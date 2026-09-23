// Text helpers ported from the web app (carnet-tcf.html) — keep behaviour identical.

/** Lower-case, strip accents, straighten apostrophes, collapse spaces. */
export const norm = (s: string): string =>
  String(s).replace(/œ/g, 'oe').replace(/Œ/g, 'OE').replace(/æ/g, 'ae').replace(/Æ/g, 'AE').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’]/g, "'").replace(/\s+/g, ' ').trim();

/** Rough pronunciation key: drops silent endings and merges -er/-ez/-ai/-et, so homophones share a key. */
export function soundKey(s: string): string {
  let k = norm(s).replace(/[^a-z]/g, '').replace(/(.)\1+/g, '$1');
  k = k.replace(/(er|ez|ai|et)$/, 'e').replace(/[estxdzp]+$/, '');
  return k || norm(s);
}

export const escRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function shuffle<T>(a: T[], rng: () => number = Math.random): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
