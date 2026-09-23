// Typed listening answers, ported from the web app's checkTyped().
import type { Word } from '../data/types';
import { norm } from './text';

export type Match =
  | { kind: 'empty' }
  | { kind: 'exact'; typed: string }
  | { kind: 'accent'; typed: string; correct: string; fixed: number[] }
  | { kind: 'homophone'; typed: string }
  | { kind: 'wrong'; typed: string };

// Articles need a following space (or are elided), so "lecture" and "semaine" stay whole.
const ARTICLE = /^(?:(?:le|la|les|un|une|se)\s+|(?:l'|s')\s*)/;

export function matchTyped(input: string, w: Word, words: Word[]): Match {
  const cleaned = String(input).toLowerCase().replace(/[’]/g, "'").replace(/\s+/g, ' ').trim();
  const typed = /^(le|la|les|un|une|se|l'|s')$/.test(cleaned) ? '' : cleaned.replace(ARTICLE, '').trim();
  if (!typed) return { kind: 'empty' };
  const targets = [w.fr, ...w.allForms].map(f => f.toLowerCase());
  if (targets.includes(typed)) return { kind: 'exact', typed };
  const nt = norm(typed);
  const correct = targets.find(t => norm(t) === nt);
  if (correct) {
    const a = correct.normalize('NFC'), b = typed.normalize('NFC');
    const fixed = [...a].flatMap((ch, k) => (ch !== [...b][k] ? [k] : []));
    return { kind: 'accent', typed, correct: a, fixed };
  }
  const other = words.find(x => x.nfr === nt || x.nforms.includes(nt));
  if (other && other.snd === w.snd) return { kind: 'homophone', typed };
  return { kind: 'wrong', typed };
}

export const isCorrect = (m: Match): boolean => m.kind === 'exact' || m.kind === 'accent' || m.kind === 'homophone';
