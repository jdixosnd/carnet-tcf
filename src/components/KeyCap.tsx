import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

export function KeyCap({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd className={cn('rounded-[4px] border border-line-strong px-[5px] py-px font-sans text-[12px] leading-[1.3] text-ink-3', className)}>
      {children}
    </kbd>
  );
}
