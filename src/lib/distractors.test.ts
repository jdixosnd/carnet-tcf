import { buildDistractorIndex, distractors, options, maskGloss } from './distractors';
import { realWords, byFr, synthWords } from '../test/fixtures';
import { hydrate } from '../data/words';

const words = realWords();
const ix = buildDistractorIndex(words);
let seed = 7;
const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const sample = Array.from({ length: 200 }, (_, k) => (k * 24 + 3) % words.length);

test.each(['en', 'fr', 'sound'] as const)('mode %s: 3 distinct distractors, never the answer', mode => {
  for (const i of sample) {
    const d = distractors(words, ix, i, mode, 3, rng);
    expect(d).toHaveLength(3);
    expect(d).not.toContain(i);
    const keys = [i, ...d].map(x => (mode === 'en' ? words[x].first : words[x].nfr));
    expect(new Set(keys).size).toBe(4);
  }
});

test.each(['en', 'fr'] as const)('mode %s keeps the part of speech for big POS pools', mode => {
  for (const i of sample) {
    if ((ix.byPos[words[i].pos] ?? []).length < 12) continue;
    for (const x of distractors(words, ix, i, mode, 3, rng)) expect(words[x].pos).toBe(words[i].pos);
  }
});

test('listening options exclude homophones', () => {
  const cour = byFr(words, 'cour');
  const cours = byFr(words, 'cours');
  for (let k = 0; k < 50; k++) {
    const d = distractors(words, ix, cour.i, 'sound', 3, rng);
    expect(d).not.toContain(cours.i);
    for (const x of d) expect(words[x].snd).not.toBe(cour.snd);
  }
});

test('options contains the answer plus 3 distractors', () => {
  const o = options(words, ix, 10, 'en', rng);
  expect(o).toHaveLength(4);
  expect(o).toContain(10);
});

test('tiny pools return what they can without looping', () => {
  const tiny = synthWords(3);
  const d = distractors(tiny, buildDistractorIndex(tiny), 0, 'en', 3, rng);
  expect(d.length).toBeLessThanOrEqual(2);
});

test('maskGloss hides French inside parentheses', () => {
  expect(maskGloss(byFr(words, 'envie'))).toBe('desire; to feel like (avoir … de)');
  expect(maskGloss(byFr(words, 'voiture'))).toBe('car');
});

test('maskGloss hides French before a colon', () => {
  const [w] = hydrate([['air', 'air; look (avoir l\'air: to seem)', 'n', 'm', 'A1', 1, [1], [], [], '']]);
  expect(maskGloss(w)).toBe("air; look (avoir l'…: to seem)");
});
