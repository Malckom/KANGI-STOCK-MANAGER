import React, { useState } from 'react';
import {
  Lock,
  KeyRound,
  ShieldCheck,
  LogOut,
  AlertCircle,
  Delete,
  RotateCcw,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../services/AuthContext';
import { DEMO_STAFF_ACCOUNTS } from '../services/authService';

export const LockScreen: React.FC = () => {
  const { user, isLocked, unlockSession, logout, openAuthModal } = useAuth();
  const [pinOrPass, setPinOrPass] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);

  if (!isLocked) return null;

  const handleUnlock = (e?: React.FormEvent, customInput?: string) => {
    if (e) e.preventDefault();
    const inputToVerify = customInput || pinOrPass;
    if (!inputToVerify.trim()) return;

    setIsUnlocking(true);
    setErrorMsg(null);

    const success = unlockSession(inputToVerify);
    if (success) {
      setPinOrPass('');
    } else {
      setErrorMsg('Incorrect PIN or Password. Please try again.');
    }
    setIsUnlocking(false);
  };

  const handlePinDigit = (digit: string) => {
    if (pinOrPass.length >= 8) return;
    const next = pinOrPass + digit;
    setPinOrPass(next);
    if (next.length === 4) {
      handleUnlock(undefined, next);
    }
  };

  const handlePinBackspace = () => {
    setPinOrPass((prev) => prev.slice(0, -1));
  };

  const handlePinClear = () => {
    setPinOrPass('');
    setErrorMsg(null);
  };

  const handleSwitchUser = async () => {
    await logout();
    openAuthModal('signin');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85">
      <div
        id="terminal-lock-screen"
        className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 sm:p-8 text-white text-center space-y-5 animate-fadeIn"
      >
        {/* Lock Icon & Avatar */}
        <div className="relative inline-block mx-auto">
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName}
              className="h-20 w-20 rounded-full object-cover border-4 border-amber-500/40 shadow-xl"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="h-20 w-20 rounded-full bg-amber-600/20 border-4 border-amber-500/40 flex items-center justify-center text-2xl font-bold text-amber-400">
              {user?.displayName ? user.displayName[0].toUpperCase() : 'K'}
            </div>
          )}
          <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-amber-600 border-2 border-slate-900 flex items-center justify-center text-white shadow-md">
            <Lock className="h-3.5 w-3.5" />
          </div>
        </div>

        {/* User Identity */}
        <div>
          <h2 className="text-lg font-bold text-white">{user?.displayName || 'Active Staff Member'}</h2>
          <div className="inline-flex items-center gap-1.5 mt-1 px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-xs font-semibold text-amber-400">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
            <span className="uppercase">{user?.role || 'cashier'} TERMINAL LOCKED</span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Enter your 4-digit Staff PIN or Password to unlock session
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="flex items-center justify-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/30 p-2.5 text-xs text-rose-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* PIN Indicators */}
        <div className="flex items-center justify-center gap-3">
          {[0, 1, 2, 3].map((index) => {
            const filled = pinOrPass.length > index;
            return (
              <div
                key={index}
                className={`h-11 w-11 rounded-xl border flex items-center justify-center text-lg font-bold transition-colors ${
                  filled
                    ? 'border-amber-400 bg-amber-500/20 text-amber-300 shadow-sm'
                    : 'border-slate-700 bg-slate-800/60 text-slate-600'
                }`}
              >
                {filled ? '●' : '○'}
              </div>
            );
          })}
        </div>

        {/* Form and keypad */}
        <form onSubmit={handleUnlock} className="space-y-4">
          <input
            type="password"
            autoFocus
            value={pinOrPass}
            onChange={(e) => {
              const val = e.target.value;
              setPinOrPass(val);
              if (val.length === 4 && /^\d+$/.test(val)) {
                handleUnlock(undefined, val);
              }
            }}
            placeholder="Type PIN or password"
            className="w-full text-center text-sm font-bold py-2.5 px-4 rounded-xl border border-slate-700 bg-slate-800 text-white placeholder:text-slate-500 placeholder:tracking-normal focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none"
          />

          {/* Onscreen Keypad */}
          <div className="grid grid-cols-3 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handlePinDigit(num)}
                className="h-11 rounded-xl border border-slate-800 bg-slate-800/80 hover:bg-slate-700 text-sm font-bold text-white transition-colors"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={handlePinClear}
              className="h-11 rounded-xl border border-slate-800 bg-slate-800/40 hover:bg-rose-900/30 text-xs font-bold text-slate-400 hover:text-rose-300 transition-colors flex items-center justify-center gap-1"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Clear</span>
            </button>
            <button
              type="button"
              onClick={() => handlePinDigit('0')}
              className="h-11 rounded-xl border border-slate-800 bg-slate-800/80 hover:bg-slate-700 text-sm font-bold text-white transition-colors"
            >
              0
            </button>
            <button
              type="button"
              onClick={handlePinBackspace}
              className="h-11 rounded-xl border border-slate-800 bg-slate-800/40 hover:bg-amber-900/30 text-xs font-bold text-slate-400 hover:text-amber-300 transition-colors flex items-center justify-center"
            >
              <Delete className="h-4 w-4" />
            </button>
          </div>

          <button
            type="submit"
            disabled={isUnlocking || pinOrPass.length === 0}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-500 py-3 text-xs font-bold text-white shadow-lg transition-colors disabled:opacity-50"
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Unlock Terminal</span>
          </button>
        </form>

        {/* Quick Demo PIN helper */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <span className="text-xs">
            Default Staff PIN: <strong className="text-amber-400 font-mono">{user?.pin || '1234'}</strong>
          </span>
          <button
            type="button"
            onClick={handleSwitchUser}
            className="inline-flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Switch Staff</span>
          </button>
        </div>
      </div>
    </div>
  );
};
