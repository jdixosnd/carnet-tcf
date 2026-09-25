import type { Card, DayHist, Settings } from '../data/types';
import type { BackupData } from '../lib/backup';

export interface LoadedData {
  cards: Record<string, Card>;
  hist: Record<number, DayHist>;
  settings: Partial<Settings>;
  extraToday: Record<string, number>;
}

export interface Repo {
  loadAll(): Promise<LoadedData>;
  /** Upserts the card and today's absolute history row, and clears the word from extra_today. */
  saveReview(word: string, card: Card, day: number, hist: DayHist): Promise<void>;
  setSetting<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void>;
  addExtraToday(word: string, day: number): Promise<void>;
  addExtraTodayMany(words: string[], day: number): Promise<void>;
  /** Upserts `put` and deletes `remove`, in one transaction (Mark as known, and its undo). */
  putCards(put: Record<string, Card>, remove: string[]): Promise<void>;
  clearExtraBefore(day: number): Promise<void>;
  /** Import: replaces cards + history (and extra_today), merges settings. */
  replaceAll(b: BackupData): Promise<void>;
  /** Wipes cards, history and extra_today; keeps settings. */
  eraseProgress(): Promise<void>;
  dataPath(): Promise<string>;
}
