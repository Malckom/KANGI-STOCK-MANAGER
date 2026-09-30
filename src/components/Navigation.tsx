import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard,
  Package,
  TrendingUp,
  Truck,
  ShoppingCart,
  Building2,
  Users,
  CalendarClock,
  BarChart3,
  Settings,
  Plus,
  Menu,
  X,
  Database,
  RefreshCw,
  FileSpreadsheet,
  LogIn,
  LogOut,
  UserCheck,
  Shield,
  ChevronDown,
  User,
  UserPlus,
  Sparkles,
  KeyRound,
  Lock,
  Activity,
} from 'lucide-react';
import { NavView, AppSettings, UserRole } from '../types';
import { useAuth } from '../services/AuthContext';
import { DEMO_STAFF_ACCOUNTS } from '../services/authService';

interface NavigationProps {
  currentView: NavView;
  onNavigate: (view: NavView) => void;
  lowStockCount: number;
  overdueFollowUpsCount: number;
  shoppingListCount: number;
  businessSettings?: AppSettings;
  isDbConnected?: boolean;
  isSyncing?: boolean;
  onManualSync?: () => void;
  onOpenQuickSale?: () => void;
  onOpenQuickFollowUp?: () => void;
  onOpenExcelExport?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentView,
  onNavigate,
  lowStockCount,
  overdueFollowUpsCount,
  shoppingListCount,
  businessSettings,
  isDbConnected = true,
  isSyncing = false,
  onManualSync,
  onOpenQuickSale,
  onOpenQuickFollowUp,
  onOpenExcelExport,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const {
    user,
    isAuthenticated,
    openAuthModal,
    openSessionModal,
    lockSession,
    logout,
    loginWithDemoRole,
  } = useAuth();

  // Close user dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleStyle = (role?: UserRole) => {
    switch (role) {
      case 'admin':
        return { label: 'Store Owner', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
      case 'manager':
        return { label: 'Store Manager', bg: 'bg-blue-500/20 text-blue-300 border-blue-500/40' };
      case 'cashier':
        return { label: 'POS Cashier', bg: 'bg-amber-600/20 text-amber-300 border-amber-500/40' };
      case 'clerk':
        return { label: 'Stock Clerk', bg: 'bg-purple-500/20 text-purple-300 border-purple-500/40' };
      default:
        return { label: 'Staff Member', bg: 'bg-slate-500/20 text-slate-300 border-slate-500/40' };
    }
  };

  const roleMeta = getRoleStyle(user?.role);

  const navItems = [
    { id: 'dashboard' as NavView, label: 'Dashboard', icon: LayoutDashboard },
    {
      id: 'inventory' as NavView,
      label: 'Inventory',
      icon: Package,
      badge: lowStockCount > 0 ? `${lowStockCount}` : undefined,
      badgeColor: 'bg-amber-600 text-white',
    },
    { id: 'sales' as NavView, label: 'Sales & POS', icon: TrendingUp },
    { id: 'purchases' as NavView, label: 'Purchases', icon: Truck },
    {
      id: 'shopping-list' as NavView,
      label: 'Shopping Cart',
      icon: ShoppingCart,
      badge: shoppingListCount > 0 ? `${shoppingListCount}` : undefined,
      badgeColor: 'bg-rose-500 text-white',
    },
    { id: 'suppliers' as NavView, label: 'Suppliers', icon: Building2 },
    { id: 'customers' as NavView, label: 'Customers & CRM', icon: Users },
    {
      id: 'follow-ups' as NavView,
      label: 'Follow-ups',
      icon: CalendarClock,
      badge: overdueFollowUpsCount > 0 ? `${overdueFollowUpsCount}` : undefined,
      badgeColor: 'bg-red-600 text-white',
    },
    { id: 'reports' as NavView, label: 'Financial Reports', icon: BarChart3 },
    { id: 'settings' as NavView, label: 'Settings & Staff', icon: Settings },
  ];

  const handleNavClick = (view: NavView) => {
    onNavigate(view);
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
  };

  return (
    <>
      {/* Top Navbar for Mobile & Small Tablets */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-slate-900 px-3 py-2.5 text-white shadow-md lg:hidden">
        <div className="flex items-center gap-2">
          <button
            id="btn-mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-300 transition-colors hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
          <button
            onClick={() => handleNavClick('dashboard')}
            className="flex items-center text-left focus:outline-none"
          >
            <span className="text-lg font-black text-amber-400">KANGI</span>
            <span className="ml-1.5 text-xs font-semibold text-slate-400">
              Stock
            </span>
          </button>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2">
          {/* User Profile / Auth Action */}
          {user ? (
            <button
              onClick={() => openAuthModal('signin')}
              className="flex items-center gap-1.5 rounded-full bg-slate-800 border border-slate-700 p-1 pr-2.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors"
            >
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName}
                  className="h-6 w-6 rounded-full object-cover border border-slate-600"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                  {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
              <span className="hidden sm:inline text-xs font-bold text-emerald-400">
                {roleMeta.label}
              </span>
            </button>
          ) : (
            <button
              onClick={() => openAuthModal('signin')}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-500"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Login</span>
            </button>
          )}

          {/* Excel Export Button */}
          {onOpenExcelExport && (
            <button
              onClick={onOpenExcelExport}
              title="Generate Excel Spreadsheet (.xlsx)"
              className="flex h-9 items-center gap-1.5 rounded-full bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 px-2.5 text-xs font-bold transition-colors hover:bg-emerald-600/30"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Excel</span>
            </button>
          )}

          {/* Quick Sale Mobile Button */}
          {onOpenQuickSale && (
            <button
              id="btn-mobile-quick-sale"
              onClick={onOpenQuickSale}
              className="flex min-h-[38px] items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <Plus className="h-4 w-4" />
              <span>Sale</span>
            </button>
          )}
        </div>
      </header>

      {/* Desktop Sidebar Navigation */}
      <aside className="hidden w-64 flex-col border-r border-slate-800 bg-slate-900 text-slate-300 lg:flex shrink-0 min-h-screen">
        {/* Brand Header */}
        <div className="flex items-center gap-3 border-b border-slate-800 px-4 py-3.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-600 text-white font-black text-xl shadow-lg">
            K
          </div>
          <div className="overflow-hidden flex-1">
            <h1 className="text-sm font-black text-white truncate">KANGI STOCK</h1>
            <p className="text-xs text-slate-400 truncate max-w-[150px]">
              {businessSettings?.businessName || 'Hardware & Electrical'}
            </p>
          </div>
        </div>

        {/* User Account & Role Dropdown Card */}
        <div className="p-3 border-b border-slate-800 relative" ref={userMenuRef}>
          {user ? (
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex w-full items-center justify-between p-2 rounded-xl bg-slate-800/80 border border-slate-700/80 hover:bg-slate-800 transition-colors text-left group"
            >
              <div className="flex items-center gap-2.5 overflow-hidden">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName}
                    className="h-8 w-8 rounded-full object-cover border border-slate-600 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white shrink-0">
                    {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
                <div className="overflow-hidden">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white truncate">
                      {user.displayName || 'Store Staff'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className={`px-1.5 py-0.2 rounded text-xs font-bold border ${roleMeta.bg}`}>
                      {roleMeta.label}
                    </span>
                  </div>
                </div>
              </div>
              <ChevronDown className={`h-4 w-4 text-slate-400 group-hover:text-white transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
            </button>
          ) : (
            <button
              onClick={() => openAuthModal('signin')}
              className="flex w-full items-center justify-center gap-2 p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shadow-md"
            >
              <LogIn className="h-4 w-4" />
              <span>Sign In / Create Account</span>
            </button>
          )}

          {/* User Account Dropdown Popover */}
          {userMenuOpen && (
            <div className="absolute left-3 right-3 top-16 z-50 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl p-2.5 space-y-2 animate-fadeIn text-xs">
              <div className="px-2 py-1.5 border-b border-slate-800">
                <div className="font-bold text-white">{user?.displayName}</div>
                <div className="text-xs text-slate-400 truncate">{user?.email}</div>
                <div className="text-xs text-emerald-400 font-medium mt-0.5">
                  PIN: <span className="font-mono">{user?.pin || '1234'}</span> • {user?.storeLocation || 'Main Store'}
                </div>
              </div>

              {/* Session controls */}
              <div className="space-y-1">
                <button
                  onClick={() => {
                    lockSession();
                    setUserMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-2 py-1.5 rounded-lg text-amber-300 hover:bg-slate-800 transition-colors font-medium"
                >
                  <Lock className="h-3.5 w-3.5 text-amber-400" />
                  <span>Lock Terminal Session</span>
                </button>

                <button
                  onClick={() => {
                    openSessionModal();
                    setUserMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-2 py-1.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                >
                  <Activity className="h-3.5 w-3.5 text-blue-400" />
                  <span>Session Telemetry & Logs</span>
                </button>
              </div>

              {/* Quick Role Switcher */}
              <div className="space-y-1 pt-1 border-t border-slate-800">
                <div className="px-2 py-0.5 text-xs font-bold text-slate-400 flex items-center justify-between">
                  <span>Switch Staff Role</span>
                  <Sparkles className="h-3 w-3 text-amber-400" />
                </div>
                {DEMO_STAFF_ACCOUNTS.map((staff) => {
                  const isActive = user?.role === staff.role && user?.email === staff.email;
                  return (
                    <button
                      key={staff.role}
                      onClick={() => {
                        loginWithDemoRole(staff.role);
                        setUserMenuOpen(false);
                      }}
                      className={`flex w-full items-center justify-between px-2 py-1.5 rounded-lg text-left transition-colors ${
                        isActive
                          ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            staff.role === 'admin'
                              ? 'bg-emerald-400'
                              : staff.role === 'manager'
                              ? 'bg-blue-400'
                              : staff.role === 'cashier'
                              ? 'bg-amber-400'
                              : 'bg-purple-400'
                          }`}
                        />
                        <span>{staff.title}</span>
                      </div>
                      {isActive && <UserCheck className="h-3.5 w-3.5 text-emerald-400" />}
                    </button>
                  );
                })}
              </div>

              <div className="pt-1 border-t border-slate-800 space-y-1">
                <button
                  onClick={() => {
                    openAuthModal('pin');
                    setUserMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-2 py-1.5 rounded-lg text-emerald-300 hover:bg-slate-800 hover:text-emerald-200 transition-colors font-semibold"
                >
                  <KeyRound className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Login with Staff PIN</span>
                </button>
                <button
                  onClick={() => {
                    openAuthModal('signup');
                    setUserMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-2 py-1.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                >
                  <UserPlus className="h-3.5 w-3.5 text-slate-400" />
                  <span>Create New Account</span>
                </button>
                <button
                  onClick={() => {
                    openAuthModal('signin');
                    setUserMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-2 py-1.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                >
                  <LogIn className="h-3.5 w-3.5 text-slate-400" />
                  <span>Login with Email / Password</span>
                </button>
                <button
                  onClick={() => {
                    logout();
                    setUserMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-2 py-1.5 rounded-lg text-rose-400 hover:bg-rose-950/40 transition-colors font-medium"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign Out (Logout)</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quick Action Buttons */}
        <div className="p-3 grid grid-cols-2 gap-2 border-b border-slate-800">
          <button
            id="btn-sidebar-quick-sale"
            onClick={onOpenQuickSale}
            className="flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-2.5 py-2 text-xs font-bold text-white shadow transition-colors hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <Plus className="h-4 w-4" />
            <span>New Sale</span>
          </button>
          <button
            id="btn-sidebar-quick-followup"
            onClick={onOpenQuickFollowUp}
            className="flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl bg-amber-600 px-2.5 py-2 text-xs font-bold text-white shadow transition-colors hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            <Plus className="h-4 w-4" />
            <span>Follow-up</span>
          </button>
        </div>

        {/* Navigation Items Links */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                id={`nav-link-${item.id}`}
                onClick={() => handleNavClick(item.id)}
                className={`group flex min-h-[42px] w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-amber-600 font-semibold text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`h-5 w-5 transition-colors ${
                      isActive ? 'text-slate-950' : 'text-slate-400 group-hover:text-amber-400'
                    }`}
                  />
                  <span className="whitespace-nowrap">{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                      isActive ? 'bg-slate-900 text-amber-400' : item.badgeColor
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Excel Generator Quick Launcher */}
        {onOpenExcelExport && (
          <div className="px-3 pb-2">
            <button
              onClick={onOpenExcelExport}
              className="flex min-h-[42px] w-full items-center justify-between rounded-xl bg-emerald-950/60 border border-emerald-500/30 px-3 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-900/50 hover:text-white transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
                <span>Excel Spreadsheet Hub</span>
              </div>
              <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-xs text-emerald-300 font-mono">
                .xlsx
              </span>
            </button>
          </div>
        )}

        {/* Database & System Connection Footer */}
        <div className="border-t border-slate-800 p-3.5 text-xs text-slate-400">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${isDbConnected ? 'bg-emerald-400' : 'bg-rose-400'}`} />
              <span className="text-xs text-slate-300 font-medium">Backend</span>
            </div>
            {onManualSync && (
              <button
                onClick={onManualSync}
                disabled={isSyncing}
                title="Sync with backend database"
                className="flex items-center gap-1 rounded-lg bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin text-amber-400' : ''}`} />
                <span>{isSyncing ? 'Syncing' : 'Sync'}</span>
              </button>
            )}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Currency: KES (KSh)</span>
            <span className="font-mono text-amber-400/90">SQLite</span>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/70 transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-slate-300 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-600 text-white font-black text-lg">
                  K
                </div>
                <div>
                  <h2 className="font-bold text-white leading-tight">KANGI Stock</h2>
                  <p className="text-xs text-slate-400">Hardware & Electrical POS</p>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Mobile User Profile Section */}
            <div className="p-3 border-b border-slate-800 bg-slate-950/40">
              {user ? (
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName}
                        className="h-8 w-8 rounded-full object-cover border border-slate-700"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                        {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                      </div>
                    )}
                    <div>
                      <div className="text-xs font-bold text-white">{user.displayName || 'Store Staff'}</div>
                      <div className="text-xs text-emerald-400">{roleMeta.label}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        lockSession();
                      }}
                      title="Lock Terminal"
                      className="p-1.5 rounded-lg bg-slate-800 text-amber-400 hover:bg-slate-700"
                    >
                      <Lock className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        openAuthModal('signin');
                      }}
                      className="rounded-lg bg-slate-800 px-2 py-1 text-xs font-bold text-slate-200 hover:bg-slate-700"
                    >
                      Switch
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    openAuthModal('signin');
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 p-2 text-xs font-bold text-white"
                >
                  <LogIn className="h-4 w-4" />
                  <span>Sign In / Create Account</span>
                </button>
              )}
            </div>

            <div className="p-3 grid grid-cols-2 gap-2 border-b border-slate-800">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenQuickSale?.();
                }}
                className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-2 py-2 text-xs font-bold text-white shadow hover:bg-emerald-500"
              >
                <Plus className="h-4 w-4" />
                <span>New Sale</span>
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenQuickFollowUp?.();
                }}
                className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-amber-600 px-2 py-2 text-xs font-bold text-white shadow hover:bg-amber-700"
              >
                <Plus className="h-4 w-4" />
                <span>Follow-up</span>
              </button>
            </div>

            <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-3">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`flex min-h-[44px] w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-amber-600 font-semibold text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`h-5 w-5 ${
                          isActive ? 'text-slate-950' : 'text-slate-400'
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          isActive ? 'bg-slate-900 text-amber-400' : item.badgeColor
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {onOpenExcelExport && (
              <div className="p-3 border-t border-slate-800">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenExcelExport();
                  }}
                  className="flex min-h-[44px] w-full items-center justify-between rounded-xl bg-emerald-600 px-3.5 py-2.5 text-xs font-bold text-white shadow-md transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>Excel Spreadsheet Hub</span>
                  </div>
                  <span className="rounded bg-emerald-800 px-2 py-0.5 text-xs font-mono">
                    .xlsx
                  </span>
                </button>
              </div>
            )}

            <div className="border-t border-slate-800 p-3 bg-slate-950/40 flex items-center justify-between text-xs text-slate-400">
              <span>Database: Connected</span>
              <span className="text-emerald-400">Online</span>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-slate-200 bg-white/95 py-1 px-1 shadow-lg lg:hidden">
        <button
          onClick={() => handleNavClick('dashboard')}
          className={`flex min-h-[48px] flex-1 flex-col items-center justify-center py-1 px-1 text-xs font-medium transition-colors ${
            currentView === 'dashboard' ? 'text-amber-600 font-bold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <LayoutDashboard className="h-5 w-5 mb-0.5" />
          <span>Home</span>
        </button>

        <button
          onClick={() => handleNavClick('inventory')}
          className={`flex min-h-[48px] flex-1 flex-col items-center justify-center py-1 px-1 text-xs font-medium relative transition-colors ${
            currentView === 'inventory' ? 'text-amber-600 font-bold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Package className="h-5 w-5 mb-0.5" />
          <span>Stock</span>
          {lowStockCount > 0 && (
            <span className="absolute top-1.5 right-3 h-2 w-2 rounded-full bg-amber-600" />
          )}
        </button>

        <button
          onClick={() => handleNavClick('sales')}
          className={`flex min-h-[48px] flex-1 flex-col items-center justify-center py-1 px-1 text-xs font-medium transition-colors ${
            currentView === 'sales' ? 'text-amber-600 font-bold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <TrendingUp className="h-5 w-5 mb-0.5" />
          <span>Sales</span>
        </button>

        <button
          onClick={() => handleNavClick('shopping-list')}
          className={`flex min-h-[48px] flex-1 flex-col items-center justify-center py-1 px-1 text-xs font-medium relative transition-colors ${
            currentView === 'shopping-list' ? 'text-amber-600 font-bold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShoppingCart className="h-5 w-5 mb-0.5" />
          <span>Cart</span>
          {shoppingListCount > 0 && (
            <span className="absolute top-1 right-3 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-xs font-bold text-white">
              {shoppingListCount}
            </span>
          )}
        </button>

        <button
          onClick={() => handleNavClick('follow-ups')}
          className={`flex min-h-[48px] flex-1 flex-col items-center justify-center py-1 px-1 text-xs font-medium relative transition-colors ${
            currentView === 'follow-ups' ? 'text-amber-600 font-bold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CalendarClock className="h-5 w-5 mb-0.5" />
          <span>Follow-up</span>
          {overdueFollowUpsCount > 0 && (
            <span className="absolute top-1 right-3 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
              !
            </span>
          )}
        </button>

        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex min-h-[48px] flex-1 flex-col items-center justify-center py-1 px-1 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          <Menu className="h-5 w-5 mb-0.5" />
          <span>More</span>
        </button>
      </nav>
    </>
  );
};

