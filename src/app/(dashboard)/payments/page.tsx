import type { Metadata } from 'next';
import { ListFilters, pick } from '@/components/list-filters';
import { Pager } from '@/components/pager';
import { PaymentsTable } from '@/components/payments-table';
import { finstack } from '@/lib/dal';

export const metadata: Metadata = { title: 'Payments · FinStack Admin' };

const STATUSES = ['pending', 'processing', 'successful', 'failed', 'reversed'] as const;
const PROVIDERS = ['paystack', 'stripe', 'flutterwave', 'mock'] as const;


export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; provider?: string; cursor?: string }>;
}) {
  const params = await searchParams;
  const status = pick(params.status, STATUSES);
  const provider = pick(params.provider, PROVIDERS);

  const { data } = await (await finstack()).GET('/v1/admin/payments', {
    params: {
      query: { status, provider, cursor: params.cursor, limit: 25 },
    },
  });
  if (!data) return null;


  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Payments</h1>

      <ListFilters
        basePath="/payments"
        filters={[
          { name: 'status', label: 'Status', options: STATUSES, value: status },
          { name: 'provider', label: 'Provider', options: PROVIDERS, value: provider },
        ]}
      />

      <PaymentsTable payments={data.data} />

      <Pager basePath="/payments" filters={{ status, provider }} onLaterPage={Boolean(params.cursor)} nextCursor={data.nextCursor} />
    </div>
  );
}
