import type { Metadata } from 'next';
import Link from 'next/link';
import { ListFilters, pick } from '@/components/list-filters';
import { Pager } from '@/components/pager';
import { StatusPill } from '@/components/status-pill';
import { finstack } from '@/lib/dal';
import { formatDateTime } from '@/lib/dates';
import { formatMoney } from '@/lib/money';

export const metadata: Metadata = { title: 'Payouts · FinStack Admin' };

const STATUSES = ['processing', 'successful', 'failed', 'reversed'] as const;
const PROVIDERS = ['paystack', 'stripe', 'flutterwave', 'mock'] as const;

export default async function PayoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; provider?: string; cursor?: string }>;
}) {
  const params = await searchParams;
  const status = pick(params.status, STATUSES);
  const provider = pick(params.provider, PROVIDERS);
  const { data } = await (await finstack()).GET('/v1/admin/payouts', {
    params: { query: { status, provider, cursor: params.cursor, limit: 25 } },
  });
  if (!data) return null;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Payouts</h1>
      <ListFilters
        basePath="/payouts"
        filters={[
          { name: 'status', label: 'Status', options: STATUSES, value: status },
          { name: 'provider', label: 'Provider', options: PROVIDERS, value: provider },
        ]}
      />
      <div className="overflow-x-auto rounded-lg bg-white ring-1 ring-zinc-200">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-500">
            <tr>
              <th className="px-4 py-2 font-medium">Created</th>
              <th className="px-4 py-2 font-medium">Reference</th>
              <th className="px-4 py-2 font-medium">To</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.data.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-zinc-500">No payouts match.</td></tr>
            )}
            {data.data.map((payout) => (
              <tr key={payout.id} className="border-t border-zinc-100">
                <td className="whitespace-nowrap px-4 py-2 text-zinc-600">{formatDateTime(payout.createdAt)}</td>
                <td className="px-4 py-2 font-mono text-xs">
                  <Link href={`/payouts/${payout.id}`} className="underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-900">
                    {payout.reference}
                  </Link>
                </td>
                <td className="px-4 py-2">
                  {payout.destination.accountName}
                  <span className="ml-1 text-zinc-500">
                    · {payout.destination.bankName ?? payout.destination.bankCode} ••{payout.destination.accountNumberLast4}
                  </span>
                </td>
                <td className="px-4 py-2"><StatusPill status={payout.status} /></td>
                <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums">{formatMoney(payout.amount, payout.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager basePath="/payouts" filters={{ status, provider }} onLaterPage={Boolean(params.cursor)} nextCursor={data.nextCursor} />
    </div>
  );
}
