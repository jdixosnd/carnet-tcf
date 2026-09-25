import { hydrate } from '../data/words';
import { DEFAULT_WORDS_FILTERS } from '../data/defaults';
import type { WordRow, WordsFilters } from '../data/types';
import { card, realWords } from '../test/fixtures';
import { describeFilters, flatten, letterOf, posAbbr, queryWords, sortKey, testsLabel } from './words-query';

// [fr, en, pos, gender, level, heard, tests, forms, examples, more]
const rows: WordRow[] = [
  ['bail', 'lease', 'n', 'm', 'B2', 4, [12], [], [], ''],
  ['abonnement', 'subscription', 'n', 'm', 'B1', 14, [12, 3], [], [], ''],
  ['inscrire', 'to enrol', 'v', '', 'B1', 9, [5], ['inscrit'], [], ''],
  ['écouter', 'to listen', 'v', '', 'A1', 30, [1], ['écoute'], [], ''],
  ['école', 'school', 'n', 'f', 'A1', 22, [1, 12], [], [], ''],
  ['aller', 'to go', 'v', '', 'A1', 90, [1, 2], ['va'], [], 'allons'],
  ['très', 'very', 'adv', '', 'A1', 50, [2], [], [], ''],
];
const words = hydrate(rows);
const F = (p: Partial<WordsFilters> = {}): WordsFilters => ({ ...DEFAULT_WORDS_FILTERS, ...p });
const fr = (idx: number[]) => idx.map(i => words[i].fr);
const TODAY = 100;

test('sort keys drop the article and reflexive pronoun, and ignore accents', () => {
  expect(sortKey("l'abonnement")).toBe('abonnement');
  expect(sortKey('le bail')).toBe('bail');
  expect(sortKey("s'inscrire")).toBe('inscrire');
  expect(sortKey('se lever')).toBe('lever');
  expect(sortKey('école')).toBe('ecole');
  expect(sortKey('le')).toBe('le'); // the word "le" itself keeps its key
  expect(letterOf(sortKey("l'abonnement"))).toBe('A');
  expect(letterOf(sortKey('école'))).toBe('E');
});

test('A–Z ignores articles and accents; école comes before écouter', () => {
  expect(fr(queryWords(words, {}, TODAY, F()))).toEqual(['abonnement', 'aller', 'bail', 'école', 'écouter', 'inscrire', 'très']);
  expect(fr(queryWords(words, {}, TODAY, F({ sort: 'za' })))[0]).toBe('très');
});

test('letter headers group the A–Z list', () => {
  const e = flatten(words, queryWords(words, {}, TODAY, F()), 'az');
  expect(e.filter(x => x.kind === 'letter').map(x => (x as { letter: string }).letter)).toEqual(['A', 'B', 'E', 'I', 'T']);
  expect(flatten(words, [0, 1], 'heard').every(x => x.kind === 'word')).toBe(true);
});

test('filters are AND across groups and OR within a group', () => {
  // Test 12 OR test 3 …
  expect(fr(queryWords(words, {}, TODAY, F({ tests: [12, 3] })))).toEqual(['abonnement', 'bail', 'école']);
  // … AND level B1 or B2
  expect(fr(queryWords(words, {}, TODAY, F({ tests: [12], levels: ['B1', 'B2'] })))).toEqual(['abonnement', 'bail']);
  // … AND nouns
  expect(fr(queryWords(words, {}, TODAY, F({ tests: [1], pos: 'n' })))).toEqual(['école']);
  expect(fr(queryWords(words, {}, TODAY, F({ pos: 'other' })))).toEqual([]);
  expect(fr(queryWords(words, {}, TODAY, F({ pos: 'adv' })))).toEqual(['très']);
});

test('status comes from the card box, and "due today" from its date', () => {
  const cards = { bail: card(1, TODAY + 1), aller: card(4, TODAY), 'très': card(6, TODAY - 2) };
  const q = (status: WordsFilters['status']) => fr(queryWords(words, cards, TODAY, F({ status })));
  expect(q('learning')).toEqual(['bail']);
  expect(q('familiar')).toEqual(['aller']);
  expect(q('mastered')).toEqual(['très']);
  expect(q('new')).toEqual(['abonnement', 'école', 'écouter', 'inscrire']);
  expect(q('due')).toEqual(['aller', 'très']);
});

test('search is accent-insensitive and matches forms and meanings', () => {
  expect(fr(queryWords(words, {}, TODAY, F({ q: 'allons' })))).toEqual(['aller']);
  expect(fr(queryWords(words, {}, TODAY, F({ q: 'ECOUTE' })))).toEqual(['écouter']);
  expect(fr(queryWords(words, {}, TODAY, F({ q: 'lease' })))).toEqual(['bail']);
});

test('most heard and due soonest', () => {
  expect(fr(queryWords(words, {}, TODAY, F({ sort: 'heard' }))).slice(0, 3)).toEqual(['aller', 'très', 'écouter']);
  const cards = { bail: card(2, TODAY + 3), 'très': card(2, TODAY - 1) };
  expect(fr(queryWords(words, cards, TODAY, F({ sort: 'due' }))).slice(0, 3)).toEqual(['très', 'bail', 'abonnement']);
});

test('labels', () => {
  expect(testsLabel([])).toBe('All tests');
  expect(testsLabel([12])).toBe('Test 12');
  expect(testsLabel([12, 3])).toBe('Tests 3, 12');
  expect(testsLabel([1, 2, 3, 4, 5])).toBe('5 tests');
  expect(describeFilters(F({ tests: [12], levels: ['B2', 'B1'] }))).toBe('Test 12 · B1, B2');
  expect(posAbbr(words[0])).toBe('n. m.');
  expect(posAbbr(words[2])).toBe('v.');
});

test('the real list: allons finds aller, and filtering all words is fast', () => {
  const real = realWords();
  expect(queryWords(real, {}, TODAY, F({ q: 'allons' })).map(i => real[i].fr)).toContain('aller');
  const t = performance.now();
  queryWords(real, {}, TODAY, F({ q: 'att', levels: ['B1', 'B2'] }));
  expect(performance.now() - t).toBeLessThan(50);
});
