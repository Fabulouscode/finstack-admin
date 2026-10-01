import { formatDateTime } from '@/lib/dates';

/** Steps with when they happened; steps not reached yet are greyed. */
export function Timeline({ steps }: { steps: [string, string | null][] }) {
  return (
    <ol className="mt-3 flex flex-col gap-3">
      {steps.map(([label, at]) => (
        <li key={label} className="flex gap-3 text-sm">
          <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${at ? 'bg-emerald-700' : 'bg-zinc-300'}`} />
          <div>
            <p className={at ? '' : 'text-zinc-400'}>{label}</p>
            <p className="text-xs text-zinc-500">{at ? formatDateTime(at) : 'Not yet'}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
