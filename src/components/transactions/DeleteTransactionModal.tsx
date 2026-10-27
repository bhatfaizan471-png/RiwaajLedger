'use client';

import React, { useState } from 'react';
import { Transaction } from '@/types/transaction';
import { AlertTriangle, Trash2 } from 'lucide-react';

interface DeleteTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  transaction: Transaction | null;
}

export function DeleteTransactionModal({
  isOpen,
  onClose,
  onConfirm,
  transaction,
}: DeleteTransactionModalProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !transaction) return null;

  const handleDelete = async () => {
    try {
      setDeleting(true);
      setError(null);
      await onConfirm();
      onClose();
    } catch (err: any) {
      console.error('Delete transaction error:', err);
      setError(err?.message || 'Could not delete transaction. Please check your connection and retry.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-[#E7E2D8] p-6">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6" />
        </div>

        <h3 className="font-semibold text-lg text-center text-[#1C1917] mb-2">
          Delete Transaction?
        </h3>

        <p className="text-sm text-center text-[#78716C] mb-4 leading-relaxed">
          Are you sure you want to delete the transaction <strong className="text-[#1C1917]">"{transaction.occasion}"</strong> ({transaction.date})? Your active ledger balance will be automatically recalculated.
        </p>

        {error && (
          <div className="mb-4 p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="flex-1 py-2.5 rounded-xl border border-[#D6D0C4] text-sm font-medium text-[#57534E] hover:bg-[#FAF8F5] transition-smooth"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-sm font-medium transition-smooth shadow-sm disabled:opacity-50"
            id="confirm-delete-tx-btn"
          >
            <Trash2 className="w-4 h-4" />
            <span>{deleting ? 'Deleting...' : 'Delete'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
