'use server';

import { revalidatePath } from 'next/cache';
import { finstack, ForbiddenError } from '@/lib/dal';
import { FinStackError } from '@/lib/finstack/auth-api';

export interface ActionResult {
  ok: boolean;
  message: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Server Actions are public endpoints: check input, and let FinStack decide. */
async function run(
  id: string,
  call: () => Promise<{ data?: { status: string } }>,
  revalidate: string,
): Promise<ActionResult> {
  if (!UUID.test(id)) return { ok: false, message: 'Not a valid id.' };
  try {
    const { data } = await call();
    revalidatePath(revalidate);
    return { ok: true, message: `Checked with the provider: ${data?.status ?? 'unchanged'}.` };
  } catch (error) {
    if (error instanceof ForbiddenError) return { ok: false, message: error.message };
    if (error instanceof FinStackError) return { ok: false, message: error.message };
    throw error;
  }
}

/** Ask the provider what happened to a payout. Never sends it again blindly. */
export async function syncPayout(payoutId: string): Promise<ActionResult> {
  const client = await finstack();
  return run(
    payoutId,
    () => client.POST('/v1/admin/payouts/{payoutId}/sync', { params: { path: { payoutId } } }),
    `/payouts/${payoutId}`,
  );
}

/** Re-ask the provider about a refund still processing (never sent twice). */
export async function retryRefund(refundId: string, paymentId: string): Promise<ActionResult> {
  const client = await finstack();
  return run(
    refundId,
    () => client.POST('/v1/admin/refunds/{refundId}/retry', { params: { path: { refundId } } }),
    `/payments/${paymentId}`,
  );
}
