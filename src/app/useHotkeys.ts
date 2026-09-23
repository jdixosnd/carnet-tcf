import { useEffect, useRef } from 'react';

type Handler = (e: KeyboardEvent) => void;

/**
 * Page-level keyboard shortcuts. Keys are KeyboardEvent.key values, "Space" for the space bar,
 * or "Ctrl+k". Keys typed into a field are ignored except Enter and Escape.
 */
export function useHotkeys(map: Record<string, Handler>, enabled = true): void {
  const ref = useRef(map);
  ref.current = map;
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return; // a held key must not answer and then skip the feedback
      // While a dialog is open (e.g. "End this session?"), the page underneath must not react.
      if (document.querySelector('[role="dialog"]')) return;
      let key = e.key === ' ' ? 'Space' : e.key;
      // AZERTY's number row types & é " ' — use the physical key for the 1–4 answers.
      const digit = /^(?:Digit|Numpad)([0-9])$/.exec(e.code ?? '');
      if (digit && !(key in ref.current)) key = digit[1];
      if (e.ctrlKey || e.metaKey) {
        const h = ref.current[`Ctrl+${key.toLowerCase()}`];
        if (h) { e.preventDefault(); h(e); }
        return;
      }
      if (e.altKey) return;
      const t = e.target as HTMLElement | null;
      const inField = !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
      if (inField && key !== 'Enter' && key !== 'Escape') return;
      // Let focused buttons handle their own Space/Enter.
      if ((key === 'Space' || key === 'Enter') && t?.tagName === 'BUTTON') return;
      const h = ref.current[key];
      if (h) { e.preventDefault(); h(e); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled]);
}
