import type { Direction, Game, Rating } from '../data/types';

export interface Item { i: number; game: 'flip' | 'mc' | 'listen'; dir: Direction; retry: boolean; }
export interface Run {
  items: Item[]; pos: number; practice: boolean; total: number;
  right: number; wrong: number; missed: number[]; newSeen: number; startNew: Set<number>;
}

const GAMES = ['flip', 'mc', 'listen'] as const;

export function createRun(indices: number[], o: {
  practice: boolean; game: Game; mcDirection: Direction | 'both'; isNew: (i: number) => boolean; rng?: () => number;
}): Run {
  const rng = o.rng ?? Math.random;
  const startNew = new Set(indices.filter(o.isNew));
  const items = indices.map<Item>(i => ({
    i,
    game: o.game === 'mix' ? GAMES[Math.floor(rng() * GAMES.length)] : o.game,
    dir: o.mcDirection === 'both' ? (startNew.has(i) ? 'fr-en' : rng() < 0.5 ? 'fr-en' : 'en-fr') : o.mcDirection,
    retry: false,
  }));
  return { items, pos: 0, practice: o.practice, total: items.length, right: 0, wrong: 0, missed: [], newSeen: 0, startNew };
}

/** Records the current item's result. Forgotten cards come back about 4 cards later as a retry (never re-graded). */
export function recordResult(run: Run, rating: Rating): Run {
  const item = run.items[run.pos];
  if (!item) return run;
  const next: Run = { ...run, items: run.items.slice(), missed: run.missed.slice() };
  if (!item.retry) {
    if (rating === 'forgot') { next.wrong++; next.missed.push(item.i); } else next.right++;
    if (run.startNew.has(item.i)) next.newSeen++;
  }
  if (rating === 'forgot') next.items.splice(Math.min(next.items.length, run.pos + 4), 0, { ...item, retry: true });
  return next;
}

export const advance = (run: Run): Run => ({ ...run, pos: run.pos + 1 });
export const isDone = (run: Run): boolean => run.pos >= run.items.length;
