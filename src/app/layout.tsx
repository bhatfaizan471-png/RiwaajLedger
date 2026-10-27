import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/auth-context';
import './globals.css';

export const metadata: Metadata = {
  title: 'Riwaaj Ledger — Digital Kashmiri Gift Notebook',
  description: 'Your Digital Notebook for Every Gift and Occasion. Clean, mobile-friendly ledger for Kashmiri weddings and family events.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#FAF8F5] text-[#1C1917]">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
