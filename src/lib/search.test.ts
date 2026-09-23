import { search } from './search';
import { realWords } from '../test/fixtures';

const words = realWords();
const top = (q: string) => words[search(words, q)[0].i].fr;

test('a heard form finds its headword and says so', () => {
  const [h] = search(words, 'allons');
  expect(words[h.i].fr).toBe('aller');
  expect(h.form).toBe('allons');
});

test('English meanings are searchable', () => {
  expect(top('to wait')).toBe('attendre');
  expect(top('invoice')).toBe('facture');
});

test('accents and case are ignored', () => {
  expect(top('ETE')).toBe('été');
});

test('exact headword beats prefix', () => {
  const hits = search(words, 'voir').map(h => words[h.i].fr);
  expect(hits[0]).toBe('voir');
  expect(hits.indexOf('voire')).toBeGreaterThan(0);
});

test('headword hits carry no form', () => {
  expect(search(words, 'voiture')[0].form).toBeUndefined();
});

test('empty and unknown queries return nothing', () => {
  expect(search(words, '')).toEqual([]);
  expect(search(words, '   ')).toEqual([]);
  expect(search(words, 'zzzzqq')).toEqual([]);
});

test('results are capped', () => {
  expect(search(words, 'e').length).toBeLessThanOrEqual(60);
});

test('under 30 ms per query', () => {
  const qs = Array.from({ length: 200 }, (_, k) => words[(k * 97) % words.length].nfr.slice(0, 1 + (k % 6)));
  const t0 = performance.now();
  for (const q of qs) search(words, q);
  expect((performance.now() - t0) / qs.length).toBeLessThan(30);
});
