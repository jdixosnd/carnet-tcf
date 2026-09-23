import fs from 'node:fs';
import path from 'node:path';
import { hydrate } from '../data/words';
import { DEFAULT_SETTINGS } from '../data/defaults';
import type { Card, Settings, UserData, Word, WordRow } from '../data/types';

/** 30 synthetic words w0…w29: even → A1 in test 1, odd → B1 in test 2. */
export function synthWords(n = 30): Word[] {
  const rows: WordRow[] = Array.from({ length: n }, (_, i) => [
    `w${i}`, `meaning ${i}`, i % 3 === 0 ? 'v' : 'n', i % 3 === 0 ? '' : 'm', i % 2 ? 'B1' : 'A1', 100 - i,
    [i % 2 ? 2 : 1], [], [[`Phrase w${i}.`, `w${i}`, 1, 1]], '',
  ]);
  return hydrate(rows);
}

export function user(p: { cards?: Record<string, Card>; hist?: UserData['hist']; settings?: Partial<Settings>; extraToday?: Record<string, number> } = {}): UserData {
  return { cards: p.cards ?? {}, hist: p.hist ?? {}, settings: { ...DEFAULT_SETTINGS, ...p.settings }, extraToday: p.extraToday ?? {} };
}

export const card = (b: number, d: number): Card => ({ b, d, r: 0, w: 0, f: d - 10, l: d - 1 });

let real: Word[] | null = null;
/** The real 4,842-word list from src-tauri/resources (run `npm run resources` first). */
export function realWords(): Word[] {
  if (real) return real;
  const p = path.resolve(import.meta.dirname, '../../src-tauri/resources/words.json');
  if (!fs.existsSync(p)) throw new Error('src-tauri/resources/words.json missing — run `npm run resources`');
  real = hydrate(JSON.parse(fs.readFileSync(p, 'utf8')) as WordRow[]);
  return real;
}
export const byFr = (words: Word[], fr: string): Word => {
  const w = words.find(x => x.fr === fr);
  if (!w) throw new Error(`no word ${fr}`);
  return w;
};
