import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from './firebase';
import { Person, PersonFormData } from '@/types/person';
import { withFirestoreTimeout } from './transaction-service';

const LOCAL_STORAGE_PEOPLE_KEY = (userId: string) => `riwaaj_people_${userId}`;

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

/**
 * Fetch all people for a user, sorted alphabetically by name
 */
export async function getPeople(userId: string): Promise<Person[]> {
  if (shouldUseFirestore(userId) && db) {
    try {
      const peopleCol = collection(db, 'users', userId, 'people');
      const snapshot = await withFirestoreTimeout(
        getDocs(peopleCol),
        8000,
        'Loading people from Cloud Firestore'
      );
      const list: Person[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        if (data.isDeleted) return; // Exclude deleted contacts from active list
        list.push({
          id: d.id,
          userId,
          fullName: data.fullName || '',
          normalizedName: (data.fullName || '').toLowerCase().trim(),
          parentageRelation: data.parentageRelation || 'S/o',
          parentageName: data.parentageName || '',
          mohalla: data.mohalla || '',
          phone: data.phone || '',
          relationship: data.relationship || '',
          notes: data.notes || '',
          isDeleted: false,
          createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : (data.createdAt || Date.now()),
          updatedAt: data.updatedAt?.toMillis ? data.updatedAt.toMillis() : (data.updatedAt || Date.now()),
        });
      });
      return sortPeopleAlphabetically(list);
    } catch (err) {
      console.error('Firestore getPeople error, falling back to local cache:', err);
    }
  }

  // Fallback to local storage
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(LOCAL_STORAGE_PEOPLE_KEY(userId));
    if (raw) {
      try {
        const parsed: Person[] = JSON.parse(raw);
        return sortPeopleAlphabetically(parsed.filter((p) => !p.isDeleted));
      } catch {
        return [];
      }
    }
  }
  return [];
}

/**
 * Fetch a single person by personId
 */
export async function getPerson(userId: string, personId: string): Promise<Person | null> {
  if (shouldUseFirestore(userId) && db) {
    try {
      const personRef = doc(db, 'users', userId, 'people', personId);
      const snapshot = await withFirestoreTimeout(
        getDoc(personRef),
        8000,
        'Loading person details from Cloud Firestore'
      );
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.isDeleted) return null;
        return {
          id: snapshot.id,
          userId,
          fullName: data.fullName || '',
          normalizedName: (data.fullName || '').toLowerCase().trim(),
          parentageRelation: data.parentageRelation || 'S/o',
          parentageName: data.parentageName || '',
          mohalla: data.mohalla || '',
          phone: data.phone || '',
          relationship: data.relationship || '',
          notes: data.notes || '',
          isDeleted: false,
          createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : (data.createdAt || Date.now()),
          updatedAt: data.updatedAt?.toMillis ? data.updatedAt.toMillis() : (data.updatedAt || Date.now()),
        };
      }
    } catch (err) {
      console.error('Firestore getPerson error:', err);
    }
  }

  // Local storage fallback
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(LOCAL_STORAGE_PEOPLE_KEY(userId));
    if (raw) {
      const list: Person[] = JSON.parse(raw);
      return list.find((p) => p.id === personId && !p.isDeleted) || null;
    }
  }
  return null;
}

/**
 * Add a new person.
 * Ensures NO field is undefined when writing to Firestore.
 */
export async function addPerson(userId: string, data: PersonFormData): Promise<Person> {
  const personId = `p_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const now = Date.now();

  const newPerson: Person = {
    id: personId,
    userId,
    fullName: (data.fullName || '').trim(),
    normalizedName: (data.fullName || '').toLowerCase().trim(),
    parentageRelation: data.parentageRelation || 'S/o',
    parentageName: (data.parentageName || '').trim(),
    mohalla: (data.mohalla || '').trim(),
    phone: (data.phone || '').trim(), // Never undefined, defaults to empty string ""
    relationship: (data.relationship || '').trim(),
    notes: (data.notes || '').trim(),
    createdAt: now,
    updatedAt: now,
  };

  if (shouldUseFirestore(userId) && db) {
    try {
      const personRef = doc(db, 'users', userId, 'people', personId);
      await withFirestoreTimeout(
        setDoc(personRef, {
          id: newPerson.id,
          userId: newPerson.userId,
          fullName: newPerson.fullName,
          normalizedName: newPerson.normalizedName,
          parentageRelation: newPerson.parentageRelation,
          parentageName: newPerson.parentageName,
          mohalla: newPerson.mohalla,
          phone: newPerson.phone,
          relationship: newPerson.relationship,
          notes: newPerson.notes,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }),
        8000,
        'Adding person to Cloud Firestore'
      );
    } catch (err) {
      console.error('Firestore addPerson error:', err);
      throw err;
    }
  }

  // Also sync to local cache
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_PEOPLE_KEY(userId));
      const current: Person[] = raw ? JSON.parse(raw) : [];
      const updated = [...current.filter((p) => p.id !== newPerson.id), newPerson];
      localStorage.setItem(LOCAL_STORAGE_PEOPLE_KEY(userId), JSON.stringify(updated));
    } catch {
      // Local sync non-blocking
    }
  }

  return newPerson;
}

/**
 * Update an existing person.
 * Guarantees no undefined values in updatePayload.
 */
export async function updatePerson(
  userId: string,
  personId: string,
  data: Partial<PersonFormData>
): Promise<void> {
  const updatePayload: Record<string, any> = {
    updatedAt: serverTimestamp(),
  };

  if (data.fullName !== undefined) {
    updatePayload.fullName = data.fullName.trim();
    updatePayload.normalizedName = data.fullName.toLowerCase().trim();
  }
  if (data.parentageRelation !== undefined) {
    updatePayload.parentageRelation = data.parentageRelation || 'S/o';
  }
  if (data.parentageName !== undefined) {
    updatePayload.parentageName = data.parentageName.trim();
  }
  if (data.mohalla !== undefined) {
    updatePayload.mohalla = data.mohalla.trim();
  }
  if (data.phone !== undefined) {
    updatePayload.phone = (data.phone || '').trim();
  }
  if (data.relationship !== undefined) {
    updatePayload.relationship = (data.relationship || '').trim();
  }
  if (data.notes !== undefined) {
    updatePayload.notes = (data.notes || '').trim();
  }

  if (shouldUseFirestore(userId) && db) {
    try {
      const personRef = doc(db, 'users', userId, 'people', personId);
      await withFirestoreTimeout(
        updateDoc(personRef, updatePayload),
        8000,
        'Updating person in Cloud Firestore'
      );
    } catch (err) {
      console.error('Firestore updatePerson error:', err);
      throw err;
    }
  }

  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(LOCAL_STORAGE_PEOPLE_KEY(userId));
    if (raw) {
      const list: Person[] = JSON.parse(raw);
      const idx = list.findIndex((p) => p.id === personId);
      if (idx !== -1) {
        list[idx] = {
          ...list[idx],
          fullName: data.fullName !== undefined ? data.fullName.trim() : list[idx].fullName,
          normalizedName: data.fullName ? data.fullName.toLowerCase().trim() : list[idx].normalizedName,
          parentageRelation: data.parentageRelation !== undefined ? (data.parentageRelation || 'S/o') : list[idx].parentageRelation,
          parentageName: data.parentageName !== undefined ? data.parentageName.trim() : list[idx].parentageName,
          mohalla: data.mohalla !== undefined ? data.mohalla.trim() : list[idx].mohalla,
          phone: data.phone !== undefined ? (data.phone || '').trim() : list[idx].phone,
          relationship: data.relationship !== undefined ? (data.relationship || '').trim() : list[idx].relationship,
          notes: data.notes !== undefined ? (data.notes || '').trim() : list[idx].notes,
          updatedAt: Date.now(),
        };
        localStorage.setItem(LOCAL_STORAGE_PEOPLE_KEY(userId), JSON.stringify(list));
      }
    }
  }
}

/**
 * Soft-delete a person (recoverable deletion protection).
 * Keeps record in Recycle Bin so it can be restored.
 */
export async function deletePerson(userId: string, personId: string): Promise<void> {
  const now = Date.now();
  if (shouldUseFirestore(userId) && db) {
    try {
      const personRef = doc(db, 'users', userId, 'people', personId);
      await withFirestoreTimeout(
        updateDoc(personRef, {
          isDeleted: true,
          deletedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }),
        8000,
        'Moving contact to Recycle Bin'
      );
    } catch (err) {
      console.error('Firestore deletePerson error:', err);
      throw err;
    }
  }

  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(LOCAL_STORAGE_PEOPLE_KEY(userId));
    if (raw) {
      const list: Person[] = JSON.parse(raw);
      const updated = list.map((p) =>
        p.id === personId ? { ...p, isDeleted: true, deletedAt: now } : p
      );
      localStorage.setItem(LOCAL_STORAGE_PEOPLE_KEY(userId), JSON.stringify(updated));
    }
  }
}

/**
 * Restore a soft-deleted person back to active notebook
 */
export async function restorePerson(userId: string, personId: string): Promise<void> {
  if (shouldUseFirestore(userId) && db) {
    try {
      const personRef = doc(db, 'users', userId, 'people', personId);
      await withFirestoreTimeout(
        updateDoc(personRef, {
          isDeleted: false,
          deletedAt: null,
          updatedAt: serverTimestamp(),
        }),
        8000,
        'Restoring contact from Recycle Bin'
      );
    } catch (err) {
      console.error('Firestore restorePerson error:', err);
      throw err;
    }
  }

  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(LOCAL_STORAGE_PEOPLE_KEY(userId));
    if (raw) {
      const list: Person[] = JSON.parse(raw);
      const updated = list.map((p) =>
        p.id === personId ? { ...p, isDeleted: false, deletedAt: undefined } : p
      );
      localStorage.setItem(LOCAL_STORAGE_PEOPLE_KEY(userId), JSON.stringify(updated));
    }
  }
}

/**
 * Permanently delete a person and their transaction records
 */
export async function permanentlyDeletePerson(userId: string, personId: string): Promise<void> {
  if (shouldUseFirestore(userId) && db) {
    try {
      const personRef = doc(db, 'users', userId, 'people', personId);
      await withFirestoreTimeout(
        deleteDoc(personRef),
        8000,
        'Permanently deleting person in Cloud Firestore'
      );
    } catch (err) {
      console.error('Firestore permanentlyDeletePerson error:', err);
      throw err;
    }
  }

  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(LOCAL_STORAGE_PEOPLE_KEY(userId));
    if (raw) {
      const list: Person[] = JSON.parse(raw);
      const filtered = list.filter((p) => p.id !== personId);
      localStorage.setItem(LOCAL_STORAGE_PEOPLE_KEY(userId), JSON.stringify(filtered));
    }
    localStorage.removeItem(`riwaaj_transactions_${userId}_${personId}`);
  }
}

/**
 * Fetch all soft-deleted people for the authenticated user
 */
export async function getDeletedPeople(userId: string): Promise<Person[]> {
  if (shouldUseFirestore(userId) && db) {
    try {
      const peopleCol = collection(db, 'users', userId, 'people');
      const snapshot = await withFirestoreTimeout(
        getDocs(peopleCol),
        8000,
        'Loading recycle bin from Cloud Firestore'
      );
      const list: Person[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        if (data.isDeleted) {
          list.push({
            id: d.id,
            userId,
            fullName: data.fullName || '',
            normalizedName: (data.fullName || '').toLowerCase().trim(),
            parentageRelation: data.parentageRelation || 'S/o',
            parentageName: data.parentageName || '',
            mohalla: data.mohalla || '',
            phone: data.phone || '',
            relationship: data.relationship || '',
            notes: data.notes || '',
            isDeleted: true,
            deletedAt: data.deletedAt?.toMillis ? data.deletedAt.toMillis() : (data.deletedAt || Date.now()),
            createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : (data.createdAt || Date.now()),
            updatedAt: data.updatedAt?.toMillis ? data.updatedAt.toMillis() : (data.updatedAt || Date.now()),
          });
        }
      });
      return list.sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0));
    } catch (err) {
      console.error('Firestore getDeletedPeople error:', err);
    }
  }

  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(LOCAL_STORAGE_PEOPLE_KEY(userId));
    if (raw) {
      try {
        const list: Person[] = JSON.parse(raw);
        return list.filter((p) => p.isDeleted).sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0));
      } catch {
        return [];
      }
    }
  }
  return [];
}

/**
 * Helper to sort people alphabetically by full name (locale-aware, case-insensitive)
 */
export function sortPeopleAlphabetically(people: Person[]): Person[] {
  return [...people].sort((a, b) =>
    a.fullName.trim().localeCompare(b.fullName.trim(), undefined, { sensitivity: 'base' })
  );
}
