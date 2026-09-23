import { nextCard, intervalLabel, intervalDays, cardStatus, GAPS } from './srs';
import type { Card } from '../data/types';

const T = 20000;
const card = (b: number): Card | undefined => (b === 0 ? undefined : { b, d: T, r: 0, w: 0, f: T - 30, l: T - 1 });

test.each([0, 1, 2, 3, 4, 5, 6, 7])('knew from box %i', b => {
  const nb = b === 0 ? 2 : Math.min(b + 1, 7);
  expect(nextCard(card(b), 'knew', T)).toMatchObject({ b: nb, d: T + GAPS[nb], l: T });
});

test.each([0, 1, 2, 3, 4, 5, 6, 7])('hard from box %i', b => {
  const nb = Math.max(1, b);
  expect(nextCard(card(b), 'hard', T)).toMatchObject({ b: nb, d: T + Math.floor(GAPS[nb] / 2) });
});

test.each([0, 1, 2, 3, 4, 5, 6, 7])('forgot from box %i', b => {
  expect(nextCard(card(b), 'forgot', T)).toMatchObject({ b: 1, d: T + 1 });
});

test('new card gets first day and counters', () => {
  expect(nextCard(undefined, 'knew', T)).toEqual({ b: 2, d: T + 3, r: 1, w: 0, f: T, l: T });
  expect(nextCard(undefined, 'forgot', T)).toEqual({ b: 1, d: T + 1, r: 0, w: 1, f: T, l: T });
});

test('existing counters and first day are kept', () => {
  expect(nextCard({ b: 3, d: T, r: 4, w: 2, f: 100, l: T - 7 }, 'knew', T)).toEqual({ b: 4, d: T + 16, r: 5, w: 2, f: 100, l: T });
});

test('box 1 hard means today again; new word ratings match the dark mock', () => {
  expect(intervalLabel(intervalDays(card(1), 'hard'))).toBe('today again');
  expect([intervalDays(undefined, 'forgot'), intervalDays(undefined, 'hard'), intervalDays(undefined, 'knew')].map(intervalLabel))
    .toEqual(['tomorrow', 'today again', 'in 3 days']);
});

test('labels', () => {
  expect([0, 1, 2, 7, 29, 30, 59, 60, 180].map(intervalLabel))
    .toEqual(['today again', 'tomorrow', 'in 2 days', 'in 7 days', 'in 29 days', 'in 1 month', 'in 1 month', 'in 2 months', 'in 6 months']);
});

test('status', () => {
  expect([undefined, card(1), card(2), card(3), card(4), card(5), card(7)].map(cardStatus))
    .toEqual(['new', 'learning', 'learning', 'familiar', 'familiar', 'mastered', 'mastered']);
});
