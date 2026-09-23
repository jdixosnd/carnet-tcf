// App state: read-only words + user progress, written through to the repository on every change.
import { create } from 'zustand';
import { toast } from 'sonner';
import { DEFAULT_SETTINGS } from '../data/defaults';
import type { AudioIndex, Rating, Settings, UserData, Word } from '../data/types';
import { loadWords } from '../data/words';
import { dayNum } from '../lib/day';
import { buildDistractorIndex, type DistractorIndex } from '../lib/distractors';
import { isNewCard, nextCard } from '../lib/srs';
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
  learnMore(): void;
  importBackup(b: BackupData): Promise<void>;
  erase(): Promise<void>;
}

let repo: Repo | null = null;
let initing: Promise<void> | null = null;
const RETRY_MS = [200, 800, 2000];

/** Runs a repository write, retrying 3 times; the in-memory state is already updated. */
function persist(fn: (r: Repo) => Promise<void>): void {
  const r = repo;
  if (!r) return;
  const attempt = (n: number): void => {
    fn(r).catch(() => {
      if (n < RETRY_MS.length) setTimeout(() => attempt(n + 1), RETRY_MS[n]);
      else toast.error("Couldn't save your progress");
    });
  };
  attempt(0);
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
    persist(rp => rp.saveReview(w.key, card, today, h));
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

  learnMore() {
    const { settings, today } = get();
    const cur = settings.extraNewToday;
    get().setSetting('extraNewToday', { day: today, n: (cur.day === today ? cur.n : 0) + 10 });
  },

  async importBackup(b) {
    if (!repo) throw new Error('not ready');
    const settings = { ...b.settings, onboarded: true };
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

  async erase() {
    if (!repo) throw new Error('not ready');
    await repo.eraseProgress();
    set({ cards: {}, hist: {}, extraToday: {} });
  },
};
});
