'use client';

import React, { useState, useEffect } from 'react';
import { Person } from '@/types/person';
import {
  Transaction,
  TransactionFormData,
  TransactionDirection,
  GiftType,
} from '@/types/transaction';
import { paiseToRupees } from '@/lib/calculations';
import { DEFAULT_OCCASION_SUGGESTIONS } from '@/lib/transaction-service';
import {
  X,
  PlusCircle,
  Check,
  AlertCircle,
  IndianRupee,
  Gift,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: TransactionFormData, addAnother?: boolean) => Promise<void>;
  person: Person;
  existingTransactions?: Transaction[];
  txToEdit?: Transaction | null;
}

export function AddTransactionModal({
  isOpen,
  onClose,
  onSave,
  person,
  existingTransactions = [],
  txToEdit,
}: AddTransactionModalProps) {
  const isEditing = Boolean(txToEdit);

  // Today's local date in YYYY-MM-DD
  const getTodayDate = () => new Date().toISOString().split('T')[0];

  const [date, setDate] = useState(getTodayDate());
  const [occasion, setOccasion] = useState('');
  const [direction, setDirection] = useState<TransactionDirection>('CREDIT');
  const [giftType, setGiftType] = useState<GiftType>('CASH');
  const [amountInRupees, setAmountInRupees] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('1');
  const [unit, setUnit] = useState<string>('packet');
  const [description, setDescription] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [showAccompanyingGift, setShowAccompanyingGift] = useState<boolean>(false);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Build suggestion list combining defaults + previously entered occasions
  const allSuggestions = Array.from(
    new Set([
      ...DEFAULT_OCCASION_SUGGESTIONS,
      ...existingTransactions.map((t) => t.occasion).filter(Boolean),
    ])
  );

  useEffect(() => {
    if (txToEdit) {
      setDate(txToEdit.date || getTodayDate());
      setOccasion(txToEdit.occasion || '');
      setDirection(txToEdit.direction || 'CREDIT');
      setGiftType(txToEdit.giftType || 'CASH');
      setAmountInRupees(
        typeof txToEdit.amountInPaise === 'number' && txToEdit.amountInPaise > 0
          ? (paiseToRupees(txToEdit.amountInPaise)).toString()
          : ''
      );
      setQuantity(txToEdit.quantity ? txToEdit.quantity.toString() : '1');
      setUnit(txToEdit.unit || 'packet');
      setDescription(txToEdit.description || '');
      setNotes(txToEdit.notes || '');
      setShowAccompanyingGift(Boolean(txToEdit.giftType === 'CASH' && txToEdit.unit));
    } else {
      setDate(getTodayDate());
      setOccasion('');
      setDirection('CREDIT');
      setGiftType('CASH');
      setAmountInRupees('');
      setQuantity('1');
      setUnit('packet');
      setDescription('');
      setNotes('');
      setShowAccompanyingGift(false);
    }
    setError(null);
  }, [txToEdit, isOpen]);

  const handleSubmit = async (addAnother: boolean = false) => {
    // Prevent accidental duplicate submissions
    if (submitting) return;

    if (!date) {
      setError('Transaction date is required.');
      return;
    }
    if (!occasion.trim()) {
      setError('Occasion / Gift Name is required. You can type any custom name.');
      return;
    }

    let parsedAmount: number | undefined = undefined;
    if (giftType === 'CASH') {
      const amtNum = parseFloat(amountInRupees);
      if (isNaN(amtNum) || amtNum <= 0) {
        setError('Please enter a valid cash amount in Rupees (greater than 0).');
        return;
      }
      parsedAmount = amtNum;
    } else {
      // For Toffee Packet, Badam, etc., Cash Amount column is optional
      if (amountInRupees && amountInRupees.trim() !== '') {
        const amtNum = parseFloat(amountInRupees);
        if (!isNaN(amtNum) && amtNum > 0) {
          parsedAmount = amtNum;
        } else if (!isNaN(amtNum) && amtNum < 0) {
          setError('Cash amount cannot be negative.');
          return;
        }
      }
    }

    let parsedQuantity: number = 0;
    let finalUnit = '';
    if (giftType !== 'CASH') {
      const qNum = parseInt(quantity, 10);
      parsedQuantity = !isNaN(qNum) && qNum > 0 ? qNum : 1;
      finalUnit = unit.trim() || 'packet';
    } else if (showAccompanyingGift && unit.trim()) {
      const qNum = parseInt(quantity, 10);
      parsedQuantity = !isNaN(qNum) && qNum > 0 ? qNum : 1;
      finalUnit = unit.trim();
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload: TransactionFormData = {
        date,
        occasion: occasion.trim(),
        direction,
        giftType,
        amountInRupees: parsedAmount,
        quantity: parsedQuantity,
        unit: finalUnit,
        description: description.trim(),
        notes: notes.trim(),
      };

      await onSave(payload, addAnother);

      if (addAnother) {
        // Reset for next entry, keeping date & direction convenient
        setOccasion('');
        setAmountInRupees('');
        setNotes('');
      } else {
        onClose();
      }
    } catch (err: any) {
      console.error('Error saving transaction:', err);
      let readableMsg = err?.message || 'Failed to save transaction. Please check inputs.';
      if (
        err?.code === 'permission-denied' ||
        readableMsg.includes('permission-denied') ||
        readableMsg.includes('insufficient permissions')
      ) {
        readableMsg = 'Permission denied: Please ensure you are logged into your account.';
      } else if (
        err?.code === 'not-found' ||
        readableMsg.includes('(default)') ||
        readableMsg.includes('not found')
      ) {
        readableMsg = "Cloud Firestore database '(default)' not found. Please create it in your Firebase Console (Build > Firestore Database).";
      } else if (
        err?.code === 'unavailable' ||
        readableMsg.includes('unavailable')
      ) {
        readableMsg = 'Firestore service is currently unavailable. Please check your internet connection.';
      }
      setError(readableMsg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-[#E7E2D8] overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-[#F0ECE1] bg-[#FAF8F5]">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#0F5132]/10 text-[#0F5132] flex items-center justify-center">
                <PlusCircle className="w-4 h-4" />
              </div>
              <h2 className="font-semibold text-lg text-[#1C1917]">
                {isEditing ? 'Edit Transaction' : 'Record Gift / Occasion'}
              </h2>
            </div>
            <p className="text-xs text-[#78716C] mt-0.5 ml-10">
              For: <span className="font-semibold text-[#1C1917]">{person.fullName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#78716C] hover:text-[#1C1917] hover:bg-black/5 transition-smooth"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4 max-h-[calc(85vh-120px)] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Date & Gift Type Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* A. Date */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#57534E] mb-1.5">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D6D0C4] bg-white text-sm text-[#1C1917] focus:outline-hidden focus:ring-2 focus:ring-[#0F5132] focus:border-transparent transition-smooth"
                id="tx-date-input"
              />
            </div>

            {/* D. Gift Type */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#57534E] mb-1.5">
                Gift Type <span className="text-red-500">*</span>
              </label>
              <select
                value={giftType}
                onChange={(e) => setGiftType(e.target.value as GiftType)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D6D0C4] bg-white text-sm text-[#1C1917] focus:outline-hidden focus:ring-2 focus:ring-[#0F5132] focus:border-transparent transition-smooth"
                id="tx-gifttype-select"
              >
                <option value="CASH">Cash Gift (₹)</option>
                <option value="TOFFEE_PACKET">Toffee Packet (with or without cash)</option>
                <option value="BADAM_ALMONDS">Badam / Almonds (with or without cash)</option>
                <option value="DRY_FRUITS">Dry Fruits Box (with or without cash)</option>
                <option value="HOUSEHOLD_GIFT">Household Gift (with or without cash)</option>
                <option value="OTHER">Other Gift (with or without cash)</option>
              </select>
            </div>
          </div>

          {/* C. Direction: Debit vs Credit */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#57534E] mb-1.5">
              Direction <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Credit: They Gave Us */}
              <button
                type="button"
                onClick={() => setDirection('CREDIT')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-semibold transition-smooth text-left ${
                  direction === 'CREDIT'
                    ? 'bg-[#F0FDF4] border-[#16A34A] text-[#166534] shadow-xs ring-1 ring-[#16A34A]'
                    : 'bg-white border-[#D6D0C4] text-[#57534E] hover:bg-[#FAF8F5]'
                }`}
                id="direction-credit-btn"
              >
                <ArrowDownLeft className="w-4 h-4 text-[#16A34A]" />
                <div>
                  <div className="leading-tight">Credit</div>
                  <div className="text-[11px] font-normal text-[#78716C]">They Gave Us</div>
                </div>
              </button>

              {/* Debit: We Gave Them */}
              <button
                type="button"
                onClick={() => setDirection('DEBIT')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-semibold transition-smooth text-left ${
                  direction === 'DEBIT'
                    ? 'bg-[#FEF2F2] border-[#DC2626] text-[#991B1B] shadow-xs ring-1 ring-[#DC2626]'
                    : 'bg-white border-[#D6D0C4] text-[#57534E] hover:bg-[#FAF8F5]'
                }`}
                id="direction-debit-btn"
              >
                <ArrowUpRight className="w-4 h-4 text-[#DC2626]" />
                <div>
                  <div className="leading-tight">Debit</div>
                  <div className="text-[11px] font-normal text-[#78716C]">We Gave Them</div>
                </div>
              </button>
            </div>
          </div>

          {/* B. Occasion / Gift Name (Free-Text with Suggestions) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#57534E]">
                Occasion / Gift Name <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] text-[#A8A29E]">Type any custom name</span>
            </div>
            <input
              type="text"
              required
              value={occasion}
              onChange={(e) => setOccasion(e.target.value)}
              placeholder="e.g. Shadi Mubarak, Mehndi Raat, Wazwan Mubarak..."
              list="occasion-datalist"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#D6D0C4] bg-white text-sm text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-hidden focus:ring-2 focus:ring-[#0F5132] focus:border-transparent transition-smooth"
              id="tx-occasion-input"
            />
            <datalist id="occasion-datalist">
              {allSuggestions.map((sug) => (
                <option key={sug} value={sug} />
              ))}
            </datalist>

            {/* Quick Suggestion Pills */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="text-[11px] text-[#78716C] self-center mr-1">Quick pick:</span>
              {['Shadi Mubarak', 'Mehndi Raat', 'Wazwan Mubarak', 'Eid Mubarak'].map((tag) => (
                <button
                  type="button"
                  key={tag}
                  onClick={() => setOccasion(tag)}
                  className="px-2 py-0.5 rounded-md text-[11px] bg-[#FAF8F5] border border-[#E7E2D8] text-[#57534E] hover:border-[#0F5132] hover:text-[#0F5132] transition-smooth"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* E. Amount & Gift Particulars */}
          {giftType === 'CASH' ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#57534E] mb-1.5">
                  Cash Amount (in ₹ Rupees) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#78716C] font-semibold text-base">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={amountInRupees}
                    onChange={(e) => setAmountInRupees(e.target.value)}
                    placeholder="e.g. 1000"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#D6D0C4] bg-white text-sm font-semibold text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-hidden focus:ring-2 focus:ring-[#0F5132] focus:border-transparent transition-smooth"
                    id="tx-amount-input"
                  />
                </div>
              </div>

              {/* Accompanying item toggle for Cash gift */}
              <div className="pt-0.5">
                <button
                  type="button"
                  onClick={() => setShowAccompanyingGift(!showAccompanyingGift)}
                  className="text-xs font-medium text-[#0F5132] hover:text-[#0b3d26] inline-flex items-center gap-1.5 transition-colors"
                >
                  <Gift className="w-3.5 h-3.5 text-[#C59B27]" />
                  <span>
                    {showAccompanyingGift
                      ? '− Remove accompanying gift item (Toffee/Badam)'
                      : '+ Also gave toffee, badam, or gift item?'}
                  </span>
                </button>

                {showAccompanyingGift && (
                  <div className="grid grid-cols-2 gap-3 mt-2 p-3.5 bg-[#FAF8F5] border border-[#E7E2D8] rounded-xl animate-in fade-in duration-150">
                    <div>
                      <label className="block text-[11px] font-medium text-[#78716C] mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        placeholder="1"
                        className="w-full px-3 py-2 rounded-lg border border-[#D6D0C4] bg-white text-sm text-[#1C1917] focus:outline-hidden focus:ring-2 focus:ring-[#0F5132]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[#78716C] mb-1">
                        Item / Unit (e.g. toffee packet, badam box)
                      </label>
                      <input
                        type="text"
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                        placeholder="packet"
                        className="w-full px-3 py-2 rounded-lg border border-[#D6D0C4] bg-white text-sm text-[#1C1917] focus:outline-hidden focus:ring-2 focus:ring-[#0F5132]"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-3.5 bg-[#FAF8F5] border border-[#E7E2D8] rounded-xl space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-[#57534E]">
                <div className="flex items-center gap-1.5">
                  <Gift className="w-3.5 h-3.5 text-[#C59B27]" />
                  <span>Gift & Cash Particulars</span>
                </div>
                <span className="text-[11px] font-medium text-[#15803D] bg-[#DCFCE7] px-2 py-0.5 rounded-md">
                  Cash + Gift Supported
                </span>
              </div>

              {/* 3 Columns: Cash (₹) + Quantity + Unit */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Column 1: Cash Amount */}
                <div>
                  <label className="block text-[11px] font-medium text-[#78716C] mb-1">
                    Cash Amount (₹) <span className="text-[#A8A29E] font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-[#78716C] font-semibold text-xs">
                      ₹
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={amountInRupees}
                      onChange={(e) => setAmountInRupees(e.target.value)}
                      placeholder="e.g. 500"
                      className="w-full pl-7 pr-2.5 py-2 rounded-lg border border-[#D6D0C4] bg-white text-sm font-semibold text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-hidden focus:ring-2 focus:ring-[#0F5132]"
                      id="tx-cash-gift-amount"
                    />
                  </div>
                </div>

                {/* Column 2: Quantity */}
                <div>
                  <label className="block text-[11px] font-medium text-[#78716C] mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="1"
                    className="w-full px-3 py-2 rounded-lg border border-[#D6D0C4] bg-white text-sm text-[#1C1917] focus:outline-hidden focus:ring-2 focus:ring-[#0F5132]"
                    id="tx-quantity-input"
                  />
                </div>

                {/* Column 3: Unit */}
                <div>
                  <label className="block text-[11px] font-medium text-[#78716C] mb-1">
                    Unit (packet, box, kg)
                  </label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="packet"
                    className="w-full px-3 py-2 rounded-lg border border-[#D6D0C4] bg-white text-sm text-[#1C1917] focus:outline-hidden focus:ring-2 focus:ring-[#0F5132]"
                    id="tx-unit-input"
                  />
                </div>
              </div>

              <p className="text-[11px] text-[#78716C] italic leading-relaxed">
                * Note: If cash was given along with the gift (e.g. ₹500 + toffee packet / badam), enter the cash in the Cash column above to include in Debit/Credit calculations. If only gift was given, leave Cash blank or 0.
              </p>
            </div>
          )}

          {/* F. Notes */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#57534E] mb-1.5">
              Notes <span className="text-xs text-[#A8A29E] font-normal normal-case">(Optional)</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Given at groom's residence, attended with family..."
              className="w-full px-3.5 py-2 rounded-xl border border-[#D6D0C4] bg-white text-sm text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-hidden focus:ring-2 focus:ring-[#0F5132] focus:border-transparent transition-smooth"
              id="tx-notes-input"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-end gap-2.5 px-6 py-4 border-t border-[#F0ECE1] bg-[#FAF8F5]">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2.5 rounded-xl border border-[#D6D0C4] text-sm font-medium text-[#57534E] hover:bg-white transition-smooth"
          >
            Cancel
          </button>

          {!isEditing && (
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl border border-[#0F5132] text-sm font-medium text-[#0F5132] bg-white hover:bg-[#EBF5EF] transition-smooth disabled:opacity-50"
              id="save-add-another-btn"
            >
              Save & Add Another
            </button>
          )}

          <button
            type="button"
            onClick={() => handleSubmit(false)}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#0F5132] hover:bg-[#0C4328] text-white text-sm font-medium transition-smooth shadow-sm disabled:opacity-50"
            id="save-transaction-btn"
          >
            {submitting ? (
              <span>Saving...</span>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>{isEditing ? 'Update Transaction' : 'Save Transaction'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
