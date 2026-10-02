import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { freezeWallet, unfreezeWallet } from '@/app/(dashboard)/actions';
import { AccountStatus } from '@/components/account-status';
import { ConfirmForm } from '@/components/confirm-form';
import { Field } from '@/components/field';
import { finstack } from '@/lib/dal';
import { formatDateTime } from '@/lib/dates';
import { FinStackError } from '@/lib/finstack/auth-api';
import { formatMoney } from '@/lib/money';
import { can } from '@/lib/permissions';

export const metadata: Metadata = { title: 'Wallet · FinStack Admin' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function WalletPage({ params }: { params: Promise<{ walletId: string }> }) {
  const { walletId } = await params;
  if (!UUID.test(walletId)) notFound();
  let wallet;
  try {
    ({ data: wallet } = await (await finstack()).GET('/v1/admin/wallets/{walletId}', { params: { path: { walletId } } }));
  } catch (error) {
    if (error instanceof FinStackError && error.status === 404) notFound();
    throw error;
  }
  if (!wallet) notFound();
  const mayManage = await can('wallets:manage');
  const owner = wallet.userId
    ? { href: `/users/${wallet.userId}`, label: 'Owner (user)' }
    : wallet.organizationId
      ? { href: `/organizations/${wallet.organizationId}`, label: 'Owner (organization)' }
      : null;

  return (
    <div className="flex flex-col gap-6">
      {owner && <Link href={owner.href} className="text-sm text-zinc-600 underline">← {owner.label}</Link>}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-zinc-500">{wallet.currency} wallet{wallet.isPrimary ? ' · primary' : ''}</p>
          <h1 className="mt-1 text-3xl font-semibold tabular-nums">{formatMoney(wallet.balances.available, wallet.currency)}</h1>
          <p className="text-sm text-zinc-600">available</p>
        </div>
        <AccountStatus status={wallet.status} />
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        <section className="rounded-lg bg-white p-4 ring-1 ring-zinc-200 md:col-span-2">
          <dl className="grid grid-cols-1 sm:grid-cols-2">
            <Field label="Pending (on hold after payments)">{formatMoney(wallet.balances.pending, wallet.currency)}</Field>
            <Field label="Reserved (refunds and payouts in flight)">{formatMoney(wallet.balances.reserved, wallet.currency)}</Field>
            <Field label="Wallet ID" mono>{wallet.id}</Field>
            <Field label="Created">{formatDateTime(wallet.createdAt)}</Field>
          </dl>
        </section>
        <section className="flex flex-col gap-3 rounded-lg bg-white p-4 ring-1 ring-zinc-200">
          <h2 className="text-sm font-medium text-zinc-500">Actions</h2>
          {mayManage && wallet.status === 'active' && (
            <ConfirmForm
              action={freezeWallet.bind(null, wallet.id)}
              label="Freeze wallet"
              confirmLabel="Freeze"
              danger
              description="Money can still arrive, but none can leave (transfers, payouts) until it’s unfrozen."
            />
          )}
          {mayManage && wallet.status === 'frozen' && (
            <ConfirmForm action={unfreezeWallet.bind(null, wallet.id)} label="Unfreeze wallet" confirmLabel="Unfreeze" />
          )}
          {!mayManage && <p className="text-xs text-zinc-500">Your role can view this wallet but not freeze it.</p>}
        </section>
      </div>
    </div>
  );
}
