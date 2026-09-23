import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../lib/cn';

/** Level chip: outline when off, filled accent when on. */
export function Pill({ on, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { on: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      className={cn(
        'press rounded-full px-3 py-1.5 text-[14px]',
        on ? 'border border-accent bg-accent font-bold text-on-accent' : 'border border-line-strong text-ink-2 hover:bg-hover',
        className,
      )}
      {...rest}
    />
  );
}
