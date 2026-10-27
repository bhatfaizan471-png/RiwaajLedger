'use client';

import React from 'react';
import { LedgerCalculationResult } from '@/types/transaction';
import { ArrowDownLeft, ArrowUpRight, Scale } from 'lucide-react';

interface LedgerSummaryCardProps {
  calculation: LedgerCalculationResult;
  selectedYear?: string;
}

export function LedgerSummaryCard({ calculation, selectedYear }: LedgerSummaryCardProps) {
  const isAllYears = !selectedYear || selectedYear === 'ALL';

  return (
    <div className="bg-white rounded-2xl border border-[#E7E2D8] p-4 sm:p-5 shadow-xs mb-6">
      <div className="flex items-center justify-between mb-3 border-b border-[#F5F2EB] pb-2">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-[#0F5132]" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#57534E]">
            {isAllYears ? 'Overall Gift Balance' : `Balance for Year ${selectedYear}`}
          </h2>
        </div>
        {!isAllYears && (
          <span className="text-[11px] font-medium text-[#78716C] bg-[#FAF8F5] px-2 py-0.5 rounded-full border border-[#E7E2D8]">
            Year {selectedYear} only
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Total Debit: We Gave Them */}
        <div className="p-3.5 rounded-xl bg-[#FEF2F2]/80 border border-[#FEE2E2]">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#991B1B] mb-1">
            <ArrowUpRight className="w-3.5 h-3.5 text-[#DC2626]" />
            <span>TOTAL DEBIT (We Gave)</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-[#DC2626] tracking-tight">
            {calculation.totalDebitFormatted}
          </p>
          <p className="text-[11px] text-[#78716C] mt-0.5">
            Cash gifts we presented to them
          </p>
        </div>

        {/* Total Credit: They Gave Us */}
        <div className="p-3.5 rounded-xl bg-[#F0FDF4]/80 border border-[#DCFCE7]">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#166534] mb-1">
            <ArrowDownLeft className="w-3.5 h-3.5 text-[#16A34A]" />
            <span>TOTAL CREDIT (They Gave)</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-[#16A34A] tracking-tight">
            {calculation.totalCreditFormatted}
          </p>
          <p className="text-[11px] text-[#78716C] mt-0.5">
            Cash gifts they presented to us
          </p>
        </div>

        {/* Net Balance */}
        <div
          className={`p-3.5 rounded-xl border ${
            calculation.statusVariant === 'positive'
              ? 'bg-[#F0FDF4] border-[#86EFAC]'
              : calculation.statusVariant === 'negative'
              ? 'bg-[#FEF2F2] border-[#FCA5A5]'
              : 'bg-[#F8FAFC] border-[#E2E8F0]'
          }`}
        >
          <div className="text-xs font-semibold text-[#44403C] mb-1">
            NET BALANCE
          </div>
          <p
            className={`text-xl sm:text-2xl font-bold tracking-tight ${
              calculation.statusVariant === 'positive'
                ? 'text-[#15803D]'
                : calculation.statusVariant === 'negative'
                ? 'text-[#B91C1C]'
                : 'text-[#475569]'
            }`}
          >
            {calculation.netBalanceFormatted}
          </p>
          <p className="text-xs font-medium text-[#1C1917] mt-0.5">
            {calculation.statusText}
          </p>
        </div>
      </div>
    </div>
  );
}
