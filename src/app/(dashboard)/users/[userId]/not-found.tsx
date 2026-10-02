import Link from 'next/link';

export default function UserNotFound() {
  return (
    <div className="rounded-lg bg-white p-6 ring-1 ring-zinc-200">
      <h2 className="text-lg font-semibold">User not found</h2>
      <p className="mt-2 text-sm text-zinc-600">It may have been mistyped, or it doesn’t exist.</p>
      <Link href="/users" className="mt-4 inline-block text-sm underline">Back to users</Link>
    </div>
  );
}
