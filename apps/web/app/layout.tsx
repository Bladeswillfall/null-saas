import './globals.css';
import type { Metadata } from 'next';
import { TRPCProvider } from '@/lib/trpc/provider';

export const metadata: Metadata = {
  title: 'NULL - IP Intelligence Terminal',
  description:
    'Market intelligence for books, manga, and web comics. Rank media franchises across multiple platforms with confidence-weighted signals and traceable provenance.'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  );
}
