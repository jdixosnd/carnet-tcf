import type { DayHist, Level, Settings, UserData, Word } from '../data/types';
import { isNewCard } from './srs';

/** A word matches if its level is selected (none = all) and it appears in a selected test (null = all). */
export function matchesFilters(w: Word, levels: Level[], tests: number[] | null): boolean {
  return (!levels.length || levels.includes(w.lvl)) && (!tests || tests.some(t => w.tests.includes(t)));
}

export function newAllowance(s: Settings, hist: Record<number, DayHist>, today: number): number {
  const extra = s.extraNewToday.day === today ? s.extraNewToday.n : 0;
  return Math.max(0, s.newPerDay + extra - (hist[today]?.nw ?? 0));
}

export interface Queue {
  due: number[]; extra: number[]; fresh: number[];
  dueTotal: number; freshTotal: number; queue: number[]; matching: number;
}

export function buildQueue(words: Word[], d: UserData, today: number): Queue {
  const { levels, tests, sessionSize } = d.settings;
  const extraSet = new Set<number>();
  const byKey = new Map(words.map(w => [w.key, w.i]));
  for (const [key, day] of Object.entries(d.extraToday)) {
    const i = byKey.get(key);
    if (day === today && i !== undefined) extraSet.add(i);
  }
  const due: number[] = [], fresh: number[] = [];
  let matching = 0;
  for (const w of words) {
    if (!matchesFilters(w, levels, tests)) continue;
    matching++;
    const c = d.cards[w.key];
    if (!isNewCard(c)) { if (c.d <= today) due.push(w.i); }
    else if (!extraSet.has(w.i)) fresh.push(w.i);
  }
  due.sort((a, b) => d.cards[words[a].key].d - d.cards[words[b].key].d || a - b);
  const dueSet = new Set(due);
  const extra = [...extraSet].filter(i => !dueSet.has(i)).sort((a, b) => a - b);
  const allowed = fresh.slice(0, newAllowance(d.settings, d.hist, today));
  return {
    due, extra, fresh: allowed,
    dueTotal: due.length + extra.length,
    freshTotal: fresh.length,
    queue: [...due, ...extra, ...allowed].slice(0, sessionSize),
    matching,
  };
}

/** Earliest future due day among started cards, or null. */
export function nextDueDay(words: Word[], d: UserData, today: number): number | null {
  let best: number | null = null;
  for (const w of words) {
    const c = d.cards[w.key];
    if (!isNewCard(c) && c.d > today && (best === null || c.d < best)) best = c.d;
  }
  return best;
}
