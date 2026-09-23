// Search over headwords, every heard form and English meanings (ported from the web app).
import type { Word } from '../data/types';
import { escRe, norm } from './text';

export interface Hit { i: number; score: number; /** the heard form that matched, when not the headword */ form?: string; }

export function search(words: Word[], q: string, limit = 60): Hit[] {
  const nq = norm(q).replace(/^(the|a|an) /, '');
  if (!nq) return [];
  const bare = nq.replace(/^to /, '');
  const re = new RegExp(`(^|[^a-z'])${escRe(nq)}($|[^a-z])`);
  const out: Hit[] = [];
  for (const w of words) {
    let s = 0;
    let form: string | undefined;
    if (w.nfr === nq) s = 100;
    else {
      const k = w.nforms.indexOf(nq);
      if (k >= 0) { s = 92; form = w.allForms[k]; }
      else if (w.nfr.startsWith(nq)) s = 60 + Math.min(20, (20 * nq.length) / w.nfr.length);
      else if (nq.length >= 3) {
        const p = w.nforms.findIndex(f => f.startsWith(nq));
        if (p >= 0) { s = 55; form = w.allForms[p]; }
      }
      if (!s && nq.length >= 4 && w.nfr.includes(nq)) s = 30;
    }
    let e = 0;
    if (w.senses[0] === bare) e = 96;
    else if (w.senses.includes(bare)) e = 88;
    else if (re.test(w.nen)) e = 70;
    else if (nq.length >= 4 && w.nen.includes(nq)) e = 25;
    if (e > s) { s = e; form = undefined; }
    if (s) out.push(form ? { i: w.i, score: s, form } : { i: w.i, score: s });
  }
  out.sort((a, b) => b.score - a.score || a.i - b.i);
  return out.slice(0, limit);
}
