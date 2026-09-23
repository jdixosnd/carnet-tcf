import { streak, lastDays, totals, statusCounts, byLevel, dueOn, dueBy } from './stats';
import { synthWords, card } from '../test/fixtures';

const T = 20000;
const h = (rev: number, ok = rev, nw = 0) => ({ rev, ok, nw });

test('streak counts consecutive days up to today', () => {
  expect(streak({ [T]: h(3), [T - 1]: h(1), [T - 2]: h(5), [T - 4]: h(1) }, T)).toBe(3);
});

test('streak counts up to yesterday when today is not done yet', () => {
  expect(streak({ [T - 1]: h(1), [T - 2]: h(5) }, T)).toBe(2);
  expect(streak({ [T]: h(0), [T - 1]: h(1) }, T)).toBe(1);
});

test('streak is zero after a gap', () => {
  expect(streak({ [T - 2]: h(5) }, T)).toBe(0);
  expect(streak({}, T)).toBe(0);
});

test('last 14 days, oldest first, empty days zero', () => {
  const d = lastDays({ [T]: h(4, 3, 1), [T - 13]: h(2) }, T);
  expect(d).toHaveLength(14);
  expect(d[0]).toEqual({ day: T - 13, rev: 2, ok: 2, nw: 0 });
  expect(d[13]).toEqual({ day: T, rev: 4, ok: 3, nw: 1 });
  expect(d[5]).toEqual({ day: T - 8, rev: 0, ok: 0, nw: 0 });
});

test('totals', () => {
  expect(totals({ 1: h(3, 2), 2: h(4, 4) })).toEqual({ reviews: 7, remembered: 6, pct: 86 });
  expect(totals({})).toEqual({ reviews: 0, remembered: 0, pct: null });
});

test('status counts and by level', () => {
  const words = synthWords(6);
  const cards = { w0: card(1, T), w1: card(3, T), w2: card(6, T) };
  expect(statusCounts(words, cards)).toEqual({ new: 3, learning: 1, familiar: 1, mastered: 1, total: 6 });
  const lv = byLevel(words, cards);
  expect(lv.A1).toEqual({ new: 1, learning: 1, familiar: 0, mastered: 1, total: 3 });
  expect(lv.C2.total).toBe(0);
});

test('due counts', () => {
  const cards = { a: card(1, T + 1), b: card(2, T + 1), c: card(3, T), d: card(3, T + 5) };
  expect(dueOn(cards, T + 1)).toBe(2);
  expect(dueBy(cards, T + 1)).toBe(3);
});
