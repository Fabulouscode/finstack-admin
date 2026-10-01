import type { Metadata } from 'next';
import Link from 'next/link';
import { StatusPill } from '@/components/status-pill';
import { finstack } from '@/lib/dal';
import { formatDateTime } from '@/lib/dates';
import { formatMoney } from '@/lib/money';

export const metadata: Metadata = { title: 'Payments · FinStack Admin' };

const STATUSES = ['pending', 'processing', 'successful', 'failed', 'reversed'] as const;
const PROVIDERS = ['paystack', 'stripe', 'flutterwave', 'mock'] as const;

type Status = (typeof STATUSES)[number];
type Provider = (typeof PROVIDERS)[number];

const pick = <T extends string>(value: string | undefined, allowed: readonly T[]) =>
  allowed.includes(value as T) ? (value as T) : undefined;

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; provider?: string; cursor?: string }>;
}) {
  const params = await searchParams;
  const status = pick<Status>(params.status, STATUSES);
  const provider = pick<Provider>(params.provider, PROVIDERS);

  const { data } = await (await finstack()).GET('/v1/admin/payments', {
    params: {
      query: { status, provider, cursor: params.cursor, limit: 25 },
    },
  });
  if (!data) return null;

  const next = new URLSearchParams();
  if (status) next.set('status', status);
  if (provider) next.set('provider', provider);
  if (data.nextCursor) next.set('cursor', data.nextCursor);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Payments</h1>

      <form className="flex flex-wrap items-end gap-3 text-sm">
        <label className="flex flex-col gap-1">
          Status
          <select name="status" defaultValue={status ?? ''} className="rounded-md border border-zinc-300 bg-white px-2 py-1.5">
            <option value="">Any</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          Provider
          <select name="provider" defaultValue={provider ?? ''} className="rounded-md border border-zinc-300 bg-white px-2 py-1.5">
            <option value="">Any</option>
            {PROVIDERS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="rounded-md bg-zinc-900 px-3 py-1.5 text-white">Filter</button>
        {(status || provider) && (
          <Link href="/payments" className="px-1 py-1.5 text-zinc-600 underline">Clear</Link>
        )}
      </form>

      <div className="overflow-x-auto rounded-lg bg-white ring-1 ring-zinc-200">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-500">
            <tr>
              <th className="px-4 py-2 font-medium">Created</th>
              <th className="px-4 py-2 font-medium">Reference</th>
              <th className="px-4 py-2 font-medium">Provider</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.data.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">No payments match.</td>
              </tr>
            )}
            {data.data.map((payment) => (
              <tr key={payment.id} className="border-t border-zinc-100">
                <td className="whitespace-nowrap px-4 py-2 text-zinc-600">
                  {formatDateTime(payment.createdAt)}
                </td>
                <td className="px-4 py-2 font-mono text-xs">
                  <Link href={`/payments/${payment.id}`} className="underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-900">
                    {payment.reference}
                  </Link>
                </td>
                <td className="px-4 py-2">{payment.provider}</td>
                <td className="px-4 py-2">
                  <StatusPill status={payment.status} />
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums">
                  {formatMoney(payment.amount, payment.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between text-sm">
        {params.cursor ? (
          <Link href={`/payments?${new URLSearchParams({ ...(status && { status }), ...(provider && { provider }) })}`} className="underline">
            First page
          </Link>
        ) : <span />}
        {data.nextCursor && (
          <Link href={`/payments?${next}`} className="underline">Next page →</Link>
        )}
      </div>
    </div>
  );
}
