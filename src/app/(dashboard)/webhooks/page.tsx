import type { Metadata } from 'next';
import { replayWebhookEvent } from '@/app/(dashboard)/actions';
import { ActionButton } from '@/components/action-button';
import { ListFilters } from '@/components/list-filters';
import { finstack } from '@/lib/dal';
import { formatDateTime } from '@/lib/dates';

export const metadata: Metadata = { title: 'Webhooks · FinStack Admin' };

const STATUSES = ['failed', 'ignored', 'processed', 'received'] as const;

export default async function WebhooksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  // Failed events by default: they're the ones that may need a replay.
  const status = STATUSES.find((s) => s === params.status) ?? (params.status === '' ? undefined : 'failed');
  const client = await finstack();
  const [{ data: events }, { data: queues }] = await Promise.all([
    client.GET('/v1/admin/webhook-events', { params: { query: { status, limit: 50 } } }),
    client.GET('/v1/admin/queues'),
  ]);
  const rows = Array.isArray(events) ? events : [];
  const queueRows = Array.isArray(queues) ? queues : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Provider webhooks</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Events from Paystack, Stripe and Flutterwave. Failed ones were retried automatically; replay one after fixing the cause. Replaying can never credit twice.
        </p>
      </div>
      <ListFilters basePath="/webhooks?status=" filters={[{ name: 'status', label: 'Status', options: STATUSES, value: status }]} />
      <div className="overflow-x-auto rounded-lg bg-white ring-1 ring-zinc-200">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-500">
            <tr>
              <th className="px-4 py-2 font-medium">Received</th>
              <th className="px-4 py-2 font-medium">Event</th>
              <th className="px-4 py-2 font-medium">Outcome</th>
              <th className="px-4 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-zinc-500">{status === 'failed' ? 'No failed webhooks.' : 'No events match.'}</td></tr>
            )}
            {rows.map((event) => (
              <tr key={event.id} className="border-t border-zinc-100 align-top">
                <td className="whitespace-nowrap px-4 py-2 text-zinc-600">{formatDateTime(event.receivedAt)}</td>
                <td className="px-4 py-2">
                  {event.provider} <span className="font-mono text-xs">{event.type}</span>
                  <p className="font-mono text-xs text-zinc-400">{event.eventId}</p>
                </td>
                <td className="max-w-md px-4 py-2">
                  <span className="text-zinc-700">{event.status}</span>
                  {event.outcome && <span className="font-mono text-xs text-zinc-500"> · {event.outcome}</span>}
                  <span className="text-xs text-zinc-500"> · {event.attempts} {event.attempts === 1 ? 'attempt' : 'attempts'}</span>
                  {event.lastError && <p className="mt-1 text-xs text-red-700">{event.lastError}</p>}
                </td>
                <td className="px-4 py-2">
                  {(event.status === 'failed' || event.status === 'ignored') && (
                    <ActionButton action={replayWebhookEvent.bind(null, event.id)} label="Replay" pendingLabel="Replaying…" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-zinc-500">Background queues</h2>
        <div className="overflow-x-auto rounded-lg bg-white ring-1 ring-zinc-200">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-zinc-500">
              <tr>
                {['Queue', 'Waiting', 'Active', 'Delayed', 'Failed'].map((h, i) => (
                  <th key={h} className={`px-4 py-2 font-medium ${i ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {queueRows.map((q) => (
                <tr key={q.queue} className="border-t border-zinc-100">
                  <td className="px-4 py-2 font-mono text-xs">{q.queue}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{q.waiting}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{q.active}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{q.delayed}</td>
                  <td className={`px-4 py-2 text-right tabular-nums ${q.failed > 0 ? 'text-red-700' : ''}`}>{q.failed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
