'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, maskPhoneNumber } from '@/lib/auth-context';
import { Navbar } from '@/components/layout/Navbar';
import {
  getPeople,
  getDeletedPeople,
  restorePerson,
  permanentlyDeletePerson,
} from '@/lib/people-service';
import { getTransactions } from '@/lib/transaction-service';
import { Person } from '@/types/person';
import { ConfirmationResult } from 'firebase/auth';
import {
  ArrowLeft,
  User,
  Shield,
  Download,
  LogOut,
  CheckCircle,
  AlertTriangle,
  Smartphone,
  Trash2,
  RotateCcw,
  RefreshCw,
  Lock,
} from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const {
    user,
    loading: authLoading,
    logOut,
    sendPasswordReset,
    setupTwoFactor,
    confirmTwoFactorSetup,
    disableTwoFactor,
  } = useAuth();

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Two-Step Verification state
  const [isSettingUp2fa, setIsSettingUp2fa] = useState(false);
  const [setupStep, setSetupStep] = useState<'phone' | 'code'>('phone');
  const [phoneInput, setPhoneInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [submitting2fa, setSubmitting2fa] = useState(false);

  // Recycle Bin state
  const [deletedPeople, setDeletedPeople] = useState<Person[]>([]);
  const [loadingDeleted, setLoadingDeleted] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Load soft-deleted contacts
  const loadDeletedItems = async () => {
    if (!user) return;
    try {
      setLoadingDeleted(true);
      const data = await getDeletedPeople(user.uid);
      setDeletedPeople(data);
    } catch (err) {
      console.error('Error loading recycle bin:', err);
    } finally {
      setLoadingDeleted(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadDeletedItems();
    }
  }, [user]);

  const handlePasswordReset = async () => {
    if (!user?.email) {
      setError('No registered email found for this account.');
      return;
    }
    try {
      setMessage(null);
      setError(null);
      await sendPasswordReset(user.email);
      setMessage(`Password reset email sent to ${user.email}. Check your inbox.`);
    } catch (err: any) {
      setError(err?.message || 'Failed to send password reset email.');
    }
  };

  // Two-Step Verification Handlers
  const handleStart2faSetup = () => {
    setIsSettingUp2fa(true);
    setSetupStep('phone');
    setPhoneInput(user?.phoneNumber || '+91 ');
    setOtpInput('');
    setError(null);
    setMessage(null);
  };

  const handleCancel2faSetup = () => {
    setIsSettingUp2fa(false);
    setSetupStep('phone');
    setPhoneInput('');
    setOtpInput('');
    setConfirmationResult(null);
    setError(null);
  };

  const handleSend2faCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phoneInput.trim();
    if (!cleanPhone || cleanPhone.length < 8) {
      setError('Please enter a valid phone number with country code (e.g. +91 94190 12345).');
      return;
    }
    try {
      setSubmitting2fa(true);
      setError(null);
      setMessage(null);
      const res = await setupTwoFactor(cleanPhone, 'settings-recaptcha-container');
      setConfirmationResult(res);
      setSetupStep('code');
      setMessage(`Verification code sent via SMS to ${cleanPhone}.`);
    } catch (err: any) {
      console.error('2FA send error:', err);
      setError(err?.message || 'Could not send verification code.');
    } finally {
      setSubmitting2fa(false);
    }
  };

  const handleConfirm2faCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = otpInput.trim();
    if (!cleanCode || cleanCode.length < 6 || !confirmationResult) {
      setError('Please enter the 6-digit verification code sent to your phone.');
      return;
    }
    try {
      setSubmitting2fa(true);
      setError(null);
      setMessage(null);
      await confirmTwoFactorSetup(confirmationResult, cleanCode, phoneInput.trim());
      setIsSettingUp2fa(false);
      setSetupStep('phone');
      setPhoneInput('');
      setOtpInput('');
      setConfirmationResult(null);
      setMessage('Two-step verification has been successfully enabled for your account.');
    } catch (err: any) {
      console.error('2FA confirm error:', err);
      setError(err?.message || 'Invalid verification code. Please check and retry.');
    } finally {
      setSubmitting2fa(false);
    }
  };

  const handleDisable2fa = async () => {
    if (
      !window.confirm(
        'Are you sure you want to disable Two-Step Verification? Your account will be less secure.'
      )
    ) {
      return;
    }
    try {
      setError(null);
      setMessage(null);
      await disableTwoFactor();
      setMessage('Two-step verification has been disabled.');
    } catch (err: any) {
      setError(err?.message || 'Failed to disable two-step verification.');
    }
  };

  // Recycle Bin Handlers
  const handleRestorePerson = async (p: Person) => {
    if (!user) return;
    try {
      setProcessingId(p.id);
      setError(null);
      setMessage(null);
      await restorePerson(user.uid, p.id);
      await loadDeletedItems();
      setMessage(`"${p.fullName}" has been restored to your contacts notebook.`);
    } catch (err: any) {
      setError(err?.message || `Failed to restore "${p.fullName}".`);
    } finally {
      setProcessingId(null);
    }
  };

  const handlePermanentDelete = async (p: Person) => {
    if (!user) return;
    if (
      !window.confirm(
        `Permanently delete "${p.fullName}"? This action cannot be undone and will permanently remove all associated gift records.`
      )
    ) {
      return;
    }
    try {
      setProcessingId(p.id);
      setError(null);
      setMessage(null);
      await permanentlyDeletePerson(user.uid, p.id);
      await loadDeletedItems();
      setMessage(`"${p.fullName}" was permanently removed.`);
    } catch (err: any) {
      setError(err?.message || `Failed to delete "${p.fullName}".`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleExportAllData = async () => {
    if (!user) return;
    try {
      setExporting(true);
      const people = await getPeople(user.uid);
      const allData: any = {
        exportedAt: new Date().toISOString(),
        user: {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
        },
        peopleWithTransactions: [],
      };

      for (const p of people) {
        const txs = await getTransactions(user.uid, p.id);
        allData.peopleWithTransactions.push({
          person: p,
          transactions: txs,
        });
      }

      const blob = new Blob([JSON.stringify(allData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `riwaaj_ledger_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setMessage('Complete notebook backup successfully downloaded as JSON.');
    } catch (err) {
      console.error('Export error:', err);
      setError('Could not export notebook data.');
    } finally {
      setExporting(false);
    }
  };

  const handleLogout = async () => {
    await logOut();
    router.push('/login');
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5]">
        <div className="w-8 h-8 border-3 border-[#0F5132] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] pb-16">
      <Navbar />

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 pt-6">
        <Link
          href="/people"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#78716C] hover:text-[#0F5132] transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to My People</span>
        </Link>

        <h1 className="text-2xl font-serif font-bold text-[#1C1917] mb-6">
          Account & Notebook Settings
        </h1>

        {message && (
          <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs sm:text-sm text-emerald-800 font-medium flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs sm:text-sm text-red-700 font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* reCAPTCHA Invisible Container */}
        <div id="settings-recaptcha-container" />

        <div className="space-y-5">
          {/* Profile Card */}
          <div className="bg-white rounded-2xl border border-[#E7E2D8] p-5 shadow-xs">
            <div className="flex items-center gap-3 mb-4 border-b border-[#F5F2EB] pb-3">
              <div className="w-9 h-9 rounded-xl bg-[#0F5132]/10 text-[#0F5132] flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-[#1C1917]">Profile Information</h3>
                <p className="text-xs text-[#78716C]">Your account details</p>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center py-1">
                <span className="text-[#78716C] text-xs">Name</span>
                <span className="font-medium text-[#1C1917]">{user.displayName || 'Not set'}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-[#F5F2EB]">
                <span className="text-[#78716C] text-xs">Email</span>
                <span className="font-medium text-[#1C1917]">{user.email || 'Not provided'}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-[#F5F2EB]">
                <span className="text-[#78716C] text-xs">Phone</span>
                <span className="font-medium text-[#1C1917]">{user.phoneNumber || 'Not provided'}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-[#F5F2EB]">
                <span className="text-[#78716C] text-xs">Status</span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle className="w-3 h-3" />
                  <span>Active Account</span>
                </span>
              </div>
            </div>
          </div>

          {/* Security & Password */}
          <div className="bg-white rounded-2xl border border-[#E7E2D8] p-5 shadow-xs">
            <div className="flex items-center gap-3 mb-4 border-b border-[#F5F2EB] pb-3">
              <div className="w-9 h-9 rounded-xl bg-[#0F5132]/10 text-[#0F5132] flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-[#1C1917]">Security & Password Recovery</h3>
                <p className="text-xs text-[#78716C]">Official Firebase password-reset recovery</p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-[#57534E] leading-relaxed">
                Need to change or recover your password? Request an official Firebase password reset link sent to your registered email address.
              </p>
              <button
                onClick={handlePasswordReset}
                className="px-4 py-2 rounded-xl border border-[#D6D0C4] text-xs font-semibold text-[#1C1917] hover:bg-[#FAF8F5] transition-smooth cursor-pointer"
                id="send-password-reset-btn"
              >
                Send Password Reset Email
              </button>
            </div>
          </div>

          {/* Two-Step Verification (2FA) */}
          <div className="bg-white rounded-2xl border border-[#E7E2D8] p-5 shadow-xs" id="two-factor-settings-card">
            <div className="flex items-center gap-3 mb-4 border-b border-[#F5F2EB] pb-3">
              <div className="w-9 h-9 rounded-xl bg-[#0F5132]/10 text-[#0F5132] flex items-center justify-center">
                <Shield className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-[#1C1917]">Two-Step Verification (2FA)</h3>
                  {user.isTwoFactorEnabled ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle className="w-3 h-3" />
                      <span>Enabled</span>
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-[#78716C] bg-stone-100 px-2.5 py-0.5 rounded-full border border-stone-200">
                      Disabled
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#78716C]">Add an SMS verification step to protect your ledger</p>
              </div>
            </div>

            {user.isTwoFactorEnabled ? (
              <div className="space-y-3">
                <div className="p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-xl text-xs text-emerald-900 leading-relaxed flex items-start gap-2.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-emerald-950 mb-0.5">Two-step verification is active</p>
                    <p className="text-[#57534E]">
                      A 6-digit SMS verification code is required when signing in with your email and password.
                    </p>
                    {user.twoFactorPhoneNumber && (
                      <p className="mt-1 font-mono text-[11px] text-[#0F5132] font-medium">
                        Verified Phone: {maskPhoneNumber(user.twoFactorPhoneNumber)}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleDisable2fa}
                  className="px-3.5 py-2 rounded-xl border border-red-200 text-xs font-semibold text-red-600 hover:bg-red-50 transition-smooth cursor-pointer"
                  id="disable-2fa-btn"
                >
                  Turn Off Two-Step Verification
                </button>
              </div>
            ) : isSettingUp2fa ? (
              <div className="space-y-4 pt-1">
                {setupStep === 'phone' ? (
                  <form onSubmit={handleSend2faCode} className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#1C1917] mb-1.5">
                        Mobile Phone Number
                      </label>
                      <div className="relative">
                        <Smartphone className="w-4 h-4 absolute left-3 top-3 text-[#78716C]" />
                        <input
                          type="tel"
                          value={phoneInput}
                          onChange={(e) => setPhoneInput(e.target.value)}
                          placeholder="+91 94190 12345"
                          className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#D6D0C4] bg-white text-xs sm:text-sm text-[#1C1917] focus:outline-hidden focus:ring-2 focus:ring-[#0F5132]"
                          required
                          id="2fa-phone-input"
                        />
                      </div>
                      <p className="text-[11px] text-[#78716C] mt-1.5">
                        Include your country code (e.g. +91 for India). Standard SMS charges may apply.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="submit"
                        disabled={submitting2fa}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0F5132] text-white text-xs font-semibold hover:bg-[#0C4328] transition-smooth cursor-pointer disabled:opacity-50"
                        id="send-2fa-code-btn"
                      >
                        {submitting2fa && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                        <span>{submitting2fa ? 'Sending SMS...' : 'Send SMS Code'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleCancel2faSetup}
                        className="px-3.5 py-2 rounded-xl border border-[#D6D0C4] text-xs font-semibold text-[#57534E] hover:bg-[#FAF8F5] transition-smooth cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleConfirm2faCode} className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#1C1917] mb-1.5">
                        Enter 6-Digit SMS Code
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        value={otpInput}
                        onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                        placeholder="123456"
                        className="w-full text-center tracking-widest font-mono text-base py-2.5 rounded-xl border border-[#D6D0C4] bg-white text-[#1C1917] focus:outline-hidden focus:ring-2 focus:ring-[#0F5132]"
                        required
                        autoFocus
                        id="2fa-code-input"
                      />
                      <p className="text-[11px] text-[#78716C] mt-1.5">
                        Enter the code sent to {phoneInput}.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="submit"
                        disabled={submitting2fa || otpInput.length < 6}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0F5132] text-white text-xs font-semibold hover:bg-[#0C4328] transition-smooth cursor-pointer disabled:opacity-50"
                        id="confirm-2fa-code-btn"
                      >
                        {submitting2fa && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                        <span>{submitting2fa ? 'Verifying...' : 'Verify & Turn On 2FA'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSetupStep('phone')}
                        className="px-3.5 py-2 rounded-xl border border-[#D6D0C4] text-xs font-semibold text-[#57534E] hover:bg-[#FAF8F5] transition-smooth cursor-pointer"
                      >
                        Change Number
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-[#57534E] leading-relaxed">
                  Protect your notebook with an extra layer of security. When enabled, a one-time verification code is sent to your mobile phone every time you log in.
                </p>
                <button
                  onClick={handleStart2faSetup}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0F5132] text-white text-xs font-semibold hover:bg-[#0C4328] transition-smooth cursor-pointer"
                  id="enable-2fa-btn"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Set Up Two-Step Verification</span>
                </button>
              </div>
            )}
          </div>

          {/* Recycle Bin (Accidental Deletion Recovery) */}
          <div className="bg-white rounded-2xl border border-[#E7E2D8] p-5 shadow-xs" id="recycle-bin-card">
            <div className="flex items-center gap-3 mb-4 border-b border-[#F5F2EB] pb-3">
              <div className="w-9 h-9 rounded-xl bg-[#0F5132]/10 text-[#0F5132] flex items-center justify-center">
                <Trash2 className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-[#1C1917]">Recycle Bin & Recovery</h3>
                  <button
                    onClick={loadDeletedItems}
                    disabled={loadingDeleted}
                    className="text-xs text-[#0F5132] hover:underline inline-flex items-center gap-1 cursor-pointer"
                    title="Refresh Recycle Bin"
                  >
                    <RefreshCw className={`w-3 h-3 ${loadingDeleted ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>
                <p className="text-xs text-[#78716C]">
                  Recover accidentally deleted contacts and transactions
                </p>
              </div>
            </div>

            {loadingDeleted ? (
              <div className="py-6 text-center">
                <div className="w-5 h-5 border-2 border-[#0F5132] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs text-[#78716C]">Checking recycle bin...</p>
              </div>
            ) : deletedPeople.length === 0 ? (
              <div className="p-4 bg-[#FAF8F5] rounded-xl border border-[#E7E2D8] text-center">
                <p className="text-xs font-medium text-[#57534E]">
                  Your Recycle Bin is empty.
                </p>
                <p className="text-[11px] text-[#A8A29E] mt-0.5">
                  When you delete a person or gift, it is safely stored here and does not affect your active ledger totals.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                <p className="text-xs text-[#57534E]">
                  The following contacts were moved to the Recycle Bin. You can restore them anytime:
                </p>
                <div className="divide-y divide-[#F5F2EB] border border-[#E7E2D8] rounded-xl overflow-hidden bg-white">
                  {deletedPeople.map((p) => (
                    <div
                      key={p.id}
                      className="p-3 flex items-center justify-between gap-3 hover:bg-[#FAF8F5]/60 transition-colors"
                    >
                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-semibold text-[#1C1917] truncate">
                          {p.fullName}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#78716C] mt-0.5">
                          {p.parentageName && (
                            <span>{p.parentageRelation || 'S/o'} {p.parentageName}</span>
                          )}
                          {p.mohalla && (
                            <span className="text-[#0F5132] font-medium">• {p.mohalla}</span>
                          )}
                          {p.deletedAt && (
                            <span className="text-[#A8A29E]">
                              • Deleted {new Date(p.deletedAt).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => handleRestorePerson(p)}
                          disabled={processingId === p.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold hover:bg-emerald-100 transition-smooth cursor-pointer disabled:opacity-50"
                          title="Restore contact to active notebook"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Restore</span>
                        </button>
                        <button
                          onClick={() => handlePermanentDelete(p)}
                          disabled={processingId === p.id}
                          className="p-1.5 rounded-lg border border-[#FEE2E2] text-red-600 hover:bg-red-50 transition-smooth cursor-pointer disabled:opacity-50"
                          title="Permanently Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Data Backup & Export */}
          <div className="bg-white rounded-2xl border border-[#E7E2D8] p-5 shadow-xs">
            <div className="flex items-center gap-3 mb-4 border-b border-[#F5F2EB] pb-3">
              <div className="w-9 h-9 rounded-xl bg-[#0F5132]/10 text-[#0F5132] flex items-center justify-center">
                <Download className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-[#1C1917]">Notebook Data Backup</h3>
                <p className="text-xs text-[#78716C]">Download your complete gift notebook</p>
              </div>
            </div>

            <p className="text-xs text-[#57534E] mb-3 leading-relaxed">
              Export all saved contacts, gift occasions, transactions, and notes in an offline JSON backup file for safekeeping.
            </p>

            <button
              onClick={handleExportAllData}
              disabled={exporting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0F5132] text-white text-xs font-semibold hover:bg-[#0C4328] transition-smooth cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{exporting ? 'Generating Backup...' : 'Download Full JSON Backup'}</span>
            </button>
          </div>

          {/* Sign out */}
          <div className="bg-white rounded-2xl border border-[#E7E2D8] p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm text-[#1C1917]">Log Out</h3>
                <p className="text-xs text-[#78716C]">End your current session on this device</p>
              </div>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 text-xs font-semibold transition-smooth cursor-pointer"
                id="logout-btn"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
