'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  useAuth,
  formatFirebaseAuthError,
  isValidEmail,
  isValidPhoneNumber,
} from '@/lib/auth-context';
import {
  BookOpen,
  Mail,
  Lock,
  User,
  Phone,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';
import { DeveloperCredit } from '@/components/layout/DeveloperCredit';
import { PrivacyTrustNote } from '@/components/layout/PrivacyTrustNote';

export default function LoginPage() {
  const router = useRouter();
  const {
    user,
    loading,
    pendingTwoFactor,
    signIn,
    signUp,
    sendPasswordReset,
    loginAsDemoUser,
    verifyTwoFactorLogin,
    cancelTwoFactorLogin,
  } = useAuth();

  const [mode, setMode] = useState<'LOGIN' | 'SIGNUP' | 'FORGOT' | 'TWO_FACTOR'>('LOGIN');

  // Form states
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // If user is logged in, redirect directly to ledger
  useEffect(() => {
    if (!loading && user) {
      router.push('/people');
    }
  }, [user, loading, router]);

  // Handle Login or Signup submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (mode === 'LOGIN') {
      const cleanId = identifier.trim();
      if (!cleanId) {
        setError('Please enter your email address or phone number.');
        return;
      }
      if (!password) {
        setError('Please enter your password.');
        return;
      }

      try {
        setSubmitting(true);
        const res = await signIn(cleanId, password);
        if (res?.requires2FA) {
          setMode('TWO_FACTOR');
          setSuccessMessage('Password verified. Please enter the 6-digit Two-Step Verification code.');
          return;
        }
        router.push('/people');
      } catch (err: any) {
        console.error('Login error:', err);
        const code = err?.code ? ` (${err.code})` : '';
        const msg =
          err?.message && !err.message.startsWith('Firebase:')
            ? err.message
            : formatFirebaseAuthError(err);
        setError(`${msg}${code}`);
      } finally {
        setSubmitting(false);
      }
    } else if (mode === 'SIGNUP') {
      const cleanName = fullName.trim();
      const cleanEmail = email.trim().toLowerCase();
      const cleanPhone = phoneNumber.trim();

      if (!cleanName || cleanName.length < 2) {
        setError('Please enter your full name (at least 2 characters).');
        return;
      }
      if (!isValidEmail(cleanEmail)) {
        setError('Please enter a valid email address (e.g. name@example.com).');
        return;
      }
      if (!cleanPhone || !isValidPhoneNumber(cleanPhone)) {
        setError('Please enter a valid phone number with 8-16 digits (e.g. +91 94190 12345).');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match. Please re-enter.');
        return;
      }

      try {
        setSubmitting(true);
        await signUp(cleanEmail, password, cleanName, cleanPhone);
        router.push('/people');
      } catch (err: any) {
        console.error('Signup error:', err);
        const code = err?.code ? ` (${err.code})` : '';
        const msg =
          err?.message && !err.message.startsWith('Firebase:')
            ? err.message
            : formatFirebaseAuthError(err);
        setError(`${msg}${code}`);
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = forgotEmail.trim().toLowerCase();
    if (!cleanEmail || !isValidEmail(cleanEmail)) {
      setError('Please enter a valid registered email address (e.g. name@example.com).');
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      await sendPasswordReset(cleanEmail);
      setSuccessMessage(
        `Password reset link sent to ${cleanEmail}. Please check your inbox or spam folder.`
      );
    } catch (err: any) {
      const code = err?.code ? ` (${err.code})` : '';
      const msg =
        err?.message && !err.message.startsWith('Firebase:')
          ? err.message
          : formatFirebaseAuthError(err);
      setError(`${msg}${code}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyTwoFactor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFactorCode.trim()) {
      setError('Please enter the 6-digit verification code.');
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      await verifyTwoFactorLogin(twoFactorCode.trim());
      router.push('/people');
    } catch (err: any) {
      setError(err?.message || 'Invalid or expired verification code.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelTwoFactor = () => {
    cancelTwoFactorLogin();
    setTwoFactorCode('');
    setMode('LOGIN');
    setError(null);
    setSuccessMessage(null);
  };

  const handleDemoSignIn = () => {
    loginAsDemoUser('Kashmiri Host', 'host@kashmirriwaaj.com');
    router.push('/people');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5]">
        <div className="w-8 h-8 border-3 border-[#0F5132] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#FAF8F5]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Logo & Name */}
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#0F5132] text-white flex items-center justify-center mx-auto shadow-md mb-3.5">
            <BookOpen className="w-7 h-7 text-[#E6D5AC]" />
          </div>
          <h1 className="font-serif font-bold text-2xl sm:text-3xl text-[#0F5132] tracking-tight">
            Riwaaj Ledger
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#78716C] font-medium">
            Your Digital Notebook for Every Gift and Occasion.
          </p>
        </div>

        {/* Card */}
        <div className="mt-7 bg-white py-8 px-6 shadow-xl rounded-2xl border border-[#E7E2D8] sm:px-10">
          {/* Tabs for Login vs Signup */}
          {mode !== 'FORGOT' && mode !== 'TWO_FACTOR' && (
            <div className="flex rounded-xl bg-[#FAF8F5] p-1 border border-[#E7E2D8] mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode('LOGIN');
                  setError(null);
                  setSuccessMessage(null);
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-smooth ${
                  mode === 'LOGIN'
                    ? 'bg-white text-[#0F5132] shadow-xs'
                    : 'text-[#78716C] hover:text-[#1C1917]'
                }`}
                id="login-tab-btn"
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('SIGNUP');
                  setError(null);
                  setSuccessMessage(null);
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-smooth ${
                  mode === 'SIGNUP'
                    ? 'bg-white text-[#0F5132] shadow-xs'
                    : 'text-[#78716C] hover:text-[#1C1917]'
                }`}
                id="signup-tab-btn"
              >
                Sign Up
              </button>
            </div>
          )}

          {/* Feedback Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* FORM: Login (Email or Phone Number + Password) */}
          {mode === 'LOGIN' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#57534E] mb-1">
                  Email or Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#A8A29E]">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="name@example.com or +91 94190 12345"
                    className="w-full pl-9.5 pr-3 py-2.5 rounded-xl border border-[#D6D0C4] text-sm text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-hidden focus:ring-2 focus:ring-[#0F5132] transition-smooth"
                    id="login-identifier-input"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#57534E]">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('FORGOT');
                      setError(null);
                      setSuccessMessage(null);
                      setForgotEmail(identifier.includes('@') ? identifier : '');
                    }}
                    className="text-xs text-[#0F5132] hover:underline"
                    id="forgot-password-link"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#A8A29E]">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9.5 pr-3 py-2.5 rounded-xl border border-[#D6D0C4] text-sm text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-hidden focus:ring-2 focus:ring-[#0F5132] transition-smooth"
                    id="login-password-input"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#0F5132] hover:bg-[#0C4328] text-white text-sm font-semibold transition-smooth shadow-sm disabled:opacity-50 cursor-pointer"
                id="submit-login-btn"
              >
                <span>{submitting ? 'Signing in...' : 'Sign In to Notebook'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Developer Credit */}
              <DeveloperCredit />
            </form>
          )}

          {/* FORM: Signup (Full Name, Email, Phone, Password) */}
          {mode === 'SIGNUP' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#57534E] mb-1">
                  Full Name / Username <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#A8A29E]">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Farooq Ahmad"
                    className="w-full pl-9.5 pr-3 py-2.5 rounded-xl border border-[#D6D0C4] text-sm text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-hidden focus:ring-2 focus:ring-[#0F5132] transition-smooth"
                    id="signup-fullname-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#57534E] mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#A8A29E]">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-9.5 pr-3 py-2.5 rounded-xl border border-[#D6D0C4] text-sm text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-hidden focus:ring-2 focus:ring-[#0F5132] transition-smooth"
                    id="signup-email-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#57534E] mb-1">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#A8A29E]">
                    <Phone className="w-4 h-4" />
                  </span>
                  <input
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+91 94190 12345"
                    className="w-full pl-9.5 pr-3 py-2.5 rounded-xl border border-[#D6D0C4] text-sm text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-hidden focus:ring-2 focus:ring-[#0F5132] transition-smooth"
                    id="signup-phone-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#57534E] mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#A8A29E]">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full pl-9.5 pr-3 py-2.5 rounded-xl border border-[#D6D0C4] text-sm text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-hidden focus:ring-2 focus:ring-[#0F5132] transition-smooth"
                    id="signup-password-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#57534E] mb-1">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#A8A29E]">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full pl-9.5 pr-3 py-2.5 rounded-xl border border-[#D6D0C4] text-sm text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-hidden focus:ring-2 focus:ring-[#0F5132] transition-smooth"
                    id="signup-confirm-password-input"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#0F5132] hover:bg-[#0C4328] text-white text-sm font-semibold transition-smooth shadow-sm disabled:opacity-50 cursor-pointer"
                id="submit-signup-btn"
              >
                <span>{submitting ? 'Creating account...' : 'Create Account & Enter'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Privacy and Trust Note & Password Safety Reminder */}
              <PrivacyTrustNote />

              {/* Developer Credit */}
              <DeveloperCredit />
            </form>
          )}

          {/* FORM: Forgot Password */}
          {mode === 'FORGOT' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#57534E] mb-1">
                  Registered Email Address
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#A8A29E]">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-9.5 pr-3 py-2.5 rounded-xl border border-[#D6D0C4] text-sm text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-hidden focus:ring-2 focus:ring-[#0F5132] transition-smooth"
                    id="forgot-email-input"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 rounded-xl bg-[#0F5132] hover:bg-[#0C4328] text-white text-sm font-semibold transition-smooth shadow-sm disabled:opacity-50 cursor-pointer"
                id="forgot-submit-btn"
              >
                {submitting ? 'Sending Link...' : 'Send Password Reset Link'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('LOGIN');
                  setError(null);
                  setSuccessMessage(null);
                }}
                className="w-full text-xs text-[#78716C] hover:text-[#1C1917] text-center block pt-2 cursor-pointer"
                id="forgot-back-btn"
              >
                Back to Sign In
              </button>
            </form>
          )}

          {/* FORM: Two-Step Verification (2FA Challenge) */}
          {mode === 'TWO_FACTOR' && (
            <form onSubmit={handleVerifyTwoFactor} className="space-y-4">
              <div className="text-center mb-2">
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-[#0F5132] flex items-center justify-center mx-auto mb-2 border border-emerald-200">
                  <ShieldCheck className="w-5 h-5 text-[#0F5132]" />
                </div>
                <h3 className="font-serif font-bold text-base text-[#1C1917]">
                  Two-Step Verification
                </h3>
                <p className="text-xs text-[#78716C] mt-1 leading-relaxed">
                  Enter the 6-digit verification code sent to your registered mobile{' '}
                  <span className="font-semibold text-[#1C1917]">
                    {pendingTwoFactor?.phoneHint || 'phone number'}
                  </span>
                  .
                </p>
              </div>

              <div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#A8A29E]">
                    <KeyRound className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value)}
                    placeholder="123456"
                    className="w-full pl-9.5 pr-3 py-2.5 rounded-xl border border-[#D6D0C4] text-center tracking-widest text-lg font-bold text-[#1C1917] focus:outline-hidden focus:ring-2 focus:ring-[#0F5132] transition-smooth"
                    id="two-factor-code-input"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#0F5132] hover:bg-[#0C4328] text-white text-sm font-semibold transition-smooth shadow-sm disabled:opacity-50 cursor-pointer"
                id="submit-two-factor-btn"
              >
                <span>{submitting ? 'Verifying Code...' : 'Verify & Enter Notebook'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleCancelTwoFactor}
                className="w-full text-xs text-[#78716C] hover:text-[#1C1917] text-center block pt-1 cursor-pointer"
                id="cancel-two-factor-btn"
              >
                Cancel & Return to Log In
              </button>
            </form>
          )}

          {/* Quick Demo Sandbox Access */}
          <div className="mt-6 pt-5 border-t border-[#F0ECE1] text-center">
            <p className="text-xs text-[#78716C] mb-2.5">
              Want to quickly explore without creating an account?
            </p>
            <button
              type="button"
              onClick={handleDemoSignIn}
              className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 rounded-xl border border-[#D6D0C4] bg-[#FAF8F5] hover:bg-[#F2EFE8] text-[#57534E] text-xs font-semibold transition-smooth cursor-pointer"
              id="try-sandbox-btn"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#C59B27]" />
              <span>Enter Sandbox Demo (Pre-loaded with sample records)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
