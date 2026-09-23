import { norm, soundKey } from '../lib/text';
import { resourceUrl } from './resources';
import type { AudioIndex, Word, WordRow } from './types';

export function hydrate(rows: WordRow[]): Word[] {
  return rows.map((r, i) => {
    const [fr, en, pos, g, lvl, n, tests, forms, ex, moreRaw] = r;
    const more = moreRaw ? moreRaw.split(' ') : [];
    const allForms = [...forms, ...more];
    const nen = norm(en);
    return {
      i, fr, en, pos, g, lvl, n, tests, forms, more, ex,
      key: fr.toLowerCase(),
      nfr: norm(fr),
      allForms,
      nforms: allForms.map(norm),
      nen,
      first: nen.split(';')[0].trim(),
      senses: nen.split(';').map(x => x.trim().replace(/^to /, '').replace(/\s*\(.*?\)\s*/g, ' ').trim()),
      snd: soundKey(fr),
    };
  });
}

/** Headword with its article for nouns: "la facture", "l'eau", "le réveil". */
export function withArticle(w: Word): string {
  if (w.pos !== 'n' || !w.g) return w.fr;
  if (/^[aeiouyhâàäéèêëîïôöûùü]/i.test(w.fr)) return `l'${w.fr}`;
  return (w.g === 'f' ? 'la ' : 'le ') + w.fr;
}

export async function loadWords(): Promise<{ words: Word[]; audio: AudioIndex }> {
  const get = async (rel: string) => {
    const r = await fetch(await resourceUrl(rel));
    if (!r.ok) throw new Error(`words: ${rel} HTTP ${r.status}`);
    return r.json();
  };
  const [rows, audio] = await Promise.all([get('words.json') as Promise<WordRow[]>, get('audio_index.json') as Promise<AudioIndex>]);
  return { words: hydrate(rows), audio };
}
