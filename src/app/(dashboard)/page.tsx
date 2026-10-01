import type { Metadata } from 'next';
import { finstack } from '@/lib/dal';
import { formatMoney } from '@/lib/money';

export const metadata: Metadata = { title: 'Overview · FinStack Admin' };

function Stat({ label, value, warn }: { label: string; value: string | number; warn?: boolean }) {
  return (
    <div className={`rounded-lg bg-white p-4 ring-1 ${warn ? 'ring-amber-300' : 'ring-zinc-200'}`}>
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${warn ? 'text-amber-800' : ''}`}>{value}</p>
    </div>
  );
}

export default async function OverviewPage() {
  const { data } = await (await finstack()).GET('/v1/admin/overview');
  if (!data) return null;
  const { attention } = data;
  const needsAttention: [string, number][] = [
    ['Payouts processing', attention.processingPayouts.count],
    ['Refunds processing', attention.processingRefunds.count],
    ['Open reconciliation items', attention.openReconciliationItems],
    ['Failed provider webhooks', attention.failedInboundWebhooks],
    ['Failed outbound deliveries (24h)', attention.failedOutboundDeliveriesLast24h],
    ['Disabled webhook endpoints', attention.disabledWebhookEndpoints],
  ];

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">Overview</h1>

      <section>
        <h2 className="mb-3 text-sm font-medium text-zinc-500">Needs attention</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {needsAttention.map(([label, count]) => (
            <Stat key={label} label={label} value={count} warn={count > 0} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-zinc-500">Owed to wallet holders</h2>
        <div className="overflow-hidden rounded-lg bg-white ring-1 ring-zinc-200">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-zinc-500">
              <tr>
                <th className="px-4 py-2 font-medium">Currency</th>
                <th className="px-4 py-2 text-right font-medium">Available</th>
                <th className="px-4 py-2 text-right font-medium">Pending</th>
                <th className="px-4 py-2 text-right font-medium">Reserved</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(data.walletBalances).map(([currency, totals]) => (
                <tr key={currency} className="border-t border-zinc-100">
                  <td className="px-4 py-2 font-mono">{currency}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatMoney(totals.available, currency)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatMoney(totals.pending, currency)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatMoney(totals.reserved, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Object.entries(data.users).map(([status, count]) => (
          <Stat key={`u-${status}`} label={`Users · ${status}`} value={count} />
        ))}
        {Object.entries(data.organizations).map(([status, count]) => (
          <Stat key={`o-${status}`} label={`Organizations · ${status}`} value={count} />
        ))}
      </section>
    </div>
  );
}
