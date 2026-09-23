// System speech (Windows voice): the fallback, or the choice in Settings → Voice.
export function speak(text: string, rate: number): boolean {
  if (typeof speechSynthesis === 'undefined' || typeof SpeechSynthesisUtterance === 'undefined' || !text) return false;
  try {
    if (speechSynthesis.speaking || speechSynthesis.pending) speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const voices = speechSynthesis.getVoices().filter(v => /^fr([-_]|$)/i.test(v.lang));
    const v = voices.find(x => /fr[-_]FR/i.test(x.lang)) ?? voices[0];
    if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'fr-FR';
    u.rate = rate;
    speechSynthesis.speak(u);
    return true;
  } catch { return false; }
}

export function stopSpeech(): void {
  try { if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel(); } catch { /* ignore */ }
}
