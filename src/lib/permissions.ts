import 'server-only';
import { cache } from 'react';
import { finstack } from './dal';

/**
 * What the signed-in staff member may do, asked of FinStack once per
 * request. Only decides what to show: FinStack enforces every action.
 */
export const permissions = cache(async (): Promise<Set<string>> => {
  const { data } = await (await finstack()).GET('/v1/admin/me');
  return new Set(data?.permissions ?? []);
});

export async function can(permission: string): Promise<boolean> {
  return (await permissions()).has(permission);
}
