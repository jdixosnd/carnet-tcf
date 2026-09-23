import { matchTyped, isCorrect } from './answer-match';
import { realWords, byFr } from '../test/fixtures';

const words = realWords();
const W = (fr: string) => byFr(words, fr);

test('exact headword, with spaces, capitals and an article', () => {
  expect(matchTyped('réveil', W('réveil'), words).kind).toBe('exact');
  expect(matchTyped('  Le Réveil ', W('réveil'), words).kind).toBe('exact');
  expect(matchTyped('l’eau', W('eau'), words).kind).toBe('exact');
});

test('any heard form counts', () => {
  expect(matchTyped('allons', W('aller'), words).kind).toBe('exact');
});

test('missing accent counts, with the letters to fix', () => {
  expect(matchTyped('reveil', W('réveil'), words)).toMatchObject({ kind: 'accent', correct: 'réveil', fixed: [1] });
});

test('a homophone counts', () => {
  expect(matchTyped('cours', W('cour'), words).kind).toBe('homophone');
});

test('words starting with article letters are not mangled', () => {
  expect(matchTyped('lecture', W('lecture'), words).kind).toBe('exact');
  expect(matchTyped('laisser', W('laisser'), words).kind).toBe('exact');
  expect(matchTyped('semaine', W('semaine'), words).kind).toBe('exact');
  expect(matchTyped('unique', W('unique'), words).kind).toBe('exact');
});

test('empty input or a bare article is ignored', () => {
  expect(matchTyped('   ', W('réveil'), words).kind).toBe('empty');
  expect(matchTyped('la', W('réveil'), words).kind).toBe('empty');
});

test('a different word is wrong', () => {
  const m = matchTyped('chat', W('réveil'), words);
  expect(m.kind).toBe('wrong');
  expect(isCorrect(m)).toBe(false);
});

test('articles themselves can be the answer', () => {
  expect(matchTyped('le', W('le'), words).kind).toBe('exact');
  expect(matchTyped('la', W('le'), words).kind).toBe('exact');
  expect(matchTyped("l'", W('le'), words).kind).toBe('exact');
});

test('oe typed for œ counts, with the ligature marked', () => {
  expect(matchTyped('coeur', W('cœur'), words)).toMatchObject({ kind: 'accent', correct: 'cœur', fixed: [1] });
  expect(matchTyped('soeur', W('sœur'), words).kind).toBe('accent');
});

test('punctuation and des/du/de la prefixes are ignored', () => {
  expect(matchTyped('Allons !', W('aller'), words).kind).toBe('exact');
  expect(matchTyped('réveil.', W('réveil'), words).kind).toBe('exact');
  expect(matchTyped('« réveil »', W('réveil'), words).kind).toBe('exact');
  expect(matchTyped('des factures', W('facture'), words).kind).toBe('exact');
  expect(matchTyped("de l'eau", W('eau'), words).kind).toBe('exact');
  expect(matchTyped('du travail', W('travail'), words).kind).toBe('exact');
  expect(matchTyped('!!', W('réveil'), words).kind).toBe('empty');
});
