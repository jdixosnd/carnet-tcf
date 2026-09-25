// CSV export of the Words list: UTF-8 with a BOM so Excel shows the accents.
import type { Card, Word } from '../data/types';
import { POS_NAME } from '../data/defaults';
import { dayToUTCDate } from './day';
import { cardStatus, isNewCard } from './srs';

export const CSV_COLUMNS = ['french', 'english', 'part_of_speech', 'gender', 'level', 'times_heard', 'tests', 'status', 'box', 'next_due', 'example'];

/** Quotes a field when it holds a comma, quote or line break (RFC 4180). */
export function csvField(v: string | number): string {
  const s = String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const isoDay = (day: number): string => dayToUTCDate(day).toISOString().slice(0, 10);

export function wordsCsv(words: Word[], idx: number[], cards: Record<string, Card>): string {
  const lines = [CSV_COLUMNS.join(',')];
  for (const i of idx) {
    const w = words[i];
    const c = cards[w.key];
    const known = !isNewCard(c);
    lines.push([
      w.fr, w.en, POS_NAME[w.pos], w.g, w.lvl, w.n, w.tests.join(';'), cardStatus(c),
      known ? c!.b : 0, known ? isoDay(c!.d) : '', w.ex[0]?.[0] ?? '',
    ].map(csvField).join(','));
  }
  return '﻿' + lines.join('\r\n') + '\r\n';
}
