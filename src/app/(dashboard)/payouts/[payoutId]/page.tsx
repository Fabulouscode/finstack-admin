import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { syncPayout } from '@/app/(dashboard)/actions';
import { ActionButton } from '@/components/action-button';
import { Field } from '@/components/field';
import { StatusPill } from '@/components/status-pill';
import { Timeline } from '@/components/timeline';
import { finstack } from '@/lib/dal';
import { FinStackError } from '@/lib/finstack/auth-api';
import { formatMoney } from '@/lib/money';
import { can } from '@/lib/permissions';

export const metadata: Metadata = { title: 'Payout · FinStack Admin' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PayoutPage({ params }: { params: Promise<{ payoutId: string }> }) {
  const { payoutId } = await params;
  if (!UUID.test(payoutId)) notFound();

  let payout;
  try {
    ({ data: payout } = await (await finstack()).GET('/v1/admin/payouts/{payoutId}', {
      params: { path: { payoutId } },
    }));
  } catch (error) {
    if (error instanceof FinStackError && error.status === 404) notFound();
    throw error;
  }
  if (!payout) notFound();
  const mayRecheck = await can('payouts:manage');
  const { destination } = payout;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/payouts" className="text-sm text-zinc-600 underline">← Payouts</Link>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-zinc-500">{payout.reference}</p>
          <h1 className="mt-1 text-3xl font-semibold tabular-nums">{formatMoney(payout.amount, payout.currency)}</h1>
        </div>
        <div className="flex items-center gap-2 text-sm text-zinc-600">
          <StatusPill status={payout.status} />
          via {payout.provider}
        </div>
      </header>

      {payout.failureReason && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200">
          {payout.failureReason}
        </p>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <section className="rounded-lg bg-white p-4 ring-1 ring-zinc-200 md:col-span-2">
          <h2 className="text-sm font-medium text-zinc-500">Paid to</h2>
          <dl className="mt-2 grid grid-cols-1 sm:grid-cols-2">
            <Field label="Account name">{destination.accountName}</Field>
            <Field label="Bank">{destination.bankName ?? destination.bankCode}</Field>
            <Field label="Account number">••••••{destination.accountNumberLast4}</Field>
            {destination.label && <Field label="Label">{destination.label}</Field>}
          </dl>
          <h2 className="mt-4 text-sm font-medium text-zinc-500">Details</h2>
          <dl className="mt-2 grid grid-cols-1 sm:grid-cols-2">
            <Field label="Payout ID" mono>{payout.id}</Field>
            <Field label="Provider reference" mono>{payout.providerReference}</Field>
            <Field label="Wallet debited" mono>{payout.walletId}</Field>
            {payout.fee && <Field label="Fee">{formatMoney(payout.fee.amount, payout.fee.currency)}</Field>}
            {payout.failureCode && <Field label="Failure" mono>{payout.failureCode}</Field>}
          </dl>
        </section>

        <section className="flex flex-col gap-4 rounded-lg bg-white p-4 ring-1 ring-zinc-200">
          <div>
            <h2 className="text-sm font-medium text-zinc-500">Timeline</h2>
            <Timeline
              steps={[
                ['Requested', payout.createdAt],
                [payout.status === 'failed' ? 'Failed' : 'Paid out', payout.completedAt],
              ]}
            />
          </div>
          {mayRecheck && payout.status === 'processing' && (
            <div className="border-t border-zinc-100 pt-4">
              <p className="mb-2 text-xs text-zinc-500">
                Asks {payout.provider} what happened. Never sends the money again.
              </p>
              <ActionButton
                action={syncPayout.bind(null, payout.id)}
                label="Re-check with provider"
                pendingLabel="Checking…"
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
