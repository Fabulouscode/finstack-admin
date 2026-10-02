import type { Metadata } from 'next';
import Link from 'next/link';
import { resolveReconciliationItem } from '@/app/(dashboard)/actions';
import { ConfirmForm } from '@/components/confirm-form';
import { ListFilters } from '@/components/list-filters';
import { Pager } from '@/components/pager';
import { finstack } from '@/lib/dal';
import { formatDateTime } from '@/lib/dates';

export const metadata: Metadata = { title: 'Reconciliation · FinStack Admin' };

const STATUSES = ['open', 'resolved', 'auto_resolved'] as const;

/** What each issue means, in words a finance person would use. */
const ISSUES: Record<string, string> = {
  missing_in_finstack: 'The provider has it; FinStack doesn’t',
  not_credited: 'Collected by the provider, but never credited',
  credited_without_payment: 'Credited, but the provider didn’t collect it',
  amount_mismatch: 'Amounts differ',
  status_mismatch: 'Statuses differ',
  late_settlement: 'Settled late (a webhook was missed)',
  balance_discrepancy: 'A ledger balance doesn’t match its entries',
  trial_balance_mismatch: 'The ledger doesn’t balance',
};

function Record_({ title, record }: { title: string; record: Record<string, unknown> | null }) {
  return (
    <div className="flex-1 rounded-md bg-zinc-50 p-3 ring-1 ring-zinc-200">
      <p className="text-xs font-medium text-zinc-500">{title}</p>
      {record ? (
        <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 font-mono text-xs">
          {Object.entries(record).map(([key, value]) => (
            <div key={key} className="contents">
              <dt className="text-zinc-500">{key}</dt>
              <dd className="break-all">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-1 text-xs text-zinc-400">No record</p>
      )}
    </div>
  );
}

export default async function ReconciliationPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; cursor?: string }>;
}) {
  const params = await searchParams;
  // Open items by default: they're what needs a person.
  const status = STATUSES.find((s) => s === params.status) ?? (params.status === '' ? undefined : 'open');
  const client = await finstack();
  const [{ data: items }, { data: runs }] = await Promise.all([
    client.GET('/v1/admin/reconciliation/items', { params: { query: { status, cursor: params.cursor, limit: 20 } } }),
    client.GET('/v1/admin/reconciliation/runs', { params: { query: { limit: 5 } } }),
  ]);
  if (!items) return null;
  const recentRuns = Array.isArray(runs) ? runs : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Reconciliation</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Every night FinStack compares its records with each provider’s and with the ledger. Late webhooks are fixed automatically; anything else is listed here for a person.
        </p>
      </div>
      <ListFilters basePath="/reconciliation?status=" filters={[{ name: 'status', label: 'Status', options: STATUSES, value: status }]} />

      {items.data.length === 0 && (
        <p className="rounded-lg bg-white p-6 text-center text-sm text-zinc-500 ring-1 ring-zinc-200">
          {status === 'open' ? 'Nothing needs attention. Records match.' : 'No items match.'}
        </p>
      )}
      <div className="flex flex-col gap-3">
        {items.data.map((item) => (
          <article key={item.id} className="rounded-lg bg-white p-4 ring-1 ring-zinc-200">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-medium">{ISSUES[item.issue] ?? item.issue}</h2>
              <p className="text-xs text-zinc-500">
                {item.kind} · found {formatDateTime(item.createdAt)}
                {item.reference && <> · <span className="font-mono">{item.reference}</span></>}
              </p>
            </div>
            {item.kind === 'payment' && item.targetId && (
              <Link href={`/payments/${item.targetId}`} className="text-sm underline">View payment</Link>
            )}
            {item.kind === 'payout' && item.targetId && (
              <Link href={`/payouts/${item.targetId}`} className="text-sm underline">View payout</Link>
            )}
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <Record_ title="FinStack" record={item.finstack as Record<string, unknown> | null} />
              <Record_ title="Provider" record={item.provider as Record<string, unknown> | null} />
            </div>
            <div className="mt-3">
              {item.status === 'open' ? (
                <ConfirmForm
                  action={resolveReconciliationItem.bind(null, item.id)}
                  label="Mark resolved"
                  confirmLabel="Resolve"
                  reasonLabel="What was done about it (recorded)"
                />
              ) : (
                <p className="text-sm text-zinc-600">
                  {item.status === 'auto_resolved' ? 'Fixed automatically' : 'Resolved'}
                  {item.resolvedAt && ` on ${formatDateTime(item.resolvedAt)}`}
                  {item.resolutionNote && <>: “{item.resolutionNote}”</>}
                </p>
              )}
            </div>
          </article>
        ))}
      </div>
      <Pager basePath="/reconciliation" filters={{ status }} onLaterPage={Boolean(params.cursor)} nextCursor={items.nextCursor} />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-zinc-500">Recent runs</h2>
        <div className="overflow-x-auto rounded-lg bg-white ring-1 ring-zinc-200">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-zinc-500">
              <tr>
                <th className="px-4 py-2 font-medium">Started</th>
                <th className="px-4 py-2 font-medium">Against</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 text-right font-medium">Issues</th>
              </tr>
            </thead>
            <tbody>
              {recentRuns.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-zinc-500">No runs yet.</td></tr>
              )}
              {recentRuns.map((run) => (
                <tr key={run.id} className="border-t border-zinc-100">
                  <td className="whitespace-nowrap px-4 py-2 text-zinc-600">{formatDateTime(run.createdAt)}</td>
                  <td className="px-4 py-2">{run.provider ?? 'the ledger'}</td>
                  <td className="px-4 py-2 text-zinc-600">{run.status}{run.error && <span className="text-red-700"> · {run.error}</span>}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{String((run.summary as { issues?: number }).issues ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
