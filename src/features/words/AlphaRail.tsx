import { cn } from '../../lib/cn';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/** A–Z jump rail: letters with results are links, the top visible group is highlighted. */
export function AlphaRail({ present, current, onJump }: { present: Set<string>; current: string | null; onJump(l: string): void }) {
  return (
    <nav aria-label="Jump to letter" className="flex flex-col items-center justify-between pb-[76px] pt-1.5">
      {LETTERS.map(l => {
        const has = present.has(l);
        return (
          <button key={l} type="button" disabled={!has} onClick={() => onJump(l)} aria-current={l === current || undefined}
            className={cn('rounded-[4px] px-[5px] py-px text-[11px] font-bold leading-[13px]',
              !has ? 'cursor-default text-line-strong' : l === current ? 'bg-accent text-on-accent' : 'text-accent hover:bg-hover')}>
            {l}
          </button>
        );
      })}
    </nav>
  );
}
