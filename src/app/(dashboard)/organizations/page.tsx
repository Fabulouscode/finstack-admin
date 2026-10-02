import type { Metadata } from 'next';
import Link from 'next/link';
import { AccountStatus } from '@/components/account-status';
import { ListFilters, pick } from '@/components/list-filters';
import { Pager } from '@/components/pager';
import { finstack } from '@/lib/dal';
import { formatDateTime } from '@/lib/dates';

export const metadata: Metadata = { title: 'Organizations · FinStack Admin' };

const STATUSES = ['active', 'suspended'] as const;

export default async function OrganizationsPage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string; status?: string; cursor?: string }>;
}) {
  const params = await searchParams;
  const name = params.name?.trim() || undefined;
  const status = pick(params.status, STATUSES);
  const { data } = await (await finstack()).GET('/v1/admin/organizations', {
    params: { query: { name, status, cursor: params.cursor, limit: 25 } },
  });
  if (!data) return null;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Organizations</h1>
      <ListFilters
        basePath="/organizations"
        filters={[
          { name: 'name', label: 'Name', value: name, placeholder: 'part of a name' },
          { name: 'status', label: 'Status', options: STATUSES, value: status },
        ]}
      />
      <div className="overflow-x-auto rounded-lg bg-white ring-1 ring-zinc-200">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-500">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {data.data.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-zinc-500">No organizations match.</td></tr>
            )}
            {data.data.map((org) => (
              <tr key={org.id} className="border-t border-zinc-100">
                <td className="px-4 py-2">
                  <Link href={`/organizations/${org.id}`} className="underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-900">{org.name}</Link>
                </td>
                <td className="px-4 py-2"><AccountStatus status={org.status} /></td>
                <td className="whitespace-nowrap px-4 py-2 text-zinc-600">{formatDateTime(org.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager basePath="/organizations" filters={{ name, status }} onLaterPage={Boolean(params.cursor)} nextCursor={data.nextCursor} />
    </div>
  );
}
