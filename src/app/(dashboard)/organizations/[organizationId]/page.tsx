import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { reactivateOrganization, suspendOrganization } from '@/app/(dashboard)/actions';
import { AccountStatus } from '@/components/account-status';
import { ConfirmForm } from '@/components/confirm-form';
import { PaymentsTable } from '@/components/payments-table';
import { WalletsTable } from '@/components/wallets-table';
import { finstack } from '@/lib/dal';
import { formatDateTime } from '@/lib/dates';
import { FinStackError } from '@/lib/finstack/auth-api';
import { can } from '@/lib/permissions';

export const metadata: Metadata = { title: 'Organization · FinStack Admin' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function OrganizationPage({ params }: { params: Promise<{ organizationId: string }> }) {
  const { organizationId } = await params;
  if (!UUID.test(organizationId)) notFound();
  const client = await finstack();
  let detail;
  try {
    ({ data: detail } = await client.GET('/v1/admin/organizations/{organizationId}', { params: { path: { organizationId } } }));
  } catch (error) {
    if (error instanceof FinStackError && error.status === 404) notFound();
    throw error;
  }
  if (!detail) notFound();
  const { organization, members, wallets } = detail;

  const [payments, mayManage] = await Promise.all([
    can('payments:read').then((ok) =>
      ok ? client.GET('/v1/admin/payments', { params: { query: { organizationId, limit: 10 } } }).then((r) => r.data) : null,
    ),
    can('organizations:manage'),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <Link href="/organizations" className="text-sm text-zinc-600 underline">← Organizations</Link>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{organization.name}</h1>
          <p className="font-mono text-xs text-zinc-500">{organization.id} · created {formatDateTime(organization.createdAt)}</p>
        </div>
        <AccountStatus status={organization.status} />
      </header>

      {mayManage && (
        <section className="rounded-lg bg-white p-4 ring-1 ring-zinc-200">
          {organization.status === 'active' ? (
            <ConfirmForm
              action={suspendOrganization.bind(null, organization.id)}
              label="Suspend organization"
              confirmLabel="Suspend"
              danger
              description="Members can still sign in and see it, but nothing can be changed and its API keys stop working until it’s reactivated."
            />
          ) : (
            <ConfirmForm action={reactivateOrganization.bind(null, organization.id)} label="Reactivate organization" confirmLabel="Reactivate" />
          )}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-zinc-500">Members</h2>
        <div className="overflow-x-auto rounded-lg bg-white ring-1 ring-zinc-200">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-zinc-500">
              <tr>
                <th className="px-4 py-2 font-medium">Member</th>
                <th className="px-4 py-2 font-medium">Role</th>
                <th className="px-4 py-2 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.userId} className="border-t border-zinc-100">
                  <td className="px-4 py-2">
                    <Link href={`/users/${member.userId}`} className="underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-900">
                      {member.firstName} {member.lastName}
                    </Link>
                    <span className="ml-2 text-zinc-500">{member.email}</span>
                  </td>
                  <td className="px-4 py-2 text-zinc-600">{member.role}</td>
                  <td className="whitespace-nowrap px-4 py-2 text-zinc-600">{formatDateTime(member.joinedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-zinc-500">Wallets</h2>
        <WalletsTable wallets={wallets} />
      </section>

      {payments && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-zinc-500">Recent payments</h2>
          <PaymentsTable payments={payments.data} empty="No payments yet." />
        </section>
      )}
    </div>
  );
}
