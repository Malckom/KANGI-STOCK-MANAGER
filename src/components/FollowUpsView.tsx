import React, { useState, useMemo } from 'react';
import {
  CalendarClock,
  Plus,
  Search,
  Phone,
  MessageCircle,
  Mail,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar as CalendarIcon,
  X,
  Edit2,
  Trash2,
  RefreshCw,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import {
  FollowUp,
  Customer,
  FollowUpType,
  FollowUpStatus,
} from '../types';
import {
  formatDate,
  formatTime,
  formatDateTime,
  isFollowUpOverdue,
  isDateToday,
  isDateTomorrow,
  isDateThisWeek,
  getTodayString,
} from '../utils/formatters';
import { GoogleCalendarService } from '../services/calendarService';

interface FollowUpsViewProps {
  followUps: FollowUp[];
  customers: Customer[];
  isNewFollowUpModalOpen: boolean;
  setIsNewFollowUpModalOpen: (open: boolean) => void;
  preselectedCustomer?: Customer | null;
  onAddFollowUp: (followUp: Omit<FollowUp, 'id'>) => Promise<void>;
  onEditFollowUp: (followUp: FollowUp) => Promise<void>;
  onDeleteFollowUp: (followUpId: string) => Promise<void>;
  onCompleteFollowUp: (followUp: FollowUp, outcome: string, notes?: string) => Promise<void>;
  onResyncGoogleCalendar: (followUp: FollowUp) => Promise<void>;
}

export const FollowUpsView: React.FC<FollowUpsViewProps> = ({
  followUps,
  customers,
  isNewFollowUpModalOpen,
  setIsNewFollowUpModalOpen,
  preselectedCustomer,
  onAddFollowUp,
  onEditFollowUp,
  onDeleteFollowUp,
  onCompleteFollowUp,
  onResyncGoogleCalendar,
}) => {
  const [activeTab, setActiveTab] = useState<'overdue' | 'today' | 'tomorrow' | 'this-week' | 'all'>('today');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed' | 'cancelled'>('pending');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [editingFollowUp, setEditingFollowUp] = useState<FollowUp | null>(null);
  const [completingFollowUp, setCompletingFollowUp] = useState<FollowUp | null>(null);
  const [completionOutcome, setCompletionOutcome] = useState('Purchased / Ordered');
  const [completionNotes, setCompletionNotes] = useState('');

  // Add Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    preselectedCustomer?.id || customers[0]?.id || ''
  );
  const [manualCustomerName, setManualCustomerName] = useState('');
  const [manualCustomerPhone, setManualCustomerPhone] = useState('+254 ');
  const [isManualCustomer, setIsManualCustomer] = useState(false);
  const [followUpDate, setFollowUpDate] = useState<string>(getTodayString());
  const [followUpTime, setFollowUpTime] = useState<string>('10:00');
  const [followUpType, setFollowUpType] = useState<FollowUpType>('Phone Call');
  const [productOrService, setProductOrService] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [addToGCal, setAddToGCal] = useState<boolean>(true);
  const [reminderTiming, setReminderTiming] = useState<'10_min' | '30_min' | '1_hour' | '1_day'>('30_min');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync preselected customer when modal opens
  React.useEffect(() => {
    if (preselectedCustomer) {
      setSelectedCustomerId(preselectedCustomer.id);
      setIsManualCustomer(false);
    }
  }, [preselectedCustomer]);

  // Calculations for Filter Tabs
  const pendingFollowUps = followUps.filter((f) => f.status === 'pending');
  const overdueFollowUps = pendingFollowUps.filter((f) =>
    isFollowUpOverdue(f.date, f.time, f.status)
  );
  const todayFollowUps = pendingFollowUps.filter((f) => isDateToday(f.date));
  const tomorrowFollowUps = pendingFollowUps.filter((f) => isDateTomorrow(f.date));
  const thisWeekFollowUps = pendingFollowUps.filter((f) => isDateThisWeek(f.date));

  // Filtered List
  const filteredFollowUps = useMemo(() => {
    return followUps.filter((f) => {
      // Search
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        f.customerName.toLowerCase().includes(q) ||
        f.customerPhone.toLowerCase().includes(q) ||
        (f.productOrService && f.productOrService.toLowerCase().includes(q)) ||
        f.reasonForFollowUp.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      // Status Filter
      if (statusFilter !== 'all' && f.status !== statusFilter) return false;

      // Date Tab Filter
      if (activeTab === 'overdue') {
        return f.status === 'pending' && isFollowUpOverdue(f.date, f.time, f.status);
      }
      if (activeTab === 'today') {
        return isDateToday(f.date);
      }
      if (activeTab === 'tomorrow') {
        return isDateTomorrow(f.date);
      }
      if (activeTab === 'this-week') {
        return isDateThisWeek(f.date);
      }

      return true;
    }).sort((a, b) => {
      const timeA = new Date(`${a.date}T${a.time || '00:00'}`).getTime();
      const timeB = new Date(`${b.date}T${b.time || '00:00'}`).getTime();
      return timeA - timeB;
    });
  }, [followUps, searchQuery, statusFilter, activeTab]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    let custName = manualCustomerName.trim() || 'Customer';
    let custPhone = manualCustomerPhone.trim();
    let custId: string | undefined = undefined;

    if (!isManualCustomer) {
      const cust = customers.find((c) => c.id === selectedCustomerId);
      if (cust) {
        custId = cust.id;
        custName = cust.name;
        custPhone = cust.phone;
      }
    }

    setIsSubmitting(true);
    await onAddFollowUp({
      customerId: custId,
      customerName: custName,
      customerPhone: custPhone,
      date: followUpDate,
      time: followUpTime,
      type: followUpType,
      productOrService: productOrService.trim(),
      reasonForFollowUp: reason.trim(),
      notes: notes.trim() || undefined,
      status: 'pending',
      addToGoogleCalendar: addToGCal,
      googleCalendarReminderMinutes:
        reminderTiming === '10_min' ? 10 : reminderTiming === '30_min' ? 30 : reminderTiming === '1_hour' ? 60 : 1440,
    });
    setIsSubmitting(false);

    setIsNewFollowUpModalOpen(false);
    setReason('');
    setProductOrService('');
    setNotes('');
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFollowUp) return;

    setIsSubmitting(true);
    await onEditFollowUp(editingFollowUp);
    setIsSubmitting(false);
    setEditingFollowUp(null);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Primary Action */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900">
            Customer Follow-ups & Reminders
          </h2>
          <p className="text-sm text-slate-600">
            Track customer quotes, callbacks, and appointments with live Google Calendar sync.
          </p>
        </div>

        <button
          id="btn-add-followup"
          onClick={() => setIsNewFollowUpModalOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-amber-700 transition-colors self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Schedule Follow-up</span>
        </button>
      </div>

      {/* Date Filter Tabs Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('overdue')}
          className={`relative rounded-lg px-3.5 py-2 text-xs font-bold transition-colors flex items-center gap-1.5 ${
            activeTab === 'overdue'
              ? 'bg-red-600 text-white'
              : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
          }`}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>Overdue</span>
          {overdueFollowUps.length > 0 && (
            <span
              className={`rounded-full px-2 py-0.2 text-xs font-black ${
                activeTab === 'overdue' ? 'bg-white text-red-600' : 'bg-red-600 text-white'
              }`}
            >
              {overdueFollowUps.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('today')}
          className={`rounded-lg px-3.5 py-2 text-xs font-bold transition-colors flex items-center gap-1.5 ${
            activeTab === 'today'
              ? 'bg-amber-600 text-white font-black'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          <span>Today ({todayFollowUps.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('tomorrow')}
          className={`rounded-lg px-3.5 py-2 text-xs font-bold transition-colors ${
            activeTab === 'tomorrow'
              ? 'bg-slate-900 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Tomorrow ({tomorrowFollowUps.length})
        </button>

        <button
          onClick={() => setActiveTab('this-week')}
          className={`rounded-lg px-3.5 py-2 text-xs font-bold transition-colors ${
            activeTab === 'this-week'
              ? 'bg-slate-900 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          This Week ({thisWeekFollowUps.length})
        </button>

        <button
          onClick={() => setActiveTab('all')}
          className={`rounded-lg px-3.5 py-2 text-xs font-bold transition-colors ${
            activeTab === 'all'
              ? 'bg-slate-900 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          All ({followUps.length})
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
          {/* Search Box */}
          <div className="relative sm:col-span-8">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              id="input-followups-search"
              placeholder="Search by customer name, phone, product or reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-4 py-2 text-sm text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none"
            />
          </div>

          {/* Status Filter */}
          <div className="sm:col-span-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none"
            >
              <option value="pending">Status: Pending Only</option>
              <option value="completed">Status: Completed</option>
              <option value="cancelled">Status: Cancelled</option>
              <option value="all">Status: All Records</option>
            </select>
          </div>
        </div>
      </div>

      {/* Follow-ups Cards Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {filteredFollowUps.map((followUp) => {
          const isOverdue = isFollowUpOverdue(followUp.date, followUp.time, followUp.status);
          const isToday = isDateToday(followUp.date);
          const isDone = followUp.status === 'completed';

          return (
            <div
              key={followUp.id}
              className={`rounded-2xl border p-5 shadow-xs flex flex-col justify-between transition-colors ${
                isDone
                  ? 'bg-slate-50/70 border-slate-200 opacity-80'
                  : isOverdue
                  ? 'bg-red-50/30 border-red-300 hover:border-red-400'
                  : isToday
                  ? 'bg-amber-50/30 border-amber-300 hover:border-amber-400'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                {/* Card Top: Customer & Urgency Badge */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-black text-slate-900 text-base">{followUp.customerName}</h3>
                    <p className="text-xs text-slate-500">{followUp.customerPhone}</p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                        isDone
                          ? 'bg-emerald-100 text-emerald-800'
                          : isOverdue
                          ? 'bg-red-600 text-white font-black'
                          : isToday
                          ? 'bg-amber-600 text-white font-black'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {isDone ? 'Completed' : isOverdue ? 'Overdue' : isToday ? 'Today' : formatDate(followUp.date)}
                    </span>
                  </div>
                </div>

                {/* Date & Time Row */}
                <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <Clock className="h-3.5 w-3.5 text-amber-600" />
                  <span>{formatDateTime(followUp.date, followUp.time)}</span>
                  <span>•</span>
                  <span className="rounded bg-slate-100 px-2 py-0.2 text-xs font-bold text-slate-800">
                    {followUp.type}
                  </span>
                </div>

                {/* Product & Reason Box */}
                <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs space-y-1 border border-slate-100">
                  <div>
                    <span className="text-xs text-slate-400 font-semibold block">
                      Product / Inquiry:
                    </span>
                    <span className="font-bold text-slate-900">
                      {followUp.productOrService || 'General Business Follow-up'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 font-semibold block">
                      Reason:
                    </span>
                    <span className="text-slate-700 font-medium">{followUp.reasonForFollowUp}</span>
                  </div>
                  {followUp.notes && (
                    <p className="text-xs text-slate-500 italic pt-1 border-t border-slate-200">
                      &ldquo;{followUp.notes}&rdquo;
                    </p>
                  )}
                </div>

                {/* Completed Outcome if completed */}
                {isDone && followUp.outcome && (
                  <div className="mt-2 rounded-lg bg-emerald-50 p-2 text-xs text-emerald-900 border border-emerald-200">
                    <span className="font-bold">Outcome: </span>
                    <span>{followUp.outcome}</span>
                    {followUp.completionNotes && (
                      <p className="text-xs text-emerald-700 italic mt-0.5">
                        {followUp.completionNotes}
                      </p>
                    )}
                  </div>
                )}

                {/* Google Calendar Status Indicator */}
                {followUp.addToGoogleCalendar && (
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 font-medium text-slate-500">
                      <CalendarIcon className="h-3 w-3 text-blue-600" />
                      Google Calendar:
                      {followUp.googleCalendarSyncStatus === 'synced' ? (
                        <span className="text-emerald-600 font-bold">Synced ✓</span>
                      ) : followUp.googleCalendarSyncStatus === 'failed' ? (
                        <span className="text-red-500 font-bold">Sync Failed</span>
                      ) : (
                        <span className="text-slate-400">Local Only</span>
                      )}
                    </span>
                    {followUp.googleCalendarSyncStatus === 'failed' && (
                      <button
                        onClick={() => onResyncGoogleCalendar(followUp)}
                        className="text-blue-600 font-bold hover:underline"
                      >
                        Retry Sync
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <a
                    href={`tel:${followUp.customerPhone}`}
                    className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                  >
                    <Phone className="h-3 w-3" />
                    <span>Call</span>
                  </a>
                  <a
                    href={`https://wa.me/${followUp.customerPhone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                  >
                    <MessageCircle className="h-3 w-3" />
                    <span>WhatsApp</span>
                  </a>
                </div>

                <div className="flex items-center gap-1.5">
                  {!isDone && (
                    <button
                      id={`btn-complete-followup-${followUp.id}`}
                      onClick={() => {
                        setCompletingFollowUp(followUp);
                        setCompletionOutcome('Purchased / Ordered');
                        setCompletionNotes('');
                      }}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-500"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Complete</span>
                    </button>
                  )}

                  <button
                    onClick={() => setEditingFollowUp(followUp)}
                    className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      if (window.confirm('Delete this follow-up reminder?')) {
                        onDeleteFollowUp(followUp.id);
                      }
                    }}
                    className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredFollowUps.length === 0 && (
        <div className="py-16 text-center bg-white rounded-2xl border border-slate-200">
          <CalendarClock className="h-10 w-10 mx-auto text-slate-300 mb-2" />
          <h3 className="text-sm font-bold text-slate-800">No follow-ups in this view</h3>
          <p className="text-xs text-slate-500 mt-1">There are no pending reminders.</p>
        </div>
      )}

      {/* --- SCHEDULE / ADD FOLLOW-UP MODAL --- */}
      {isNewFollowUpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                  <CalendarClock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Schedule Follow-up</h3>
                  <p className="text-xs text-slate-500">
                    Set a reminder for quotations, project supplies, or customer calls.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsNewFollowUpModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-3.5 text-xs">
              {/* Customer Selector */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700">Customer <span className="text-red-500">*</span></label>
                  <button
                    type="button"
                    onClick={() => setIsManualCustomer(!isManualCustomer)}
                    className="text-amber-700 font-bold hover:underline"
                  >
                    {isManualCustomer ? '← Choose from CRM' : '+ Enter Walk-in Customer'}
                  </button>
                </div>

                {!isManualCustomer ? (
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.customerType} — {c.phone})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Customer name"
                      value={manualCustomerName}
                      onChange={(e) => setManualCustomerName(e.target.value)}
                      className="rounded-lg border border-slate-300 p-2 text-sm text-slate-900"
                    />
                    <input
                      type="text"
                      required
                      placeholder="Phone number (+254...)"
                      value={manualCustomerPhone}
                      onChange={(e) => setManualCustomerPhone(e.target.value)}
                      className="rounded-lg border border-slate-300 p-2 text-sm text-slate-900"
                    />
                  </div>
                )}
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Scheduled Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Scheduled Time</label>
                  <input
                    type="time"
                    value={followUpTime}
                    onChange={(e) => setFollowUpTime(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm text-slate-900"
                  />
                </div>
              </div>

              {/* Type & Product */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Follow-up Channel</label>
                  <select
                    value={followUpType}
                    onChange={(e) => setFollowUpType(e.target.value as FollowUpType)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm text-slate-900"
                  >
                    <option value="Phone Call">Phone Call</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="SMS">SMS</option>
                    <option value="In-person Visit">In-person Visit</option>
                    <option value="Email">Email</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Product / Service</label>
                  <input
                    type="text"
                    placeholder="e.g. 100A Main Switch, PPR Pipes"
                    value={productOrService}
                    onChange={(e) => setProductOrService(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm text-slate-900"
                  />
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Reason for Follow-up <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Send formal quotation, check if site work started..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Google Calendar Reminder Sync Box */}
              <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={addToGCal}
                      onChange={(e) => setAddToGCal(e.target.checked)}
                      className="h-4 w-4 rounded text-blue-600"
                    />
                    <span className="font-bold text-blue-950 text-xs">
                      Add reminder to Google Calendar
                    </span>
                  </label>
                  <CalendarIcon className="h-4 w-4 text-blue-700" />
                </div>

                {addToGCal && (
                  <div className="pt-1 flex items-center justify-between text-xs text-blue-900">
                    <span>Reminder Alert:</span>
                    <select
                      value={reminderTiming}
                      onChange={(e) => setReminderTiming(e.target.value as any)}
                      className="rounded border border-blue-300 bg-white px-2 py-1 text-xs text-slate-900"
                    >
                      <option value="10_min">10 minutes before</option>
                      <option value="30_min">30 minutes before</option>
                      <option value="1_hour">1 hour before</option>
                      <option value="1_day">1 day before</option>
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Additional Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Electrician mentioned project begins this Thursday..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewFollowUpModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-lg bg-amber-600 px-5 py-2 text-sm font-bold text-white shadow hover:bg-amber-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Scheduling...' : 'Save Follow-up'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MARK AS COMPLETED MODAL --- */}
      {completingFollowUp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <h3 className="font-black text-slate-900">Mark Follow-up Completed</h3>
              </div>
              <button
                onClick={() => setCompletingFollowUp(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await onCompleteFollowUp(completingFollowUp, completionOutcome, completionNotes);
                setCompletingFollowUp(null);
              }}
              className="mt-4 space-y-3 text-xs"
            >
              <p className="text-slate-600">
                Follow-up with <strong>{completingFollowUp.customerName}</strong> regarding{' '}
                <strong>{completingFollowUp.productOrService}</strong>.
              </p>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Follow-up Outcome</label>
                <select
                  value={completionOutcome}
                  onChange={(e) => setCompletionOutcome(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-sm text-slate-900"
                >
                  <option value="Purchased / Ordered">Purchased / Ordered items</option>
                  <option value="Quotation Accepted">Quotation Accepted</option>
                  <option value="Needs More Time / Callback Requested">
                    Needs More Time / Callback Requested
                  </option>
                  <option value="Quotation Sent">Quotation Sent</option>
                  <option value="Not Interested / Postponed">Not Interested / Postponed</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Outcome Details / Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Ordered 3 rolls of cable, delivered to site..."
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCompletingFollowUp(null)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-500"
                >
                  Record Done
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT FOLLOW-UP MODAL --- */}
      {editingFollowUp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900">Edit Follow-up</h3>
              <button
                onClick={() => setEditingFollowUp(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Customer Name</label>
                <input
                  type="text"
                  required
                  value={editingFollowUp.customerName}
                  onChange={(e) =>
                    setEditingFollowUp({ ...editingFollowUp, customerName: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-300 p-2 text-sm text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Scheduled Date</label>
                  <input
                    type="date"
                    required
                    value={editingFollowUp.date}
                    onChange={(e) =>
                      setEditingFollowUp({ ...editingFollowUp, date: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Scheduled Time</label>
                  <input
                    type="time"
                    value={editingFollowUp.time || ''}
                    onChange={(e) =>
                      setEditingFollowUp({ ...editingFollowUp, time: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Product / Interest</label>
                <input
                  type="text"
                  value={editingFollowUp.productOrService}
                  onChange={(e) =>
                    setEditingFollowUp({ ...editingFollowUp, productOrService: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-300 p-2 text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Reason for Follow-up</label>
                <input
                  type="text"
                  required
                  value={editingFollowUp.reasonForFollowUp}
                  onChange={(e) =>
                    setEditingFollowUp({ ...editingFollowUp, reasonForFollowUp: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-300 p-2 text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Status</label>
                <select
                  value={editingFollowUp.status}
                  onChange={(e) =>
                    setEditingFollowUp({
                      ...editingFollowUp,
                      status: e.target.value as FollowUpStatus,
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 p-2 text-sm text-slate-900"
                >
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={editingFollowUp.notes || ''}
                  onChange={(e) =>
                    setEditingFollowUp({ ...editingFollowUp, notes: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingFollowUp(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-amber-600 px-5 py-2 text-sm font-bold text-white shadow hover:bg-amber-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
