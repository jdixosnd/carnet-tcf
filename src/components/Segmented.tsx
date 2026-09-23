import { useRef } from 'react';
import { cn } from '../lib/cn';

export interface SegOption<T extends string> { value: T; label: string; }

/** Handoff segmented control: chrome track, selected segment on surface with a small shadow. */
export function Segmented<T extends string>({ label, value, options, onChange, size = 'md' }: {
  label: string; value: T; options: SegOption<T>[]; onChange(v: T): void; size?: 'md' | 'sm';
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const idx = options.findIndex(o => o.value === value);
  const move = (d: number) => {
    const n = (idx + d + options.length) % options.length;
    onChange(options[n].value);
    refs.current[n]?.focus();
  };
  return (
    <div role="radiogroup" aria-label={label}
      className={cn('flex w-max max-w-full bg-chrome', size === 'md' ? 'gap-1.5 rounded-[10px] p-1' : 'gap-1 rounded-[8px] p-[3px]')}>
      {options.map((o, k) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            ref={el => { refs.current[k] = el; }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={e => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); move(1); }
              if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
            }}
            className={cn(
              'press whitespace-nowrap',
              size === 'md' ? 'rounded-[7px] px-4 py-2 text-[15px]' : 'rounded-[6px] px-3 py-1.5 text-[14px]',
              on ? 'bg-surface font-bold text-ink shadow-seg' : 'text-ink-2 hover:text-ink',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
