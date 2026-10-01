import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FinStack Admin',
  description: 'Staff dashboard for FinStack',
  // A staff tool: keep it out of search engines.
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased text-zinc-900">{children}</body>
    </html>
  );
}
