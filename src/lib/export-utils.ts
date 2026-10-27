import { Transaction } from '@/types/transaction';
import { Person } from '@/types/person';
import { formatPaiseToRupees, calculateLedger } from './calculations';

/**
 * Generate and download a clean CSV export for a person's transaction ledger
 */
export function exportPersonLedgerToCSV(person: Person, transactions: Transaction[]) {
  const ledger = calculateLedger(transactions);

  const headers = [
    'No.',
    'Date',
    'Occasion / Gift Details',
    'Direction',
    'Gift Type',
    'Debit (We Gave)',
    'Credit (They Gave)',
    'Quantity',
    'Unit',
    'Notes',
  ];

  const rows = transactions.map((tx, index) => {
    const hasCash = typeof tx.amountInPaise === 'number' && tx.amountInPaise > 0;
    const debit = hasCash && tx.direction === 'DEBIT'
      ? (tx.amountInPaise / 100).toFixed(2)
      : (tx.direction === 'DEBIT' ? 'Gift only' : '—');
    const credit = hasCash && tx.direction === 'CREDIT'
      ? (tx.amountInPaise / 100).toFixed(2)
      : (tx.direction === 'CREDIT' ? 'Gift only' : '—');

    return [
      index + 1,
      `"${tx.date}"`,
      `"${(tx.occasion || '').replace(/"/g, '""')}"`,
      `"${tx.direction === 'DEBIT' ? 'Debit (We Gave)' : 'Credit (They Gave)'}"`,
      `"${tx.giftType}"`,
      `"${debit}"`,
      `"${credit}"`,
      tx.quantity || '',
      `"${tx.unit || ''}"`,
      `"${(tx.notes || '').replace(/"/g, '""')}"`,
    ].join(',');
  });

  // Append summary row
  const summaryRows = [
    '',
    `"SUMMARY FOR ${person.fullName.toUpperCase()}"`,
    `"Total Debit: ${ledger.totalDebitFormatted}"`,
    `"Total Credit: ${ledger.totalCreditFormatted}"`,
    `"Net Balance: ${ledger.netBalanceFormatted} (${ledger.statusText})"`,
  ];

  const csvContent =
    '\uFEFF' + // UTF-8 BOM for Excel compatibility
    [headers.join(','), ...rows, ...summaryRows].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeName = person.fullName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  link.setAttribute('href', url);
  link.setAttribute('download', `riwaaj_ledger_${safeName}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
