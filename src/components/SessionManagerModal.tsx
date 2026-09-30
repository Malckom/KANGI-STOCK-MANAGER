import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  Clock,
  Laptop,
  Globe,
  Lock,
  LogOut,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  KeyRound,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../services/AuthContext';
import { SessionLog } from '../types';

interface SessionManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SessionManagerModal: React.FC<SessionManagerModalProps> = ({ isOpen, onClose }) => {
  const {
    user,
    session,
    sessionLogs,
    lockSession,
    logout,
    updateSessionSettings,
    refreshLogs,
    clearLogs,
  } = useAuth();

  const [activeDuration, setActiveDuration] = useState<string>('0m');
  const [idleTimeout, setIdleTimeout] = useState<number>(session?.idleTimeoutMinutes ?? 30);
  const [autoLock, setAutoLock] = useState<boolean>(session?.autoLockEnabled ?? true);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Live session duration counter
  useEffect(() => {
    if (!session?.loginTimestamp) return;

    const updateDuration = () => {
      const start = new Date(session.loginTimestamp).getTime();
      const now = Date.now();
      const diffMs = Math.max(0, now - start);
      const mins = Math.floor(diffMs / (1000 * 60));
      const hours = Math.floor(mins / 60);
      const remMins = mins % 60;
      const secs = Math.floor((diffMs % (1000 * 60)) / 1000);

      if (hours > 0) {
        setActiveDuration(`${hours}h ${remMins}m ${secs}s`);
      } else {
        setActiveDuration(`${remMins}m ${secs}s`);
      }
    };

    updateDuration();
    const timer = setInterval(updateDuration, 1000);
    return () => clearInterval(timer);
  }, [session?.loginTimestamp]);

  useEffect(() => {
    if (session) {
      setIdleTimeout(session.idleTimeoutMinutes);
      setAutoLock(session.autoLockEnabled);
    }
  }, [session]);

  if (!isOpen) return null;

  const handleSaveSettings = () => {
    updateSessionSettings({
      idleTimeoutMinutes: idleTimeout,
      autoLockEnabled: autoLock,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleLockNow = () => {
    lockSession();
    onClose();
  };

  const handleTerminateSession = async () => {
    onClose();
    await logout();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 overflow-y-auto">
      <div
        id="session-manager-modal"
        className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-8"
      >
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-400">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">Terminal Session & Security</h2>
              <p className="text-xs text-slate-400">Active session telemetry, auto-lock policies & audit history</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Active Session Info Card */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-bold text-emerald-800">
                  Active POS Terminal Session
                </span>
              </div>
              <span className="text-xs font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                ID: {session?.sessionId.slice(0, 16) || 'active-session'}...
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* User info */}
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium mb-1">
                  <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Logged In User</span>
                </div>
                <div className="text-xs font-bold text-slate-900 truncate">{user?.displayName || 'Staff Member'}</div>
                <div className="text-xs text-slate-500 font-semibold mt-0.5">
                  Role: <span className="text-emerald-700">{user?.role}</span>
                </div>
              </div>

              {/* Login Duration */}
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium mb-1">
                  <Clock className="h-3.5 w-3.5 text-blue-600" />
                  <span>Active Session Time</span>
                </div>
                <div className="text-xs font-bold text-slate-900 font-mono">{activeDuration}</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Since: {session?.loginTimestamp ? new Date(session.loginTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                </div>
              </div>

              {/* Device / Client */}
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium mb-1">
                  <Laptop className="h-3.5 w-3.5 text-amber-600" />
                  <span>Terminal Device</span>
                </div>
                <div className="text-xs font-bold text-slate-900 truncate">Web Browser Counter</div>
                <div className="text-xs text-slate-500 truncate mt-0.5">
                  {user?.storeLocation || 'Main Store Branch'}
                </div>
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/80">
              <button
                type="button"
                onClick={handleLockNow}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors shadow-xs"
              >
                <Lock className="h-3.5 w-3.5 text-amber-400" />
                <span>Lock Terminal Screen</span>
              </button>

              <button
                type="button"
                onClick={handleTerminateSession}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out & End Session</span>
              </button>
            </div>
          </div>

          {/* Session Security Policies & Idle Auto-Lock */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <KeyRound className="h-4 w-4 text-emerald-600" />
              <span>Session Inactivity & Lock Policies</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Auto-Lock on Inactivity
                </label>
                <select
                  value={idleTimeout}
                  onChange={(e) => setIdleTimeout(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-medium text-slate-800 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 outline-none"
                >
                  <option value={5}>5 Minutes Inactivity</option>
                  <option value={15}>15 Minutes Inactivity</option>
                  <option value={30}>30 Minutes Inactivity</option>
                  <option value={60}>1 Hour Inactivity</option>
                  <option value={0}>Disabled (Never auto-lock)</option>
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  Automatically protects terminal when counter is unattended.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Auto-Lock Enabled
                </label>
                <div className="flex items-center gap-3 mt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={autoLock}
                      onChange={(e) => setAutoLock(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                    />
                    <span>Require PIN / Password to resume</span>
                  </label>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Locks the screen with blurring until verified.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              {saveSuccess ? (
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Session policies updated successfully!</span>
                </div>
              ) : (
                <div className="text-xs text-slate-400">Settings apply immediately to this terminal</div>
              )}

              <button
                type="button"
                onClick={handleSaveSettings}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-xs"
              >
                Save Preferences
              </button>
            </div>
          </div>

          {/* Audit Logs & Security History */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 text-slate-600" />
                <span>Recent Terminal Session Logs</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={refreshLogs}
                  title="Refresh logs"
                  className="p-1 text-slate-400 hover:text-slate-700 transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={clearLogs}
                  title="Clear history logs"
                  className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/50 overflow-hidden max-h-52 overflow-y-auto">
              {sessionLogs.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  No session logs recorded yet in this browser.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {sessionLogs.slice(0, 15).map((log: SessionLog) => (
                    <div key={log.id} className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-100/60 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                            log.action === 'LOGIN'
                              ? 'bg-emerald-100 text-emerald-800'
                              : log.action === 'LOGOUT'
                              ? 'bg-rose-100 text-rose-800'
                              : log.action === 'LOCK'
                              ? 'bg-amber-100 text-amber-800'
                              : log.action === 'UNLOCK'
                              ? 'bg-blue-100 text-blue-800'
                              : log.action === 'ACCOUNT_CREATED'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-slate-200 text-slate-800'
                          }`}
                        >
                          {log.action}
                        </span>
                        <div>
                          <span className="font-bold text-slate-800">{log.userName}</span>{' '}
                          <span className="text-slate-500 text-xs">({log.details})</span>
                        </div>
                      </div>
                      <span className="text-xs font-mono text-slate-400 shrink-0">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-t border-slate-100 bg-slate-50 px-6 py-3 flex items-center justify-between text-xs text-slate-500">
          <span>Active Device: {session?.deviceInfo || 'Web Terminal POS'}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
