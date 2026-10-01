'use client';

/** Shown when a page can't load, e.g. the role lacks a permission. */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const forbidden = error.message.startsWith('Your role does not allow');
  return (
    <div className="rounded-lg bg-white p-6 ring-1 ring-zinc-200">
      <h2 className="text-lg font-semibold">
        {forbidden ? 'Not available to your role' : 'This page couldn’t load'}
      </h2>
      <p className="mt-2 text-sm text-zinc-600">
        {forbidden
          ? error.message
          : 'FinStack may be unavailable. Try again in a moment.'}
      </p>
      {!forbidden && (
        <button onClick={reset} className="mt-4 rounded-md px-3 py-1.5 text-sm ring-1 ring-zinc-300 hover:bg-zinc-100">
          Try again
        </button>
      )}
    </div>
  );
}
