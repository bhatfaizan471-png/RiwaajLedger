import React from 'react';
import { ShieldCheck, Lock } from 'lucide-react';

interface PrivacyTrustNoteProps {
  className?: string;
}

export function PrivacyTrustNote({ className = '' }: PrivacyTrustNoteProps) {
  return (
    <div
      className={`mt-4 p-3.5 bg-[#FAF8F5] rounded-xl border border-[#E7E2D8] text-left ${className}`}
      id="privacy-trust-note"
    >
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-5 h-5 rounded-full bg-[#EBF5EF] text-[#0F5132] flex items-center justify-center flex-shrink-0">
          <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
        </div>
        <h3 className="font-serif font-semibold text-xs text-[#0F5132] tracking-tight">
          Your Family Ledger, Your Privacy
        </h3>
      </div>
      <p className="text-[11px] text-[#57534E] leading-relaxed mb-2.5">
        Riwaaj Ledger helps you keep track of wedding gifts, cash contributions, and family transactions. Your account is designed to keep your ledger records accessible only to you through account-based access controls.
      </p>
      <div className="pt-2 border-t border-[#E7E2D8]/70 flex items-start gap-1.5 text-[11px] text-[#78716C] leading-normal">
        <Lock className="w-3 h-3 text-[#A8A29E] flex-shrink-0 mt-0.5" aria-hidden="true" />
        <span>
          Never share your password with anyone. Use a strong, unique password to help protect your account.
        </span>
      </div>
    </div>
  );
}
