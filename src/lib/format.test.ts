import { compressRanges, fmt, plural } from './format';

test('numbers use thousands separators', () => {
  expect(fmt(4842)).toBe('4,842');
  expect(plural(1, 'card')).toBe('1 card');
  expect(plural(1420, 'card')).toBe('1,420 cards');
});

test('test numbers compress into ranges', () => {
  expect(compressRanges([7, 8, 1, 2, 3, 5])).toBe('1–3, 5, 7–8');
  expect(compressRanges([...Array.from({ length: 12 }, (_, i) => i + 1), 20])).toBe('1–12, 20');
  expect(compressRanges([4])).toBe('4');
  expect(compressRanges([])).toBe('');
});
