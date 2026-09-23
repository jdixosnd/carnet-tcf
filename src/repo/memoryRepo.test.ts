import { memoryRepo } from './memoryRepo';

class FakeStorage {
  m = new Map<string, string>();
  getItem(k: string) { return this.m.get(k) ?? null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
  removeItem(k: string) { this.m.delete(k); }
}
const card = { b: 2, d: 10, r: 1, w: 0, f: 7, l: 7 };

test('reviews and settings persist across instances', async () => {
  const s = new FakeStorage();
  const a = memoryRepo(s);
  await a.saveReview('été', card, 7, { rev: 1, ok: 1, nw: 1 });
  await a.setSetting('newPerDay', 25);
  await a.addExtraToday('voir', 7);
  const b = await memoryRepo(s).loadAll();
  expect(b.cards['été']).toEqual(card);
  expect(b.hist[7]).toEqual({ rev: 1, ok: 1, nw: 1 });
  expect(b.settings.newPerDay).toBe(25);
  expect(b.extraToday).toEqual({ voir: 7 });
});

test('a review removes the word from extra_today', async () => {
  const r = memoryRepo(new FakeStorage());
  await r.addExtraToday('voir', 7);
  await r.saveReview('voir', card, 7, { rev: 1, ok: 1, nw: 0 });
  expect((await r.loadAll()).extraToday).toEqual({});
});

test('replaceAll swaps progress and merges settings', async () => {
  const r = memoryRepo(new FakeStorage());
  await r.saveReview('a', card, 7, { rev: 1, ok: 1, nw: 1 });
  await r.setSetting('theme', 'dark');
  await r.replaceAll({ cards: { b: card }, hist: { 9: { rev: 2, ok: 1, nw: 0 } }, settings: { newPerDay: 5 } });
  const d = await r.loadAll();
  expect(Object.keys(d.cards)).toEqual(['b']);
  expect(d.hist).toEqual({ 9: { rev: 2, ok: 1, nw: 0 } });
  expect(d.settings).toMatchObject({ theme: 'dark', newPerDay: 5 });
});

test('erase keeps settings only', async () => {
  const r = memoryRepo(new FakeStorage());
  await r.saveReview('a', card, 7, { rev: 1, ok: 1, nw: 1 });
  await r.addExtraToday('b', 7);
  await r.setSetting('theme', 'dark');
  await r.eraseProgress();
  expect(await r.loadAll()).toEqual({ cards: {}, hist: {}, extraToday: {}, settings: { theme: 'dark' } });
});

test('corrupted storage loads as empty', async () => {
  const s = new FakeStorage();
  s.setItem('carnet-desktop-dev', '{nope');
  expect(await memoryRepo(s).loadAll()).toEqual({ cards: {}, hist: {}, extraToday: {}, settings: {} });
});

test('clearExtraBefore drops old days', async () => {
  const r = memoryRepo(new FakeStorage());
  await r.addExtraToday('a', 5);
  await r.addExtraToday('b', 7);
  await r.clearExtraBefore(7);
  expect((await r.loadAll()).extraToday).toEqual({ b: 7 });
});
