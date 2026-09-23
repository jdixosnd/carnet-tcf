import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { sqliteRepo, type Db } from './sqliteRepo';

const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite') as typeof import('node:sqlite');
const schema = fs.readFileSync(path.resolve(import.meta.dirname, '../../src-tauri/migrations/001_init.sql'), 'utf8');

/** Adapts node:sqlite to the tauri-plugin-sql API shape ($1 placeholders → ?1). */
function nodeDb(): Db {
  const d = new DatabaseSync(':memory:');
  d.exec(schema);
  const fix = (sql: string) => sql.replace(/\$(\d+)/g, '?$1');
  return {
    async execute(sql, bind = []) {
      if (bind.length) d.prepare(fix(sql)).run(...(bind as never[]));
      else d.exec(sql);
      return {};
    },
    async select<T>(sql: string, bind: unknown[] = []) { return d.prepare(fix(sql)).all(...(bind as never[])) as T[]; },
  };
}

const card = { b: 2, d: 10, r: 1, w: 0, f: 7, l: 7 };
const repo = () => sqliteRepo(async () => nodeDb(), async () => '/data/carnet.db');

test('reviews, settings and extra words round-trip', async () => {
  const r = repo();
  await r.saveReview("l'été", card, 7, { rev: 1, ok: 1, nw: 1 });
  await r.saveReview("l'été", { ...card, b: 3 }, 7, { rev: 2, ok: 2, nw: 1 });
  await r.setSetting('levels', ['A1', 'B2']);
  await r.setSetting('tests', null);
  await r.addExtraToday('voir', 7);
  const d = await r.loadAll();
  expect(d.cards).toEqual({ "l'été": { ...card, b: 3 } });
  expect(d.hist).toEqual({ 7: { rev: 2, ok: 2, nw: 1 } });
  expect(d.settings).toEqual({ levels: ['A1', 'B2'], tests: null });
  expect(d.extraToday).toEqual({ voir: 7 });
});

test('replaceAll imports in one batch, with quotes escaped', async () => {
  const r = repo();
  await r.saveReview('old', card, 7, { rev: 1, ok: 1, nw: 1 });
  const cards = Object.fromEntries(Array.from({ length: 1200 }, (_, i) => [`mot'${i}`, { ...card, d: i }]));
  await r.replaceAll({ cards, hist: { 9: { rev: 2, ok: 1, nw: 0 } }, settings: { theme: 'dark' } });
  const d = await r.loadAll();
  expect(Object.keys(d.cards)).toHaveLength(1200);
  expect(d.cards["mot'5"]).toEqual({ ...card, d: 5 });
  expect(d.cards.old).toBeUndefined();
  expect(d.hist).toEqual({ 9: { rev: 2, ok: 1, nw: 0 } });
  expect(d.settings.theme).toBe('dark');
});

test('erase keeps settings', async () => {
  const r = repo();
  await r.saveReview('a', card, 7, { rev: 1, ok: 1, nw: 1 });
  await r.addExtraToday('b', 7);
  await r.setSetting('newPerDay', 10);
  await r.eraseProgress();
  expect(await r.loadAll()).toEqual({ cards: {}, hist: {}, extraToday: {}, settings: { newPerDay: 10 } });
});

test('unparseable settings rows are skipped', async () => {
  const db = nodeDb();
  await db.execute("INSERT INTO settings VALUES ('theme', '{bad')");
  const r = sqliteRepo(async () => db, async () => '');
  expect((await r.loadAll()).settings).toEqual({});
});

test('clearExtraBefore and dataPath', async () => {
  const r = repo();
  await r.addExtraToday('a', 5);
  await r.addExtraToday('b', 7);
  await r.clearExtraBefore(7);
  expect((await r.loadAll()).extraToday).toEqual({ b: 7 });
  expect(await r.dataPath()).toBe('/data/carnet.db');
});

test('a failed import rolls back, leaving the old progress', async () => {
  const db = nodeDb();
  const failing: Db = {
    select: db.select,
    async execute(sql, bind) {
      if (sql.startsWith('BEGIN')) {            // run part of the batch, then fail mid-way
        await db.execute('BEGIN; DELETE FROM cards;');
        throw new Error('disk I/O error');
      }
      return db.execute(sql, bind);
    },
  };
  const r = sqliteRepo(async () => failing, async () => '');
  await r.saveReview('keep', card, 7, { rev: 1, ok: 1, nw: 1 });
  await expect(r.replaceAll({ cards: {}, hist: {}, settings: {} })).rejects.toThrow('disk');
  expect(Object.keys((await r.loadAll()).cards)).toEqual(['keep']);
});

test('a failed open is retried on the next call', async () => {
  let n = 0;
  const r = sqliteRepo(async () => { if (n++ === 0) throw new Error('locked'); return nodeDb(); }, async () => '');
  await expect(r.loadAll()).rejects.toThrow('locked');
  await expect(r.loadAll()).resolves.toMatchObject({ cards: {} });
});
