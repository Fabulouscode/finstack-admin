import Link from 'next/link';
import { signOut } from '@/app/login/actions';
import { cookies } from 'next/headers';
import { Notice } from '@/components/notice';
import { requireSession } from '@/lib/dal';
import { NOTICE_COOKIE } from '@/lib/notice-cookie';
import { permissions } from '@/lib/permissions';

/** Each section shows only if the role holds the permission it needs. */
const NAV = [
  { href: '/', label: 'Overview', permission: 'overview:read' },
  { href: '/payments', label: 'Payments', permission: 'payments:read' },
  { href: '/refunds', label: 'Refunds', permission: 'refunds:read' },
  { href: '/payouts', label: 'Payouts', permission: 'payouts:read' },
  { href: '/users', label: 'Users', permission: 'users:read' },
  { href: '/organizations', label: 'Organizations', permission: 'organizations:read' },
  { href: '/audit', label: 'Audit log', permission: 'audit:read' },
  { href: '/reconciliation', label: 'Reconciliation', permission: 'reconciliation:manage' },
  { href: '/webhooks', label: 'Webhooks', permission: 'provider_webhooks:manage' },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireSession();
  const allowed = await permissions();
  const nav = NAV.filter((item) => allowed.has(item.permission));
  const notice = (await cookies()).get(NOTICE_COOKIE)?.value;
  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 pt-3">
          <span className="whitespace-nowrap font-semibold">FinStack Admin</span>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden truncate text-zinc-600 sm:inline">
              {user.email} · <span className="font-mono text-xs uppercase">{user.role}</span>
            </span>
            <form action={signOut}>
              <button type="submit" className="whitespace-nowrap rounded-md px-2 py-1 text-zinc-600 ring-1 ring-zinc-300 hover:bg-zinc-100">
                Sign out
              </button>
            </form>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-x-5 overflow-x-auto px-4 pb-2 pt-2 text-sm">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="whitespace-nowrap text-zinc-600 hover:text-zinc-900">
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        {notice && <Notice message={notice} />}
        {children}
      </main>
    </div>
  );
}
