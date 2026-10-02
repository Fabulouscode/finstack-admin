import Link from 'next/link';
import { AccountStatus } from '@/components/account-status';
import { formatMoney } from '@/lib/money';

interface WalletRow {
  id: string;
  currency: string;
  status: string;
  isPrimary: boolean;
  balances: { available: number; pending: number; reserved: number };
}

export function WalletsTable({ wallets }: { wallets: WalletRow[] }) {
  if (wallets.length === 0) {
    return <p className="rounded-lg bg-white p-4 text-sm text-zinc-500 ring-1 ring-zinc-200">No wallets.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-lg bg-white ring-1 ring-zinc-200">
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 text-left text-zinc-500">
          <tr>
            <th className="px-4 py-2 font-medium">Wallet</th>
            <th className="px-4 py-2 font-medium">Status</th>
            <th className="px-4 py-2 text-right font-medium">Available</th>
            <th className="px-4 py-2 text-right font-medium">Pending</th>
            <th className="px-4 py-2 text-right font-medium">Reserved</th>
          </tr>
        </thead>
        <tbody>
          {wallets.map((wallet) => (
            <tr key={wallet.id} className="border-t border-zinc-100">
              <td className="px-4 py-2">
                <Link href={`/wallets/${wallet.id}`} className="font-mono underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-900">
                  {wallet.currency}
                </Link>
                {wallet.isPrimary && <span className="ml-2 text-xs text-zinc-500">primary</span>}
              </td>
              <td className="px-4 py-2"><AccountStatus status={wallet.status} /></td>
              <td className="px-4 py-2 text-right tabular-nums">{formatMoney(wallet.balances.available, wallet.currency)}</td>
              <td className="px-4 py-2 text-right tabular-nums">{formatMoney(wallet.balances.pending, wallet.currency)}</td>
              <td className="px-4 py-2 text-right tabular-nums">{formatMoney(wallet.balances.reserved, wallet.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
