'use client';

import React from 'react';
import Link from 'next/link';
import { Person } from '@/types/person';
import { ChevronRight, Phone, MapPin } from 'lucide-react';

interface ContactRowProps {
  person: Person;
}

// Generate pleasing pastel avatar backgrounds based on initials
const AVATAR_COLORS = [
  'bg-emerald-100 text-emerald-800 border-emerald-200',
  'bg-amber-100 text-amber-800 border-amber-200',
  'bg-teal-100 text-teal-800 border-teal-200',
  'bg-blue-100 text-blue-800 border-blue-200',
  'bg-stone-100 text-stone-800 border-stone-200',
  'bg-rose-100 text-rose-800 border-rose-200',
  'bg-indigo-100 text-indigo-800 border-indigo-200',
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function ContactRow({ person }: ContactRowProps) {
  const avatarStyle = getAvatarColor(person.fullName);
  const initials = getInitials(person.fullName);

  return (
    <Link
      href={`/people/${person.id}`}
      id={`contact-row-${person.id}`}
      className="group flex items-center justify-between p-3.5 sm:px-4 sm:py-3.5 bg-white hover:bg-[#F6FAF7] active:bg-[#EDF5EF] border border-[#E7E2D8] rounded-xl transition-smooth shadow-xs mb-2"
    >
      <div className="flex items-center gap-3.5 min-w-0">
        {/* Avatar */}
        <div
          className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm border flex-shrink-0 ${avatarStyle} shadow-2xs`}
        >
          {initials}
        </div>

        {/* Info */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <h3 className="font-semibold text-base text-[#1C1917] group-hover:text-[#0F5132] transition-colors truncate leading-tight">
              {person.fullName}
            </h3>
            {person.parentageName && (
              <span className="text-xs font-medium text-[#57534E] truncate">
                ({person.parentageRelation || 'S/o'} {person.parentageName})
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-[#78716C]">
            {person.mohalla && (
              <span className="inline-flex items-center gap-1 truncate text-[#0F5132] font-medium bg-[#EBF5EF] px-2 py-0.5 rounded-md border border-[#D1E7DD]">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span>{person.mohalla}</span>
              </span>
            )}
            {person.phone && (
              <span className="inline-flex items-center gap-1 truncate">
                <Phone className="w-3 h-3 text-[#A8A29E] flex-shrink-0" />
                <span>{person.phone}</span>
              </span>
            )}
            {person.relationship && (
              <span className="text-[#8B847A] italic truncate">
                {person.relationship}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right chevron */}
      <div className="flex items-center pl-2 text-[#A8A29E] group-hover:text-[#0F5132] group-hover:translate-x-0.5 transition-smooth">
        <ChevronRight className="w-5 h-5" />
      </div>
    </Link>
  );
}
