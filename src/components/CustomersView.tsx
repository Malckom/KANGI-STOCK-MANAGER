import React, { useState, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  TrendingUp,
  DollarSign,
  CalendarClock,
  Sparkles,
  Edit2,
  Trash2,
  X,
  MessageCircle,
  Eye,
  Clock,
  FileText,
  CheckCircle2,
  UserCheck,
  History,
} from 'lucide-react';
import {
  Customer,
  CustomerType,
  CustomerStatus,
  ProductInterest,
  CustomerNote,
  CustomerTimelineEvent,
  Sale,
  FollowUp,
} from '../types';
import { formatKES, formatDate, formatDateTime, getTodayString } from '../utils/formatters';

interface CustomersViewProps {
  customers: Customer[];
  sales: Sale[];
  followUps: FollowUp[];
  onAddCustomer: (customer: Omit<Customer, 'id' | 'totalPurchases' | 'totalSpent' | 'totalProfitGenerated'>) => void;
  onEditCustomer: (customer: Customer) => void;
  onDeleteCustomer: (customerId: string) => void;
  onOpenSaleForCustomer: (customer: Customer) => void;
  onOpenFollowUpForCustomer: (customer: Customer) => void;
  onAddProductInterest: (customerId: string, interest: Omit<ProductInterest, 'id'>) => void;
  onAddCustomerNote: (customerId: string, text: string, relatedProduct?: string) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  sales,
  followUps,
  onAddCustomer,
  onEditCustomer,
  onDeleteCustomer,
  onOpenSaleForCustomer,
  onOpenFollowUpForCustomer,
  onAddProductInterest,
  onAddCustomerNote,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('All');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('All');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);

  // Form State for Add Customer
  const [formName, setFormName] = useState('');
  const [formBusinessName, setFormBusinessName] = useState('');
  const [formPhone, setFormPhone] = useState('+254 ');
  const [formEmail, setFormEmail] = useState('');
  const [formLocation, setFormLocation] = useState('Nairobi');
  const [formType, setFormType] = useState<CustomerType>('Electrician');
  const [formStatus, setFormStatus] = useState<CustomerStatus>('Active');
  const [formContactMethod, setFormContactMethod] = useState<'Phone' | 'WhatsApp' | 'SMS' | 'Email'>('Phone');
  const [formNotes, setFormNotes] = useState('');

  // Local Profile Add Interest State
  const [interestProduct, setInterestProduct] = useState('');
  const [interestQty, setInterestQty] = useState<number>(1);
  const [interestDate, setInterestDate] = useState('');
  const [interestNotes, setInterestNotes] = useState('');

  // Local Profile Add Note State
  const [noteText, setNoteText] = useState('');
  const [noteProduct, setNoteProduct] = useState('');

  const customerTypes: CustomerType[] = [
    'Electrician',
    'Plumber',
    'Contractor',
    'Landlord',
    'General Customer',
    'Reseller',
    'Technician',
  ];

  const customerStatuses: CustomerStatus[] = [
    'New',
    'Active',
    'Follow-up needed',
    'Quotation sent',
    'Repeat customer',
    'Inactive',
  ];

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        c.name.toLowerCase().includes(q) ||
        (c.businessName && c.businessName.toLowerCase().includes(q)) ||
        c.phone.toLowerCase().includes(q) ||
        c.location.toLowerCase().includes(q) ||
        (c.productInterests && c.productInterests.some((i) => i.productName.toLowerCase().includes(q)));

      if (!matchesSearch) return false;

      if (selectedTypeFilter !== 'All' && c.customerType !== selectedTypeFilter) return false;
      if (selectedStatusFilter !== 'All' && c.status !== selectedStatusFilter) return false;

      return true;
    });
  }, [customers, searchQuery, selectedTypeFilter, selectedStatusFilter]);

  const openAddModal = () => {
    setFormName('');
    setFormBusinessName('');
    setFormPhone('+254 ');
    setFormEmail('');
    setFormLocation('Nairobi');
    setFormType('Electrician');
    setFormStatus('Active');
    setFormContactMethod('Phone');
    setFormNotes('');
    setIsAddModalOpen(true);
  };

  const openEditModal = (c: Customer) => {
    setEditingCustomer(c);
    setFormName(c.name);
    setFormBusinessName(c.businessName || '');
    setFormPhone(c.phone);
    setFormEmail(c.email || '');
    setFormLocation(c.location);
    setFormType(c.customerType);
    setFormStatus(c.status || c.customerStatus || 'Active');
    setFormContactMethod((c.preferredContactMethod as any) || 'Phone');
    setFormNotes(typeof c.notes === 'string' ? c.notes : '');
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) return;

    onAddCustomer({
      name: formName.trim(),
      businessName: formBusinessName.trim() || undefined,
      phone: formPhone.trim(),
      email: formEmail.trim() || undefined,
      location: formLocation.trim(),
      customerType: formType,
      status: formStatus,
      preferredContactMethod: formContactMethod,
      dateAdded: getTodayString(),
      lastContactDate: getTodayString(),
      productInterests: [],
      notesHistory: formNotes.trim()
        ? [
            {
              id: `note-${Date.now()}`,
              date: getTodayString(),
              author: 'Manager',
              note: formNotes.trim(),
            },
          ]
        : [],
      timeline: [
        {
          id: `time-${Date.now()}`,
          date: new Date().toISOString(),
          type: 'INQUIRY',
          title: 'Customer Profile Created',
          description: `Registered as ${formType}`,
        },
      ],
      notes: formNotes.trim() || undefined,
    });

    setIsAddModalOpen(false);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer || !formName.trim() || !formPhone.trim()) return;

    onEditCustomer({
      ...editingCustomer,
      name: formName.trim(),
      businessName: formBusinessName.trim() || undefined,
      phone: formPhone.trim(),
      email: formEmail.trim() || undefined,
      location: formLocation.trim(),
      customerType: formType,
      status: formStatus,
      preferredContactMethod: formContactMethod,
      notes: formNotes.trim() || undefined,
    });

    setEditingCustomer(null);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Quick Action */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900">
            Customer Directory & CRM
          </h2>
          <p className="text-sm text-slate-600">
            Track customer trades (electricians, plumbers, contractors), product interests, and lifetime profit.
          </p>
        </div>

        <button
          id="btn-add-customer"
          onClick={openAddModal}
          className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-amber-700 transition-colors self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Customer</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
          {/* Search Box */}
          <div className="relative sm:col-span-6">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              id="input-customers-search"
              placeholder="Search by customer name, trade, phone, location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-4 py-2 text-sm text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none"
            />
          </div>

          {/* Trade / Type Filter */}
          <div className="sm:col-span-3">
            <select
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none"
            >
              <option value="All">All Trades ({customers.length})</option>
              {customerTypes.map((t) => (
                <option key={t} value={t}>
                  {t} ({customers.filter((c) => c.customerType === t).length})
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="sm:col-span-3">
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none"
            >
              <option value="All">All Statuses</option>
              {customerStatuses.map((s) => (
                <option key={s} value={s}>
                  {s} ({customers.filter((c) => c.status === s).length})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Customer Directory Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600 text-xs">
              <tr>
                <th className="py-3 px-3.5">Customer & Business</th>
                <th className="py-3 px-3">Trade / Type</th>
                <th className="py-3 px-3">Contact & Location</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-right">Total Spent</th>
                <th className="py-3 px-3 text-right">Profit Generated</th>
                <th className="py-3 px-3 text-center">Last Contact</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.map((customer) => {
                const customerSalesCount = sales.filter((s) => s.customerId === customer.id).length;

                return (
                  <tr key={customer.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Name & Business */}
                    <td className="py-3 px-3.5">
                      <div className="font-bold text-slate-900 text-sm">{customer.name}</div>
                      {customer.businessName && (
                        <div className="text-xs text-slate-500 font-medium">
                          {customer.businessName}
                        </div>
                      )}
                    </td>

                    {/* Trade / Type */}
                    <td className="py-3 px-3">
                      <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-800">
                        {customer.customerType}
                      </span>
                    </td>

                    {/* Contact & Location */}
                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-900">{customer.phone}</div>
                      <div className="text-xs text-slate-500">{customer.location}</div>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          customer.status === 'Active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : customer.status === 'Follow-up needed'
                            ? 'bg-amber-100 text-amber-800'
                            : customer.status === 'Quotation sent'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {customer.status}
                      </span>
                    </td>

                    {/* Total Spent */}
                    <td className="py-3 px-3 text-right font-black text-slate-900">
                      {formatKES(customer.totalSpent)}
                      <span className="text-xs text-slate-400 block font-normal">
                        {customerSalesCount} orders
                      </span>
                    </td>

                    {/* Profit Generated */}
                    <td className="py-3 px-3 text-right">
                      <span className="font-black text-emerald-600 block">
                        +{formatKES(customer.totalProfitGenerated)}
                      </span>
                      <span className="text-xs text-emerald-700">Gross Margin</span>
                    </td>

                    {/* Last Contact */}
                    <td className="py-3 px-3 text-center text-slate-500">
                      {formatDate(customer.lastContactDate)}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Profile Details Button */}
                        <button
                          title="View Profile & CRM Timeline"
                          onClick={() => setViewingCustomer(customer)}
                          className="rounded p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>

                        {/* Quick Sale for Customer */}
                        <button
                          title="Record Sale for this Customer"
                          onClick={() => onOpenSaleForCustomer(customer)}
                          className="rounded p-1.5 text-emerald-600 hover:bg-emerald-50"
                        >
                          <TrendingUp className="h-3.5 w-3.5" />
                        </button>

                        {/* Quick Follow-up */}
                        <button
                          title="Schedule Follow-up"
                          onClick={() => onOpenFollowUpForCustomer(customer)}
                          className="rounded p-1.5 text-amber-600 hover:bg-amber-50"
                        >
                          <CalendarClock className="h-3.5 w-3.5" />
                        </button>

                        {/* Edit */}
                        <button
                          title="Edit Customer"
                          onClick={() => openEditModal(customer)}
                          className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>

                        {/* Delete */}
                        <button
                          title="Delete Customer"
                          onClick={() => {
                            if (
                              window.confirm(
                                `Delete customer "${customer.name}"? Past sales will remain preserved.`
                              )
                            ) {
                              onDeleteCustomer(customer.id);
                            }
                          }}
                          className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredCustomers.length === 0 && (
            <div className="py-12 text-center">
              <Users className="h-10 w-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-700">No customers found</p>
              <p className="text-xs text-slate-400 mt-1">Try adjusting filters or add a new customer.</p>
            </div>
          )}
        </div>
      </div>

      {/* --- CUSTOMER PROFILE & CRM TIMELINE DRAWER/MODAL --- */}
      {viewingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 overflow-y-auto">
          <div className="relative w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl my-8 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black text-slate-900">{viewingCustomer.name}</h3>
                  <span className="rounded bg-amber-100 text-amber-900 px-2 py-0.5 text-xs font-bold">
                    {viewingCustomer.customerType}
                  </span>
                  <span className="rounded bg-emerald-100 text-emerald-800 px-2 py-0.5 text-xs font-bold">
                    {viewingCustomer.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {viewingCustomer.businessName && `${viewingCustomer.businessName} • `}
                  {viewingCustomer.location} • Preferred: {viewingCustomer.preferredContactMethod || 'Phone'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`tel:${viewingCustomer.phone}`}
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200"
                >
                  <Phone className="h-3.5 w-3.5" />
                  <span>Call</span>
                </a>
                <a
                  href={`https://wa.me/${viewingCustomer.phone.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  <span>WhatsApp</span>
                </a>
                <button
                  onClick={() => setViewingCustomer(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Financial Overview Cards */}
            <div className="my-4 grid grid-cols-3 gap-3 text-center text-xs">
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
                <span className="text-xs text-slate-500 font-semibold block">
                  Total Orders
                </span>
                <span className="text-xl font-black text-slate-900">
                  {sales.filter((s) => s.customerId === viewingCustomer.id).length}
                </span>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
                <span className="text-xs text-slate-500 font-semibold block">
                  Total Spent
                </span>
                <span className="text-xl font-black text-slate-900">
                  {formatKES(viewingCustomer.totalSpent)}
                </span>
              </div>
              <div className="rounded-xl bg-emerald-50 p-3 border border-emerald-200">
                <span className="text-xs text-emerald-700 font-semibold block">
                  Profit Generated
                </span>
                <span className="text-xl font-black text-emerald-700">
                  +{formatKES(viewingCustomer.totalProfitGenerated)}
                </span>
              </div>
            </div>

            {/* Body Content Tabs: Interests, Notes, Timeline */}
            <div className="flex-1 overflow-y-auto space-y-6 pr-1">
              {/* 1. Product Interest Tracker */}
              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-amber-600" />
                    <span>Product Interest Tracker</span>
                  </h4>
                  <span className="text-xs text-slate-500">
                    Products this contractor is quoting or buying soon
                  </span>
                </div>

                <div className="space-y-2">
                  {viewingCustomer.productInterests?.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-lg bg-white p-2.5 border border-slate-200 text-xs flex items-center justify-between"
                    >
                      <div>
                        <span className="font-bold text-slate-900">{item.productName}</span>
                        {item.quantity && (
                          <span className="text-slate-500 ml-1">({item.quantity} units)</span>
                        )}
                        {item.expectedPurchaseDate && (
                          <div className="text-xs text-slate-400">
                            Expected: {formatDate(item.expectedPurchaseDate)}
                          </div>
                        )}
                        {item.notes && <p className="text-xs text-slate-600 italic">{item.notes}</p>}
                      </div>
                    </div>
                  ))}

                  {(!viewingCustomer.productInterests ||
                    viewingCustomer.productInterests.length === 0) && (
                    <p className="text-xs text-slate-400 italic">No product interests logged yet.</p>
                  )}
                </div>

                {/* Quick Add Product Interest */}
                <div className="pt-2 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
                  <input
                    type="text"
                    placeholder="Product name (e.g. 100A 3-Phase Main Switch)"
                    value={interestProduct}
                    onChange={(e) => setInterestProduct(e.target.value)}
                    className="sm:col-span-5 rounded border border-slate-300 p-1.5 bg-white"
                  />
                  <input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={interestQty}
                    onChange={(e) => setInterestQty(parseInt(e.target.value, 10) || 1)}
                    className="sm:col-span-2 rounded border border-slate-300 p-1.5 bg-white"
                  />
                  <input
                    type="date"
                    value={interestDate}
                    onChange={(e) => setInterestDate(e.target.value)}
                    className="sm:col-span-3 rounded border border-slate-300 p-1.5 bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!interestProduct.trim()) return;
                      onAddProductInterest(viewingCustomer.id, {
                        productName: interestProduct.trim(),
                        quantity: interestQty,
                        expectedPurchaseDate: interestDate || undefined,
                        notes: interestNotes || undefined,
                      });
                      setInterestProduct('');
                      setInterestQty(1);
                      setInterestDate('');
                      setInterestNotes('');
                    }}
                    className="sm:col-span-2 rounded bg-amber-600 py-1.5 font-bold text-white hover:bg-amber-700 text-xs"
                  >
                    + Log
                  </button>
                </div>
              </div>

              {/* 2. Customer Notes Log */}
              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 space-y-3">
                <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span>Notes & Conversations Log</span>
                </h4>

                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {viewingCustomer.notesHistory?.map((n) => (
                    <div
                      key={n.id}
                      className="rounded-lg bg-white p-2.5 border border-slate-200 text-xs space-y-0.5"
                    >
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>{formatDate(n.date)}</span>
                        <span>By {n.author}</span>
                      </div>
                      <p className="text-slate-800 font-medium">{n.note}</p>
                    </div>
                  ))}
                  {(!viewingCustomer.notesHistory || viewingCustomer.notesHistory.length === 0) && (
                    <p className="text-xs text-slate-400 italic">No notes logged yet.</p>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-200 flex gap-2">
                  <input
                    type="text"
                    placeholder="Add a timestamped customer note..."
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    className="flex-1 rounded border border-slate-300 p-1.5 bg-white text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!noteText.trim()) return;
                      onAddCustomerNote(viewingCustomer.id, noteText.trim());
                      setNoteText('');
                    }}
                    className="rounded bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800"
                  >
                    Save Note
                  </button>
                </div>
              </div>

              {/* 3. Activity Timeline */}
              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 space-y-3">
                <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <History className="h-4 w-4 text-emerald-600" />
                  <span>CRM Activity Timeline</span>
                </h4>

                <div className="space-y-2 text-xs">
                  {viewingCustomer.timeline?.map((evt) => (
                    <div
                      key={evt.id}
                      className="flex items-start gap-2.5 rounded-lg bg-white p-2.5 border border-slate-200"
                    >
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs">
                        ✓
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{evt.title}</span>
                          <span className="text-xs text-slate-400">{formatDate(evt.date)}</span>
                        </div>
                        <p className="text-xs text-slate-600">{evt.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const c = viewingCustomer;
                    setViewingCustomer(null);
                    onOpenSaleForCustomer(c);
                  }}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-500"
                >
                  Record Sale for Customer
                </button>
                <button
                  onClick={() => {
                    const c = viewingCustomer;
                    setViewingCustomer(null);
                    onOpenFollowUpForCustomer(c);
                  }}
                  className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-amber-700"
                >
                  Schedule Follow-up
                </button>
              </div>

              <button
                onClick={() => setViewingCustomer(null)}
                className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-bold text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- ADD / EDIT CUSTOMER MODAL --- */}
      {(isAddModalOpen || editingCustomer) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900">
                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
              </h3>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingCustomer(null);
                }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={editingCustomer ? handleEditSubmit : handleAddSubmit}
              className="mt-4 space-y-3.5 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Customer Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kennedy Ochieng"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Business / Company Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ken Electricals Ltd"
                    value={formBusinessName}
                    onChange={(e) => setFormBusinessName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+254 7..."
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Customer Trade / Type
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as CustomerType)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm text-slate-900"
                  >
                    {customerTypes.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">CRM Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as CustomerStatus)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm text-slate-900"
                  >
                    {customerStatuses.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Location / Area</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kasarani, Nairobi"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Preferred Contact Method
                  </label>
                  <select
                    value={formContactMethod}
                    onChange={(e) => setFormContactMethod(e.target.value as any)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm text-slate-900"
                  >
                    <option value="Phone">Phone Call</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="SMS">SMS</option>
                    <option value="Email">Email</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email (Optional)</label>
                <input
                  type="email"
                  placeholder="contractor@domain.co.ke"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notes / Description</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Buys in bulk on Fridays, working on Ruiru estate project..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingCustomer(null);
                  }}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-amber-600 px-5 py-2 text-sm font-bold text-white shadow hover:bg-amber-700"
                >
                  {editingCustomer ? 'Update Customer' : 'Add Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
