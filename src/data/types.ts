export type Level = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export const LEVELS: Level[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
export type Pos = 'n' | 'v' | 'adj' | 'adv' | 'prep' | 'pron' | 'det' | 'conj' | 'interj';
export type Gender = '' | 'm' | 'f' | 'mf';
export type Example = [text: string, form: string, test: number, question: number];
/** The web app's compact row: [fr, en, pos, gender, level, timesHeard, tests, commonForms, examples, otherForms(space separated)] */
export type WordRow = [string, string, Pos, Gender, Level, number, number[], string[], Example[], string];

export interface Word {
  i: number; fr: string; en: string; pos: Pos; g: Gender; lvl: Level; n: number; tests: number[];
  forms: string[]; more: string[]; ex: Example[];
  /** Card key: lower-cased headword (same as the web app). */
  key: string;
  nfr: string; allForms: string[]; nforms: string[]; nen: string; first: string; senses: string[]; snd: string;
}

export interface Card { b: number; d: number; r: number; w: number; f: number; l: number; }
export interface DayHist { rev: number; ok: number; nw: number; }
export type Rating = 'forgot' | 'hard' | 'knew';
export type Game = 'flip' | 'mc' | 'listen' | 'mix';
export type Direction = 'fr-en' | 'en-fr';

export interface Settings {
  newPerDay: number; sessionSize: number; voice: 'recorded' | 'device'; speed: number;
  theme: 'light' | 'dark' | 'system'; levels: Level[]; tests: number[] | null; game: Game;
  mcDirection: Direction | 'both'; listenMode: 'choose' | 'type'; reminderEnabled: boolean; reminderTime: string;
  autoUpdate: boolean; autostart: boolean; onboarded: boolean; extraNewToday: { day: number; n: number };
  recentSearches: string[];
}

export interface UserData {
  cards: Record<string, Card>;
  hist: Record<number, DayHist>;
  settings: Settings;
  /** word key → day it was added with "Add to today's reviews" */
  extraToday: Record<string, number>;
}

export interface PackIndex { files: string[]; start: number[]; len: number[]; }
export interface AudioIndex { w: PackIndex; s: PackIndex; ws: number[]; }
