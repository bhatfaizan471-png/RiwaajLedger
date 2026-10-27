'use client';

import React from 'react';
import { Transaction } from '@/types/transaction';
import { formatPaiseToRupees, calculateLedger } from '@/lib/calculations';
import { Pencil, Trash2, Gift, Calendar, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

interface TransactionTableProps {
  transactions: Transaction[];
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
  selectedYear?: string;
}

export function TransactionTable({
  transactions,
  onEdit,
  onDelete,
  selectedYear,
}: TransactionTableProps) {
  const ledger = calculateLedger(transactions);

  if (transactions.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#E7E2D8] p-8 sm:p-12 text-center shadow-xs">
        <div className="w-12 h-12 rounded-full bg-[#FAF8F5] text-[#78716C] flex items-center justify-center mx-auto mb-3 border border-[#E7E2D8]">
          <Gift className="w-6 h-6 text-[#0F5132]" />
        </div>
        <h4 className="font-semibold text-base text-[#1C1917] mb-1">
          {selectedYear && selectedYear !== 'ALL'
            ? `No transactions recorded in ${selectedYear}`
            : 'No transactions recorded yet'}
        </h4>
        <p className="text-xs sm:text-sm text-[#78716C] max-w-sm mx-auto">
          Add your first gift or occasion entry using the "+ Add Transaction" button above.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-[#E7E2D8] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="ledger-table w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-[#FAF8F5] border-b border-[#E7E2D8] text-[#57534E] text-xs uppercase tracking-wider font-semibold">
                <th scope="col" className="py-3 px-3.5 text-center w-12">
                  No.
                </th>
                <th scope="col" className="py-3 px-3.5 w-32">
                  Date
                </th>
                <th scope="col" className="py-3 px-4">
                  Occasion / Gift Details
                </th>
                <th scope="col" className="py-3 px-4 text-right w-36">
                  Debit (We Gave)
                </th>
                <th scope="col" className="py-3 px-4 text-right w-36">
                  Credit (They Gave)
                </th>
                <th scope="col" className="py-3 px-3 text-center w-24 no-print">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE5D9]">
              {transactions.map((tx, index) => {
                const hasCash = typeof tx.amountInPaise === 'number' && tx.amountInPaise > 0;
                const hasGift = tx.giftType !== 'CASH' || (tx.quantity > 0) || (tx.unit && tx.unit.trim().length > 0);
                const isDebit = hasCash && tx.direction === 'DEBIT';
                const isCredit = hasCash && tx.direction === 'CREDIT';

                // Format display date
                const dateObj = new Date(tx.date);
                const dateFormatted = !isNaN(dateObj.getTime())
                  ? dateObj.toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })
                  : tx.date;

                return (
                  <tr
                    key={tx.id}
                    id={`tx-row-${tx.id}`}
                    className={`transition-colors group hover:bg-[#EBF5EF] ${
                      index % 2 === 1 ? 'bg-[#FAF8F5]/60' : 'bg-white'
                    }`}
                  >
                    {/* No. */}
                    <td className="py-3.5 px-3.5 text-center text-xs font-medium text-[#78716C]">
                      {index + 1}
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-3.5 text-xs text-[#44403C] whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-[#A8A29E] flex-shrink-0" />
                        <span>{dateFormatted}</span>
                      </div>
                    </td>

                    {/* Occasion / Gift Details */}
                    <td className="py-3.5 px-4 text-sm">
                      <div className="font-semibold text-[#1C1917] leading-tight">
                        {tx.occasion}
                      </div>

                      {/* Gift details */}
                      {hasGift && (
                        <div className="inline-flex flex-wrap items-center gap-1.5 mt-1 px-2 py-0.5 rounded-md bg-[#FAF8F5] border border-[#E7E2D8] text-xs text-[#57534E]">
                          <Gift className="w-3 h-3 text-[#C59B27] flex-shrink-0" />
                          <span>
                            {tx.quantity ? `${tx.quantity} ` : ''}
                            {tx.unit ? `${tx.unit} ` : ''}
                            <span className="font-medium text-[#78716C]">
                              ({tx.giftType.replace(/_/g, ' ')})
                            </span>
                          </span>
                          {hasCash && (
                            <span className="font-semibold text-[#0F5132] bg-[#EBF5EF] px-1.5 py-0.5 rounded text-[11px]">
                              + {formatPaiseToRupees(tx.amountInPaise)} Cash
                            </span>
                          )}
                        </div>
                      )}

                      {/* Notes if available */}
                      {tx.notes && (
                        <p className="text-xs text-[#78716C] mt-0.5 italic">
                          {tx.notes}
                        </p>
                      )}
                    </td>

                    {/* Debit Column (We Gave Them) */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {isDebit ? (
                        <div className="inline-flex items-center gap-1 font-bold text-[#DC2626]">
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          <span>{formatPaiseToRupees(tx.amountInPaise)}</span>
                        </div>
                      ) : tx.direction === 'DEBIT' && !hasCash ? (
                        <span className="text-xs text-[#A8A29E] font-normal italic">Gift only</span>
                      ) : (
                        <span className="text-[#A8A29E] font-medium">—</span>
                      )}
                    </td>

                    {/* Credit Column (They Gave Us) */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {isCredit ? (
                        <div className="inline-flex items-center gap-1 font-bold text-[#16A34A]">
                          <ArrowDownLeft className="w-3.5 h-3.5" />
                          <span>{formatPaiseToRupees(tx.amountInPaise)}</span>
                        </div>
                      ) : tx.direction === 'CREDIT' && !hasCash ? (
                        <span className="text-xs text-[#A8A29E] font-normal italic">Gift only</span>
                      ) : (
                        <span className="text-[#A8A29E] font-medium">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-3 text-center whitespace-nowrap no-print">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onEdit(tx)}
                          className="p-1.5 rounded-lg text-[#78716C] hover:text-[#0F5132] hover:bg-[#FAF8F5] transition-smooth"
                          title="Edit Transaction"
                          aria-label={`Edit ${tx.occasion}`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDelete(tx)}
                          className="p-1.5 rounded-lg text-[#78716C] hover:text-[#DC2626] hover:bg-red-50 transition-smooth"
                          title="Delete Transaction"
                          aria-label={`Delete ${tx.occasion}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* FINAL NET BALANCE SECTION BELOW TABLE (Explicit Requirement) */}
      <div className="print-summary bg-white rounded-2xl border-2 border-[#E7E2D8] p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="text-xs font-bold uppercase tracking-wider text-[#57534E]">
              Final Ledger Summary {selectedYear && selectedYear !== 'ALL' ? `(${selectedYear})` : '(All Time)'}
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm font-semibold text-[#44403C]">
              <div>
                TOTAL DEBIT:{' '}
                <span className="text-[#DC2626] font-bold">
                  {ledger.totalDebitFormatted}
                </span>
              </div>
              <div className="text-[#D6D0C4] hidden sm:inline">•</div>
              <div>
                TOTAL CREDIT:{' '}
                <span className="text-[#16A34A] font-bold">
                  {ledger.totalCreditFormatted}
                </span>
              </div>
            </div>
          </div>

          {/* Prominent Net Balance Badge */}
          <div
            className={`p-3.5 sm:px-5 sm:py-3 rounded-xl border text-left sm:text-right ${
              ledger.statusVariant === 'positive'
                ? 'bg-[#F0FDF4] border-[#86EFAC]'
                : ledger.statusVariant === 'negative'
                ? 'bg-[#FEF2F2] border-[#FCA5A5]'
                : 'bg-[#F8FAFC] border-[#CBD5E1]'
            }`}
          >
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#57534E]">
              NET BALANCE
            </div>
            <div
              className={`text-2xl font-extrabold tracking-tight ${
                ledger.statusVariant === 'positive'
                  ? 'text-[#15803D]'
                  : ledger.statusVariant === 'negative'
                  ? 'text-[#B91C1C]'
                  : 'text-[#475569]'
              }`}
            >
              {ledger.netBalanceFormatted}
            </div>
            <div className="text-xs font-medium text-[#1C1917] mt-0.5">
              {ledger.statusText}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
