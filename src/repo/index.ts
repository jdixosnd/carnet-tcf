import { isTauri } from './env';
import { memoryRepo } from './memoryRepo';
import type { Repo } from './types';

export type { Repo } from './types';

export async function openRepo(): Promise<Repo> {
  if (isTauri()) return (await import('./sqliteRepo')).openSqliteRepo();
  return memoryRepo();
}
