// App state: read-only words + user progress, written through to the repository on every change.
import { create } from 'zustand';
import { toast } from 'sonner';
import { DEFAULT_SETTINGS } from '../data/defaults';
import type { AudioIndex, Card, Rating, Settings, UserData, Word } from '../data/types';
import { loadWords } from '../data/words';
import { dayNum } from '../lib/day';
import { buildDistractorIndex, type DistractorIndex } from '../lib/distractors';
import { GAPS, isNewCard, nextCard } from '../lib/srs';
import type { BackupData } from '../lib/backup';
import { openRepo } from '../repo';
import type { Repo } from '../repo/types';

export interface CarnetState extends UserData {
  status: 'loading' | 'ready' | 'error';
  error?: 'db' | 'words';
  words: Word[];
  audio: AudioIndex | null;
  dix: DistractorIndex | null;
  today: number;
  dbPath: string;
  init(opts?: { repo?: Repo; words?: Word[]; audio?: AudioIndex }): Promise<void>;
  tick(): void;
  rate(i: number, r: Rating): void;
  setSetting<K extends keyof Settings>(k: K, v: Settings[K]): void;
  addToToday(i: number): void;
  /** Adds the words that aren't already due or added; returns how many were added. */
  addManyToToday(indices: number[]): number;
  /** Box 5, due in 35 days. Returns the previous cards (undefined = was new) for restoreCards. */
  markKnown(indices: number[]): Record<string, Card | undefined>;
  restoreCards(prev: Record<string, Card | undefined>): void;
  learnMore(): void;
  importBackup(b: BackupData): Promise<void>;
  erase(): Promise<void>;
  /** Waits for queued writes, then flushes and closes the database (an update is about to install). */
  closeForUpdate(): Promise<void>;
}

let repo: Repo | null = null;
let initing: Promise<void> | null = null;
const RETRY_MS = [200, 800, 2000];

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));
let writes: Promise<void> = Promise.resolve();

/**
 * Queues a repository write (the in-memory state is already updated). Writes run one at a time, in order,
 * each retried 3 times, so a retried write can never land after — and overwrite — a newer one.
 */
function persist(fn: (r: Repo) => Promise<void>): void {
  const r = repo;
  if (!r) return;
  writes = writes.then(async () => {
    for (let n = 0; ; n++) {
      try { await fn(r); return; } catch {
        if (n >= RETRY_MS.length) { toast.error("Couldn't save your progress"); return; }
        await sleep(RETRY_MS[n]);
      }
    }
  });
}

export const useCarnet = create<CarnetState>()((set, get) => {
  const doInit = async (opts: { repo?: Repo; words?: Word[]; audio?: AudioIndex }): Promise<void> => {
    set({ status: 'loading', error: undefined });
    let data;
    try {
      repo = opts.repo ?? (await openRepo());
      data = await repo.loadAll();
    } catch (e) {
      console.error('database', e);
      set({ status: 'error', error: 'db' });
      return;
    }
    let words = opts.words, audio = opts.audio;
    if (!words || !audio) {
      try { ({ words, audio } = await loadWords()); } catch (e) {
        console.error('words', e);
        set({ status: 'error', error: 'words' });
        return;
      }
    }
    const today = dayNum();
    const extraToday = Object.fromEntries(Object.entries(data.extraToday).filter(([, d]) => d === today));
    persist(r => r.clearExtraBefore(today));
    set({
      status: 'ready', words, audio, dix: buildDistractorIndex(words), today,
      cards: data.cards, hist: data.hist, extraToday,
      settings: { ...DEFAULT_SETTINGS, ...data.settings },
      dbPath: await repo.dataPath().catch(() => ''),
    });
  };

  return {
  status: 'loading',
  words: [], audio: null, dix: null,
  cards: {}, hist: {}, settings: DEFAULT_SETTINGS, extraToday: {},
  today: dayNum(), dbPath: '',

  init(opts = {}) {
    // StrictMode runs effects twice in dev: share one load so a new database isn't opened twice.
    initing ??= doInit(opts).finally(() => { initing = null; });
    return initing;
  },

  tick() {
    const t = dayNum();
    if (t === get().today) return;
    set({ today: t, extraToday: Object.fromEntries(Object.entries(get().extraToday).filter(([, d]) => d === t)) });
    persist(r => r.clearExtraBefore(t));
  },

  rate(i, r) {
    get().tick(); // the minute timer may not have noticed midnight yet
    const { words, cards, hist, today, extraToday } = get();
    const w = words[i];
    const prev = cards[w.key];
    const card = nextCard(prev, r, today);
    const h = { ...(hist[today] ?? { rev: 0, ok: 0, nw: 0 }) };
    h.rev++;
    if (r !== 'forgot') h.ok++;
    if (isNewCard(prev)) h.nw++;
    const { [w.key]: _gone, ...restExtra } = extraToday;
    set({ cards: { ...cards, [w.key]: card }, hist: { ...hist, [today]: h }, extraToday: restExtra });
    // Write whatever is newest when the queued write runs (another rating may have updated the day since).
    persist(rp => {
      const s = get();
      if (!s.cards[w.key] || !s.hist[today]) return Promise.resolve(); // erased or replaced meanwhile
      return rp.saveReview(w.key, s.cards[w.key], today, s.hist[today]);
    });
  },

  setSetting(k, v) {
    set({ settings: { ...get().settings, [k]: v } });
    persist(r => r.setSetting(k, v));
  },

  addToToday(i) {
    const { words, today, extraToday } = get();
    const key = words[i].key;
    set({ extraToday: { ...extraToday, [key]: today } });
    persist(r => r.addExtraToday(key, today));
  },

  addManyToToday(indices) {
    get().tick();
    const { words, cards, today, extraToday } = get();
    const keys = [...new Set(indices.map(i => words[i].key))].filter(k => {
      const c = cards[k];
      return extraToday[k] !== today && (isNewCard(c) || c.d > today);
    });
    if (!keys.length) return 0;
    set({ extraToday: { ...extraToday, ...Object.fromEntries(keys.map(k => [k, today])) } });
    persist(r => r.addExtraTodayMany(keys, today));
    return keys.length;
  },

  markKnown(indices) {
    get().tick();
    const { words, cards, today } = get();
    const prev: Record<string, Card | undefined> = {};
    const put: Record<string, Card> = {};
    for (const i of indices) {
      const k = words[i].key;
      if (k in prev) continue;
      const c = cards[k];
      prev[k] = c;
      put[k] = isNewCard(c) ? { b: 5, d: today + GAPS[5], r: c?.r ?? 0, w: c?.w ?? 0, f: c?.f ?? today, l: today }
        : { ...c, b: 5, d: today + GAPS[5] };
    }
    set({ cards: { ...cards, ...put } });
    persist(r => r.putCards(put, []));
    return prev;
  },

  restoreCards(prev) {
    const cards = { ...get().cards };
    const put: Record<string, Card> = {};
    const remove: string[] = [];
    for (const [k, c] of Object.entries(prev)) {
      if (c) { cards[k] = put[k] = c; } else { delete cards[k]; remove.push(k); }
    }
    set({ cards });
    persist(r => r.putCards(put, remove));
  },

  learnMore() {
    const { settings, today } = get();
    const cur = settings.extraNewToday;
    get().setSetting('extraNewToday', { day: today, n: (cur.day === today ? cur.n : 0) + 10 });
  },

  async importBackup(b) {
    if (!repo) throw new Error('not ready');
    const settings = { ...b.settings, onboarded: true };
    await writes; // let queued reviews land first, so none is written on top of the import
    try {
      await repo.replaceAll({ ...b, settings });
    } catch (e) {
      // Show what is really stored, whatever the failure left behind.
      const d = await repo.loadAll().catch(() => null);
      if (d) set({ cards: d.cards, hist: d.hist, settings: { ...DEFAULT_SETTINGS, ...d.settings },
        extraToday: Object.fromEntries(Object.entries(d.extraToday).filter(([, day]) => day === get().today)) });
      throw e;
    }
    set({ cards: b.cards, hist: b.hist, extraToday: {}, settings: { ...get().settings, ...settings } });
  },

  async closeForUpdate() {
    await writes;
    await repo?.close();
  },

  async erase() {
    if (!repo) throw new Error('not ready');
    await writes;
    await repo.eraseProgress();
    set({ cards: {}, hist: {}, extraToday: {} });
  },
};
});
