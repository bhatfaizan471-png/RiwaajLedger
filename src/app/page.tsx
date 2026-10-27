'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace('/people');
      } else {
        router.replace('/login');
      }
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5]">
      <div className="text-center">
        <div className="w-10 h-10 border-3 border-[#0F5132] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm font-serif text-[#0F5132] font-semibold">Opening Riwaaj Ledger...</p>
      </div>
    </div>
  );
}
