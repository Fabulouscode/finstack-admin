import type { Metadata } from 'next';
import Link from 'next/link';
import { ListFilters } from '@/components/list-filters';
import { Pager } from '@/components/pager';
import { finstack } from '@/lib/dal';
import { formatDateTime } from '@/lib/dates';

export const metadata: Metadata = { title: 'Audit log · FinStack Admin' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Targets with a page in the dashboard. */
const TARGET_PAGES: Record<string, string> = {
  user: '/users',
  organization: '/organizations',
  wallet: '/wallets',
  payment: '/payments',
  payout: '/payouts',
};

function Target({ type, id }: { type: string; id: string | null }) {
  const base = TARGET_PAGES[type];
  if (!id) return <span className="text-zinc-600">{type}</span>;
  return base ? (
    <Link href={`${base}/${id}`} className="underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-900">{type}</Link>
  ) : (
    <span className="text-zinc-600" title={id}>{type}</span>
  );
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; actorId?: string; targetId?: string; cursor?: string }>;
}) {
  const params = await searchParams;
  const action = params.action?.trim() || undefined;
  const actorId = params.actorId && UUID.test(params.actorId.trim()) ? params.actorId.trim() : undefined;
  const targetId = params.targetId && UUID.test(params.targetId.trim()) ? params.targetId.trim() : undefined;
  const { data } = await (await finstack()).GET('/v1/admin/audit-logs', {
    params: { query: { action, actorId, targetId, cursor: params.cursor, limit: 50 } },
  });
  if (!data) return null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Audit log</h1>
        <p className="mt-1 text-sm text-zinc-600">Every sensitive action, who took it and why. Entries can’t be edited or deleted.</p>
      </div>
      <ListFilters
        basePath="/audit"
        filters={[
          { name: 'action', label: 'Action', value: action, placeholder: 'e.g. user.suspended' },
          { name: 'actorId', label: 'Actor ID', value: actorId, placeholder: 'user id' },
          { name: 'targetId', label: 'Target ID', value: targetId, placeholder: 'id of what was changed' },
        ]}
      />
      <div className="overflow-x-auto rounded-lg bg-white ring-1 ring-zinc-200">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-500">
            <tr>
              <th className="px-4 py-2 font-medium">When</th>
              <th className="px-4 py-2 font-medium">Action</th>
              <th className="px-4 py-2 font-medium">By</th>
              <th className="px-4 py-2 font-medium">On</th>
              <th className="px-4 py-2 font-medium">Details</th>
            </tr>
          </thead>
          <tbody>
            {data.data.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-zinc-500">No entries match.</td></tr>
            )}
            {data.data.map((entry) => {
              const reason = typeof entry.metadata.reason === 'string' ? entry.metadata.reason : null;
              const rest = Object.entries(entry.metadata).filter(([key]) => key !== 'reason');
              return (
                <tr key={entry.id} className="border-t border-zinc-100 align-top">
                  <td className="whitespace-nowrap px-4 py-2 text-zinc-600">{formatDateTime(entry.createdAt)}</td>
                  <td className="px-4 py-2 font-mono text-xs">{entry.action}</td>
                  <td className="whitespace-nowrap px-4 py-2">
                    {entry.actor.type === 'user' && entry.actor.id ? (
                      <Link href={`/users/${entry.actor.id}`} className="underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-900">Staff member</Link>
                    ) : (
                      <span className="text-zinc-600">{entry.actor.type.replace('_', ' ')}</span>
                    )}
                    {entry.ipAddress && <p className="font-mono text-xs text-zinc-400">{entry.ipAddress}</p>}
                  </td>
                  <td className="px-4 py-2"><Target type={entry.targetType} id={entry.targetId} /></td>
                  <td className="max-w-md px-4 py-2">
                    {reason && <p>“{reason}”</p>}
                    {rest.length > 0 && (
                      <p className="mt-1 break-all font-mono text-xs text-zinc-500">
                        {rest.map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : String(value)}`).join(' · ')}
                      </p>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Pager basePath="/audit" filters={{ action, actorId, targetId }} onLaterPage={Boolean(params.cursor)} nextCursor={data.nextCursor} />
    </div>
  );
}
