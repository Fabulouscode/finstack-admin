import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { randomUUID } from 'node:crypto';
import { createRefund, releaseHold, retryRefund } from '@/app/(dashboard)/actions';
import { ConfirmForm } from '@/components/confirm-form';
import { ActionButton } from '@/components/action-button';
import { Field } from '@/components/field';
import { StatusPill } from '@/components/status-pill';
import { Timeline } from '@/components/timeline';
import { finstack } from '@/lib/dal';
import { formatDateTime } from '@/lib/dates';
import { FinStackError } from '@/lib/finstack/auth-api';
import { formatMoney } from '@/lib/money';
import { can } from '@/lib/permissions';

export const metadata: Metadata = { title: 'Payment · FinStack Admin' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

  const [mayRetry, mayRelease] = await Promise.all([can('refunds:manage'), can('payments:manage')]);
  const mayRefund = mayRetry && payment.status === 'successful';
  const mayEndHold = mayRelease && payment.heldAmount > 0;
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
          <Timeline steps={timeline} />
        </section>
      </div>

      {(mayRefund || mayEndHold) && (
        <section className="flex flex-col gap-3 rounded-lg bg-white p-4 ring-1 ring-zinc-200">
          <h2 className="text-sm font-medium text-zinc-500">Actions</h2>
          {mayRefund && (
            <ConfirmForm
              action={createRefund.bind(null, payment.id, payment.currency, randomUUID())}
              label="Refund…"
              confirmLabel="Send refund"
              danger
              description={`Sends money back to the customer through ${payment.provider}. The wallet is debited first, so a refund can’t exceed what the wallet holds.`}
              acknowledge={`I understand this sends money back to the customer and can’t be undone.`}
            >
              <label className="flex flex-col gap-1 text-sm">
                Amount ({payment.currency})
                <input
                  name="amount"
                  inputMode="decimal"
                  placeholder="Leave empty to refund everything that’s left"
                  className="w-80 max-w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5"
                />
              </label>
            </ConfirmForm>
          )}
          {mayEndHold && (
            <ConfirmForm
              action={releaseHold.bind(null, payment.id)}
              label="Release hold now"
              confirmLabel="Release"
              description="Makes the held money spendable before the settlement delay ends. Use when you’re confident there won’t be a chargeback."
              acknowledge="I understand the money becomes spendable immediately."
              reasonRequired={false}
              reasonLabel=""
            />
          )}
        </section>
      )}

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
                    <td className="px-4 py-2">
                      <StatusPill status={refund.status} />
                      {mayRetry && refund.status === 'processing' && (
                        <div className="mt-2">
                          <ActionButton
                            action={retryRefund.bind(null, refund.id, payment.id)}
                            label="Retry"
                            pendingLabel="Checking…"
                          />
                        </div>
                      )}
                    </td>
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
