import { buildQueue, newAllowance, nextDueDay } from './session';
import { DEFAULT_SETTINGS } from '../data/defaults';
import { synthWords, user, card } from '../test/fixtures';

const T = 20000;
const words = synthWords();

test('due first (oldest), then extra, then new in rank order, capped', () => {
  const d = user({ cards: { w5: card(3, T - 2), w3: card(2, T - 5), w9: card(1, T + 1) }, extraToday: { w20: T }, settings: { newPerDay: 3, sessionSize: 6 } });
  const q = buildQueue(words, d, T);
  expect(q.due).toEqual([3, 5]);
  expect(q.extra).toEqual([20]);
  expect(q.queue).toEqual([3, 5, 20, 0, 1, 2]);
  expect(q.dueTotal).toBe(3);
  expect(q.freshTotal).toBe(26);
});

test('session size caps due reviews too', () => {
  const cards = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`w${i}`, card(2, T - i)]));
  const q = buildQueue(words, user({ cards, settings: { sessionSize: 4 } }), T);
  expect(q.queue).toEqual([9, 8, 7, 6]);
  expect(q.dueTotal).toBe(10);
});

test('new allowance subtracts today and adds Learn 10 more for today only', () => {
  expect(newAllowance({ ...DEFAULT_SETTINGS, newPerDay: 15, extraNewToday: { day: T, n: 10 } }, { [T]: { rev: 9, ok: 9, nw: 9 } }, T)).toBe(16);
  expect(newAllowance({ ...DEFAULT_SETTINGS, newPerDay: 15, extraNewToday: { day: T - 1, n: 10 } }, {}, T)).toBe(15);
  expect(newAllowance({ ...DEFAULT_SETTINGS, newPerDay: 5 }, { [T]: { rev: 9, ok: 9, nw: 9 } }, T)).toBe(0);
});

test('filters: levels AND tests', () => {
  expect(buildQueue(words, user({ settings: { levels: ['B1'], tests: [2] } }), T).matching).toBe(15);
  expect(buildQueue(words, user({ settings: { levels: ['B1'], tests: [1] } }), T).matching).toBe(0);
  expect(buildQueue(words, user({ settings: { levels: [], tests: null } }), T).matching).toBe(30);
});

test('an empty test list matches nothing', () => {
  const q = buildQueue(words, user({ settings: { tests: [] } }), T);
  expect(q.matching).toBe(0);
  expect(q.queue).toEqual([]);
});

test('extra_today from another day is ignored', () => {
  expect(buildQueue(words, user({ extraToday: { w4: T - 1 } }), T).extra).toEqual([]);
});

test('extra word that is already due is not duplicated', () => {
  const q = buildQueue(words, user({ cards: { w4: card(2, T) }, extraToday: { w4: T } }), T);
  expect(q.queue.filter(i => i === 4)).toHaveLength(1);
});

test('next due day ignores new words', () => {
  expect(nextDueDay(words, user({ cards: { w1: card(2, T + 5), w2: card(3, T + 3) } }), T)).toBe(T + 3);
  expect(nextDueDay(words, user(), T)).toBeNull();
});
