'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { finstack, ForbiddenError } from '@/lib/dal';
import { FinStackError } from '@/lib/finstack/auth-api';
import { formatMoney, parseAmount } from '@/lib/money';
import { NOTICE_COOKIE } from '@/lib/notice-cookie';

export interface ActionResult {
  ok: boolean;
  message: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Leaves a one-time notice for the next render, then returns the result. */
async function succeeded(message: string): Promise<ActionResult> {
  (await cookies()).set(NOTICE_COOKIE, message, { path: '/', maxAge: 60, sameSite: 'lax' });
  return { ok: true, message };
}

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
    return succeeded(`Checked with the provider: ${data?.status ?? 'unchanged'}.`);
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

// ---- Actions that need a reason (recorded in FinStack's audit log) --------

type ReasonAction = (
  id: string,
  previous: ActionResult | null,
  form: FormData,
) => Promise<ActionResult>;

function reasonFrom(form: FormData): string | null {
  const reason = String(form.get('reason') ?? '').trim();
  return reason.length > 0 && reason.length <= 500 ? reason : null;
}

/** Runs a FinStack call that takes `{ reason }`, reporting the outcome. */
async function withReason(
  id: string,
  form: FormData,
  call: (reason: string) => Promise<unknown>,
  done: string,
  revalidate: string[],
): Promise<ActionResult> {
  if (!UUID.test(id)) return { ok: false, message: 'Not a valid id.' };
  const reason = reasonFrom(form);
  if (!reason) return { ok: false, message: 'Give a reason (up to 500 characters).' };
  try {
    await call(reason);
  } catch (error) {
    if (error instanceof ForbiddenError || error instanceof FinStackError) {
      return { ok: false, message: error.message };
    }
    throw error;
  }
  for (const path of revalidate) revalidatePath(path);
  return succeeded(done);
}

export const suspendUser: ReasonAction = async (userId, _previous, form) => {
  const client = await finstack();
  return withReason(userId, form, (reason) =>
    client.POST('/v1/admin/users/{userId}/suspend', { params: { path: { userId } }, body: { reason } }),
    'Suspended. Their sessions have ended.', [`/users/${userId}`, '/users']);
};

export const reactivateUser: ReasonAction = async (userId, _previous, form) => {
  const client = await finstack();
  return withReason(userId, form, (reason) =>
    client.POST('/v1/admin/users/{userId}/reactivate', { params: { path: { userId } }, body: { reason } }),
    'Reactivated.', [`/users/${userId}`, '/users']);
};

const ROLES = ['user', 'support', 'risk', 'finance', 'admin'] as const;

export const setUserRole: ReasonAction = async (userId, _previous, form) => {
  const role = ROLES.find((r) => r === form.get('role'));
  if (!role) return { ok: false, message: 'Choose a role.' };
  const client = await finstack();
  return withReason(userId, form, (reason) =>
    client.POST('/v1/admin/users/{userId}/role', { params: { path: { userId } }, body: { reason, role } }),
    `Role changed to ${role}. It applies immediately.`, [`/users/${userId}`]);
};

export const suspendOrganization: ReasonAction = async (organizationId, _previous, form) => {
  const client = await finstack();
  return withReason(organizationId, form, (reason) =>
    client.POST('/v1/admin/organizations/{organizationId}/suspend', { params: { path: { organizationId } }, body: { reason } }),
    'Suspended. Its API keys have stopped working.', [`/organizations/${organizationId}`, '/organizations']);
};

export const reactivateOrganization: ReasonAction = async (organizationId, _previous, form) => {
  const client = await finstack();
  return withReason(organizationId, form, (reason) =>
    client.POST('/v1/admin/organizations/{organizationId}/reactivate', { params: { path: { organizationId } }, body: { reason } }),
    'Reactivated.', [`/organizations/${organizationId}`, '/organizations']);
};

export const freezeWallet: ReasonAction = async (walletId, _previous, form) => {
  const client = await finstack();
  return withReason(walletId, form, (reason) =>
    client.POST('/v1/admin/wallets/{walletId}/freeze', { params: { path: { walletId } }, body: { reason } }),
    'Frozen. No money can leave it.', [`/wallets/${walletId}`]);
};

export const unfreezeWallet: ReasonAction = async (walletId, _previous, form) => {
  const client = await finstack();
  return withReason(walletId, form, (reason) =>
    client.POST('/v1/admin/wallets/{walletId}/unfreeze', { params: { path: { walletId } }, body: { reason } }),
    'Unfrozen.', [`/wallets/${walletId}`]);
};

export const resolveReconciliationItem: ReasonAction = async (itemId, _previous, form) => {
  const client = await finstack();
  return withReason(itemId, form, (note) =>
    client.POST('/v1/admin/reconciliation/items/{itemId}/resolve', { params: { path: { itemId } }, body: { note } }),
    'Resolved.', ['/reconciliation']);
};

/** Re-runs a stored provider webhook. Settlement is idempotent: never credits twice. */
export async function replayWebhookEvent(id: string): Promise<ActionResult> {
  if (!UUID.test(id)) return { ok: false, message: 'Not a valid id.' };
  const client = await finstack();
  try {
    await client.POST('/v1/admin/webhook-events/{id}/replay', { params: { path: { id } } });
  } catch (error) {
    if (error instanceof ForbiddenError || error instanceof FinStackError) {
      return { ok: false, message: error.message };
    }
    throw error;
  }
  revalidatePath('/webhooks');
  return succeeded('Replay queued: FinStack is processing the event again. Refresh in a moment to see the outcome.');
}

// ---- Money-moving actions -------------------------------------------------

/**
 * Refunds a payment (in full when no amount is given). The idempotency key
 * is generated when the page renders, so a double-submitted form is one
 * refund at FinStack, never two.
 */
export async function createRefund(
  paymentId: string,
  currency: string,
  idempotencyKey: string,
  _previous: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  if (!UUID.test(paymentId) || !UUID.test(idempotencyKey)) {
    return { ok: false, message: 'Not a valid request.' };
  }
  if (form.get('acknowledged') !== 'on') {
    return { ok: false, message: 'Confirm that money will be returned to the customer.' };
  }
  const reason = reasonFrom(form);
  if (!reason) return { ok: false, message: 'Give a reason (up to 500 characters).' };
  const typed = String(form.get('amount') ?? '').trim();
  const amount = typed === '' ? undefined : parseAmount(typed, currency);
  if (amount === null) {
    return { ok: false, message: `“${typed}” isn’t a valid ${currency} amount.` };
  }

  const client = await finstack();
  try {
    const { data } = await client.POST('/v1/admin/payments/{paymentId}/refunds', {
      params: { path: { paymentId }, header: { 'Idempotency-Key': idempotencyKey } },
      body: { reason, ...(amount === undefined ? {} : { amount }) },
    });
    revalidatePath(`/payments/${paymentId}`);
    revalidatePath('/refunds');
    if (!data) return succeeded('Refund requested.');
    const sent = formatMoney(data.amount, data.currency);
    return data.status === 'failed'
      ? { ok: false, message: `The provider rejected the ${sent} refund: ${data.failureReason ?? 'no reason given'}. The money stays in the wallet.` }
      : succeeded(`Refund of ${sent} ${data.status === 'successful' ? 'sent' : 'is processing'}.`);
  } catch (error) {
    if (error instanceof ForbiddenError || error instanceof FinStackError) {
      return { ok: false, message: error.message };
    }
    throw error;
  }
}

/** Ends a payment's settlement hold early, making the money spendable now. */
export async function releaseHold(
  paymentId: string,
  _previous: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  if (!UUID.test(paymentId)) return { ok: false, message: 'Not a valid id.' };
  if (form.get('acknowledged') !== 'on') {
    return { ok: false, message: 'Confirm the money should become spendable now.' };
  }
  const client = await finstack();
  try {
    await client.POST('/v1/admin/payments/{paymentId}/release', { params: { path: { paymentId } } });
  } catch (error) {
    if (error instanceof ForbiddenError || error instanceof FinStackError) {
      return { ok: false, message: error.message };
    }
    throw error;
  }
  revalidatePath(`/payments/${paymentId}`);
  return succeeded('Released: the money is now available.');
}
