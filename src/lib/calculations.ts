import { Transaction, LedgerCalculationResult } from '@/types/transaction';

/**
 * Format integer paise into an Indian Rupee string (e.g., ₹1,000 or ₹2,500.50).
 */
export function formatPaiseToRupees(paise: number, includeSign: boolean = false): string {
  const isNegative = paise < 0;
  const absPaise = Math.abs(paise);
  const rupees = absPaise / 100;

  // Check if there are fractional paise
  const hasDecimals = absPaise % 100 !== 0;

  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(rupees);

  if (includeSign) {
    if (paise > 0) return `+${formatted}`;
    if (paise < 0) return `-${formatted}`;
  } else if (isNegative) {
    return `-${formatted}`;
  }

  return formatted;
}

/**
 * Convert rupee number input into integer paise (avoids float inaccuracies)
 */
export function rupeesToPaise(rupees: number): number {
  if (isNaN(rupees) || rupees < 0) return 0;
  return Math.round(rupees * 100);
}

/**
 * Convert integer paise back into rupees number
 */
export function paiseToRupees(paise: number): number {
  if (isNaN(paise)) return 0;
  return paise / 100;
}

/**
 * Calculate totals and net balance for a list of transactions.
 * Accounting convention:
 * - DEBIT = Money WE gave them (attendance, wedding, gift, etc.)
 * - CREDIT = Money THEY gave us (attendance, gift received, etc.)
 * - NET BALANCE = Total Credit - Total Debit
 *
 * Interpretation:
 * - Positive: "They gave us ₹X more."
 * - Negative: "We gave them ₹X more."
 * - Zero: "Hisab Barabar" / "₹0 Difference"
 */
export function calculateLedger(transactions: Transaction[]): LedgerCalculationResult {
  let totalDebitPaise = 0;
  let totalCreditPaise = 0;

  for (const tx of transactions) {
    // Any transaction with cash amount (pure cash or cash + gift like toffee/badam) counts towards cash debit/credit
    if (typeof tx.amountInPaise === 'number' && tx.amountInPaise > 0) {
      if (tx.direction === 'DEBIT') {
        totalDebitPaise += tx.amountInPaise;
      } else if (tx.direction === 'CREDIT') {
        totalCreditPaise += tx.amountInPaise;
      }
    }
  }

  const netBalancePaise = totalCreditPaise - totalDebitPaise;

  let statusText = 'Hisab Barabar (₹0 Difference)';
  let statusVariant: 'positive' | 'negative' | 'neutral' = 'neutral';

  if (netBalancePaise > 0) {
    statusText = `They gave us ${formatPaiseToRupees(netBalancePaise)} more.`;
    statusVariant = 'positive';
  } else if (netBalancePaise < 0) {
    statusText = `We gave them ${formatPaiseToRupees(Math.abs(netBalancePaise))} more.`;
    statusVariant = 'negative';
  }

  return {
    totalDebitPaise,
    totalCreditPaise,
    netBalancePaise,
    totalDebitFormatted: formatPaiseToRupees(totalDebitPaise),
    totalCreditFormatted: formatPaiseToRupees(totalCreditPaise),
    netBalanceFormatted: formatPaiseToRupees(netBalancePaise, true),
    statusText,
    statusVariant,
  };
}

/**
 * Extract distinct sorted years from transactions for the year filter
 */
export function extractTransactionYears(transactions: Transaction[]): string[] {
  const years = new Set<string>();
  for (const tx of transactions) {
    if (tx.date) {
      const yr = tx.date.split('-')[0];
      if (yr && yr.length === 4) {
        years.add(yr);
      }
    }
  }
  return Array.from(years).sort((a, b) => b.localeCompare(a)); // Descending years
}
