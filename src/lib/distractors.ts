// Wrong-answer selection and gloss masking, ported from the web app.
import type { Word } from '../data/types';
import { escRe, shuffle } from './text';

export interface DistractorIndex { byPos: Record<string, number[]>; rankInPos: Map<number, number>; all: number[]; }

export function buildDistractorIndex(words: Word[]): DistractorIndex {
  const byPos: Record<string, number[]> = {};
  for (const w of words) (byPos[w.pos] ??= []).push(w.i);
  const rankInPos = new Map<number, number>();
  for (const p in byPos) byPos[p].forEach((i, k) => rankInPos.set(i, k));
  return { byPos, rankInPos, all: words.map(w => w.i) };
}

/**
 * mode 'en': English options (French prompt) — same POS, nearby frequency.
 * mode 'fr': French options (English prompt) — same POS, nearby frequency.
 * mode 'sound': listening — same first letters, similar length, never a homophone.
 */
export function distractors(words: Word[], ix: DistractorIndex, i: number, mode: 'en' | 'fr' | 'sound', n = 3, rng: () => number = Math.random): number[] {
  const w = words[i];
  const out: number[] = [], used = new Set([i]);
  const keyOf = (x: Word) => (mode === 'en' ? x.first : x.nfr);
  const seen = new Set([keyOf(w)]);
  const posList = ix.byPos[w.pos] ?? [];
  let pool: number[];
  if (mode === 'sound') {
    const p2 = w.nfr.slice(0, 2), p1 = w.nfr[0];
    const near = words.filter(x => x.i !== i && x.nfr.startsWith(p2) && Math.abs(x.nfr.length - w.nfr.length) <= 3).map(x => x.i);
    const first = words.filter(x => x.i !== i && x.nfr[0] === p1).map(x => x.i);
    pool = shuffle(near, rng).concat(shuffle(first, rng).slice(0, 80), shuffle(posList.slice(), rng).slice(0, 40));
  } else {
    const r = ix.rankInPos.get(i) ?? 0;
    pool = shuffle(posList.slice(Math.max(0, r - 250), r + 250), rng).concat(shuffle(posList.slice(), rng).slice(0, 60));
    if (posList.length < 12) pool = pool.concat(shuffle(ix.all.slice(), rng).slice(0, 80));
  }
  for (const j of pool) {
    if (out.length >= n) break;
    if (used.has(j)) continue;
    const x = words[j], k = keyOf(x);
    if (seen.has(k)) continue;
    if (mode === 'sound' && x.snd === w.snd) continue;
    if (mode === 'en' && x.nen === w.nen) continue;
    used.add(j); seen.add(k); out.push(j);
  }
  return out;
}

/** The answer plus distractors, shuffled. */
export function options(words: Word[], ix: DistractorIndex, i: number, mode: 'en' | 'fr' | 'sound', rng: () => number = Math.random): number[] {
  return shuffle([i, ...distractors(words, ix, i, mode, 3, rng)], rng);
}

function maskWords(s: string, w: Word): string {
  const list = [w.fr, ...w.forms, ...w.more].filter(x => x.length > 1).sort((a, b) => b.length - a.length);
  for (const f of list) s = s.replace(new RegExp(`(^|[^\\p{L}])(${escRe(f)})(?=[^\\p{L}]|$)`, 'giu'), (_m, p: string) => p + '…');
  return s;
}

/** English meaning with any French hint (e.g. "(avoir envie de)") masked, for English → French prompts. */
export function maskGloss(w: Word): string {
  const g = w.en.replace(/\(([^)]*)\)/g, (_m, inner: string) => '(' + maskWords(inner, w) + ')');
  return g.split(/;\s*/).map(seg => {
    const k = seg.indexOf(':');
    return k > 0 ? maskWords(seg.slice(0, k), w) + seg.slice(k) : seg;
  }).join('; ');
}
