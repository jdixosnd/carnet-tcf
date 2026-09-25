import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Popover } from '../../components/Popover';
import { Tooltip } from '../../components/Tooltip';
import { useCarnet } from '../../store/useCarnet';
import { testsLabel } from '../../lib/words-query';
import { plural } from '../../lib/format';
import { cn } from '../../lib/cn';

const ALL = Array.from({ length: 40 }, (_, k) => k + 1);

/** Multi-select of tests 1–40; none selected means all tests. */
export function TestsPopover({ tests, onChange }: { tests: number[]; onChange(t: number[]): void }) {
  const [open, setOpen] = useState(false);
  const words = useCarnet(s => s.words);
  const counts = useMemo(() => {
    const n = new Array<number>(41).fill(0);
    for (const w of words) for (const t of w.tests) n[t]++;
    return n;
  }, [words]);
  const active = tests.length > 0 && tests.length < 40;
  const toggle = (t: number) =>
    onChange(tests.includes(t) ? tests.filter(x => x !== t) : [...tests, t].sort((a, b) => a - b));

  return (
    <Popover open={open} onOpenChange={setOpen} trigger={
      <button type="button" aria-label={`Tests: ${testsLabel(tests)}`}
        className={cn('press flex items-center gap-2 rounded-[10px] text-[15px]',
          active ? 'border-2 border-accent bg-accent-soft px-[13px] py-[9px] font-bold text-accent-strong'
            : 'border border-line-strong px-3.5 py-2.5 text-ink hover:bg-hover')}>
        {testsLabel(tests)}
        <ChevronDown size={16} strokeWidth={1.75} className={active ? 'text-accent-strong' : 'text-ink-3'} />
      </button>
    }>
      <div className="flex w-max flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <span className="text-[15px] font-bold">Tests</span>
          <div className="flex gap-3 text-[14px]">
            <button type="button" className="text-accent hover:underline" onClick={() => onChange(ALL)}>All</button>
            <button type="button" className="text-accent hover:underline" onClick={() => onChange([])}>None</button>
          </div>
        </div>
        <div className="grid grid-cols-8 gap-1" role="group" aria-label="Tests">
          {ALL.map(t => {
            const on = tests.includes(t);
            return (
              <Tooltip key={t} side="top" content={plural(counts[t], 'word')}>
                <button type="button" aria-pressed={on} onClick={() => toggle(t)}
                  className={cn('press tnum h-8 w-9 rounded-[6px] text-[13px]',
                    on ? 'bg-accent font-bold text-on-accent' : 'border border-line-strong text-ink-2 hover:bg-hover')}>
                  {t}
                </button>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </Popover>
  );
}
