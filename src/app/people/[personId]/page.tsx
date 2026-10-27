'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Navbar } from '@/components/layout/Navbar';
import { LedgerSummaryCard } from '@/components/transactions/LedgerSummaryCard';
import { TransactionTable } from '@/components/transactions/TransactionTable';
import { AddTransactionModal } from '@/components/transactions/AddTransactionModal';
import { DeleteTransactionModal } from '@/components/transactions/DeleteTransactionModal';
import { AddPersonModal } from '@/components/contacts/AddPersonModal';
import { DeletePersonModal } from '@/components/contacts/DeletePersonModal';
import { Person, PersonFormData } from '@/types/person';
import {
  Transaction,
  TransactionFormData,
} from '@/types/transaction';
import { getPerson, updatePerson, deletePerson } from '@/lib/people-service';
import {
  getTransactions,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  restoreTransaction,
  sortTransactionsByDate,
} from '@/lib/transaction-service';
import { calculateLedger, extractTransactionYears } from '@/lib/calculations';
import { exportPersonLedgerToCSV } from '@/lib/export-utils';
import {
  ArrowLeft,
  Plus,
  Printer,
  Download,
  Pencil,
  Trash2,
  Phone,
  MapPin,
  Calendar,
  ArrowUpDown,
  BookOpen,
} from 'lucide-react';

function PersonLedgerContent() {
  const params = useParams();
  const personId = (params?.personId as string) || '';
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [person, setPerson] = useState<Person | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Sorting
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [newestFirst, setNewestFirst] = useState<boolean>(true);

  // Modals state
  const [isAddTxOpen, setIsAddTxOpen] = useState(false);
  const [txToEdit, setTxToEdit] = useState<Transaction | null>(null);
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);
  const [isEditPersonOpen, setIsEditPersonOpen] = useState(false);
  const [isDeletePersonOpen, setIsDeletePersonOpen] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastUndoAction, setToastUndoAction] = useState<(() => Promise<void>) | null>(null);

  const showToast = (msg: string, undoAction?: () => Promise<void>) => {
    setToastMessage(msg);
    setToastUndoAction(undoAction ? () => undoAction : null);
    setTimeout(() => {
      setToastMessage(null);
      setToastUndoAction(null);
    }, 6000);
  };

  // Auth protection
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Load person and their transactions
  const loadData = async () => {
    if (!user || !personId) return;
    try {
      setLoading(true);
      const [personData, txData] = await Promise.all([
        getPerson(user.uid, personId),
        getTransactions(user.uid, personId),
      ]);
      setPerson(personData);
      setTransactions(txData);
    } catch (err) {
      console.error('Error loading ledger data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && personId) {
      loadData();
    }
  }, [user, personId]);

  // Available distinct years dynamically extracted from transaction dates
  const availableYears = useMemo(() => {
    return extractTransactionYears(transactions);
  }, [transactions]);

  // Filter transactions by selected year
  const filteredTransactions = useMemo(() => {
    let list = transactions;
    if (selectedYear !== 'ALL') {
      list = list.filter((t) => t.date && t.date.startsWith(selectedYear));
    }
    return sortTransactionsByDate(list, newestFirst);
  }, [transactions, selectedYear, newestFirst]);

  // Calculation for current filtered view
  const currentCalculation = useMemo(() => {
    return calculateLedger(filteredTransactions);
  }, [filteredTransactions]);

  // Handlers for transactions
  const handleSaveTransaction = async (data: TransactionFormData, addAnother?: boolean) => {
    if (!user || !person) {
      throw new Error('User or contact information is not loaded. Please try again.');
    }
    if (txToEdit) {
      await updateTransaction(user.uid, person.id, txToEdit.id, data);
      showToast('Transaction updated');
      setTxToEdit(null);
    } else {
      const created = await addTransaction(user.uid, person.id, data);
      showToast(`Recorded "${created.occasion}"`);
    }
    // Refresh list from exact Firestore collection path
    const fresh = await getTransactions(user.uid, person.id);
    setTransactions(fresh);
  };

  const handleConfirmDeleteTx = async () => {
    if (!user || !person || !txToDelete) return;
    const deletedId = txToDelete.id;
    const deletedOccasion = txToDelete.occasion;
    await deleteTransaction(user.uid, person.id, deletedId);
    setTxToDelete(null);
    const fresh = await getTransactions(user.uid, person.id);
    setTransactions(fresh);
    showToast(`"${deletedOccasion}" moved to Recycle Bin`, async () => {
      await restoreTransaction(user.uid, person.id, deletedId);
      const restored = await getTransactions(user.uid, person.id);
      setTransactions(restored);
      showToast(`Restored "${deletedOccasion}"`);
    });
  };

  // Handlers for person
  const handleUpdatePerson = async (data: PersonFormData) => {
    if (!user || !person) return;
    await updatePerson(user.uid, person.id, data);
    setPerson((prev) => (prev ? { ...prev, ...data, normalizedName: data.fullName.toLowerCase().trim() } : null));
    showToast('Contact details updated');
  };

  const handleConfirmDeletePerson = async () => {
    if (!user || !person) return;
    const deletedId = person.id;
    const deletedName = person.fullName;
    await deletePerson(user.uid, person.id);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(
        'riwaaj_just_deleted_person',
        JSON.stringify({ id: deletedId, name: deletedName })
      );
    }
    router.push('/people');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!person) return;
    exportPersonLedgerToCSV(person, filteredTransactions);
    showToast('CSV downloaded');
  };

  if (authLoading || (loading && !person)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5]">
        <div className="w-8 h-8 border-3 border-[#0F5132] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!person) {
    return (
      <div className="min-h-screen flex flex-col bg-[#FAF8F5]">
        <Navbar />
        <div className="max-w-md mx-auto my-auto p-6 text-center">
          <h2 className="text-lg font-bold text-[#1C1917] mb-2">Person Not Found</h2>
          <p className="text-xs text-[#78716C] mb-4">
            This person may have been deleted or does not exist in your account.
          </p>
          <Link
            href="/people"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0F5132] text-white text-sm font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Contacts</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] pb-24 sm:pb-16">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 pt-5 sm:pt-7">
        {/* Navigation & Header Section */}
        <div className="mb-6">
          {/* Back button */}
          <Link
            href="/people"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#78716C] hover:text-[#0F5132] transition-colors mb-3 no-print"
            id="back-to-contacts-link"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to My People</span>
          </Link>

          {/* Person Header Card */}
          <div className="bg-white rounded-2xl border border-[#E7E2D8] p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-baseline gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1C1917] tracking-tight">
                  {person.fullName}
                </h1>
                {person.parentageName && (
                  <span className="text-sm sm:text-base font-semibold text-[#57534E]">
                    ({person.parentageRelation || 'S/o'} {person.parentageName})
                  </span>
                )}
                <button
                  onClick={() => setIsEditPersonOpen(true)}
                  className="p-1.5 rounded-lg text-[#78716C] hover:text-[#0F5132] hover:bg-[#FAF8F5] transition-smooth no-print cursor-pointer"
                  title="Edit Person Details"
                  id="edit-person-btn"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-xs text-[#78716C]">
                {person.mohalla && (
                  <span className="inline-flex items-center gap-1 font-semibold text-[#0F5132] bg-[#EBF5EF] px-2.5 py-1 rounded-md border border-[#D1E7DD]">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{person.mohalla}</span>
                  </span>
                )}
                {person.phone && (
                  <span className="inline-flex items-center gap-1 font-medium text-[#44403C]">
                    <Phone className="w-3.5 h-3.5 text-[#A8A29E]" />
                    <span>{person.phone}</span>
                  </span>
                )}
                {person.relationship && (
                  <span className="text-[#8B847A] italic">
                    Relationship: {person.relationship}
                  </span>
                )}
              </div>

              {person.notes && (
                <p className="text-xs text-[#78716C] mt-2 italic max-w-xl">
                  {person.notes}
                </p>
              )}
            </div>

            {/* Header Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 no-print">
              <button
                onClick={handlePrint}
                className="p-2 sm:px-3 sm:py-2 rounded-xl border border-[#D6D0C4] bg-white text-xs font-semibold text-[#57534E] hover:bg-[#FAF8F5] transition-smooth inline-flex items-center gap-1.5 cursor-pointer"
                title="Print Ledger"
                id="print-ledger-btn"
              >
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">Print</span>
              </button>

              <button
                onClick={handleExportCSV}
                className="p-2 sm:px-3 sm:py-2 rounded-xl border border-[#D6D0C4] bg-white text-xs font-semibold text-[#57534E] hover:bg-[#FAF8F5] transition-smooth inline-flex items-center gap-1.5 cursor-pointer"
                title="Export to CSV"
                id="export-csv-btn"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export CSV</span>
              </button>

              <button
                onClick={() => setIsDeletePersonOpen(true)}
                className="p-2 rounded-xl border border-[#FEE2E2] bg-white text-xs font-semibold text-[#DC2626] hover:bg-red-50 transition-smooth cursor-pointer"
                title="Delete Contact"
                id="delete-person-btn"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  setTxToEdit(null);
                  setIsAddTxOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0F5132] hover:bg-[#0C4328] text-white text-xs sm:text-sm font-semibold transition-smooth shadow-sm cursor-pointer ml-1"
                id="add-transaction-btn"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Add Transaction</span>
              </button>
            </div>
          </div>
        </div>

        {/* Toast */}
        {toastMessage && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs sm:text-sm text-emerald-800 font-medium flex items-center justify-between gap-2 animate-in fade-in slide-in-from-top-2 duration-150 no-print">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{toastMessage}</span>
            </div>
            {toastUndoAction && (
              <button
                onClick={async () => {
                  await toastUndoAction();
                  setToastMessage(null);
                  setToastUndoAction(null);
                }}
                className="underline font-bold text-emerald-900 hover:text-emerald-950 px-2 py-0.5 rounded cursor-pointer"
                id="undo-action-btn"
              >
                Undo
              </button>
            )}
          </div>
        )}

        {/* Balance Summary Card */}
        <LedgerSummaryCard
          calculation={currentCalculation}
          selectedYear={selectedYear}
        />

        {/* Controls: Year Filter and Sort */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 no-print">
          {/* Year Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#57534E] flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#0F5132]" />
              <span>Year:</span>
            </span>
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-[#D6D0C4] shadow-2xs">
              <button
                onClick={() => setSelectedYear('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-smooth cursor-pointer ${
                  selectedYear === 'ALL'
                    ? 'bg-[#0F5132] text-white shadow-2xs'
                    : 'text-[#57534E] hover:text-[#1C1917]'
                }`}
                id="filter-year-all-btn"
              >
                All Years
              </button>
              {availableYears.map((yr) => (
                <button
                  key={yr}
                  onClick={() => setSelectedYear(yr)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-smooth cursor-pointer ${
                    selectedYear === yr
                      ? 'bg-[#0F5132] text-white shadow-2xs'
                      : 'text-[#57534E] hover:text-[#1C1917]'
                  }`}
                  id={`filter-year-${yr}-btn`}
                >
                  {yr}
                </button>
              ))}
            </div>
          </div>

          {/* Sort Order Toggle */}
          <button
            onClick={() => setNewestFirst(!newestFirst)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#D6D0C4] bg-white text-xs font-medium text-[#57534E] hover:bg-[#FAF8F5] transition-smooth cursor-pointer"
            title="Toggle Sort Order"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-[#78716C]" />
            <span>{newestFirst ? 'Newest first' : 'Oldest first'}</span>
          </button>
        </div>

        {/* Print-only Header */}
        <div className="hidden print-header print-only">
          <h2 className="text-xl font-bold text-black">{person.fullName} — Gift Ledger</h2>
          <p className="text-xs text-gray-700">
            Riwaaj Ledger • {selectedYear === 'ALL' ? 'Complete Transaction History' : `Year ${selectedYear}`} • Generated on {new Date().toLocaleDateString('en-GB')}
          </p>
        </div>

        {/* Transaction Table */}
        <TransactionTable
          transactions={filteredTransactions}
          onEdit={(tx) => {
            setTxToEdit(tx);
            setIsAddTxOpen(true);
          }}
          onDelete={(tx) => {
            setTxToDelete(tx);
          }}
          selectedYear={selectedYear}
        />
      </main>

      {/* Floating Action Button for Adding Transaction on Mobile */}
      <div className="sm:hidden fixed bottom-6 right-6 z-20 no-print">
        <button
          onClick={() => {
            setTxToEdit(null);
            setIsAddTxOpen(true);
          }}
          className="w-14 h-14 rounded-full bg-[#0F5132] text-white flex items-center justify-center shadow-lg hover:bg-[#0C4328] active:scale-95 transition-smooth"
          title="Add Transaction"
          aria-label="Add Transaction"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>
      </div>

      {/* Add / Edit Transaction Modal */}
      <AddTransactionModal
        isOpen={isAddTxOpen}
        onClose={() => {
          setIsAddTxOpen(false);
          setTxToEdit(null);
        }}
        onSave={handleSaveTransaction}
        person={person}
        existingTransactions={transactions}
        txToEdit={txToEdit}
      />

      {/* Delete Transaction Modal */}
      <DeleteTransactionModal
        isOpen={Boolean(txToDelete)}
        onClose={() => setTxToDelete(null)}
        onConfirm={handleConfirmDeleteTx}
        transaction={txToDelete}
      />

      {/* Edit Person Modal */}
      <AddPersonModal
        isOpen={isEditPersonOpen}
        onClose={() => setIsEditPersonOpen(false)}
        onSave={handleUpdatePerson}
        personToEdit={person}
      />

      {/* Delete Person Modal */}
      <DeletePersonModal
        isOpen={isDeletePersonOpen}
        onClose={() => setIsDeletePersonOpen(false)}
        onConfirm={handleConfirmDeletePerson}
        person={person}
      />
    </div>
  );
}

export default function PersonLedgerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5]">
          <div className="w-8 h-8 border-3 border-[#0F5132] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <PersonLedgerContent />
    </Suspense>
  );
}
