import type { Word } from '../../data/types';
import { withArticle } from '../../data/words';

/** "the bill" — the first sense, cut at the first comma or semicolon. */
export const shortMeaning = (w: Word): string => w.en.split(/[;,]/)[0].replace(/\s*\(.*?\)\s*/g, ' ').trim();

export function feedbackText(w: Word, ok: boolean): { title: string; sub: string } {
  const ex = w.ex[0] ? `« ${w.ex[0][0]} »` : '';
  const title = `${ok ? 'Correct' : 'Not quite'} — ${withArticle(w)} is ${shortMeaning(w)}`;
  const sub = ok ? ex : [ex, "You'll see it again in 4 cards."].filter(Boolean).join(' · ');
  return { title, sub };
}
