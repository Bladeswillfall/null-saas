import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'NULL SaaS Starter',
  description: 'A clean monorepo starter for the NULL SaaS web app with a future Tauri shell.'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
