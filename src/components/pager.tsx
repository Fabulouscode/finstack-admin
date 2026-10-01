import Link from 'next/link';

/** "First page" and "Next page" links that keep the current filters. */
export function Pager({
  basePath,
  filters,
  onLaterPage,
  nextCursor,
}: {
  basePath: string;
  filters: Record<string, string | undefined>;
  onLaterPage: boolean;
  nextCursor: string | null;
}) {
  const query = (cursor?: string) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
    if (cursor) params.set('cursor', cursor);
    const text = params.toString();
    return text ? `${basePath}?${text}` : basePath;
  };
  return (
    <div className="flex justify-between text-sm">
      {onLaterPage ? <Link href={query()} className="underline">First page</Link> : <span />}
      {nextCursor && <Link href={query(nextCursor)} className="underline">Next page →</Link>}
    </div>
  );
}
