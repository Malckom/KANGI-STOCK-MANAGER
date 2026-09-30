import React, { useState } from 'react';
import {
  X,
  Mail,
  Lock,
  User,
  Phone,
  ShieldCheck,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Store,
  KeyRound,
  Delete,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '../services/AuthContext';
import { DEMO_STAFF_ACCOUNTS } from '../services/authService';
import { UserRole } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const {
    user,
    loading,
    error,
    authModalMode,
    openAuthModal,
    loginWithEmail,
    loginWithPin,
    registerWithEmail,
    loginWithDemoRole,
    sendPasswordReset,
    clearError,
  } = useAuth();

  // Form states
  const [pin, setPin] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [staffPin, setStaffPin] = useState('1234');
  const [storeLocation, setStoreLocation] = useState('Nairobi Main Store');
  const [role, setRole] = useState<UserRole>('cashier');
  const [showPassword, setShowPassword] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setSubmitting(true);
    try {
      await loginWithEmail(email, password);
      onClose();
    } catch {
      // Error handled in context
    } finally {
      setSubmitting(false);
    }
  };

  const handlePinSignIn = async (e?: React.FormEvent, customPin?: string) => {
    if (e) e.preventDefault();
    const pinToSubmit = customPin || pin;
    if (!pinToSubmit || pinToSubmit.trim().length === 0) return;
    setSubmitting(true);
    try {
      await loginWithPin(pinToSubmit);
      setPin('');
      onClose();
    } catch {
      // Error handled in context
    } finally {
      setSubmitting(false);
    }
  };

  const handlePinDigit = (digit: string) => {
    if (pin.length >= 6) return;
    const newPin = pin + digit;
    setPin(newPin);
    if (newPin.length === 4) {
      // Auto-submit 4-digit PIN for rapid cashier/staff login
      handlePinSignIn(undefined, newPin);
    }
  };

  const handlePinBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const handlePinClear = () => {
    setPin('');
    clearError();
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !displayName) return;
    setSubmitting(true);
    try {
      await registerWithEmail(email, password, displayName, role, phone);
      onClose();
    } catch {
      // Error handled in context
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    setResetSuccessMessage(null);
    try {
      await sendPasswordReset(email);
      setResetSuccessMessage(
        `A password reset link has been dispatched to ${email}. Please check your inbox.`
      );
    } catch {
      // Error handled in context
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoSwitch = async (targetRole: UserRole) => {
    setSubmitting(true);
    try {
      await loginWithDemoRole(targetRole);
      onClose();
    } catch {
      // Error handled
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 overflow-y-auto">
      <div
        id="auth-modal-card"
        className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-8"
      >
        {/* Header Bar */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-400">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">
                {authModalMode === 'pin' && 'Quick Staff PIN Login'}
                {authModalMode === 'signin' && 'Sign in with Email'}
                {authModalMode === 'signup' && 'Register New Staff Member'}
                {authModalMode === 'forgot' && 'Reset Store Password'}
              </h2>
              <p className="text-xs text-slate-400">KANGI Stock & Point-of-Sale System</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mode Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => {
              clearError();
              setResetSuccessMessage(null);
              openAuthModal('pin');
            }}
            className={`flex items-center gap-1.5 pb-3 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
              authModalMode === 'pin'
                ? 'border-amber-600 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <KeyRound className="h-3.5 w-3.5" />
            <span>Staff PIN</span>
          </button>
          <button
            type="button"
            onClick={() => {
              clearError();
              setResetSuccessMessage(null);
              openAuthModal('signin');
            }}
            className={`flex items-center gap-1.5 pb-3 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
              authModalMode === 'signin'
                ? 'border-amber-600 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Mail className="h-3.5 w-3.5" />
            <span>Email Login</span>
          </button>
          <button
            type="button"
            onClick={() => {
              clearError();
              setResetSuccessMessage(null);
              openAuthModal('signup');
            }}
            className={`flex items-center gap-1.5 pb-3 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
              authModalMode === 'signup'
                ? 'border-amber-600 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <User className="h-3.5 w-3.5" />
            <span>Create Staff</span>
          </button>
          <button
            type="button"
            onClick={() => {
              clearError();
              setResetSuccessMessage(null);
              openAuthModal('forgot');
            }}
            className={`flex items-center gap-1.5 pb-3 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
              authModalMode === 'forgot'
                ? 'border-amber-600 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <span>Forgot Password</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 space-y-5">
          {/* Error Notification */}
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 animate-fadeIn">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">{error}</div>
            </div>
          )}

          {/* Reset Success */}
          {resetSuccessMessage && (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-800 animate-fadeIn">
              <CheckCircle2 className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">{resetSuccessMessage}</div>
            </div>
          )}

          {/* ================= MODE: PIN LOGIN ================= */}
          {authModalMode === 'pin' && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 mb-2">
                  <KeyRound className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Enter Your Staff PIN</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Instant POS & stock counter sign-in with your assigned 4-digit code
                </p>
              </div>

              {/* PIN Display & Input */}
              <form onSubmit={handlePinSignIn} className="space-y-4">
                <div className="flex items-center justify-center gap-3 my-2">
                  {[0, 1, 2, 3].map((index) => {
                    const digit = pin[index];
                    return (
                      <div
                        key={index}
                        className={`h-12 w-12 rounded-xl border-2 flex items-center justify-center text-xl font-bold transition-colors ${
                          digit
                            ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-sm'
                            : 'border-slate-300 bg-slate-50 text-slate-300'
                        }`}
                      >
                        {digit ? '●' : '○'}
                      </div>
                    );
                  })}
                </div>

                {/* Hidden / Keyboard Direct Input */}
                <div className="relative max-w-xs mx-auto">
                  <input
                    type="password"
                    maxLength={6}
                    pattern="[0-9]*"
                    inputMode="numeric"
                    autoFocus
                    value={pin}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setPin(val);
                      if (val.length === 4) {
                        handlePinSignIn(undefined, val);
                      }
                    }}
                    placeholder="Type PIN or use keypad below"
                    className="w-full text-center text-sm font-bold py-2 px-4 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 placeholder:tracking-normal focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20 outline-none"
                  />
                </div>

                {/* Interactive Keypad */}
                <div className="max-w-xs mx-auto grid grid-cols-3 gap-2 pt-1">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handlePinDigit(num)}
                      className="h-11 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 text-sm font-bold text-slate-800 transition-colors shadow-2xs"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handlePinClear}
                    title="Clear PIN"
                    className="h-11 rounded-xl border border-slate-200 bg-slate-50 hover:bg-rose-50 hover:border-rose-200 text-xs font-bold text-slate-600 hover:text-rose-700 transition-colors flex items-center justify-center gap-1"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Clear</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePinDigit('0')}
                    className="h-11 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 text-sm font-bold text-slate-800 transition-colors shadow-2xs"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={handlePinBackspace}
                    title="Backspace"
                    className="h-11 rounded-xl border border-slate-200 bg-slate-50 hover:bg-amber-50 hover:border-amber-200 text-xs font-bold text-slate-600 hover:text-amber-700 transition-colors flex items-center justify-center"
                  >
                    <Delete className="h-4 w-4" />
                  </button>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={submitting || loading || pin.length < 4}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-amber-500 transition-colors disabled:opacity-50"
                >
                  {submitting ? (
                    <span>Verifying PIN...</span>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      <span>Unlock Staff Session</span>
                    </>
                  )}
                </button>
              </form>

              {/* Quick PIN Chips for testing */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-600">Quick Test PINs:</span>
                  <span className="text-xs text-slate-400">Click to autofill & log in</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {DEMO_STAFF_ACCOUNTS.map((s) => (
                    <button
                      key={s.role}
                      type="button"
                      onClick={() => {
                        setPin(s.pin);
                        handlePinSignIn(undefined, s.pin);
                      }}
                      className="flex items-center justify-between p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-amber-50/70 hover:border-amber-300 text-left transition-colors group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-700 text-[11px] font-semibold text-white">
                          {s.name[0]}
                        </span>
                        <div>
                          <div className="text-xs font-bold text-slate-800 group-hover:text-amber-900 leading-tight">
                            {s.name.split(' ')[0]} ({s.role.toUpperCase()})
                          </div>
                        </div>
                      </div>
                      <span className="font-mono text-xs font-bold bg-white px-1.5 py-0.5 rounded border border-slate-300 text-slate-700 group-hover:border-amber-400 group-hover:text-amber-700">
                        {s.pin}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================= MODE: EMAIL SIGN IN ================= */}
          {authModalMode === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Email Address / Staff ID
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. admin@kangistock.co.ke"
                    className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20 outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">Password</label>
                  <button
                    type="button"
                    onClick={() => openAuthModal('forgot')}
                    className="text-xs font-semibold text-amber-600 hover:text-amber-700 hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 p-0.5 text-slate-400 hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-600 py-3 text-sm font-bold text-white shadow-md hover:bg-amber-500 transition-colors disabled:opacity-50"
              >
                {submitting ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    <span>Sign In with Email</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* ================= MODE: SIGN UP ================= */}
          {authModalMode === 'signup' && (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Name / Staff Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Kelvin Mutua"
                    className="w-full rounded-xl border border-slate-300 py-2 pl-10 pr-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="staff@store.co.ke"
                      className="w-full rounded-xl border border-slate-300 py-2 pl-10 pr-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Phone / M-Pesa
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+254 700 000 000"
                      className="w-full rounded-xl border border-slate-300 py-2 pl-10 pr-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Assigned Store Role
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { r: 'cashier', label: 'Cashier / POS', desc: 'Add/delete to cart, POS sales' },
                    { r: 'clerk', label: 'Stock Clerk', desc: 'Add/delete to cart, restock' },
                    { r: 'manager', label: 'Store Manager', desc: 'Add/delete to cart, CRM' },
                    { r: 'admin', label: 'Store Owner', desc: 'Add, edit, delete products' },
                  ].map((item) => (
                    <button
                      key={item.r}
                      type="button"
                      onClick={() => setRole(item.r as UserRole)}
                      className={`p-2 rounded-xl border text-left transition-colors ${
                        role === item.r
                          ? 'border-amber-600 bg-amber-50 text-amber-900 ring-2 ring-amber-500/20'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <div className="text-xs font-bold">{item.label}</div>
                      <div className="text-xs text-slate-500 leading-tight mt-0.5">
                        {item.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full rounded-xl border border-slate-300 py-2 pl-10 pr-10 text-xs text-slate-900 placeholder:text-slate-400 focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2 p-0.5 text-slate-400 hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-amber-500 transition-colors disabled:opacity-50"
              >
                {submitting ? (
                  <span>Creating Account...</span>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    <span>Register Staff Member</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* ================= MODE: FORGOT PASSWORD ================= */}
          {authModalMode === 'forgot' && (
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Enter your registered store email address below and we will send you a password reset link to regain access.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. admin@kangistock.co.ke"
                    className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20 outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-600 py-3 text-sm font-bold text-white shadow-md hover:bg-amber-500 transition-colors disabled:opacity-50"
              >
                {submitting ? <span>Sending Link...</span> : <span>Send Password Reset Link</span>}
              </button>
            </form>
          )}

          {/* ================= 1-CLICK DEMO STAFF SWITCHER ================= */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span>Demo accounts</span>
              </div>
              <span className="text-xs text-slate-500">Tap to sign in</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DEMO_STAFF_ACCOUNTS.map((staff) => {
                const isCurrent = user?.role === staff.role && user?.email === staff.email;
                return (
                  <button
                    key={staff.role}
                    type="button"
                    onClick={() => handleDemoSwitch(staff.role)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-colors ${
                      isCurrent
                        ? 'border-amber-500 bg-amber-50/80 ring-2 ring-amber-500/20'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-semibold text-white">
                        {staff.name[0]}
                      </span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900">{staff.name}</span>
                          {isCurrent && (
                            <span className="rounded bg-amber-200 px-1 py-0.2 text-xs font-bold text-amber-800">
                              Active
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-500 block">
                          {staff.title} • PIN: <strong className="text-slate-700 font-mono">{staff.pin}</strong>
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 bg-slate-50 px-6 py-3 text-center text-xs text-slate-500">
          Staff sign-in
        </div>
      </div>
    </div>
  );
};

