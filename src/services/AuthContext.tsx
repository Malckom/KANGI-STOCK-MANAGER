import React, { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { AuthService, getRolePermissions, DEMO_STAFF_ACCOUNTS } from './authService';
import { setUnauthorizedHandler } from './api';
import { UserProfile, UserRole, UserRolePermissions, UserSession, SessionLog } from '../types';

interface AuthContextType {
  user: UserProfile | null;
  session: UserSession | null;
  isLocked: boolean;
  sessionLogs: SessionLog[];
  loading: boolean;
  error: string | null;
  permissions: UserRolePermissions;
  isAuthenticated: boolean;
  isAuthModalOpen: boolean;
  authModalMode: 'signin' | 'pin' | 'signup' | 'forgot';
  isSessionModalOpen: boolean;
  openAuthModal: (mode?: 'signin' | 'pin' | 'signup' | 'forgot') => void;
  closeAuthModal: () => void;
  openSessionModal: () => void;
  closeSessionModal: () => void;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  loginWithPin: (pin: string) => Promise<void>;
  registerWithEmail: (
    email: string,
    pass: string,
    displayName: string,
    role?: UserRole,
    phone?: string,
    pin?: string,
    storeLocation?: string
  ) => Promise<void>;
  loginWithDemoRole: (role: UserRole) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  lockSession: () => void;
  unlockSession: (pinOrPassword: string) => boolean;
  updateSessionSettings: (settings: { idleTimeoutMinutes: number; autoLockEnabled: boolean }) => void;
  refreshLogs: () => void;
  clearLogs: () => void;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<UserSession | null>(() => AuthService.getActiveSession());
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    const s = AuthService.getActiveSession();
    return s?.isLocked || false;
  });
  const [sessionLogs, setSessionLogs] = useState<SessionLog[]>(() => AuthService.getSessionLogs());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'pin' | 'signup' | 'forgot'>('signin');
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);

  const lastActivityRef = useRef<number>(Date.now());

  // Initial hydration: validate any stored token against the backend; if none
  // (or it's expired), auto sign-in as the demo Store Owner so the till is
  // usable immediately, same as before.
  useEffect(() => {
    let mounted = true;

    const forceLogout = () => {
      if (!mounted) return;
      setUser(null);
      setSession(null);
      setIsLocked(false);
    };
    setUnauthorizedHandler(forceLogout);

    (async () => {
      try {
        const existing = await AuthService.fetchCurrentUser();
        if (existing) {
          if (mounted) {
            setUser(existing);
            const currentSess = AuthService.getActiveSession() || AuthService.createSession(existing);
            setSession(currentSess);
            setIsLocked(currentSess.isLocked);
          }
        } else {
          // No valid session yet — sign in as the default demo admin account.
          const profile = await AuthService.loginWithPin(DEMO_STAFF_ACCOUNTS[0].pin);
          if (mounted) {
            setUser(profile);
            const newSess = AuthService.getActiveSession();
            setSession(newSess);
            setIsLocked(false);
          }
        }
      } catch (err) {
        console.warn('Could not establish an initial session:', err);
      } finally {
        if (mounted) {
          setLoading(false);
          setSessionLogs(AuthService.getSessionLogs());
        }
      }
    })();

    return () => {
      mounted = false;
      setUnauthorizedHandler(null);
    };
  }, []);

  // Idle Activity Tracking & Auto-Lock Listener
  useEffect(() => {
    const handleUserActivity = () => {
      lastActivityRef.current = Date.now();
      AuthService.updateSessionActivity();
    };

    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll'];
    let throttleTimeout: NodeJS.Timeout | null = null;

    const throttledHandler = () => {
      if (!throttleTimeout) {
        throttleTimeout = setTimeout(() => {
          handleUserActivity();
          throttleTimeout = null;
        }, 3000);
      }
    };

    events.forEach((ev) => window.addEventListener(ev, throttledHandler, { passive: true }));

    const interval = setInterval(() => {
      const sess = AuthService.getActiveSession();
      if (sess && !sess.isLocked && sess.autoLockEnabled && sess.idleTimeoutMinutes > 0) {
        const idleMs = Date.now() - lastActivityRef.current;
        const maxIdleMs = sess.idleTimeoutMinutes * 60 * 1000;
        if (idleMs >= maxIdleMs) {
          const lockedSess = AuthService.lockSession();
          if (lockedSess) {
            setSession(lockedSess);
            setIsLocked(true);
            setSessionLogs(AuthService.getSessionLogs());
          }
        }
      }
    }, 15000);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, throttledHandler));
      clearInterval(interval);
      if (throttleTimeout) clearTimeout(throttleTimeout);
    };
  }, []);

  const permissions = useMemo(() => {
    const role = user?.role || 'admin';
    return getRolePermissions(role);
  }, [user?.role]);

  const openAuthModal = useCallback((mode: 'signin' | 'pin' | 'signup' | 'forgot' = 'signin') => {
    setAuthModalMode(mode);
    setError(null);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
    setError(null);
  }, []);

  const openSessionModal = useCallback(() => {
    setSessionLogs(AuthService.getSessionLogs());
    setIsSessionModalOpen(true);
  }, []);

  const closeSessionModal = useCallback(() => {
    setIsSessionModalOpen(false);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const refreshLogs = useCallback(() => {
    setSessionLogs(AuthService.getSessionLogs());
  }, []);

  const clearLogs = useCallback(() => {
    AuthService.clearSessionLogs();
    setSessionLogs([]);
  }, []);

  const loginWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    setError(null);
    try {
      const profile = await AuthService.loginWithEmail(email, pass);
      setUser(profile);
      setSession(AuthService.getActiveSession());
      setIsLocked(false);
      setIsAuthModalOpen(false);
      setSessionLogs(AuthService.getSessionLogs());
    } catch (err: any) {
      const msg = err?.message || 'Failed to sign in. Please check your email and password.';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const loginWithPin = async (pin: string) => {
    setLoading(true);
    setError(null);
    try {
      const profile = await AuthService.loginWithPin(pin);
      setUser(profile);
      setSession(AuthService.getActiveSession());
      setIsLocked(false);
      setIsAuthModalOpen(false);
      setSessionLogs(AuthService.getSessionLogs());
    } catch (err: any) {
      const msg = err?.message || 'Invalid staff PIN code.';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const registerWithEmail = async (
    email: string,
    pass: string,
    displayName: string,
    role: UserRole = 'cashier',
    phone?: string,
    pin?: string,
    storeLocation?: string
  ) => {
    setLoading(true);
    setError(null);
    try {
      const profile = await AuthService.registerWithEmail(email, pass, displayName, role, phone, pin, storeLocation);
      setUser(profile);
      setSession(AuthService.getActiveSession());
      setIsLocked(false);
      setIsAuthModalOpen(false);
      setSessionLogs(AuthService.getSessionLogs());
    } catch (err: any) {
      const msg = err?.message || 'Failed to create account.';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const loginWithDemoRole = async (role: UserRole) => {
    setLoading(true);
    setError(null);
    try {
      const staffMeta = DEMO_STAFF_ACCOUNTS.find((s) => s.role === role) || DEMO_STAFF_ACCOUNTS[0];
      const profile = await AuthService.loginWithPin(staffMeta.pin);
      setUser(profile);
      setSession(AuthService.getActiveSession());
      setIsLocked(false);
      setIsAuthModalOpen(false);
      setSessionLogs(AuthService.getSessionLogs());
    } catch (err: any) {
      setError('Could not switch demo role.');
    } finally {
      setLoading(false);
    }
  };

  const sendPasswordReset = async (email: string) => {
    setError(null);
    try {
      await AuthService.sendPasswordReset(email);
    } catch (err: any) {
      const msg = err?.message || 'Failed to send password reset email.';
      setError(msg);
      throw new Error(msg);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await AuthService.logout();
      setUser(null);
      setSession(null);
      setIsLocked(false);
      setSessionLogs(AuthService.getSessionLogs());
    } finally {
      setLoading(false);
    }
  };

  const lockSession = () => {
    const locked = AuthService.lockSession();
    if (locked) {
      setSession(locked);
      setIsLocked(true);
      setSessionLogs(AuthService.getSessionLogs());
    }
  };

  const unlockSession = (pinOrPassword: string): boolean => {
    const success = AuthService.unlockSession(pinOrPassword, user);
    if (success) {
      setSession(AuthService.getActiveSession());
      setIsLocked(false);
      lastActivityRef.current = Date.now();
      setSessionLogs(AuthService.getSessionLogs());
      return true;
    }
    return false;
  };

  const updateSessionSettings = (settings: { idleTimeoutMinutes: number; autoLockEnabled: boolean }) => {
    AuthService.saveSessionSettings(settings);
    setSession(AuthService.getActiveSession());
  };

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    const updated: UserProfile = { ...user, ...data };
    setUser(updated);
    AuthService.cacheUser(updated);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLocked,
        sessionLogs,
        loading,
        error,
        permissions,
        isAuthenticated: !!user,
        isAuthModalOpen,
        authModalMode,
        isSessionModalOpen,
        openAuthModal,
        closeAuthModal,
        openSessionModal,
        closeSessionModal,
        loginWithEmail,
        loginWithPin,
        registerWithEmail,
        loginWithDemoRole,
        sendPasswordReset,
        logout,
        lockSession,
        unlockSession,
        updateSessionSettings,
        refreshLogs,
        clearLogs,
        updateUserProfile,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
