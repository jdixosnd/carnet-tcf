import * as P from '@radix-ui/react-popover';
import type { ReactNode } from 'react';

export function Popover({ trigger, children, open, onOpenChange }: { trigger: ReactNode; children: ReactNode; open?: boolean; onOpenChange?(o: boolean): void }) {
  return (
    <P.Root open={open} onOpenChange={onOpenChange}>
      <P.Trigger asChild>{trigger}</P.Trigger>
      <P.Portal>
        <P.Content align="start" sideOffset={6}
          className="z-50 rounded-[12px] border border-line bg-surface p-4 text-ink shadow-dialog outline-none animate-[fade-in_120ms_ease-out]">
          {children}
        </P.Content>
      </P.Portal>
    </P.Root>
  );
}
