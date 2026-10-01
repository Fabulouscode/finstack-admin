import type { Metadata } from 'next';
import Link from 'next/link';
import { ListFilters, pick } from '@/components/list-filters';
import { Pager } from '@/components/pager';
import { StatusPill } from '@/components/status-pill';
import { finstack } from '@/lib/dal';
import { formatDateTime } from '@/lib/dates';
import { formatMoney } from '@/lib/money';

export const metadata: Metadata = { title: 'Refunds · FinStack Admin' };

const STATUSES = ['processing', 'successful', 'failed'] as const;
const PROVIDERS = ['paystack', 'stripe', 'flutterwave', 'mock'] as const;

export default async function RefundsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; provider?: string; cursor?: string }>;
}) {
  const params = await searchParams;
  const status = pick(params.status, STATUSES);
  const provider = pick(params.provider, PROVIDERS);
  const { data } = await (await finstack()).GET('/v1/admin/refunds', {
    params: { query: { status, provider, cursor: params.cursor, limit: 25 } },
  });
  if (!data) return null;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Refunds</h1>
      <ListFilters
        basePath="/refunds"
        filters={[
          { name: 'status', label: 'Status', options: STATUSES, value: status },
          { name: 'provider', label: 'Provider', options: PROVIDERS, value: provider },
        ]}
      />
      <div className="overflow-x-auto rounded-lg bg-white ring-1 ring-zinc-200">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-500">
            <tr>
              <th className="px-4 py-2 font-medium">Requested</th>
              <th className="px-4 py-2 font-medium">Payment</th>
              <th className="px-4 py-2 font-medium">Reason</th>
              <th className="px-4 py-2 font-medium">Provider</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.data.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-zinc-500">No refunds match.</td></tr>
            )}
            {data.data.map((refund) => (
              <tr key={refund.id} className="border-t border-zinc-100 align-top">
                <td className="whitespace-nowrap px-4 py-2 text-zinc-600">{formatDateTime(refund.createdAt)}</td>
                <td className="px-4 py-2 text-xs">
                  <Link href={`/payments/${refund.paymentId}`} className="underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-900">
                    View payment
                  </Link>
                </td>
                <td className="px-4 py-2">
                  {refund.reason}
                  {refund.failureReason && <p className="mt-1 text-xs text-red-700">{refund.failureReason}</p>}
                </td>
                <td className="px-4 py-2">{refund.provider}</td>
                <td className="px-4 py-2"><StatusPill status={refund.status} /></td>
                <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums">{formatMoney(refund.amount, refund.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager basePath="/refunds" filters={{ status, provider }} onLaterPage={Boolean(params.cursor)} nextCursor={data.nextCursor} />
    </div>
  );
}
