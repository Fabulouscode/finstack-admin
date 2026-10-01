/** One labelled value in a details card; empty values show a dash. */
export function Field({ label, children, mono }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 py-2">
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className={`break-all text-sm ${mono ? 'font-mono text-xs' : ''}`}>
        {children ?? <span className="text-zinc-400">—</span>}
      </dd>
    </div>
  );
}
