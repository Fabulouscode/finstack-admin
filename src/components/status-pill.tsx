const STYLES: Record<string, string> = {
  successful: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  failed: 'bg-red-50 text-red-800 ring-red-200',
  reversed: 'bg-zinc-100 text-zinc-700 ring-zinc-300',
  cancelled: 'bg-zinc-100 text-zinc-700 ring-zinc-300',
  expired: 'bg-zinc-100 text-zinc-700 ring-zinc-300',
};

/** A transaction status; anything unfinished (pending, processing) is amber. */
export function StatusPill({ status }: { status: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs ring-1 ${STYLES[status] ?? 'bg-amber-50 text-amber-800 ring-amber-200'}`}>
      {status}
    </span>
  );
}
