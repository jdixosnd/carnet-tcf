import type { Settings } from '../data/types';

const dark = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches;

/** Sets html[data-theme] to light/dark; "system" follows the OS live. Returns an unsubscribe. */
export function applyTheme(pref: Settings['theme']): () => void {
  const set = () => { document.documentElement.dataset.theme = pref === 'system' ? (dark() ? 'dark' : 'light') : pref; };
  set();
  if (pref !== 'system' || typeof matchMedia === 'undefined') return () => {};
  const mq = matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', set);
  return () => mq.removeEventListener('change', set);
}
