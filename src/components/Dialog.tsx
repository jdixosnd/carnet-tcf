import * as D from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';

/** Handoff dialog: scrim below the title bar, 480 px panel, radius 16, padding 32, fade + scale in. */
export function Dialog({ open, onOpenChange, title, eyebrow, children, width = 480 }: {
  open: boolean; onOpenChange(o: boolean): void; title: string; eyebrow?: string; children: ReactNode; width?: number;
}) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-x-0 bottom-0 top-9 z-40 bg-[var(--c-scrim)] animate-[fade-in_180ms_ease-out]" />
        <D.Content
          style={{ width }}
          className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100vh-80px)] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-[16px] bg-surface p-8 text-ink shadow-dialog outline-none animate-[dialog-in_180ms_ease-out]"
        >
          {eyebrow && <p className="eyebrow m-0 mb-2 text-accent!">{eyebrow}</p>}
          <D.Title className="m-0 font-serif text-[34px] font-normal leading-[1.1]">{title}</D.Title>
          <D.Description asChild><div className="mt-4">{children}</div></D.Description>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
