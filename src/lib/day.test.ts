import { dayNum, shortDate, longDate } from './day';

test('day number is constant within a local day and increments at local midnight', () => {
  const a = dayNum(new Date(2026, 8, 24, 0, 30));
  expect(dayNum(new Date(2026, 8, 24, 23, 30))).toBe(a);
  expect(dayNum(new Date(2026, 8, 25, 0, 0))).toBe(a + 1);
});

test('dates', () => {
  expect(shortDate(dayNum(new Date(2026, 8, 11, 12)))).toBe('11 Sep');
  expect(longDate(new Date(2025, 8, 24))).toBe('Wednesday 24 September');
});
