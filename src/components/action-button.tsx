'use client';

import { useActionState } from 'react';
import type { ActionResult } from '@/app/(dashboard)/actions';

/** Runs a safe server action and shows what happened. */
export function ActionButton({
  action,
  label,
  pendingLabel,
}: {
  action: () => Promise<ActionResult>;
  label: string;
  pendingLabel: string;
}) {
  const [result, run, pending] = useActionState<ActionResult | null>(action, null);
  return (
    <form action={run} className="flex flex-wrap items-center gap-2">
      <button
        type="submit"
        disabled={pending}
        className="rounded-md px-3 py-1.5 text-sm ring-1 ring-zinc-300 hover:bg-zinc-100 disabled:opacity-60"
      >
        {pending ? pendingLabel : label}
      </button>
      {result && (
        <span role="status" className={`text-xs ${result.ok ? 'text-emerald-800' : 'text-red-700'}`}>
          {result.message}
        </span>
      )}
    </form>
  );
}
