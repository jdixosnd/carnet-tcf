import * as D from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { Word } from '../../data/types';
import { withArticle } from '../../data/words';
import { WordDetail } from '../search/WordDetail';

/** Right-hand sheet with the same content as the Search detail pane. Esc or the scrim closes it. */
export function WordDrawer({ w, onClose }: { w: Word | null; onClose(): void }) {
  return (
    <D.Root open={!!w} onOpenChange={o => { if (!o) onClose(); }}>
      <D.Portal>
        <D.Overlay className="fixed inset-x-0 bottom-0 top-9 z-40 bg-[var(--c-scrim)] animate-[fade-in_180ms_ease-out]" />
        <D.Content aria-describedby={undefined}
          className="fixed bottom-0 right-0 top-9 z-50 w-[440px] overflow-auto border-l border-line bg-paper text-ink shadow-dialog outline-none animate-[sheet-in_200ms_var(--ease-flip)]">
          {w && (
            <>
              {/* Names the dialog without a second heading next to WordDetail's own. */}
              <D.Title asChild><span className="sr-only">{withArticle(w)}</span></D.Title>
              <D.Close aria-label="Close" className="press absolute right-4 top-4 grid size-8 place-items-center rounded-full text-ink-3 hover:bg-hover hover:text-ink">
                <X size={18} strokeWidth={1.75} />
              </D.Close>
              <WordDetail w={w} compact />
            </>
          )}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
