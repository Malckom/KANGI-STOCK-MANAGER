import React, { useState } from 'react';
import {
  Settings,
  Building2,
  Calendar,
  Layers,
  Save,
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Plus,
  Trash2,
  Sparkles,
  Info,
  Database,
  RefreshCw,
  Server,
  Activity,
  FileSpreadsheet,
  Users,
  Shield,
  KeyRound,
  UserCheck,
  LogOut,
  LogIn,
  Check,
  X as XIcon,
} from 'lucide-react';
import { BusinessSettings, PriorityLabel, UserRole } from '../types';
import { GoogleCalendarService } from '../services/calendarService';
import { resetDatabaseWithDemoData, exportDatabaseJSON, importDatabaseJSON } from '../utils/storage';
import { DatabaseAPI } from '../services/api';
import { useAuth } from '../services/AuthContext';
import { DEMO_STAFF_ACCOUNTS } from '../services/authService';

interface SettingsViewProps {
  settings: BusinessSettings;
  categories: string[];
  priorityLabels: PriorityLabel[];
  isDbConnected?: boolean;
  isSyncing?: boolean;
  lastSyncTime?: string | null;
  onManualSync?: () => void;
  onSaveSettings: (settings: BusinessSettings) => void;
  onSaveCategories: (categories: string[]) => void;
  onResetDatabase: () => void;
  onOpenExcelExport?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  categories,
  priorityLabels,
  isDbConnected = true,
  isSyncing = false,
  lastSyncTime,
  onManualSync,
  onSaveSettings,
  onSaveCategories,
  onResetDatabase,
  onOpenExcelExport,
}) => {
  // Business Profile Form
  const [businessName, setBusinessName] = useState(settings.businessName);
  const [ownerName, setOwnerName] = useState(settings.ownerName);
  const [phone, setPhone] = useState(settings.phone);
  const [location, setLocation] = useState(settings.location);
  const [currency, setCurrency] = useState(settings.currency || 'KES');
  const [lowStockDefault, setLowStockDefault] = useState(settings.lowStockThresholdDefault || 5);
  const [receiptFooter, setReceiptFooter] = useState(
    settings.receiptFooter || 'Thank you for your business! Goods once sold cannot be returned.'
  );

  // Categories Form
  const [categoryList, setCategoryList] = useState<string[]>(categories);
  const [newCatName, setNewCatName] = useState('');

  // DB Health Test
  const [isTestingDb, setIsTestingDb] = useState(false);
  const [dbHealthStatus, setDbHealthStatus] = useState<{
    ok: boolean;
    apiOk?: boolean;
    latencyMs?: number;
    metrics?: any;
    details?: string;
  } | null>(null);

  // Google Calendar Integration
  const [gcalToken, setGcalToken] = useState(
    GoogleCalendarService.getAccessToken() || ''
  );
  const [isTestingSync, setIsTestingSync] = useState(false);
  const [testSyncResult, setTestSyncResult] = useState<{ success: boolean; msg: string } | null>(
    null
  );

  const [savedSuccess, setSavedSuccess] = useState(false);

  // Auth & Roles
  const { user, isAuthenticated, permissions, openAuthModal, logout, loginWithDemoRole } = useAuth();

  const getRoleBadge = (role?: UserRole) => {
    switch (role) {
      case 'admin':
        return { label: 'Store Owner', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
      case 'manager':
        return { label: 'Store Manager', color: 'bg-blue-100 text-blue-800 border-blue-300' };
      case 'cashier':
        return { label: 'POS Cashier', color: 'bg-amber-100 text-amber-800 border-amber-300' };
      case 'clerk':
        return { label: 'Stock Clerk', color: 'bg-purple-100 text-purple-800 border-purple-300' };
      default:
        return { label: 'Staff Member', color: 'bg-slate-100 text-slate-800 border-slate-300' };
    }
  };

  const currentRoleMeta = getRoleBadge(user?.role);

  // Handle Save Business Profile
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings({
      ...settings,
      businessName,
      ownerName,
      phone,
      location,
      currency,
      lowStockThresholdDefault: lowStockDefault,
      receiptFooter,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Handle Save Categories
  const handleAddCategory = () => {
    if (!newCatName.trim() || categoryList.includes(newCatName.trim())) return;
    const updated = [...categoryList, newCatName.trim()];
    setCategoryList(updated);
    onSaveCategories(updated);
    setNewCatName('');
  };

  const handleDeleteCategory = (cat: string) => {
    const updated = categoryList.filter((c) => c !== cat);
    setCategoryList(updated);
    onSaveCategories(updated);
  };

  // Test DB connection
  const handleTestDatabaseConnection = async () => {
    setIsTestingDb(true);
    setDbHealthStatus(null);
    try {
      const apiRes = await DatabaseAPI.checkHealth();
      setDbHealthStatus({
        ok: apiRes.ok,
        apiOk: apiRes.ok,
        latencyMs: apiRes.latencyMs ?? 0,
        metrics: apiRes.data?.metrics,
        details: apiRes.ok
          ? 'Connected to the KANGI backend (SQLite).'
          : 'Could not reach the backend server.',
      });
    } catch (e) {
      setDbHealthStatus({ ok: false, details: 'Could not connect to database.' });
    } finally {
      setIsTestingDb(false);
    }
  };

  // Google Calendar OAuth / Token Handling
  const handleSaveGCalToken = () => {
    GoogleCalendarService.setAccessToken(gcalToken.trim());
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleTestGCalSync = async () => {
    setIsTestingSync(true);
    setTestSyncResult(null);
    try {
      const isConfigured = GoogleCalendarService.isConfigured();
      if (!isConfigured) {
        setTestSyncResult({
          success: false,
          msg: 'No Google Calendar access token provided. Follow-ups will be stored locally in KANGI Stock Manager.',
        });
      } else {
        const testRes = await GoogleCalendarService.createFollowUpEvent({
          id: 'test-sync',
          customerName: 'KANGI Test Sync',
          customerPhone: phone,
          date: new Date().toISOString().split('T')[0],
          time: '12:00',
          type: 'Phone Call',
          productOrService: 'System Verification',
          reasonForFollowUp: 'Verify Google Calendar sync connection',
          status: 'pending',
          addToGoogleCalendar: true,
        });

        if (testRes) {
          setTestSyncResult({
            success: true,
            msg: 'Successfully connected and verified with Google Calendar API!',
          });
        } else {
          setTestSyncResult({
            success: false,
            msg: 'Could not sync test event to Google Calendar. Check if token has calendar.events scope.',
          });
        }
      }
    } catch (err: any) {
      setTestSyncResult({
        success: false,
        msg: err?.message || 'Error communicating with Google Calendar API.',
      });
    } finally {
      setIsTestingSync(false);
    }
  };

  // Export JSON Backup
  const handleExportJSON = () => {
    const jsonStr = exportDatabaseJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `KANGI_Backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Import JSON Backup
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = importDatabaseJSON(content);
        if (success) {
          alert('Database restored successfully! Refreshing view...');
          window.location.reload();
        } else {
          alert('Failed to import database file. Please ensure it is a valid KANGI backup JSON.');
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 pb-20 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-slate-900">
          Business & System Settings
        </h2>
        <p className="text-sm text-slate-600">
          Manage backend database sync, store details, inventory categories, and data backups.
        </p>
      </div>

      {savedSuccess && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-800 text-xs font-bold flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Settings saved and synchronized with database!</span>
        </div>
      )}

      {/* 1. Backend Database Connection Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-600 text-white font-bold shadow-xs">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900">
                  Backend Database
                </h3>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-black text-amber-800">
                  SQLite
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Store data is saved on this server in <code className="font-mono text-slate-700">data/kangi.db</code>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                isDbConnected
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${isDbConnected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              {isDbConnected ? 'Backend Connected & Live' : 'Offline / Local Cache'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 text-xs">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <span className="text-xs font-semibold text-slate-500">Storage Engine</span>
            <p className="font-mono text-xs font-bold text-slate-900 mt-1">SQLite (better-sqlite3)</p>
            <p className="text-xs text-emerald-700 font-medium mt-0.5">Single file on this server</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <span className="text-xs font-semibold text-slate-500">Last Synced</span>
            <p className="text-xs font-bold text-slate-900 mt-1">{lastSyncTime || 'Just now'}</p>
            <p className="text-xs text-emerald-600 mt-0.5">Saved on every change</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2">
          <button
            type="button"
            onClick={onManualSync}
            disabled={isSyncing}
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin text-amber-400' : ''}`} />
            <span>{isSyncing ? 'Syncing with Backend...' : 'Sync with Backend'}</span>
          </button>

          <button
            type="button"
            onClick={handleTestDatabaseConnection}
            disabled={isTestingDb}
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <Activity className="h-4 w-4 text-emerald-600" />
            <span>{isTestingDb ? 'Testing Connection...' : 'Ping Backend'}</span>
          </button>
        </div>

        {dbHealthStatus && (
          <div
            className={`mt-4 rounded-xl p-3.5 text-xs ${
              dbHealthStatus.ok
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border border-rose-200 text-rose-900'
            }`}
          >
            <div className="flex items-center gap-2 font-bold">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Database Server Responded in {dbHealthStatus.latencyMs}ms!</span>
            </div>
            <p className="mt-1 text-xs text-emerald-800">
              {dbHealthStatus.details || 'SQLite database is active and accepting read/write transactions.'}
            </p>
            {dbHealthStatus.metrics && (
              <p className="mt-0.5 text-xs text-emerald-700">
                Verified tables: {dbHealthStatus.metrics.productsCount} Products, {dbHealthStatus.metrics.salesCount} Sales, {dbHealthStatus.metrics.customersCount} Customers, {dbHealthStatus.metrics.followUpsCount} Follow-ups.
              </p>
            )}
          </div>
        )}
      </div>

      {/* 2. Staff Authentication & Access Control Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold shadow-xs">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900">
                  Staff Authentication & Access Control
                </h3>
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-black text-indigo-800">
                  RBAC Active
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Manage cashier/manager logins, granular permissions, and store security.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => openAuthModal('signin')}
              className="flex min-h-[40px] items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-500 transition-colors"
            >
              <LogIn className="h-4 w-4" />
              <span>Login / Switch Staff</span>
            </button>
          </div>
        </div>

        {/* Current Active Staff Account Card */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 mb-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3.5">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName}
                  className="h-12 w-12 rounded-full object-cover border-2 border-indigo-200 shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-base font-black text-white shrink-0 shadow-xs">
                  {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-black text-slate-900">
                    {user?.displayName || 'Active Staff Member'}
                  </h4>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${currentRoleMeta.color}`}>
                    {currentRoleMeta.label}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{user?.email || 'No email attached'}</p>
                <p className="text-xs font-mono text-slate-400 mt-0.5">UID: {user?.uid || 'local-demo'}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => openAuthModal('signup')}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Plus className="h-3.5 w-3.5 text-slate-500" />
                <span>Add Staff</span>
              </button>
              <button
                type="button"
                onClick={logout}
                className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5 text-rose-600" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Role Simulation & Test accounts */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-amber-600" />
              <span>Instant Staff Role Switcher (Live Demo Accounts)</span>
            </span>
            <span className="text-xs text-slate-400">Click to instantly test role-based UI constraints</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {DEMO_STAFF_ACCOUNTS.map((staff) => {
              const isActive = user?.role === staff.role;
              return (
                <button
                  key={staff.role}
                  type="button"
                  onClick={() => loginWithDemoRole(staff.role)}
                  className={`flex flex-col p-3 rounded-xl border text-left transition-colors ${
                    isActive
                      ? 'border-indigo-500 bg-indigo-50/70 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-black text-slate-900">{staff.name}</span>
                    {isActive ? (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white">
                        <Check className="h-3 w-3" />
                      </span>
                    ) : (
                      <span className="text-xs font-mono text-slate-400">Test</span>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-indigo-700">{staff.title}</span>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{staff.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Granular Permissions Checklist for Current User */}
        <div className="mt-5 border-t border-slate-100 pt-4">
          <h4 className="text-xs font-bold text-slate-600 mb-3">
            Active Permissions for &quot;{currentRoleMeta.label}&quot;
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
            <div className={`flex items-center gap-2 p-2 rounded-lg ${permissions.canProcessSales ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-slate-50 text-slate-400'}`}>
              {permissions.canProcessSales ? <Check className="h-4 w-4 text-emerald-600 shrink-0" /> : <XIcon className="h-4 w-4 text-slate-400 shrink-0" />}
              <span className="text-xs font-medium">Record POS Sales</span>
            </div>

            <div className={`flex items-center gap-2 p-2 rounded-lg ${permissions.canManageProducts ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-slate-50 text-slate-400'}`}>
              {permissions.canManageProducts ? <Check className="h-4 w-4 text-emerald-600 shrink-0" /> : <XIcon className="h-4 w-4 text-slate-400 shrink-0" />}
              <span className="text-xs font-medium">Manage Products & Stock</span>
            </div>

            <div className={`flex items-center gap-2 p-2 rounded-lg ${permissions.canRecordPurchases ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-slate-50 text-slate-400'}`}>
              {permissions.canRecordPurchases ? <Check className="h-4 w-4 text-emerald-600 shrink-0" /> : <XIcon className="h-4 w-4 text-slate-400 shrink-0" />}
              <span className="text-xs font-medium">Record Purchases</span>
            </div>

            <div className={`flex items-center gap-2 p-2 rounded-lg ${permissions.canExportExcel ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-slate-50 text-slate-400'}`}>
              {permissions.canExportExcel ? <Check className="h-4 w-4 text-emerald-600 shrink-0" /> : <XIcon className="h-4 w-4 text-slate-400 shrink-0" />}
              <span className="text-xs font-medium">Generate Excel (.xlsx)</span>
            </div>

            <div className={`flex items-center gap-2 p-2 rounded-lg ${permissions.canManageCustomers ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-slate-50 text-slate-400'}`}>
              {permissions.canManageCustomers ? <Check className="h-4 w-4 text-emerald-600 shrink-0" /> : <XIcon className="h-4 w-4 text-slate-400 shrink-0" />}
              <span className="text-xs font-medium">Manage Customers & CRM</span>
            </div>

            <div className={`flex items-center gap-2 p-2 rounded-lg ${permissions.canManageSuppliers ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-slate-50 text-slate-400'}`}>
              {permissions.canManageSuppliers ? <Check className="h-4 w-4 text-emerald-600 shrink-0" /> : <XIcon className="h-4 w-4 text-slate-400 shrink-0" />}
              <span className="text-xs font-medium">Manage Suppliers</span>
            </div>

            <div className={`flex items-center gap-2 p-2 rounded-lg ${permissions.canEditSettings ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-slate-50 text-slate-400'}`}>
              {permissions.canEditSettings ? <Check className="h-4 w-4 text-emerald-600 shrink-0" /> : <XIcon className="h-4 w-4 text-slate-400 shrink-0" />}
              <span className="text-xs font-medium">Edit Store Settings</span>
            </div>

            <div className={`flex items-center gap-2 p-2 rounded-lg ${permissions.canResetDatabase ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
              {permissions.canResetDatabase ? <Check className="h-4 w-4 text-emerald-600 shrink-0" /> : <Lock className="h-4 w-4 text-rose-500 shrink-0" />}
              <span className="text-xs font-medium">Reset Database (Admin)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Business Profile Settings */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
        <h3 className="text-base font-black text-slate-900 mb-4 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-amber-600" />
          <span>Business Profile & Receipts</span>
        </h3>

        <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Business Store Name</label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 text-sm text-slate-900 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Owner / Manager Name</label>
              <input
                type="text"
                required
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 text-sm text-slate-900 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Store Phone / M-Pesa</label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 text-sm text-slate-900 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Location / City</label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 text-sm text-slate-900 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Currency Code</label>
              <input
                type="text"
                required
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 text-sm font-bold text-slate-900 bg-slate-50"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Default Low Stock Alert Threshold
              </label>
              <input
                type="number"
                min="1"
                required
                value={lowStockDefault}
                onChange={(e) => setLowStockDefault(parseInt(e.target.value, 10) || 5)}
                className="w-full rounded-xl border border-slate-300 p-2.5 text-sm font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Receipt Footer Notice
              </label>
              <input
                type="text"
                value={receiptFooter}
                onChange={(e) => setReceiptFooter(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900"
              />
            </div>
          </div>

          <div className="pt-2 text-right">
            <button
              type="submit"
              className="flex min-h-[44px] w-full sm:w-auto items-center justify-center gap-1.5 rounded-xl bg-amber-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-amber-700 transition-colors"
            >
              <Save className="h-4 w-4" />
              <span>Save Business Details</span>
            </button>
          </div>
        </form>
      </div>

      {/* 3. Google Calendar Integration */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <span>Google Calendar Sync Integration</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Sync customer follow-ups, quotation deadlines, and supplier deliveries directly to your phone&apos;s Google Calendar.
            </p>
          </div>

          <span
            className={`rounded-full px-3 py-1 text-xs font-bold self-start sm:self-auto ${
              GoogleCalendarService.isConfigured()
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {GoogleCalendarService.isConfigured() ? 'Connected ✓' : 'Local Reminders Active'}
          </span>
        </div>

        <div className="mt-4 rounded-xl bg-blue-50 border border-blue-200 p-4 text-xs text-blue-900 space-y-2">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">How Google Calendar Reminders Work in KANGI:</p>
              <p className="text-xs text-blue-800 mt-0.5">
                When you schedule customer follow-ups, KANGI creates an event on your Google Calendar with custom alerts (10 min, 30 min, 1 hour before). All follow-ups also automatically appear in the KANGI Follow-ups dashboard.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              OAuth / Calendar API Access Token (Optional)
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="Enter Google Calendar OAuth token..."
                value={gcalToken}
                onChange={(e) => setGcalToken(e.target.value)}
                className="flex-1 rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 font-mono"
              />
              <button
                type="button"
                onClick={handleSaveGCalToken}
                className="flex min-h-[44px] sm:min-h-0 items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors"
              >
                Save Token
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2">
            <button
              type="button"
              disabled={isTestingSync}
              onClick={handleTestGCalSync}
              className="flex min-h-[44px] sm:min-h-0 items-center justify-center gap-1.5 rounded-xl border border-blue-300 bg-blue-50 px-4 py-2 text-xs font-bold text-blue-800 hover:bg-blue-100 transition-colors disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5 text-blue-600" />
              <span>{isTestingSync ? 'Verifying...' : 'Test Calendar Connection'}</span>
            </button>

            {GoogleCalendarService.isConfigured() && (
              <button
                type="button"
                onClick={() => {
                  GoogleCalendarService.disconnect();
                  setGcalToken('');
                  alert('Disconnected from Google Calendar.');
                }}
                className="text-xs text-red-600 font-semibold hover:underline self-center"
              >
                Disconnect
              </button>
            )}
          </div>

          {testSyncResult && (
            <div
              className={`rounded-xl p-3 text-xs font-medium ${
                testSyncResult.success
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-amber-50 text-amber-900 border border-amber-200'
              }`}
            >
              {testSyncResult.msg}
            </div>
          )}
        </div>
      </div>

      {/* 4. Product Categories Management */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
        <h3 className="text-base font-black text-slate-900 mb-4 flex items-center gap-2">
          <Layers className="h-5 w-5 text-purple-600" />
          <span>Product Categories</span>
        </h3>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {categoryList.map((cat) => (
              <span
                key={cat}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-800 border border-slate-200"
              >
                <span>{cat}</span>
                {categoryList.length > 1 && (
                  <button
                    onClick={() => handleDeleteCategory(cat)}
                    className="flex h-5 w-5 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-red-600 transition-colors"
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 max-w-md pt-2">
            <input
              type="text"
              placeholder="New category (e.g. Solar / Inverters)"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="flex-1 rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900"
            />
            <button
              type="button"
              onClick={handleAddCategory}
              className="flex min-h-[44px] sm:min-h-0 items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors"
            >
              + Add Category
            </button>
          </div>
        </div>
      </div>

      {/* 5. Data Backup, Export & Reset */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
          <RotateCcw className="h-5 w-5 text-slate-700" />
          <span>Data Backup & Recovery</span>
        </h3>
        <p className="text-xs text-slate-500">
          Export your store inventory, transactions, customers and CRM records locally or restore from a backup file.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {/* Export Excel Master */}
          {onOpenExcelExport && (
            <button
              type="button"
              onClick={onOpenExcelExport}
              className="flex min-h-[50px] items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50/50 p-3.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 shadow-xs transition-colors"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              <span>Excel Export Hub (.xlsx)</span>
            </button>
          )}

          {/* Export JSON */}
          <button
            type="button"
            onClick={handleExportJSON}
            className="flex min-h-[50px] items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white p-3.5 text-xs font-bold text-slate-800 hover:bg-slate-50 shadow-xs transition-colors"
          >
            <Download className="h-4 w-4 text-slate-600" />
            <span>Export Backup (JSON)</span>
          </button>

          {/* Import JSON */}
          <label className="flex min-h-[50px] items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white p-3.5 text-xs font-bold text-slate-800 hover:bg-slate-50 shadow-xs cursor-pointer transition-colors">
            <Upload className="h-4 w-4 text-slate-600" />
            <span>Restore Backup</span>
            <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
          </label>

          {/* Reset Demo Data */}
          <button
            type="button"
            disabled={!permissions.canResetDatabase}
            title={
              permissions.canResetDatabase
                ? 'Reset demo store records'
                : 'Admin permission required to reset database'
            }
            onClick={() => {
              if (!permissions.canResetDatabase) {
                alert('Access restricted: Only Store Owners (Admin) can reset the database.');
                return;
              }
              if (
                window.confirm(
                  'Are you sure you want to reset all data back to the default Kenya demo dataset? Any custom items will be overwritten.'
                )
              ) {
                onResetDatabase();
              }
            }}
            className={`flex min-h-[50px] items-center justify-center gap-2 rounded-xl border p-3.5 text-xs font-bold shadow-xs transition-colors ${
              permissions.canResetDatabase
                ? 'border-red-200 bg-red-50/50 text-red-700 hover:bg-red-100/70'
                : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-60'
            }`}
          >
            {permissions.canResetDatabase ? (
              <RotateCcw className="h-4 w-4 text-red-600" />
            ) : (
              <Lock className="h-4 w-4 text-slate-400" />
            )}
            <span>{permissions.canResetDatabase ? 'Reset Demo Data' : 'Reset Locked (Admin Only)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
