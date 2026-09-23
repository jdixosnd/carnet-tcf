// Plays word and sentence clips from the packs, time-stretched for "Slower"/speed, with a speech fallback.
import { useSyncExternalStore } from 'react';
import type { AudioIndex, Word } from '../../data/types';
import { resourceUrl } from '../../data/resources';
import { locate, PackCache } from './packs';
import { stretchPCM } from './wsola';
import { speak, stopSpeech } from './tts';

export type AudioState = { key: string | null; status: 'idle' | 'loading' | 'playing' };
export interface PlayerConfig {
  index: AudioIndex; words: Word[];
  getVoice(): 'recorded' | 'device'; getSpeed(): number; onFallback(): void;
  fetchBytes?: (file: string) => Promise<ArrayBuffer>;
}

async function defaultFetch(file: string): Promise<ArrayBuffer> {
  const r = await fetch(await resourceUrl(file));
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${file}`);
  return r.arrayBuffer();
}

let cfg: PlayerConfig | null = null;
let packs = new PackCache(defaultFetch);
let ctx: AudioContext | null = null;
const decoded = new Map<string, AudioBuffer>();
const stretched = new Map<string, AudioBuffer>();
let current: AudioBufferSourceNode | null = null;
let token = 0;
let state: AudioState = { key: null, status: 'idle' };
const listeners = new Set<(s: AudioState) => void>();

function setState(s: AudioState) { state = s; listeners.forEach(f => f(s)); }

export function initPlayer(c: PlayerConfig): void {
  cfg = c;
  packs = new PackCache(c.fetchBytes ?? defaultFetch);
  decoded.clear(); stretched.clear();
}

function audioCtx(): AudioContext | null {
  if (!ctx) {
    const AC = (globalThis as { AudioContext?: typeof AudioContext }).AudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
  return ctx;
}

const remember = <V>(m: Map<string, V>, k: string, v: V, max: number) => {
  m.set(k, v);
  while (m.size > max) m.delete(m.keys().next().value!);
};

async function clip(kind: 'w' | 's', i: number, c: AudioContext): Promise<AudioBuffer> {
  const key = kind + i;
  const hit = decoded.get(key);
  if (hit) return hit;
  const loc = locate(cfg!.index[kind], i);
  const bytes = await packs.get(loc.file);
  const buf = await c.decodeAudioData(bytes.slice(loc.offset, loc.offset + loc.len));
  remember(decoded, key, buf, 64);
  return buf;
}

function atRate(c: AudioContext, key: string, buf: AudioBuffer, rate: number): AudioBuffer {
  if (Math.abs(rate - 1) < 0.01) return buf;
  const k = `${key}@${rate}`;
  let out = stretched.get(k);
  if (!out) {
    const y = stretchPCM(buf.getChannelData(0), buf.sampleRate, rate);
    out = c.createBuffer(1, y.length, buf.sampleRate);
    out.getChannelData(0).set(y);
    remember(stretched, k, out, 32);
  }
  return out;
}

export function stopAudio(): void {
  token++;
  try { current?.stop(); } catch { /* already stopped */ }
  current = null;
  stopSpeech();
  if (state.status !== 'idle') setState({ key: null, status: 'idle' });
}

async function play(kind: 'w' | 's', i: number, text: string, stateKey: string, rate?: number): Promise<void> {
  if (!cfg) return;
  const r = rate ?? cfg.getSpeed();
  stopAudio();
  const tok = token;
  if (cfg.getVoice() === 'device' || i < 0) { speak(text, r); return; }
  setState({ key: stateKey, status: 'loading' });
  try {
    const c = audioCtx();
    if (!c) throw new Error('no AudioContext');
    const buf = atRate(c, kind + i, await clip(kind, i, c), r);
    if (tok !== token) return;
    const src = c.createBufferSource();
    src.buffer = buf;
    src.connect(c.destination);
    src.onended = () => { if (current === src) { current = null; setState({ key: null, status: 'idle' }); } };
    src.start(0);
    current = src;
    setState({ key: stateKey, status: 'playing' });
  } catch (e) {
    console.warn('audio fallback', e);
    if (tok !== token) return;
    setState({ key: null, status: 'idle' });
    cfg.onFallback();
    speak(text, r);
  }
}

/** Plays word i. `rate` overrides the speed setting (e.g. 0.7 for "Slower"). */
export function playWord(i: number, rate?: number): Promise<void> {
  return play('w', i, cfg?.words[i]?.fr ?? '', `w${i}`, rate);
}

/** Plays the first example sentence of word i (speech if it has no recording). */
export function playSentence(i: number, rate?: number): Promise<void> {
  const text = (cfg?.words[i]?.ex[0]?.[0] ?? '').replace(/…/g, '');
  return play('s', cfg?.index.ws[i] ?? -1, text, `s${i}`, rate);
}

/** Starts fetching the packs for these words (and their sentences). */
export function prefetch(wordIdxs: number[]): void {
  if (!cfg || cfg.getVoice() === 'device') return;
  for (const i of wordIdxs) {
    packs.get(locate(cfg.index.w, i).file).catch(() => {});
    const s = cfg.index.ws[i];
    if (s >= 0) packs.get(locate(cfg.index.s, s).file).catch(() => {});
  }
}

export function subscribeAudio(fn: (s: AudioState) => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function useAudioState(): AudioState {
  return useSyncExternalStore(subscribeAudio, () => state);
}
