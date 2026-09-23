import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Popover } from '../../components/Popover';
import { compressRanges } from '../../lib/format';
import { cn } from '../../lib/cn';

const ALL = Array.from({ length: 40 }, (_, k) => k + 1);

export function testsLabel(tests: number[] | null): string {
  if (tests === null) return 'All tests';
  if (!tests.length) return 'No tests';
  return (tests.length === 1 ? 'Test ' : 'Tests ') + compressRanges(tests);
}

export function TestsPopover({ tests, onChange }: { tests: number[] | null; onChange(t: number[] | null): void }) {
  const [open, setOpen] = useState(false);
  const on = (t: number) => tests === null || tests.includes(t);
  const toggle = (t: number) => {
    const cur = tests ?? ALL;
    const next = cur.includes(t) ? cur.filter(x => x !== t) : [...cur, t].sort((a, b) => a - b);
    onChange(next.length === 40 ? null : next);
  };
  return (
    <Popover open={open} onOpenChange={setOpen} trigger={
      <button type="button" aria-label={`Tests: ${testsLabel(tests)}`}
        className="press flex w-full items-center justify-between rounded-[8px] border border-line-strong px-3.5 py-2.5 text-left text-[15px] hover:bg-hover">
        <span>{testsLabel(tests)}</span>
        <ChevronDown size={16} strokeWidth={1.75} className="text-ink-3" />
      </button>
    }>
      <div className="flex w-[340px] flex-col gap-3">
        <div className="grid grid-cols-8 gap-1.5" role="group" aria-label="Tests">
          {ALL.map(t => (
            <button key={t} type="button" aria-pressed={on(t)} onClick={() => toggle(t)}
              className={cn('press tnum h-8 rounded-[6px] text-[13px]',
                on(t) ? 'bg-accent font-bold text-on-accent' : 'border border-line-strong text-ink-2 hover:bg-hover')}>
              {t}
            </button>
          ))}
        </div>
        <div className="flex gap-4 text-[14px]">
          <button type="button" className="text-accent hover:underline" onClick={() => onChange(null)}>All</button>
          <button type="button" className="text-accent hover:underline" onClick={() => onChange([])}>None</button>
        </div>
      </div>
    </Popover>
  );
}
