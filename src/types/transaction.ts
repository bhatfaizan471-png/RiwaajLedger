export type TransactionDirection = 'DEBIT' | 'CREDIT';

export type GiftType =
  | 'CASH'
  | 'TOFFEE_PACKET'
  | 'BADAM_ALMONDS'
  | 'DRY_FRUITS'
  | 'HOUSEHOLD_GIFT'
  | 'OTHER';

export interface Transaction {
  id: string;
  personId: string;
  userId: string;
  date: string; // YYYY-MM-DD
  occasion: string; // Free-text custom occasion or gift name
  direction: TransactionDirection; // DEBIT = We gave them; CREDIT = They gave us
  giftType: GiftType;
  amountInPaise: number; // Integer paise (e.g. ₹100 = 10000 paise). 0 for non-cash.
  quantity: number; // For non-cash gifts (e.g. 1, 2). 0 for cash.
  unit: string; // e.g. "packet", "box", "kg", "piece". Empty string "" when not specified.
  description: string; // Empty string "" when not specified.
  notes: string; // Empty string "" when not specified.
  createdAt: number;
  updatedAt: number;
  isDeleted?: boolean;
  deletedAt?: number;
}

export interface TransactionFormData {
  date: string;
  occasion: string;
  direction: TransactionDirection;
  giftType: GiftType;
  amountInRupees?: number; // User inputs in rupees
  quantity?: number;
  unit?: string;
  description?: string;
  notes?: string;
}

export interface LedgerCalculationResult {
  totalDebitPaise: number;
  totalCreditPaise: number;
  netBalancePaise: number;
  // Formatted rupee representations:
  totalDebitFormatted: string;
  totalCreditFormatted: string;
  netBalanceFormatted: string;
  statusText: string;
  statusVariant: 'positive' | 'negative' | 'neutral';
}
