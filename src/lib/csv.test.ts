import { hydrate } from '../data/words';
import type { WordRow } from '../data/types';
import { card } from '../test/fixtures';
import { csvField, wordsCsv } from './csv';

test('fields with commas, quotes or line breaks are quoted', () => {
  expect(csvField('plain')).toBe('plain');
  expect(csvField('to welcome, host')).toBe('"to welcome, host"');
  expect(csvField('le "bail"')).toBe('"le ""bail"""');
  expect(csvField('a\nb')).toBe('"a\nb"');
  expect(csvField(14)).toBe('14');
});

test('the export has a BOM, a header and one row per word', () => {
  const rows: WordRow[] = [
    ['accueillir', 'to welcome, host', 'v', '', 'B1', 22, [3, 12], [], [['Il faut "accueillir" les gens.', 'accueillir', 12, 4]], ''],
    ['bail', 'lease', 'n', 'm', 'B2', 4, [12], [], [], ''],
  ];
  const words = hydrate(rows);
  // Day 20000 is 2024-10-04.
  const csv = wordsCsv(words, [1, 0], { accueillir: card(3, 20000) });
  expect(csv.startsWith('﻿french,english,part_of_speech,gender,level,times_heard,tests,status,box,next_due,example\r\n')).toBe(true);
  const lines = csv.slice(1).trimEnd().split('\r\n');
  expect(lines[1]).toBe('bail,lease,noun,m,B2,4,12,new,0,,');
  expect(lines[2]).toBe('accueillir,"to welcome, host",verb,,B1,22,3;12,familiar,3,2024-10-04,"Il faut ""accueillir"" les gens."');
});
