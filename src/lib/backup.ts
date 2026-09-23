// Backup codes compatible with the web app's localStorage['carnet-tcf-v1'] export:
// base64(UTF-8 JSON of { cards: {word: {b,d,r,w,f,l}}, hist: {day: {rev,ok,nw}}, settings }).
import { LEVELS, type Card, type DayHist, type Level, type Settings, type UserData } from '../data/types';

export interface BackupData { cards: Record<string, Card>; hist: Record<number, DayHist>; settings: Partial<Settings>; }
export class BackupError extends Error {
  constructor() { super("That code isn't a valid Carnet backup"); }
}

const WEB_MODE: Record<Settings['game'], string> = { flip: 'flip', mc: 'choice', listen: 'listen', mix: 'mix' };
const FROM_WEB_MODE: Record<string, Settings['game']> = { flip: 'flip', choice: 'mc', listen: 'listen', mix: 'mix' };

export function exportSettings(s: Settings): Record<string, unknown> {
  const { recentSearches: _r, extraNewToday: _e, onboarded: _o, ...desktop } = s;
  return {
    // web app names (it ignores unknown keys and keeps them, so both survive a round trip)
    // (newPerDay and levels share a name; the web's `voice` is a TTS voice id and falls back safely.)
    audio: s.voice, sessionLen: s.sessionSize, mode: WEB_MODE[s.game], dir: s.mcDirection, listenAns: s.listenMode,
    test: s.tests?.length === 1 ? s.tests[0] : 0, rate: s.speed,
    ...desktop,
  };
}

const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
const oneOf = <T extends string>(v: unknown, opts: readonly T[]): v is T => typeof v === 'string' && (opts as readonly string[]).includes(v);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// Desktop key → [web key, the web value a desktop export writes for it].
const WEB_TWINS: Record<string, [string, (v: unknown) => unknown]> = {
  sessionSize: ['sessionLen', v => v],
  voice: ['audio', v => v],
  speed: ['rate', v => v],
  game: ['mode', v => WEB_MODE[v as Settings['game']]],
  mcDirection: ['dir', v => v],
  listenMode: ['listenAns', v => v],
  tests: ['test', v => (Array.isArray(v) && v.length === 1 ? v[0] : 0)],
};

export function importSettings(input: Record<string, unknown>): Partial<Settings> {
  // The web app only edits its own key names. When a web value no longer matches what the desktop
  // export wrote, it was changed in the web app after the export, so it wins over the desktop copy.
  const raw = { ...input };
  for (const [desk, [web, toWeb]] of Object.entries(WEB_TWINS))
    if (desk in raw && web in raw && raw[web] !== toWeb(raw[desk])) delete raw[desk];
  const s: Partial<Settings> = {};
  const pick = (desktop: string, web?: string) => (desktop in raw ? raw[desktop] : web !== undefined ? raw[web] : undefined);

  const npd = pick('newPerDay');
  if (isInt(npd)) s.newPerDay = clamp(npd, 0, 100);
  const size = pick('sessionSize', 'sessionLen');
  if (isInt(size)) s.sessionSize = clamp(size, 10, 200);
  const voice = pick('voice', 'audio');
  if (oneOf(voice, ['recorded', 'device'] as const)) s.voice = voice;
  else if ('audio' in raw && oneOf(raw.audio, ['recorded', 'device'] as const)) s.voice = raw.audio;
  const speed = pick('speed', 'rate');
  if (typeof speed === 'number' && Number.isFinite(speed)) s.speed = Math.round(clamp(speed, 0.6, 1.2) * 10) / 10;
  if (oneOf(raw.theme, ['light', 'dark', 'system'] as const)) s.theme = raw.theme;
  if (Array.isArray(raw.levels)) s.levels = (raw.levels.filter(l => oneOf(l, LEVELS)) as Level[]).sort();
  if ('tests' in raw) {
    if (raw.tests === null) s.tests = null;
    else if (Array.isArray(raw.tests)) s.tests = raw.tests.filter(t => isInt(t) && t >= 1 && t <= 40).sort((a, b) => a - b);
  } else if (isInt(raw.test)) s.tests = raw.test >= 1 && raw.test <= 40 ? [raw.test] : null;
  if (oneOf(raw.game, ['flip', 'mc', 'listen', 'mix'] as const)) s.game = raw.game;
  else if (typeof raw.mode === 'string' && FROM_WEB_MODE[raw.mode]) s.game = FROM_WEB_MODE[raw.mode];
  const dir = pick('mcDirection', 'dir');
  if (oneOf(dir, ['fr-en', 'en-fr', 'both'] as const)) s.mcDirection = dir;
  const lm = pick('listenMode', 'listenAns');
  if (oneOf(lm, ['choose', 'type'] as const)) s.listenMode = lm;
  for (const k of ['reminderEnabled', 'autoUpdate', 'autostart'] as const) if (typeof raw[k] === 'boolean') s[k] = raw[k] as boolean;
  if (typeof raw.reminderTime === 'string' && /^\d\d:\d\d$/.test(raw.reminderTime)) s.reminderTime = raw.reminderTime;
  return s;
}

export function toBackupJson(d: UserData): string {
  return JSON.stringify({ cards: d.cards, hist: d.hist, settings: exportSettings(d.settings) });
}

function utf8ToBase64(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

function base64ToUtf8(b64: string): string {
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

export const encodeBackup = (d: UserData): string => utf8ToBase64(toBackupJson(d));

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

export function parseBackupJson(text: string): BackupData {
  let o: unknown;
  try { o = JSON.parse(text); } catch { throw new BackupError(); }
  if (!isObj(o) || !isObj(o.cards)) throw new BackupError();
  const cards: Record<string, Card> = {};
  for (const [word, c] of Object.entries(o.cards)) {
    if (!isObj(c) || !isInt(c.b) || c.b < 0 || c.b > 7 || !isInt(c.d)) throw new BackupError();
    const n = (v: unknown, dflt: number) => (isInt(v) ? v : dflt);
    cards[word] = { b: c.b, d: c.d, r: n(c.r, 0), w: n(c.w, 0), f: n(c.f, c.d), l: n(c.l, c.d) };
  }
  const hist: Record<number, DayHist> = {};
  if (o.hist !== undefined) {
    if (!isObj(o.hist)) throw new BackupError();
    for (const [day, h] of Object.entries(o.hist)) {
      if (!/^\d+$/.test(day) || !isObj(h)) throw new BackupError();
      const n = (v: unknown) => (isInt(v) && v >= 0 ? v : 0);
      hist[Number(day)] = { rev: n(h.rev), ok: n(h.ok), nw: n(h.nw) };
    }
  }
  return { cards, hist, settings: isObj(o.settings) ? importSettings(o.settings) : {} };
}

export function decodeBackup(code: string): BackupData {
  const clean = String(code).replace(/\s+/g, '');
  if (!clean) throw new BackupError();
  let text: string;
  try { text = base64ToUtf8(clean); } catch { throw new BackupError(); }
  return parseBackupJson(text);
}

export function backupCounts(b: BackupData): { words: number; days: number; reviews: number } {
  const hs = Object.values(b.hist);
  return { words: Object.keys(b.cards).length, days: hs.filter(h => h.rev > 0).length, reviews: hs.reduce((a, h) => a + h.rev, 0) };
}
