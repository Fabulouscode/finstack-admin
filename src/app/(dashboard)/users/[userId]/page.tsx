import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { reactivateUser, setUserRole, suspendUser } from '@/app/(dashboard)/actions';
import { AccountStatus } from '@/components/account-status';
import { ConfirmForm } from '@/components/confirm-form';
import { Field } from '@/components/field';
import { PaymentsTable } from '@/components/payments-table';
import { WalletsTable } from '@/components/wallets-table';
import { finstack, requireSession } from '@/lib/dal';
import { formatDateTime } from '@/lib/dates';
import { FinStackError } from '@/lib/finstack/auth-api';
import { can } from '@/lib/permissions';

export const metadata: Metadata = { title: 'User · FinStack Admin' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ROLES = ['user', 'support', 'risk', 'finance', 'admin'];

export default async function UserPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  if (!UUID.test(userId)) notFound();
  const client = await finstack();
  let detail;
  try {
    ({ data: detail } = await client.GET('/v1/admin/users/{userId}', { params: { path: { userId } } }));
  } catch (error) {
    if (error instanceof FinStackError && error.status === 404) notFound();
    throw error;
  }
  if (!detail) notFound();
  const { user, wallets, organizations } = detail;

  const [payments, mayManage, mayAssignRoles, session] = await Promise.all([
    can('payments:read').then((ok) =>
      ok ? client.GET('/v1/admin/payments', { params: { query: { userId, limit: 10 } } }).then((r) => r.data) : null,
    ),
    can('users:manage'),
    can('roles:manage'),
    requireSession(),
  ]);
  const isSelf = session.user.id === user.id;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/users" className="text-sm text-zinc-600 underline">← Users</Link>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{user.firstName} {user.lastName}</h1>
          <p className="text-sm text-zinc-600">{user.email}</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <AccountStatus status={user.status} />
          <span className="font-mono text-xs uppercase text-zinc-600">{user.role}</span>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        <section className="rounded-lg bg-white p-4 ring-1 ring-zinc-200 md:col-span-2">
          <h2 className="text-sm font-medium text-zinc-500">Details</h2>
          <dl className="mt-2 grid grid-cols-1 sm:grid-cols-2">
            <Field label="User ID" mono>{user.id}</Field>
            <Field label="Joined">{formatDateTime(user.createdAt)}</Field>
            <Field label="Organizations">
              {organizations.length === 0
                ? null
                : organizations.map((org) => (
                    <Link key={org.id} href={`/organizations/${org.id}`} className="mr-2 underline">
                      {org.name} <span className="text-xs text-zinc-500">({org.role})</span>
                    </Link>
                  ))}
            </Field>
          </dl>
        </section>

        <section className="flex flex-col gap-3 rounded-lg bg-white p-4 ring-1 ring-zinc-200">
          <h2 className="text-sm font-medium text-zinc-500">Actions</h2>
          {isSelf && <p className="text-xs text-zinc-500">This is you: you can’t act on your own account.</p>}
          {!isSelf && mayManage && user.status === 'active' && (
            <ConfirmForm
              action={suspendUser.bind(null, user.id)}
              label="Suspend user"
              confirmLabel="Suspend"
              danger
              description="They’re signed out everywhere at once and can’t sign in or move money until reactivated."
            />
          )}
          {!isSelf && mayManage && user.status === 'suspended' && (
            <ConfirmForm action={reactivateUser.bind(null, user.id)} label="Reactivate user" confirmLabel="Reactivate" />
          )}
          {!isSelf && mayAssignRoles && (
            <ConfirmForm
              action={setUserRole.bind(null, user.id)}
              label="Change role"
              confirmLabel="Change role"
              description="Staff roles decide what someone can see and do here. The change applies immediately."
            >
              <label className="flex flex-col gap-1 text-sm">
                Role
                <select name="role" defaultValue={user.role} className="rounded-md border border-zinc-300 bg-white px-2 py-1.5">
                  {ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
                </select>
              </label>
            </ConfirmForm>
          )}
          {!isSelf && !mayManage && !mayAssignRoles && (
            <p className="text-xs text-zinc-500">Your role can view this user but not change them.</p>
          )}
        </section>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-zinc-500">Wallets</h2>
        <WalletsTable wallets={wallets} />
      </section>

      {payments && (
        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-medium text-zinc-500">Recent payments</h2>
          </div>
          <PaymentsTable payments={payments.data} empty="No payments yet." />
        </section>
      )}
    </div>
  );
}
