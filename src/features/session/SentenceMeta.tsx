import { Play } from 'lucide-react';
import type { Word } from '../../data/types';
import { playSentence } from '../../lib/audio/player';

export function SentenceMeta({ w, k = 0 }: { w: Word; k?: number }) {
  const ex = w.ex[k];
  if (!ex) return null;
  return (
    <div className="flex items-center gap-4 text-[13px] text-ink-3">
      {k === 0 && (
        <button type="button" onClick={() => void playSentence(w.i)} className="press flex items-center gap-1.5 hover:text-accent">
          <Play size={12} strokeWidth={1.75} fill="currentColor" /> Play sentence
        </button>
      )}
      <span>Test {ex[2]} · Question {ex[3]}</span>
    </div>
  );
}
