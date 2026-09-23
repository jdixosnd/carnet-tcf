import { vi } from 'vitest';
import { initPlayer, playWord, playSentence } from './player';
import { synthWords } from '../../test/fixtures';

const spoken: string[] = [];
beforeEach(() => {
  spoken.length = 0;
  vi.stubGlobal('SpeechSynthesisUtterance', class { text: string; lang = ''; rate = 1; voice = null; constructor(t: string) { this.text = t; } });
  vi.stubGlobal('speechSynthesis', {
    speak: (u: { text: string }) => spoken.push(u.text), cancel: () => {}, resume: () => {},
    getVoices: () => [], speaking: false, pending: false, addEventListener: () => {},
  });
});

const words = synthWords(3);
const index = { w: { files: ['audio/w000.mp3'], start: [0], len: [5, 5, 5] }, s: { files: ['audio/s000.mp3'], start: [0], len: [7] }, ws: [0, -1, -1] };

test('a failed pack falls back to the speech voice without throwing', async () => {
  const onFallback = vi.fn();
  initPlayer({ index, words, getVoice: () => 'recorded', getSpeed: () => 1, onFallback, fetchBytes: () => Promise.reject(new Error('404')) });
  await expect(playWord(1)).resolves.toBeUndefined();
  expect(onFallback).toHaveBeenCalledTimes(1);
  expect(spoken).toEqual(['w1']);
});

test('device voice always speaks', async () => {
  const fetchBytes = vi.fn();
  initPlayer({ index, words, getVoice: () => 'device', getSpeed: () => 1, onFallback: vi.fn(), fetchBytes });
  await playWord(0);
  expect(fetchBytes).not.toHaveBeenCalled();
  expect(spoken).toEqual(['w0']);
});

test('a word without sentence audio speaks the example text', async () => {
  initPlayer({ index, words, getVoice: () => 'recorded', getSpeed: () => 1, onFallback: vi.fn(), fetchBytes: vi.fn() });
  await playSentence(2);
  expect(spoken).toEqual(['Phrase w2.']);
});
