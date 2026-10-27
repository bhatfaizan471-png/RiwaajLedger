export interface Person {
  id: string;
  userId: string;
  fullName: string;
  normalizedName: string; // Lowercase for case-insensitive alphabetical sorting & search
  parentageRelation: string; // "S/o" | "D/o" | "W/o" | "H/o"
  parentageName: string; // Mandatory: Son of / Daughter of / Wife of Name (e.g. Ghulam Ahmad)
  mohalla: string; // Mandatory: Mohalla / Locality
  phone: string; // Empty string "" when not provided (never undefined)
  relationship: string; // Empty string "" when not provided (never undefined)
  notes: string; // Empty string "" when not provided (never undefined)
  createdAt: number;
  updatedAt: number;
  isDeleted?: boolean;
  deletedAt?: number;
}

export interface PersonFormData {
  fullName: string;
  parentageRelation?: string;
  parentageName: string; // Mandatory
  mohalla: string; // Mandatory
  phone?: string; // Optional: empty string saved when omitted
  relationship?: string; // Optional: empty string saved when omitted
  notes?: string; // Optional: empty string saved when omitted
}
