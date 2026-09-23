// In-browser repository (Vite dev server, Playwright). Keeps data in memory and mirrors it to localStorage.
import type { Repo, LoadedData } from './types';

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;
const empty = (): LoadedData => ({ cards: {}, hist: {}, settings: {}, extraToday: {} });

export function memoryRepo(storage: StorageLike | null = typeof localStorage !== 'undefined' ? localStorage : null, key = 'carnet-desktop-dev'): Repo {
  let data = empty();
  try {
    const raw = storage?.getItem(key);
    if (raw) {
      const o = JSON.parse(raw) as Partial<LoadedData>;
      data = { cards: o.cards ?? {}, hist: o.hist ?? {}, settings: o.settings ?? {}, extraToday: o.extraToday ?? {} };
    }
  } catch { data = empty(); }

  const save = () => { try { storage?.setItem(key, JSON.stringify(data)); } catch { /* storage full or blocked */ } };
  const clone = (): LoadedData => JSON.parse(JSON.stringify(data)) as LoadedData;

  return {
    async loadAll() { return clone(); },
    async saveReview(word, card, day, hist) {
      data.cards[word] = { ...card };
      data.hist[day] = { ...hist };
      delete data.extraToday[word];
      save();
    },
    async setSetting(k, v) { data.settings = { ...data.settings, [k]: v }; save(); },
    async addExtraToday(word, day) { data.extraToday[word] = day; save(); },
    async clearExtraBefore(day) {
      data.extraToday = Object.fromEntries(Object.entries(data.extraToday).filter(([, d]) => d >= day));
      save();
    },
    async replaceAll(b) {
      data = { cards: { ...b.cards }, hist: { ...b.hist }, extraToday: {}, settings: { ...data.settings, ...b.settings } };
      save();
    },
    async eraseProgress() { data = { ...empty(), settings: data.settings }; save(); },
    async dataPath() { return 'Browser storage (development build)'; },
  };
}
