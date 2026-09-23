import * as T from '@radix-ui/react-tooltip';
import type { ReactNode } from 'react';

export function Tooltip({ content, children, side = 'right' }: { content: ReactNode; children: ReactNode; side?: 'top' | 'right' | 'bottom' | 'left' }) {
  return (
    <T.Root delayDuration={250}>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal>
        <T.Content side={side} sideOffset={8} className="z-50 rounded-[8px] bg-ink px-3 py-2 text-[13px] text-on-ink shadow-dialog">
          {content}
        </T.Content>
      </T.Portal>
    </T.Root>
  );
}
