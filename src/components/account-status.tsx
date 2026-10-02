/** Active is quiet; anything else (suspended, frozen) stands out. */
export function AccountStatus({ status }: { status: string }) {
  return status === 'active' ? (
    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 ring-1 ring-zinc-200">active</span>
  ) : (
    <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-800 ring-1 ring-red-200">{status}</span>
  );
}
