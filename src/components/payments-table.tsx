import Link from 'next/link';
import { StatusPill } from '@/components/status-pill';
import { formatDateTime } from '@/lib/dates';
import { formatMoney } from '@/lib/money';

interface PaymentRow {
  id: string;
  reference: string;
  provider: string;
  status: string;
  amount: number;
  currency: string;
  createdAt: string;
}

export function PaymentsTable({ payments, empty = 'No payments match.' }: { payments: PaymentRow[]; empty?: string }) {
  return (
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
          {payments.length === 0 && (
            <tr><td colSpan={5} className="px-4 py-8 text-center text-zinc-500">{empty}</td></tr>
          )}
          {payments.map((payment) => (
            <tr key={payment.id} className="border-t border-zinc-100">
              <td className="whitespace-nowrap px-4 py-2 text-zinc-600">{formatDateTime(payment.createdAt)}</td>
              <td className="px-4 py-2 font-mono text-xs">
                <Link href={`/payments/${payment.id}`} className="underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-900">
                  {payment.reference}
                </Link>
              </td>
              <td className="px-4 py-2">{payment.provider}</td>
              <td className="px-4 py-2"><StatusPill status={payment.status} /></td>
              <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums">{formatMoney(payment.amount, payment.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
