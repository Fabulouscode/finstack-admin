import type { Metadata } from 'next';
import Link from 'next/link';
import { AccountStatus } from '@/components/account-status';
import { ListFilters, pick } from '@/components/list-filters';
import { Pager } from '@/components/pager';
import { finstack } from '@/lib/dal';
import { formatDateTime } from '@/lib/dates';

export const metadata: Metadata = { title: 'Users · FinStack Admin' };

const STATUSES = ['active', 'suspended'] as const;

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; status?: string; cursor?: string }>;
}) {
  const params = await searchParams;
  const email = params.email?.trim() || undefined;
  const status = pick(params.status, STATUSES);
  const { data } = await (await finstack()).GET('/v1/admin/users', {
    params: { query: { email, status, cursor: params.cursor, limit: 25 } },
  });
  if (!data) return null;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Users</h1>
      <ListFilters
        basePath="/users"
        filters={[
          { name: 'email', label: 'Email', value: email, placeholder: 'part of an email' },
          { name: 'status', label: 'Status', options: STATUSES, value: status },
        ]}
      />
      <div className="overflow-x-auto rounded-lg bg-white ring-1 ring-zinc-200">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-500">
            <tr>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Role</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {data.data.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-zinc-500">No users match.</td></tr>
            )}
            {data.data.map((user) => (
              <tr key={user.id} className="border-t border-zinc-100">
                <td className="px-4 py-2">
                  <Link href={`/users/${user.id}`} className="underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-900">{user.email}</Link>
                </td>
                <td className="px-4 py-2">{user.firstName} {user.lastName}</td>
                <td className="px-4 py-2 font-mono text-xs uppercase text-zinc-600">{user.role}</td>
                <td className="px-4 py-2"><AccountStatus status={user.status} /></td>
                <td className="whitespace-nowrap px-4 py-2 text-zinc-600">{formatDateTime(user.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager basePath="/users" filters={{ email, status }} onLaterPage={Boolean(params.cursor)} nextCursor={data.nextCursor} />
    </div>
  );
}
