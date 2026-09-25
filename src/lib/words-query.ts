// Words screen: filter + sort + group the whole word list (4,842 rows filter in well under 5 ms).
import type { Card, Level, Word, WordsFilters, WordStatus, WordType } from '../data/types';
import { withArticle } from '../data/words';
import { cardStatus, isNewCard } from './srs';
import { compressRanges } from './format';
import { norm } from './text';

const ARTICLE = /^(?:le |la |les |l'|l’|un |une |se |s'|s’)/i;

/** Headword without its leading article or reflexive pronoun: "l'abonnement" → "abonnement", "s'inscrire" → "inscrire". */
export function sortKey(display: string): string {
  const k = display.replace(ARTICLE, '');
  return norm(k || display);
}

/** A–Z group letter: the first letter of the sort key, "#" for anything else. */
export function letterOf(key: string): string {
  const c = key.charAt(0).toUpperCase();
  return c >= 'A' && c <= 'Z' ? c : '#';
}

export interface Prepared { key: string; letter: string; blob: string; /** position in A–Z order */ rank: number; }

const collator = new Intl.Collator('fr', { sensitivity: 'base', ignorePunctuation: true });
const cache = new WeakMap<Word[], Prepared[]>();

/** Per-word sort key, group letter, search text and A–Z rank; computed once per word list. */
export function prepare(words: Word[]): Prepared[] {
  const hit = cache.get(words);
  if (hit) return hit;
  const out: Prepared[] = words.map(w => {
    const key = sortKey(withArticle(w));
    return { key, letter: letterOf(key), blob: [w.nfr, ...w.nforms, w.nen].join('\n'), rank: 0 };
  });
  const order = words.map(w => w.i).sort((a, b) => collator.compare(out[a].key, out[b].key) || a - b);
  order.forEach((i, r) => { out[i].rank = r; });
  cache.set(words, out);
  return out;
}

export const isDue = (c: Card | undefined, today: number): boolean => !isNewCard(c) && c!.d <= today;

const OTHER = new Set(['prep', 'pron', 'det', 'conj', 'interj']);
const typeMatches = (w: Word, t: WordType) => t === 'all' || (t === 'other' ? OTHER.has(w.pos) : w.pos === t);
const statusMatches = (c: Card | undefined, s: WordStatus, today: number) =>
  s === 'any' || (s === 'due' ? isDue(c, today) : cardStatus(c) === s);

export const hasFilters = (f: WordsFilters): boolean =>
  !!f.q.trim() || f.tests.length > 0 || f.levels.length > 0 || f.status !== 'any' || f.pos !== 'all';

/** Indices of the words that pass every filter group (AND across groups, OR within one), in list order. */
export function queryWords(words: Word[], cards: Record<string, Card>, today: number, f: WordsFilters): number[] {
  const prep = prepare(words);
  const q = norm(f.q);
  const tests = f.tests.length ? new Set(f.tests) : null;
  const levels = f.levels.length ? new Set<Level>(f.levels) : null;
  const out: number[] = [];
  for (const w of words) {
    if (levels && !levels.has(w.lvl)) continue;
    if (!typeMatches(w, f.pos)) continue;
    if (tests && !w.tests.some(t => tests.has(t))) continue;
    if (q && !prep[w.i].blob.includes(q)) continue;
    if (!statusMatches(cards[w.key], f.status, today)) continue;
    out.push(w.i);
  }
  return sortWords(words, cards, out, f.sort);
}

/** Sorts in place and returns `idx`. */
export function sortWords(words: Word[], cards: Record<string, Card>, idx: number[], sort: WordsFilters['sort']): number[] {
  const prep = prepare(words);
  const az = (a: number, b: number) => prep[a].rank - prep[b].rank;
  if (sort === 'az') return idx.sort(az);
  if (sort === 'za') return idx.sort((a, b) => az(b, a));
  if (sort === 'heard') return idx.sort((a, b) => words[b].n - words[a].n || az(a, b));
  const due = (i: number) => {
    const c = cards[words[i].key];
    return isNewCard(c) ? Infinity : c!.d;
  };
  return idx.sort((a, b) => {
    const da = due(a), db = due(b);
    return da === db ? az(a, b) : da < db ? -1 : 1;
  });
}

export type Entry = { kind: 'letter'; letter: string } | { kind: 'word'; i: number };

/** The virtual list's rows: letter headers between groups in A–Z / Z–A, plain rows otherwise. */
export function flatten(words: Word[], idx: number[], sort: WordsFilters['sort']): Entry[] {
  if (sort !== 'az' && sort !== 'za') return idx.map(i => ({ kind: 'word', i }));
  const prep = prepare(words);
  const out: Entry[] = [];
  let last = '';
  for (const i of idx) {
    const l = prep[i].letter;
    if (l !== last) { out.push({ kind: 'letter', letter: l }); last = l; }
    out.push({ kind: 'word', i });
  }
  return out;
}

export function testsLabel(tests: number[]): string {
  if (!tests.length || tests.length === 40) return 'All tests';
  if (tests.length === 1) return `Test ${tests[0]}`;
  if (tests.length <= 3) return `Tests ${[...tests].sort((a, b) => a - b).join(', ')}`;
  return `${tests.length} tests`;
}

export const STATUS_LABEL: Record<WordStatus, string> = {
  any: 'Any status', new: 'New', learning: 'Learning', familiar: 'Familiar', mastered: 'Mastered', due: 'Due today',
};
export const TYPE_LABEL: Record<WordType, string> = {
  all: 'All types', n: 'Nouns', v: 'Verbs', adj: 'Adjectives', adv: 'Adverbs', other: 'Other',
};

/** "Test 12 · B1, B2 · Verbs" — the active filters except the search text. */
export function describeFilters(f: WordsFilters): string {
  const parts: string[] = [];
  if (f.tests.length && f.tests.length < 40) parts.push(f.tests.length <= 3 ? testsLabel(f.tests) : `Tests ${compressRanges(f.tests)}`);
  if (f.levels.length) parts.push([...f.levels].sort().join(', '));
  if (f.status !== 'any') parts.push(STATUS_LABEL[f.status]);
  if (f.pos !== 'all') parts.push(TYPE_LABEL[f.pos]);
  return parts.join(' · ');
}

/** "n. m.", "v.", "adj." … shown after the headword. */
export function posAbbr(w: Word): string {
  if (w.pos === 'n') return w.g === 'm' ? 'n. m.' : w.g === 'f' ? 'n. f.' : w.g === 'mf' ? 'n. m./f.' : 'n.';
  if (w.pos === 'v') return 'v.';
  if (w.pos === 'adj') return 'adj.';
  if (w.pos === 'adv') return 'adv.';
  return '—';
}
