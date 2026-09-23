import fs from 'node:fs';
import path from 'node:path';
import { decodeBackup, encodeBackup, toBackupJson, exportSettings, importSettings, parseBackupJson, backupCounts, BackupError } from './backup';
import { DEFAULT_SETTINGS } from '../data/defaults';
import type { UserData } from '../data/types';

const code = fs.readFileSync(path.resolve(import.meta.dirname, '../../tests/fixtures/web-backup.txt'), 'utf8');

test('decodes the real web backup, mapping web setting names', () => {
  const b = decodeBackup(code);
  expect(Object.keys(b.cards)).toEqual(['permettre', 'fois', 'parler']);
  expect(b.cards.permettre).toEqual({ b: 2, d: 20723, r: 1, w: 0, f: 20720, l: 20720 });
  expect(b.settings).toMatchObject({ sessionSize: 20, levels: ['A2'], tests: [7], game: 'flip', mcDirection: 'fr-en', listenMode: 'choose', voice: 'recorded', speed: 1 });
  expect(backupCounts(b)).toEqual({ words: 3, days: 1, reviews: 3 });
});

test('round trip is lossless for cards, history and settings', () => {
  const b = decodeBackup(code);
  const d: UserData = { cards: b.cards, hist: b.hist, settings: { ...DEFAULT_SETTINGS, ...b.settings }, extraToday: {} };
  const again = decodeBackup(encodeBackup(d));
  expect(again.cards).toEqual(b.cards);
  expect(again.hist).toEqual(b.hist);
  expect(again.settings).toMatchObject(b.settings);
});

test('encoding is byte-identical to the web app (UTF-8 base64)', () => {
  const d: UserData = { cards: { 'été': { b: 2, d: 5, r: 1, w: 0, f: 2, l: 2 } }, hist: {}, settings: DEFAULT_SETTINGS, extraToday: {} };
  expect(encodeBackup(d)).toBe(Buffer.from(toBackupJson(d), 'utf8').toString('base64'));
  expect(decodeBackup(encodeBackup(d)).cards['été'].b).toBe(2);
});

test('exported settings carry the web names too', () => {
  const s = exportSettings({ ...DEFAULT_SETTINGS, game: 'mc', sessionSize: 60, tests: [3], speed: 0.8 });
  expect(s).toMatchObject({ mode: 'choice', sessionLen: 60, test: 3, rate: 0.8, audio: 'recorded', game: 'mc', sessionSize: 60 });
  expect(s).not.toHaveProperty('recentSearches');
  expect(s).not.toHaveProperty('onboarded');
  expect(exportSettings({ ...DEFAULT_SETTINGS, tests: [3, 4] }).test).toBe(0);
});

test('import prefers desktop keys and drops invalid values', () => {
  expect(importSettings({ mode: 'choice', game: 'listen', test: 0, newPerDay: 'lots', speed: 9, theme: 'dark' }))
    .toEqual({ game: 'listen', tests: null, speed: 1.2, theme: 'dark' });
});

test('whitespace inside a pasted code is ignored', () => {
  expect(Object.keys(decodeBackup(code.replace(/(.{40})/g, '$1\n ')).cards)).toHaveLength(3);
});

test('a backup file (plain JSON) parses', () => {
  expect(Object.keys(parseBackupJson(Buffer.from(code, 'base64').toString('utf8')).cards)).toHaveLength(3);
});

test.each(['', 'abc', btoa('{"x":1}'), btoa('{"cards":{"a":{"b":9,"d":1}}}'), btoa('{"cards":{"a":{"b":1}}}'), btoa('[1]')])('rejects %s', bad => {
  expect(() => decodeBackup(bad)).toThrow(BackupError);
});
