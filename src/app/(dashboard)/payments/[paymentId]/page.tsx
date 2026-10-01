import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { StatusPill } from '@/components/status-pill';
import { finstack } from '@/lib/dal';
import { formatDateTime } from '@/lib/dates';
import { FinStackError } from '@/lib/finstack/auth-api';
import { formatMoney } from '@/lib/money';

export const metadata: Metadata = { title: 'Payment · FinStack Admin' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function Field({ label, children, mono }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 py-2">
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className={`break-all text-sm ${mono ? 'font-mono text-xs' : ''}`}>
        {children ?? <span className="text-zinc-400">—</span>}
      </dd>
    </div>
  );
}

export default async function PaymentPage({
  params,
}: {
  params: Promise<{ paymentId: string }>;
}) {
  const { paymentId } = await params;
  if (!UUID.test(paymentId)) notFound();

  const client = await finstack();
  let payment;
  try {
    ({ data: payment } = await client.GET('/v1/admin/payments/{paymentId}', {
      params: { path: { paymentId } },
    }));
  } catch (error) {
    if (error instanceof FinStackError && error.status === 404) notFound();
    throw error;
  }
  if (!payment) notFound();

  const { data: refunds } = await client.GET('/v1/admin/refunds', {
    params: { query: { paymentId, limit: 100 } },
  });

  const timeline: [string, string | null][] = [
    ['Created', payment.createdAt],
    [payment.status === 'failed' ? 'Failed' : 'Completed', payment.completedAt],
    ['Money available to spend', payment.fundsAvailableAt],
  ];

  return (
    <div className="flex flex-col gap-6">
      <Link href="/payments" className="text-sm text-zinc-600 underline">← Payments</Link>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-zinc-500">{payment.reference}</p>
          <h1 className="mt-1 text-3xl font-semibold tabular-nums">
            {formatMoney(payment.amount, payment.currency)}
          </h1>
        </div>
        <div className="flex items-center gap-2 text-sm text-zinc-600">
          <StatusPill status={payment.status} />
          via {payment.provider}
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        <section className="rounded-lg bg-white p-4 ring-1 ring-zinc-200 md:col-span-2">
          <h2 className="text-sm font-medium text-zinc-500">Details</h2>
          <dl className="mt-2 grid grid-cols-1 divide-y divide-zinc-100 sm:grid-cols-2 sm:divide-y-0">
            <Field label="Payment ID" mono>{payment.id}</Field>
            <Field label="Provider reference" mono>{payment.providerReference}</Field>
            <Field label="Wallet credited" mono>{payment.walletId}</Field>
            <Field label="Transaction ID" mono>{payment.transactionId}</Field>
            {payment.conversion && (
              <Field label="Credited after conversion">
                {formatMoney(payment.conversion.amount, payment.conversion.currency)} at{' '}
                {payment.conversion.rate} {payment.conversion.rateQuote}/{payment.conversion.rateBase}
              </Field>
            )}
            {payment.fee && (
              <Field label="Fee">{formatMoney(payment.fee.amount, payment.fee.currency)}</Field>
            )}
            {payment.heldAmount > 0 && (
              <Field label="Still on hold">
                {formatMoney(payment.heldAmount, payment.conversion?.currency ?? payment.currency)}
              </Field>
            )}
            {payment.failureCode && (
              <Field label="Failure" mono>{payment.failureCode}</Field>
            )}
          </dl>
        </section>

        <section className="rounded-lg bg-white p-4 ring-1 ring-zinc-200">
          <h2 className="text-sm font-medium text-zinc-500">Timeline</h2>
          <ol className="mt-3 flex flex-col gap-3">
            {timeline.map(([label, at]) => (
              <li key={label} className="flex gap-3 text-sm">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${at ? 'bg-emerald-700' : 'bg-zinc-300'}`} />
                <div>
                  <p className={at ? '' : 'text-zinc-400'}>{label}</p>
                  <p className="text-xs text-zinc-500">{at ? formatDateTime(at) : 'Not yet'}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-zinc-500">Refunds</h2>
        {!refunds || refunds.data.length === 0 ? (
          <p className="rounded-lg bg-white p-4 text-sm text-zinc-500 ring-1 ring-zinc-200">
            No refunds on this payment.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg bg-white ring-1 ring-zinc-200">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-left text-zinc-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Requested</th>
                  <th className="px-4 py-2 font-medium">Reason</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {refunds.data.map((refund) => (
                  <tr key={refund.id} className="border-t border-zinc-100 align-top">
                    <td className="whitespace-nowrap px-4 py-2 text-zinc-600">{formatDateTime(refund.createdAt)}</td>
                    <td className="px-4 py-2">
                      {refund.reason}
                      {refund.failureReason && (
                        <p className="mt-1 text-xs text-red-700">{refund.failureReason}</p>
                      )}
                    </td>
                    <td className="px-4 py-2"><StatusPill status={refund.status} /></td>
                    <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums">
                      {formatMoney(refund.amount, refund.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
