import type { Word } from '../../data/types';
import { withArticle } from '../../data/words';
import { levelPos } from './wordMeta';

/** Compact meaning + example card shown after a listening answer. */
export function WordCard({ w }: { w: Word }) {
  const ex = w.ex[0];
  return (
    <div className="flex w-[560px] flex-col gap-2 rounded-[14px] border border-line bg-surface p-[22px]">
      <div className="flex items-baseline justify-between gap-4">
        <span lang="fr" className="font-serif text-[28px]">{withArticle(w)}</span>
        <span className="text-[13px] font-bold text-accent">{levelPos(w)}</span>
      </div>
      <span className="text-[18px]">{w.en}</span>
      {ex && <span lang="fr" className="font-serif text-[18px] italic text-ink-2">« {ex[0]} »</span>}
    </div>
  );
}
