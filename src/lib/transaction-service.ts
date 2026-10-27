import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from './firebase';
import { Transaction, TransactionFormData } from '@/types/transaction';
import { rupeesToPaise } from './calculations';

const LOCAL_STORAGE_TX_KEY = (userId: string, personId: string) =>
  `riwaaj_transactions_${userId}_${personId}`;

/**
 * Determines whether the active session can and should write to Cloud Firestore.
 * Prevents unauthenticated demo accounts from throwing Firestore permission errors.
 */
export function shouldUseFirestore(userId: string): boolean {
  if (!isFirebaseConfigured || !db) return false;
  if (!userId || userId.startsWith('demo_')) return false;
  if (typeof window !== 'undefined' && auth && !auth.currentUser) return false;
  return true;
}

export const DEFAULT_OCCASION_SUGGESTIONS = [
  'Shadi Mubarak',
  'Mehndi Raat',
  'Mehndi Raat Mubarak',
  'Wazwan Mubarak',
  'Engagement',
  'Nikah Mubarak',
  'Eid Mubarak',
  'Badam Packet',
  'Toffee Packet',
  'Family Function',
];

/**
 * Helper to race a Firestore Promise against a timeout so the UI never hangs indefinitely
 * when the database is unprovisioned, offline, or experiencing network drop.
 */
export async function withFirestoreTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 8000,
  operationName: string = 'Firestore operation'
): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(
        new Error(
          `${operationName} timed out after ${timeoutMs / 1000}s. Please check that Cloud Firestore database '(default)' is created in the Firebase console and your network connection is active.`
        )
      );
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch all transactions for a person
 */
export async function getTransactions(
  userId: string,
  personId: string
): Promise<Transaction[]> {
  if (!userId || !personId) return [];

  if (shouldUseFirestore(userId) && db) {
    try {
      const txCol = collection(db, 'users', userId, 'people', personId, 'transactions');
      const snapshot = await withFirestoreTimeout(
        getDocs(txCol),
        8000,
        'Loading transactions from Cloud Firestore'
      );
      const list: Transaction[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        if (data.isDeleted) return; // Exclude deleted transactions from active ledger
        list.push({
          id: d.id,
          personId,
          userId,
          date: data.date || '',
          occasion: data.occasion || '',
          direction: data.direction || 'CREDIT',
          giftType: data.giftType || 'CASH',
          amountInPaise: typeof data.amountInPaise === 'number' ? data.amountInPaise : 0,
          quantity: typeof data.quantity === 'number' ? data.quantity : 0,
          unit: data.unit || '',
          description: data.description || '',
          notes: data.notes || '',
          isDeleted: false,
          createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : (data.createdAt || Date.now()),
          updatedAt: data.updatedAt?.toMillis ? data.updatedAt.toMillis() : (data.updatedAt || Date.now()),
        });
      });

      // Update local storage cache
      if (typeof window !== 'undefined') {
        localStorage.setItem(LOCAL_STORAGE_TX_KEY(userId, personId), JSON.stringify(list));
      }

      return sortTransactionsByDate(list, true);
    } catch (err) {
      console.error('Firestore getTransactions error, fallback to local cache:', err);
    }
  }

  // Local storage fallback
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(LOCAL_STORAGE_TX_KEY(userId, personId));
    if (raw) {
      try {
        const parsed: Transaction[] = JSON.parse(raw);
        return sortTransactionsByDate(parsed.filter((t) => !t.isDeleted), true);
      } catch {
        return [];
      }
    }
  }
  return [];
}

/**
 * Add a new transaction.
 * Guarantees NO field is undefined when writing to Firestore.
 */
export async function addTransaction(
  userId: string,
  personId: string,
  data: TransactionFormData
): Promise<Transaction> {
  if (!userId || !personId) {
    throw new Error('User ID and Person ID are required to save a transaction.');
  }

  const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const now = Date.now();

  const amountInPaise =
    typeof data.amountInRupees === 'number' && data.amountInRupees > 0
      ? rupeesToPaise(data.amountInRupees)
      : 0;

  const hasGiftParticulars = data.giftType !== 'CASH' || (data.unit && data.unit.trim().length > 0);
  const quantity = hasGiftParticulars ? (data.quantity || 1) : 0;
  const unit = hasGiftParticulars ? (data.unit || '').trim() : '';

  const newTx: Transaction = {
    id: transactionId,
    personId,
    userId,
    date: data.date,
    occasion: (data.occasion || '').trim(),
    direction: data.direction,
    giftType: data.giftType,
    amountInPaise,
    quantity,
    unit,
    description: (data.description || '').trim(),
    notes: (data.notes || '').trim(),
    createdAt: now,
    updatedAt: now,
  };

  if (shouldUseFirestore(userId) && db) {
    try {
      const txRef = doc(db, 'users', userId, 'people', personId, 'transactions', transactionId);
      await withFirestoreTimeout(
        setDoc(txRef, {
          id: newTx.id,
          personId: newTx.personId,
          userId: newTx.userId,
          date: newTx.date,
          occasion: newTx.occasion,
          direction: newTx.direction,
          giftType: newTx.giftType,
          amountInPaise: newTx.amountInPaise,
          quantity: newTx.quantity,
          unit: newTx.unit,
          description: newTx.description,
          notes: newTx.notes,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }),
        8000,
        'Saving transaction to Cloud Firestore'
      );
    } catch (err: any) {
      console.error('Firestore addTransaction error:', err);
      throw err;
    }
  }

  // Sync to local cache safely without extra network roundtrips
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_TX_KEY(userId, personId));
      const currentList: Transaction[] = raw ? JSON.parse(raw) : [];
      const updated = [newTx, ...currentList.filter((t) => t.id !== newTx.id)];
      localStorage.setItem(LOCAL_STORAGE_TX_KEY(userId, personId), JSON.stringify(updated));
    } catch (e) {
      console.warn('Local cache sync error:', e);
    }
  }

  return newTx;
}

/**
 * Update an existing transaction.
 * Guarantees no undefined values in updatePayload.
 */
export async function updateTransaction(
  userId: string,
  personId: string,
  transactionId: string,
  data: Partial<TransactionFormData>
): Promise<void> {
  if (!userId || !personId || !transactionId) {
    throw new Error('User ID, Person ID, and Transaction ID are required to update a transaction.');
  }

  const updatePayload: Record<string, any> = {
    updatedAt: serverTimestamp(),
  };

  if (data.date !== undefined) updatePayload.date = data.date;
  if (data.occasion !== undefined) updatePayload.occasion = data.occasion.trim();
  if (data.direction !== undefined) updatePayload.direction = data.direction;
  if (data.giftType !== undefined) updatePayload.giftType = data.giftType;
  if (data.notes !== undefined) updatePayload.notes = (data.notes || '').trim();

  // Allow cash amount for any gift type (e.g. Cash + Toffee Packet)
  if (data.amountInRupees !== undefined) {
    const amt = typeof data.amountInRupees === 'number' && data.amountInRupees > 0 ? data.amountInRupees : 0;
    updatePayload.amountInPaise = rupeesToPaise(amt);
  }

  if (data.quantity !== undefined) {
    updatePayload.quantity = data.quantity || 0;
  }
  if (data.unit !== undefined) {
    updatePayload.unit = (data.unit || '').trim();
  }
  if (data.description !== undefined) {
    updatePayload.description = (data.description || '').trim();
  }

  if (shouldUseFirestore(userId) && db) {
    try {
      const txRef = doc(db, 'users', userId, 'people', personId, 'transactions', transactionId);
      await withFirestoreTimeout(
        updateDoc(txRef, updatePayload),
        8000,
        'Updating transaction in Cloud Firestore'
      );
    } catch (err) {
      console.error('Firestore updateTransaction error:', err);
      throw err;
    }
  }

  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(LOCAL_STORAGE_TX_KEY(userId, personId));
    if (raw) {
      const list: Transaction[] = JSON.parse(raw);
      const idx = list.findIndex((t) => t.id === transactionId);
      if (idx !== -1) {
        list[idx] = {
          ...list[idx],
          ...updatePayload,
          updatedAt: Date.now(),
        };
        localStorage.setItem(LOCAL_STORAGE_TX_KEY(userId, personId), JSON.stringify(list));
      }
    }
  }
}

/**
 * Soft-delete a transaction (recoverable deletion protection).
 * Keeps record in Recycle Bin so it can be restored.
 */
export async function deleteTransaction(
  userId: string,
  personId: string,
  transactionId: string
): Promise<void> {
  if (!userId || !personId || !transactionId) {
    throw new Error('User ID, Person ID, and Transaction ID are required to delete a transaction.');
  }

  const now = Date.now();
  if (shouldUseFirestore(userId) && db) {
    try {
      const txRef = doc(db, 'users', userId, 'people', personId, 'transactions', transactionId);
      await withFirestoreTimeout(
        updateDoc(txRef, {
          isDeleted: true,
          deletedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }),
        8000,
        'Moving transaction to Recycle Bin'
      );
    } catch (err) {
      console.error('Firestore deleteTransaction error:', err);
      throw err;
    }
  }

  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(LOCAL_STORAGE_TX_KEY(userId, personId));
    if (raw) {
      const list: Transaction[] = JSON.parse(raw);
      const updated = list.map((t) =>
        t.id === transactionId ? { ...t, isDeleted: true, deletedAt: now } : t
      );
      localStorage.setItem(LOCAL_STORAGE_TX_KEY(userId, personId), JSON.stringify(updated));
    }
  }
}

/**
 * Restore a soft-deleted transaction back to active ledger
 */
export async function restoreTransaction(
  userId: string,
  personId: string,
  transactionId: string
): Promise<void> {
  if (!userId || !personId || !transactionId) {
    throw new Error('User ID, Person ID, and Transaction ID are required to restore a transaction.');
  }

  if (shouldUseFirestore(userId) && db) {
    try {
      const txRef = doc(db, 'users', userId, 'people', personId, 'transactions', transactionId);
      await withFirestoreTimeout(
        updateDoc(txRef, {
          isDeleted: false,
          deletedAt: null,
          updatedAt: serverTimestamp(),
        }),
        8000,
        'Restoring transaction from Recycle Bin'
      );
    } catch (err) {
      console.error('Firestore restoreTransaction error:', err);
      throw err;
    }
  }

  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(LOCAL_STORAGE_TX_KEY(userId, personId));
    if (raw) {
      const list: Transaction[] = JSON.parse(raw);
      const updated = list.map((t) =>
        t.id === transactionId ? { ...t, isDeleted: false, deletedAt: undefined } : t
      );
      localStorage.setItem(LOCAL_STORAGE_TX_KEY(userId, personId), JSON.stringify(updated));
    }
  }
}

/**
 * Permanently delete a transaction from Cloud Firestore
 */
export async function permanentlyDeleteTransaction(
  userId: string,
  personId: string,
  transactionId: string
): Promise<void> {
  if (!userId || !personId || !transactionId) {
    throw new Error('User ID, Person ID, and Transaction ID are required to permanently delete a transaction.');
  }

  if (shouldUseFirestore(userId) && db) {
    try {
      const txRef = doc(db, 'users', userId, 'people', personId, 'transactions', transactionId);
      await withFirestoreTimeout(
        deleteDoc(txRef),
        8000,
        'Permanently deleting transaction in Cloud Firestore'
      );
    } catch (err) {
      console.error('Firestore permanentlyDeleteTransaction error:', err);
      throw err;
    }
  }

  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(LOCAL_STORAGE_TX_KEY(userId, personId));
    if (raw) {
      const list: Transaction[] = JSON.parse(raw);
      const filtered = list.filter((t) => t.id !== transactionId);
      localStorage.setItem(LOCAL_STORAGE_TX_KEY(userId, personId), JSON.stringify(filtered));
    }
  }
}

/**
 * Fetch all soft-deleted transactions for a person
 */
export async function getDeletedTransactions(
  userId: string,
  personId: string
): Promise<Transaction[]> {
  if (!userId || !personId) return [];

  if (shouldUseFirestore(userId) && db) {
    try {
      const txCol = collection(db, 'users', userId, 'people', personId, 'transactions');
      const snapshot = await withFirestoreTimeout(
        getDocs(txCol),
        8000,
        'Loading deleted transactions'
      );
      const list: Transaction[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        if (data.isDeleted) {
          list.push({
            id: d.id,
            personId,
            userId,
            date: data.date || '',
            occasion: data.occasion || '',
            direction: data.direction || 'CREDIT',
            giftType: data.giftType || 'CASH',
            amountInPaise: typeof data.amountInPaise === 'number' ? data.amountInPaise : 0,
            quantity: typeof data.quantity === 'number' ? data.quantity : 0,
            unit: data.unit || '',
            description: data.description || '',
            notes: data.notes || '',
            isDeleted: true,
            deletedAt: data.deletedAt?.toMillis ? data.deletedAt.toMillis() : (data.deletedAt || Date.now()),
            createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : (data.createdAt || Date.now()),
            updatedAt: data.updatedAt?.toMillis ? data.updatedAt.toMillis() : (data.updatedAt || Date.now()),
          });
        }
      });
      return sortTransactionsByDate(list, true);
    } catch (err) {
      console.error('Firestore getDeletedTransactions error:', err);
    }
  }

  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(LOCAL_STORAGE_TX_KEY(userId, personId));
    if (raw) {
      try {
        const parsed: Transaction[] = JSON.parse(raw);
        return sortTransactionsByDate(parsed.filter((t) => t.isDeleted), true);
      } catch {
        return [];
      }
    }
  }
  return [];
}

/**
 * Helper to sort transactions by date (newest first or oldest first)
 */
export function sortTransactionsByDate(
  transactions: Transaction[],
  newestFirst: boolean = true
): Transaction[] {
  return [...transactions].sort((a, b) => {
    const dateCmp = newestFirst
      ? b.date.localeCompare(a.date)
      : a.date.localeCompare(b.date);
    if (dateCmp !== 0) return dateCmp;
    return newestFirst ? b.createdAt - a.createdAt : a.createdAt - b.createdAt;
  });
}
