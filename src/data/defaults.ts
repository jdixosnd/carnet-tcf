import type { Gender, Pos, Settings, WordsFilters } from './types';

export const DEFAULT_WORDS_FILTERS: WordsFilters = { q: '', tests: [], levels: [], status: 'any', pos: 'all', sort: 'az' };

export const DEFAULT_SETTINGS: Settings = {
  newPerDay: 15, sessionSize: 40, voice: 'recorded', speed: 1, theme: 'system', levels: [], tests: null,
  game: 'flip', mcDirection: 'fr-en', listenMode: 'choose', reminderEnabled: true, reminderTime: '19:00',
  autoUpdate: true, autostart: false, onboarded: false, extraNewToday: { day: 0, n: 0 }, recentSearches: [],
  wordsFilters: DEFAULT_WORDS_FILTERS,
};

export const POS_NAME: Record<Pos, string> = {
  n: 'noun', v: 'verb', adj: 'adjective', adv: 'adverb', pron: 'pronoun', prep: 'preposition',
  det: 'determiner', conj: 'conjunction', interj: 'interjection',
};
export const GENDER_NAME: Record<Exclude<Gender, ''>, string> = { m: 'masculine', f: 'feminine', mf: 'masculine or feminine' };

export const TOTAL_WORDS = 4842;
export const APP_VERSION = '1.5.0';
