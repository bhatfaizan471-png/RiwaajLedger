'use client';

import React, { useState, useEffect } from 'react';
import { Person, PersonFormData } from '@/types/person';
import { X, UserPlus, AlertCircle, Check } from 'lucide-react';

interface AddPersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: PersonFormData) => Promise<void>;
  existingPeople?: Person[];
  personToEdit?: Person | null;
}

export function AddPersonModal({
  isOpen,
  onClose,
  onSave,
  existingPeople = [],
  personToEdit,
}: AddPersonModalProps) {
  const isEditing = Boolean(personToEdit);

  const [fullName, setFullName] = useState('');
  const [parentageRelation, setParentageRelation] = useState<'S/o' | 'D/o' | 'W/o' | 'H/o'>('S/o');
  const [parentageName, setParentageName] = useState('');
  const [mohalla, setMohalla] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('');
  const [notes, setNotes] = useState('');

  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (personToEdit) {
      setFullName(personToEdit.fullName || '');
      setParentageRelation((personToEdit.parentageRelation as any) || 'S/o');
      setParentageName(personToEdit.parentageName || '');
      setMohalla(personToEdit.mohalla || '');
      setPhone(personToEdit.phone || '');
      setRelationship(personToEdit.relationship || '');
      setNotes(personToEdit.notes || '');
    } else {
      setFullName('');
      setParentageRelation('S/o');
      setParentageName('');
      setMohalla('');
      setPhone('');
      setRelationship('');
      setNotes('');
    }
    setDuplicateWarning(null);
    setError(null);
  }, [personToEdit, isOpen]);

  // Check for duplicate name warning on input change
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFullName(val);
    setError(null);

    const trimmed = val.trim().toLowerCase();
    if (trimmed.length > 1) {
      const existing = existingPeople.find(
        (p) =>
          p.normalizedName === trimmed &&
          (!personToEdit || p.id !== personToEdit.id)
      );
      if (existing) {
        setDuplicateWarning(
          `Notice: A person named "${existing.fullName}" already exists in your notebook. You can still save if they are different individuals.`
        );
      } else {
        setDuplicateWarning(null);
      }
    } else {
      setDuplicateWarning(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!fullName.trim()) {
      setError('Full Name is required.');
      return;
    }
    if (!parentageName.trim()) {
      setError('Son of / Daughter of / Wife of Name is mandatory.');
      return;
    }
    if (!mohalla.trim()) {
      setError('Mohalla / Locality is mandatory.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onSave({
        fullName: fullName.trim(),
        parentageRelation,
        parentageName: parentageName.trim(),
        mohalla: mohalla.trim(),
        phone: phone.trim(),
        relationship: relationship.trim(),
        notes: notes.trim(),
      });
      onClose();
    } catch (err: any) {
      console.error('Failed to save person:', err);
      let readable = err?.message || 'Could not save person. Please try again.';
      if (err?.code === 'permission-denied' || readable.includes('permission-denied') || readable.includes('insufficient permissions')) {
        readable = 'Permission denied: Please ensure you are logged into your account.';
      } else if (err?.code === 'not-found' || readable.includes('(default)') || readable.includes('not found')) {
        readable = "Cloud Firestore database '(default)' not found. Please click 'Create database' under Firestore Database in your Firebase Console (Build > Firestore Database).";
      } else if (err?.code === 'unavailable' || readable.includes('unavailable')) {
        readable = 'Firestore service unavailable: Please check your internet connection.';
      }
      setError(readable);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-[#E7E2D8] overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-[#F0ECE1] bg-[#FAF8F5]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0F5132]/10 text-[#0F5132] flex items-center justify-center">
              <UserPlus className="w-4 h-4" />
            </div>
            <h2 className="font-semibold text-lg text-[#1C1917]">
              {isEditing ? 'Edit Person Details' : 'Add New Person'}
            </h2>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[calc(85vh-120px)] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Full Name (Mandatory) */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#57534E] mb-1.5">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={fullName}
              onChange={handleNameChange}
              placeholder="e.g. Ahmad Dar, Mehraj Ahmad..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#D6D0C4] bg-white text-sm text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-hidden focus:ring-2 focus:ring-[#0F5132] focus:border-transparent transition-smooth"
              id="person-name-input"
            />
          </div>

          {/* Duplicate Warning notice if applicable */}
          {duplicateWarning && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <span>{duplicateWarning}</span>
            </div>
          )}

          {/* Parentage / Relation: S/o, D/o, W/o (Mandatory) */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#57534E] mb-1.5">
              Son of / Daughter of / Wife of <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <select
                value={parentageRelation}
                onChange={(e) => setParentageRelation(e.target.value as any)}
                className="w-28 px-3 py-2.5 rounded-xl border border-[#D6D0C4] bg-white text-sm font-semibold text-[#1C1917] focus:outline-hidden focus:ring-2 focus:ring-[#0F5132] transition-smooth flex-shrink-0"
                id="person-relation-select"
              >
                <option value="S/o">S/o (Son of)</option>
                <option value="D/o">D/o (Daughter of)</option>
                <option value="W/o">W/o (Wife of)</option>
                <option value="H/o">H/o (Husband of)</option>
              </select>
              <input
                type="text"
                required
                value={parentageName}
                onChange={(e) => setParentageName(e.target.value)}
                placeholder="Father's or Husband's name (e.g. Ghulam Ahmad)..."
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-[#D6D0C4] bg-white text-sm text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-hidden focus:ring-2 focus:ring-[#0F5132] focus:border-transparent transition-smooth"
                id="person-parentage-input"
              />
            </div>
            <p className="text-[11px] text-[#78716C] mt-1">
              Required for traditional Khatabandi identity verification.
            </p>
          </div>

          {/* Mohalla / Locality (Mandatory) */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#57534E] mb-1.5">
              Mohalla / Locality <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={mohalla}
              onChange={(e) => setMohalla(e.target.value)}
              placeholder="e.g. Soura, Lal Bazar, Rajbagh, Khanyar..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#D6D0C4] bg-white text-sm text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-hidden focus:ring-2 focus:ring-[#0F5132] focus:border-transparent transition-smooth"
              id="person-mohalla-input"
            />
          </div>

          {/* Phone Number (Optional) */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#57534E] mb-1.5">
              Phone Number <span className="text-xs text-[#A8A29E] font-normal normal-case">(Optional)</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +91 94190 12345"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#D6D0C4] bg-white text-sm text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-hidden focus:ring-2 focus:ring-[#0F5132] focus:border-transparent transition-smooth"
              id="person-phone-input"
            />
          </div>

          {/* Relationship / Association (Optional) */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#57534E] mb-1.5">
              Relationship / Association <span className="text-xs text-[#A8A29E] font-normal normal-case">(Optional)</span>
            </label>
            <input
              type="text"
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              placeholder="e.g. Cousin, Neighbor, Friend, Maternal Uncle..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#D6D0C4] bg-white text-sm text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-hidden focus:ring-2 focus:ring-[#0F5132] focus:border-transparent transition-smooth"
              id="person-relationship-input"
            />
          </div>

          {/* Notes (Optional) */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#57534E] mb-1.5">
              Notes <span className="text-xs text-[#A8A29E] font-normal normal-case">(Optional)</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any helpful family details or reference..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#D6D0C4] bg-white text-sm text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-hidden focus:ring-2 focus:ring-[#0F5132] focus:border-transparent transition-smooth resize-none"
              id="person-notes-input"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#F0ECE1]">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl border border-[#D6D0C4] text-sm font-medium text-[#57534E] hover:bg-[#FAF8F5] transition-smooth cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !fullName.trim() || !parentageName.trim() || !mohalla.trim()}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#0F5132] hover:bg-[#0C4328] text-white text-sm font-medium transition-smooth shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              id="save-person-submit-btn"
            >
              {submitting ? (
                <span>Saving...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{isEditing ? 'Save Changes' : 'Save Person'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
