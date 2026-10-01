import Link from 'next/link';
import { signOut } from '@/app/login/actions';
import { requireSession } from '@/lib/dal';

const NAV = [
  { href: '/', label: 'Overview' },
  { href: '/payments', label: 'Payments' },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireSession();
  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <span className="font-semibold">FinStack Admin</span>
            <nav className="flex gap-4 text-sm">
              {NAV.map((item) => (
                <Link key={item.href} href={item.href} className="text-zinc-600 hover:text-zinc-900">
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-zinc-600">
              {user.email} · <span className="font-mono text-xs uppercase">{user.role}</span>
            </span>
            <form action={signOut}>
              <button type="submit" className="rounded-md px-2 py-1 text-zinc-600 ring-1 ring-zinc-300 hover:bg-zinc-100">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
