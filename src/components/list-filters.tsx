import Link from 'next/link';

export interface FilterSpec {
  name: string;
  label: string;
  options: readonly string[];
  value: string | undefined;
}

/** A plain GET form, so filters work without JavaScript and are linkable. */
export function ListFilters({ basePath, filters }: { basePath: string; filters: FilterSpec[] }) {
  const active = filters.some((filter) => filter.value);
  return (
    <form className="flex flex-wrap items-end gap-3 text-sm">
      {filters.map((filter) => (
        <label key={filter.name} className="flex flex-col gap-1">
          {filter.label}
          <select name={filter.name} defaultValue={filter.value ?? ''} className="rounded-md border border-zinc-300 bg-white px-2 py-1.5">
            <option value="">Any</option>
            {filter.options.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
      ))}
      <button type="submit" className="rounded-md bg-zinc-900 px-3 py-1.5 text-white">Filter</button>
      {active && (
        <Link href={basePath} className="px-1 py-1.5 text-zinc-600 underline">Clear</Link>
      )}
    </form>
  );
}

/** Pick a query value only if it's one of the allowed options. */
export function pick<T extends string>(value: string | undefined, allowed: readonly T[]): T | undefined {
  return allowed.includes(value as T) ? (value as T) : undefined;
}
