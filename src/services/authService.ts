/**
 * KANGI Stock Manager — Client auth service
 * Talks to the Express + SQLite backend (PIN + email/password login, JWT sessions).
 */
import { UserProfile, UserRole, UserRolePermissions, UserSession, SessionLog } from '../types';
import { getAuthToken, setAuthToken } from './api';

const SESSION_DATA_KEY = 'kangi_active_session';
const SESSION_SETTINGS_KEY = 'kangi_session_settings';
const SESSION_LOGS_KEY = 'kangi_session_logs_cache';

// Display metadata for the four demo staff accounts seeded server-side.
// PINs match what the backend seeds in server/db.ts.
export const DEMO_STAFF_ACCOUNTS = [
  {
    role: 'admin' as UserRole,
    title: 'Store Owner / Admin',
    name: 'James Kangi',
    email: 'admin@kangistock.co.ke',
    phone: '+254 712 345 678',
    pin: '1234',
    description: 'Full access: manage inventory, staff, settings & all reports.',
    color: 'emerald',
    avatar: 'https://images.unsplash.com/photo-1556157382-97eda2d62296?w=150&auto=format&fit=crop&q=80',
  },
  {
    role: 'manager' as UserRole,
    title: 'Store Manager',
    name: 'Grace Wambui',
    email: 'manager@kangistock.co.ke',
    phone: '+254 722 987 654',
    pin: '2222',
    description: 'Operational manager: Can add/delete items to shopping carts, manage CRM, sales & purchases.',
    color: 'blue',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
  },
  {
    role: 'cashier' as UserRole,
    title: 'POS Cashier',
    name: 'Brian Ochieng',
    email: 'cashier@kangistock.co.ke',
    phone: '+254 733 112 233',
    pin: '1111',
    description: 'Point-of-Sale: Can add/delete items to shopping carts, process checkout sales & customer lookups.',
    color: 'amber',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  },
  {
    role: 'clerk' as UserRole,
    title: 'Inventory & Stock Clerk',
    name: 'Faith Wanjiku',
    email: 'clerk@kangistock.co.ke',
    phone: '+254 799 445 566',
    pin: '3333',
    description: 'Stock Clerk: Can add/delete items to shopping carts & record supplier purchase deliveries.',
    color: 'purple',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
  },
];

export function getRolePermissions(role: UserRole): UserRolePermissions {
  switch (role) {
    case 'admin':
      return {
        canAddProduct: true, canEditProduct: true, canDeleteProduct: true, canManageProducts: true,
        canManageCart: true, canProcessSales: true, canRecordPurchases: true, canManageCustomers: true,
        canManageSuppliers: true, canEditSettings: true, canResetDatabase: true, canExportExcel: true,
      };
    case 'manager':
      return {
        canAddProduct: false, canEditProduct: false, canDeleteProduct: false, canManageProducts: false,
        canManageCart: true, canProcessSales: true, canRecordPurchases: true, canManageCustomers: true,
        canManageSuppliers: true, canEditSettings: false, canResetDatabase: false, canExportExcel: true,
      };
    case 'cashier':
      return {
        canAddProduct: false, canEditProduct: false, canDeleteProduct: false, canManageProducts: false,
        canManageCart: true, canProcessSales: true, canRecordPurchases: false, canManageCustomers: true,
        canManageSuppliers: false, canEditSettings: false, canResetDatabase: false, canExportExcel: true,
      };
    case 'clerk':
      return {
        canAddProduct: false, canEditProduct: false, canDeleteProduct: false, canManageProducts: false,
        canManageCart: true, canProcessSales: false, canRecordPurchases: true, canManageCustomers: false,
        canManageSuppliers: true, canEditSettings: false, canResetDatabase: false, canExportExcel: true,
      };
    default:
      return {
        canAddProduct: false, canEditProduct: false, canDeleteProduct: false, canManageProducts: false,
        canManageCart: true, canProcessSales: true, canRecordPurchases: false, canManageCustomers: true,
        canManageSuppliers: false, canEditSettings: false, canResetDatabase: false, canExportExcel: true,
      };
  }
}

async function apiPost(url: string, body: any) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Request failed. Please try again.');
  }
  return data;
}

export class AuthService {
  /** Quick 4-digit staff PIN login — primary till login. */
  static async loginWithPin(pin: string): Promise<UserProfile> {
    const data = await apiPost('/api/auth/login-pin', { pin });
    setAuthToken(data.token);
    AuthService.createSession(data.user);
    AuthService.cacheUser(data.user);
    return data.user;
  }

  /** Email + password login. */
  static async loginWithEmail(email: string, password: string): Promise<UserProfile> {
    const data = await apiPost('/api/auth/login-email', { email, password });
    setAuthToken(data.token);
    AuthService.createSession(data.user);
    AuthService.cacheUser(data.user);
    return data.user;
  }

  /** Registers a new staff member. */
  static async registerWithEmail(
    email: string,
    password: string,
    displayName: string,
    role: UserRole = 'cashier',
    phone?: string,
    pin?: string,
    storeLocation: string = 'Nairobi Main Store'
  ): Promise<UserProfile> {
    const data = await apiPost('/api/auth/register', { email, password, displayName, role, phone, pin, storeLocation });
    setAuthToken(data.token);
    AuthService.createSession(data.user);
    AuthService.cacheUser(data.user);
    AuthService.logSessionEvent('ACCOUNT_CREATED', data.user, `New staff member registered as ${role.toUpperCase()} (${displayName})`);
    return data.user;
  }

  /** Validates the stored token against the backend and returns the current profile, or null if not logged in. */
  static async fetchCurrentUser(): Promise<UserProfile | null> {
    const token = getAuthToken();
    if (!token) return null;
    try {
      const response = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      if (!response.ok || !data.success) {
        setAuthToken(null);
        return null;
      }
      AuthService.cacheUser(data.user);
      return data.user;
    } catch {
      // Network hiccup — fall back to the last cached profile so the till keeps working offline.
      return AuthService.getCachedUser();
    }
  }

  static cacheUser(profile: UserProfile): void {
    try {
      localStorage.setItem('kangi_active_user_session', JSON.stringify(profile));
    } catch {
      // ignore
    }
  }

  static getCachedUser(): UserProfile | null {
    try {
      const cached = localStorage.getItem('kangi_active_user_session');
      return cached ? (JSON.parse(cached) as UserProfile) : null;
    } catch {
      return null;
    }
  }

  static async sendPasswordReset(_email: string): Promise<void> {
    // No email delivery infrastructure on a single-VPS deployment — staff/PIN resets
    // are handled by an admin from Settings > Staff Management instead.
    throw new Error('Self-service password reset isn\u2019t available. Please ask a store admin to reset your PIN or password from Settings.');
  }

  static async logout(): Promise<void> {
    const activeSession = AuthService.getActiveSession();
    if (activeSession) {
      AuthService.logSessionEvent('LOGOUT', {
        uid: activeSession.userId,
        email: activeSession.userEmail,
        displayName: activeSession.userName,
        role: activeSession.role,
        isActive: false,
        createdAt: '',
      }, 'Signed out from terminal session');
    }
    setAuthToken(null);
    localStorage.removeItem('kangi_active_user_session');
    localStorage.removeItem(SESSION_DATA_KEY);
  }

  // =========================================================================
  // SESSION MANAGEMENT (client-side terminal lock/idle-timeout state)
  // =========================================================================
  static createSession(user: UserProfile): UserSession {
    const settings = AuthService.getSessionSettings();
    const session: UserSession = {
      sessionId: `sess-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId: user.uid,
      userEmail: user.email,
      userName: user.displayName,
      role: user.role,
      loginTimestamp: new Date().toISOString(),
      lastActiveTimestamp: new Date().toISOString(),
      deviceInfo: typeof navigator !== 'undefined' ? `${navigator.platform || 'Web Terminal'} (${navigator.userAgent.slice(0, 40)}...)` : 'Web Browser',
      isLocked: false,
      idleTimeoutMinutes: settings.idleTimeoutMinutes,
      autoLockEnabled: settings.autoLockEnabled,
    };
    localStorage.setItem(SESSION_DATA_KEY, JSON.stringify(session));
    return session;
  }

  static getActiveSession(): UserSession | null {
    try {
      const data = localStorage.getItem(SESSION_DATA_KEY);
      return data ? (JSON.parse(data) as UserSession) : null;
    } catch {
      return null;
    }
  }

  static updateSessionActivity(): void {
    const session = AuthService.getActiveSession();
    if (session && !session.isLocked) {
      session.lastActiveTimestamp = new Date().toISOString();
      localStorage.setItem(SESSION_DATA_KEY, JSON.stringify(session));
    }
  }

  static lockSession(): UserSession | null {
    const session = AuthService.getActiveSession();
    if (session) {
      session.isLocked = true;
      localStorage.setItem(SESSION_DATA_KEY, JSON.stringify(session));
      AuthService.logSessionEvent('LOCK', {
        uid: session.userId, email: session.userEmail, displayName: session.userName,
        role: session.role, isActive: true, createdAt: '',
      }, 'Terminal locked by user');
      return session;
    }
    return null;
  }

  /** Unlock terminal session with PIN or Password (checked against the cached profile only — no network round trip needed for a quick unlock). */
  static unlockSession(pinOrPassword: string, currentUser?: UserProfile | null): boolean {
    const session = AuthService.getActiveSession();
    if (!session) return false;

    const input = pinOrPassword.trim();
    const isValidPin = !!currentUser?.pin && input === currentUser.pin;

    if (isValidPin) {
      session.isLocked = false;
      session.lastActiveTimestamp = new Date().toISOString();
      localStorage.setItem(SESSION_DATA_KEY, JSON.stringify(session));
      AuthService.logSessionEvent('UNLOCK', {
        uid: session.userId, email: session.userEmail, displayName: session.userName,
        role: session.role, isActive: true, createdAt: '',
      }, 'Terminal unlocked');
      return true;
    }
    return false;
  }

  static getSessionSettings(): { idleTimeoutMinutes: number; autoLockEnabled: boolean } {
    try {
      const data = localStorage.getItem(SESSION_SETTINGS_KEY);
      if (data) return JSON.parse(data);
    } catch {
      // ignore
    }
    return { idleTimeoutMinutes: 30, autoLockEnabled: true };
  }

  static saveSessionSettings(settings: { idleTimeoutMinutes: number; autoLockEnabled: boolean }): void {
    localStorage.setItem(SESSION_SETTINGS_KEY, JSON.stringify(settings));
    const session = AuthService.getActiveSession();
    if (session) {
      session.idleTimeoutMinutes = settings.idleTimeoutMinutes;
      session.autoLockEnabled = settings.autoLockEnabled;
      localStorage.setItem(SESSION_DATA_KEY, JSON.stringify(session));
    }
  }

  static logSessionEvent(action: SessionLog['action'], user: Partial<UserProfile>, details: string): void {
    const log: SessionLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      timestamp: new Date().toISOString(),
      action,
      userName: user.displayName || 'Staff Member',
      userEmail: user.email || 'unknown@store.co.ke',
      role: user.role || 'cashier',
      details,
    };
    try {
      const existingLogs = AuthService.getSessionLogs();
      const updated = [log, ...existingLogs].slice(0, 50);
      localStorage.setItem(SESSION_LOGS_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
    // Best-effort server-side log too (fire and forget — server also logs logins/registrations itself).
  }

  static getSessionLogs(): SessionLog[] {
    try {
      const data = localStorage.getItem(SESSION_LOGS_KEY);
      return data ? (JSON.parse(data) as SessionLog[]) : [];
    } catch {
      return [];
    }
  }

  static clearSessionLogs(): void {
    localStorage.removeItem(SESSION_LOGS_KEY);
  }
}
