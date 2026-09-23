import { LEVELS, type Card, type DayHist, type Level, type Word } from '../data/types';
import { cardStatus, isNewCard } from './srs';

/** Consecutive days with reviews, up to today — or up to yesterday if today isn't done yet. */
export function streak(hist: Record<number, DayHist>, today: number): number {
  let t = today, s = 0;
  if (!hist[t]?.rev) t--;
  while (hist[t]?.rev) { s++; t--; }
  return s;
}

export interface StatusCounts { new: number; learning: number; familiar: number; mastered: number; total: number; }
const zero = (): StatusCounts => ({ new: 0, learning: 0, familiar: 0, mastered: 0, total: 0 });

export function statusCounts(words: Word[], cards: Record<string, Card>, pred?: (w: Word) => boolean): StatusCounts {
  const c = zero();
  for (const w of words) if (!pred || pred(w)) { c[cardStatus(cards[w.key])]++; c.total++; }
  return c;
}

export function byLevel(words: Word[], cards: Record<string, Card>): Record<Level, StatusCounts> {
  const out = Object.fromEntries(LEVELS.map(l => [l, zero()])) as Record<Level, StatusCounts>;
  for (const w of words) { const c = out[w.lvl]; c[cardStatus(cards[w.key])]++; c.total++; }
  return out;
}

export interface DayBar { day: number; rev: number; ok: number; nw: number; }
export function lastDays(hist: Record<number, DayHist>, today: number, n = 14): DayBar[] {
  return Array.from({ length: n }, (_, k) => {
    const day = today - n + 1 + k;
    const h = hist[day];
    return { day, rev: h?.rev ?? 0, ok: h?.ok ?? 0, nw: h?.nw ?? 0 };
  });
}

export function totals(hist: Record<number, DayHist>): { reviews: number; remembered: number; pct: number | null } {
  let reviews = 0, remembered = 0;
  for (const h of Object.values(hist)) { reviews += h.rev; remembered += h.ok; }
  return { reviews, remembered, pct: reviews ? Math.round((100 * remembered) / reviews) : null };
}

export const dueOn = (cards: Record<string, Card>, day: number): number =>
  Object.values(cards).filter(c => !isNewCard(c) && c.d === day).length;
export const dueBy = (cards: Record<string, Card>, day: number): number =>
  Object.values(cards).filter(c => !isNewCard(c) && c.d <= day).length;
