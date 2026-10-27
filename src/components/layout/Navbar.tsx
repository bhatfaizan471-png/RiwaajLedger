'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { BookOpen, LogOut, User, Settings, Info, X } from 'lucide-react';

export function Navbar() {
  const { user, logOut, isFirebaseConfigured } = useAuth();
  const router = useRouter();
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logOut();
      router.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-[#FAF8F5]/90 backdrop-blur-md border-b border-[#E7E2D8] no-print">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <Link href="/people" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-[#0F5132] text-white flex items-center justify-center shadow-sm group-hover:bg-[#0C4328] transition-smooth">
              <BookOpen className="w-5 h-5 text-[#E6D5AC]" />
            </div>
            <div>
              <span className="font-serif font-bold text-lg sm:text-xl text-[#0F5132] tracking-tight block leading-tight">
                Riwaaj Ledger
              </span>
              <span className="text-[11px] text-[#78716C] font-medium tracking-wide uppercase block">
                Kashmiri Gift Notebook
              </span>
            </div>
          </Link>

          {/* Right actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Setup / Sandbox Status Badge */}
            {!isFirebaseConfigured && (
              <button
                onClick={() => setShowConfigModal(true)}
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] hover:bg-[#FDE68A] transition-smooth"
                title="Firebase setup status"
              >
                <Info className="w-3.5 h-3.5" />
                <span>Sandbox Mode</span>
              </button>
            )}

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-lg border border-[#E7E2D8] bg-white hover:border-[#CBD5E1] transition-smooth text-sm font-medium text-[#1C1917]"
                  id="user-profile-menu-button"
                  aria-expanded={menuOpen}
                >
                  <div className="w-7 h-7 rounded-full bg-[#0F5132]/10 text-[#0F5132] flex items-center justify-center font-semibold text-xs">
                    {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span className="hidden md:inline-block max-w-[120px] truncate">
                    {user.displayName || user.email || 'My Account'}
                  </span>
                </button>

                {menuOpen && (
                  <div
                    className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-[#E7E2D8] py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100"
                    onMouseLeave={() => setMenuOpen(false)}
                  >
                    <div className="px-3.5 py-2 border-b border-[#F5F2EB]">
                      <p className="text-xs text-[#78716C]">Signed in as</p>
                      <p className="text-sm font-semibold text-[#1C1917] truncate">
                        {user.displayName || 'Riwaaj User'}
                      </p>
                      <p className="text-xs text-[#78716C] truncate">{user.email || user.phoneNumber || ''}</p>
                    </div>

                    <Link
                      href="/settings"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-[#44403C] hover:bg-[#F8F6F0] hover:text-[#0F5132] transition-smooth"
                    >
                      <Settings className="w-4 h-4 text-[#78716C]" />
                      <span>Account Settings</span>
                    </Link>

                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-[#DC2626] hover:bg-[#FEF2F2] transition-smooth text-left"
                      id="navbar-logout-btn"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Log Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#0F5132] text-white text-sm font-medium hover:bg-[#0C4328] transition-smooth shadow-sm"
              >
                <User className="w-4 h-4" />
                <span>Log In</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Firebase setup guidance modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#E7E2D8] relative">
            <button
              onClick={() => setShowConfigModal(false)}
              className="absolute top-4 right-4 text-[#78716C] hover:text-[#1C1917] p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#FEF3C7] text-[#92400E] flex items-center justify-center">
                <Info className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-base text-[#1C1917]">Running in Local Sandbox Mode</h3>
                <p className="text-xs text-[#78716C]">Full offline functionality active</p>
              </div>
            </div>

            <p className="text-sm text-[#44403C] mb-3 leading-relaxed">
              All features (contacts, alphabetical ordering, custom gifts, calculations, ledger tables, CSV export) are currently persisting to your secure local session.
            </p>

            <div className="p-3 bg-[#FAF8F5] border border-[#E7E2D8] rounded-xl text-xs text-[#57534E] mb-4 space-y-1.5">
              <p className="font-medium text-[#1C1917]">To connect your live Firebase Cloud:</p>
              <ol className="list-decimal list-inside space-y-1 pl-1">
                <li>Create a project in the Firebase Console.</li>
                <li>Enable Authentication (Email/Password & Phone) and Firestore.</li>
                <li>Copy credentials from <code className="bg-[#E7E2D8] px-1 rounded">.env.example</code> into <code className="bg-[#E7E2D8] px-1 rounded">.env.local</code>.</li>
              </ol>
            </div>

            <button
              onClick={() => setShowConfigModal(false)}
              className="w-full py-2.5 rounded-xl bg-[#0F5132] text-white text-sm font-medium hover:bg-[#0C4328] transition-smooth"
            >
              Got it, continue testing
            </button>
          </div>
        </div>
      )}
    </>
  );
}
