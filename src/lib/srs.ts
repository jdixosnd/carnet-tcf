import type { Card, Rating } from '../data/types';

/** Review gap in days for boxes 0–7. */
export const GAPS = [0, 1, 3, 7, 16, 35, 80, 180] as const;

export const isNewCard = (c?: Card): boolean => !c || !c.b;

export function nextCard(prev: Card | undefined, r: Rating, t: number): Card {
  const c: Card = isNewCard(prev) ? { b: 0, d: t, r: 0, w: 0, f: prev?.f ?? t, l: t } : { ...prev! };
  if (r === 'forgot') { c.b = 1; c.d = t + 1; c.w++; }
  else if (r === 'hard') { c.b = Math.max(1, c.b); c.d = t + Math.floor(GAPS[c.b] / 2); c.r++; }
  else { c.b = c.b === 0 ? 2 : Math.min(c.b + 1, 7); c.d = t + GAPS[c.b]; c.r++; }
  c.l = t;
  return c;
}

/** Days until the next review if the card were rated `r` now. */
export const intervalDays = (c: Card | undefined, r: Rating): number => nextCard(c, r, 0).d;

export function intervalLabel(days: number): string {
  if (days <= 0) return 'today again';
  if (days === 1) return 'tomorrow';
  if (days < 30) return `in ${days} days`;
  if (days < 60) return 'in 1 month';
  return `in ${Math.round(days / 30)} months`;
}

export type Status = 'new' | 'learning' | 'familiar' | 'mastered';
export function cardStatus(c?: Card): Status {
  if (isNewCard(c)) return 'new';
  if (c!.b >= 5) return 'mastered';
  if (c!.b >= 3) return 'familiar';
  return 'learning';
}
