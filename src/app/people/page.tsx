'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Navbar } from '@/components/layout/Navbar';
import { ContactRow } from '@/components/contacts/ContactRow';
import { AddPersonModal } from '@/components/contacts/AddPersonModal';
import { Person, PersonFormData } from '@/types/person';
import { getPeople, addPerson, sortPeopleAlphabetically, restorePerson } from '@/lib/people-service';
import {
  Search,
  Plus,
  X,
  Users,
  UserPlus,
  BookOpen,
} from 'lucide-react';

export default function PeoplePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastUndoAction, setToastUndoAction] = useState<(() => Promise<void>) | null>(null);

  // Redirect if unauthenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Load people for authenticated user
  const loadPeople = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await getPeople(user.uid);
      setPeople(data);
    } catch (err) {
      console.error('Failed to load contacts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadPeople();

      // Check if a contact was just deleted from detail page to provide immediate Undo
      if (typeof window !== 'undefined') {
        const item = sessionStorage.getItem('riwaaj_just_deleted_person');
        if (item) {
          sessionStorage.removeItem('riwaaj_just_deleted_person');
          try {
            const parsed = JSON.parse(item);
            if (parsed?.id && parsed?.name) {
              showToast(`"${parsed.name}" moved to Recycle Bin`, async () => {
                await restorePerson(user.uid, parsed.id);
                await loadPeople();
                showToast(`Restored "${parsed.name}"`);
              });
            }
          } catch {}
        }
      }
    }
  }, [user]);

  const showToast = (msg: string, undoAction?: () => Promise<void>) => {
    setToastMessage(msg);
    setToastUndoAction(undoAction ? () => undoAction : null);
    setTimeout(() => {
      setToastMessage(null);
      setToastUndoAction(null);
    }, undoAction ? 6000 : 3000);
  };

  const handleAddPerson = async (data: PersonFormData) => {
    if (!user) return;
    const newPerson = await addPerson(user.uid, data);
    // Automatically re-sort and place in alphabetical order
    setPeople((prev) => sortPeopleAlphabetically([...prev, newPerson]));
    showToast(`"${newPerson.fullName}" added to contacts`);
  };

  // Filter contacts based on search query (name, partial name, phone, mohalla)
  const filteredPeople = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return people;

    return people.filter((p) => {
      const nameMatch = p.normalizedName.includes(q);
      const parentageMatch = p.parentageName ? p.parentageName.toLowerCase().includes(q) : false;
      const phoneMatch = p.phone ? p.phone.toLowerCase().includes(q) : false;
      const mohallaMatch = p.mohalla ? p.mohalla.toLowerCase().includes(q) : false;
      return nameMatch || parentageMatch || phoneMatch || mohallaMatch;
    });
  }, [people, searchQuery]);

  // Group contacts by their first alphabet letter
  const groupedPeople = useMemo(() => {
    const groups: { [key: string]: Person[] } = {};
    for (const p of filteredPeople) {
      const firstChar = p.fullName.trim().charAt(0).toUpperCase() || '#';
      const key = /[A-Z]/.test(firstChar) ? firstChar : '#';
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(p);
    }
    // Return sorted keys
    return Object.keys(groups)
      .sort()
      .map((key) => ({
        letter: key,
        contacts: groups[key],
      }));
  }, [filteredPeople]);

  if (authLoading || (!user && loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5]">
        <div className="w-8 h-8 border-3 border-[#0F5132] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] pb-24 sm:pb-16">
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 pt-5 sm:pt-7">
        {/* Header: Title and + Add People */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-serif text-[#0F5132] tracking-tight">
              My People
            </h1>
            <p className="text-xs sm:text-sm text-[#78716C]">
              {people.length === 1 ? '1 person saved' : `${people.length} people saved in notebook`}
            </p>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0F5132] hover:bg-[#0C4328] text-white text-sm font-semibold transition-smooth shadow-sm cursor-pointer"
            id="add-person-btn"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add People</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative mb-5">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#78716C]">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, phone number or Mohalla..."
            className="w-full pl-10 pr-10 py-3 rounded-2xl border border-[#D6D0C4] bg-white text-sm text-[#1C1917] placeholder:text-[#A8A29E] shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-[#0F5132] focus:border-transparent transition-smooth"
            id="contact-search-input"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#A8A29E] hover:text-[#1C1917]"
              title="Clear search"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs sm:text-sm text-emerald-800 font-medium flex items-center justify-between gap-2 animate-in fade-in slide-in-from-top-2 duration-150">
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
                id="undo-person-delete-btn"
              >
                Undo
              </button>
            )}
          </div>
        )}

        {/* Contact List */}
        {loading ? (
          <div className="py-12 text-center">
            <div className="w-6 h-6 border-2 border-[#0F5132] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-[#78716C]">Loading your notebook...</p>
          </div>
        ) : people.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-2xl border border-[#E7E2D8] p-8 sm:p-14 text-center shadow-xs mt-4">
            <div className="w-16 h-16 rounded-full bg-[#FAF8F5] text-[#0F5132] border border-[#E7E2D8] flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-[#0F5132]" />
            </div>
            <h3 className="font-serif font-bold text-lg sm:text-xl text-[#1C1917] mb-1.5">
              No people added yet.
            </h3>
            <p className="text-xs sm:text-sm text-[#78716C] max-w-sm mx-auto mb-6">
              Add your first person to start recording gifts and occasions.
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0F5132] hover:bg-[#0C4328] text-white text-sm font-semibold transition-smooth shadow-sm cursor-pointer"
              id="empty-state-add-person-btn"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Add Your First Person</span>
            </button>
          </div>
        ) : filteredPeople.length === 0 ? (
          /* No search results */
          <div className="bg-white rounded-2xl border border-[#E7E2D8] p-8 text-center shadow-xs">
            <p className="text-sm font-medium text-[#1C1917] mb-1">
              No results found for &ldquo;{searchQuery}&rdquo;
            </p>
            <p className="text-xs text-[#78716C] mb-3">
              Check spelling or search by phone number / Mohalla.
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-[#0F5132] font-semibold hover:underline"
            >
              Clear search filter
            </button>
          </div>
        ) : (
          /* Grouped Alphabetical Contact List */
          <div className="space-y-4">
            {groupedPeople.map(({ letter, contacts }) => (
              <div key={letter}>
                {/* Alphabet Header */}
                <div className="sticky top-16 z-10 py-1 px-1 bg-[#FAF8F5]/90 backdrop-blur-xs flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-[#EBF5EF] text-[#0F5132] font-bold text-xs flex items-center justify-center">
                    {letter}
                  </span>
                  <div className="h-px flex-1 bg-[#E7E2D8]" />
                </div>

                {/* Contacts in this letter */}
                <div className="mt-1">
                  {contacts.map((person) => (
                    <ContactRow key={person.id} person={person} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Floating Action Button on mobile */}
      <div className="sm:hidden fixed bottom-6 right-6 z-20">
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="w-14 h-14 rounded-full bg-[#0F5132] text-white flex items-center justify-center shadow-lg hover:bg-[#0C4328] active:scale-95 transition-smooth"
          title="Add People"
          aria-label="Add People"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>
      </div>

      {/* Add Person Modal */}
      <AddPersonModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleAddPerson}
        existingPeople={people}
      />
    </div>
  );
}
