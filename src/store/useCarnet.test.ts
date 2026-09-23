import { vi } from 'vitest';
import { useCarnet } from './useCarnet';
import { memoryRepo } from '../repo/memoryRepo';
import { synthWords } from '../test/fixtures';
import { dayNum } from '../lib/day';
import type { Repo } from '../repo/types';

vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { error: vi.fn() }) }));
import { toast } from 'sonner';

const words = synthWords();
const audio = { w: { files: [], start: [], len: [] }, s: { files: [], start: [], len: [] }, ws: [] };
const store = () => useCarnet.getState();
const mem = () => memoryRepo(null);

afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });

test('init loads data and merges settings over defaults', async () => {
  const repo = mem();
  await repo.setSetting('newPerDay', 25);
  await store().init({ repo, words, audio });
  expect(store().status).toBe('ready');
  expect(store().settings.newPerDay).toBe(25);
  expect(store().settings.sessionSize).toBe(40);
  expect(store().today).toBe(dayNum());
});

test('rating a new word updates the card, history and repo', async () => {
  const repo = mem();
  await store().init({ repo, words, audio });
  const t = store().today;
  store().rate(0, 'knew');
  expect(store().cards.w0).toMatchObject({ b: 2, d: t + 3 });
  expect(store().hist[t]).toEqual({ rev: 1, ok: 1, nw: 1 });
  store().rate(0, 'forgot');
  expect(store().hist[t]).toEqual({ rev: 2, ok: 1, nw: 1 });
  await vi.waitFor(async () => expect((await repo.loadAll()).cards.w0).toMatchObject({ b: 1 }));
});

test('learn more adds 10 per press, for today only', async () => {
  await store().init({ repo: mem(), words, audio });
  store().learnMore();
  store().learnMore();
  expect(store().settings.extraNewToday).toEqual({ day: store().today, n: 20 });
});

test('tick rolls the day over at midnight', async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 8, 24, 23, 59));
  await store().init({ repo: mem(), words, audio });
  const t = store().today;
  store().addToToday(3);
  store().learnMore();
  vi.setSystemTime(new Date(2026, 8, 25, 0, 1));
  store().tick();
  expect(store().today).toBe(t + 1);
  expect(store().extraToday).toEqual({});
});

test('import replaces progress and marks onboarded', async () => {
  const repo = mem();
  await store().init({ repo, words, audio });
  store().rate(1, 'knew');
  await store().importBackup({ cards: { w5: { b: 3, d: 1, r: 1, w: 0, f: 1, l: 1 } }, hist: {}, settings: { newPerDay: 5 } });
  expect(Object.keys(store().cards)).toEqual(['w5']);
  expect(store().settings).toMatchObject({ newPerDay: 5, onboarded: true });
  expect((await repo.loadAll()).settings.onboarded).toBe(true);
});

test('erase keeps settings', async () => {
  await store().init({ repo: mem(), words, audio });
  store().setSetting('theme', 'dark');
  store().rate(1, 'knew');
  await store().erase();
  expect(store().cards).toEqual({});
  expect(store().hist).toEqual({});
  expect(store().settings.theme).toBe('dark');
});

test('a failing save keeps the state and tells the user after retries', async () => {
  const repo: Repo = { ...mem(), saveReview: vi.fn().mockRejectedValue(new Error('disk')) };
  await store().init({ repo, words, audio });
  vi.useFakeTimers();
  store().rate(2, 'knew');
  expect(store().cards.w2).toBeDefined();
  await vi.runAllTimersAsync();
  expect(repo.saveReview).toHaveBeenCalledTimes(4);
  expect(toast.error).toHaveBeenCalledWith("Couldn't save your progress");
});

test('init reports a database error', async () => {
  const repo: Repo = { ...mem(), loadAll: () => Promise.reject(new Error('migration')) };
  await store().init({ repo, words, audio });
  expect(store().status).toBe('error');
  expect(store().error).toBe('db');
});

test('a failed import leaves progress as stored and rethrows', async () => {
  const base = mem();
  const repo: Repo = { ...base, replaceAll: () => Promise.reject(new Error('disk')) };
  await store().init({ repo, words, audio });
  store().rate(1, 'knew');
  await expect(store().importBackup({ cards: {}, hist: {}, settings: {} })).rejects.toThrow('disk');
  expect(Object.keys(store().cards)).toEqual(['w1']);
  expect(store().settings.onboarded).toBe(false);
});
