import { useState, type RefObject } from 'react';
import { Check, ChevronDown, Search as SearchIcon } from 'lucide-react';
import { LEVELS, type Level, type WordsFilters as Filters, type WordStatus, type WordType } from '../../data/types';
import { Popover } from '../../components/Popover';
import { Pill } from '../../components/Pill';
import { KeyCap } from '../../components/KeyCap';
import { describeFilters, hasFilters, STATUS_LABEL, TYPE_LABEL } from '../../lib/words-query';
import { plural } from '../../lib/format';
import { cn } from '../../lib/cn';
import { TestsPopover } from './TestsPopover';

/** A button that opens a single-choice list (Status, Type). */
function MenuSelect<T extends string>({ label, value, options, onChange }: {
  label: string; value: T; options: Record<T, string>; onChange(v: T): void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen} trigger={
      <button type="button" aria-label={`${label}: ${options[value]}`}
        className="press flex items-center gap-2 rounded-[10px] border border-line-strong px-3.5 py-2.5 text-[15px] hover:bg-hover">
        {options[value]}
        <ChevronDown size={16} strokeWidth={1.75} className="text-ink-3" />
      </button>
    }>
      <div role="listbox" aria-label={label} className="-m-2 flex min-w-[180px] flex-col">
        {(Object.keys(options) as T[]).map(k => (
          <button key={k} type="button" role="option" aria-selected={k === value}
            onClick={() => { onChange(k); setOpen(false); }}
            className={cn('flex items-center justify-between gap-6 rounded-[6px] px-3 py-2 text-left text-[15px] hover:bg-hover',
              k === value && 'font-bold')}>
            {options[k]}
            {k === value && <Check size={16} strokeWidth={1.75} className="text-accent" />}
          </button>
        ))}
      </div>
    </Popover>
  );
}

export function WordsFilters({ f, text, onText, onChange, inputRef }: {
  f: Filters; text: string; onText(t: string): void; onChange(p: Partial<Filters>): void;
  inputRef: RefObject<HTMLInputElement>;
}) {
  const toggleLevel = (l: Level) =>
    onChange({ levels: f.levels.includes(l) ? f.levels.filter(x => x !== l) : [...f.levels, l].sort() as Level[] });
  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="flex w-[260px] items-center gap-2.5 rounded-[10px] border border-line-strong bg-surface px-3.5 py-2.5 focus-within:border-2 focus-within:border-accent focus-within:px-[13px] focus-within:py-[9px]">
        <SearchIcon size={16} strokeWidth={1.75} className="shrink-0 text-ink-3" />
        <input ref={inputRef} id="words-filter" type="search" value={text} placeholder="Filter words or meanings"
          aria-label="Filter words or meanings" spellCheck={false} autoComplete="off"
          onChange={e => onText(e.target.value)}
          onKeyDown={e => {
            if (e.key !== 'Escape') return;
            e.stopPropagation(); // Esc here clears the text, not the selection
            if (text) onText(''); else e.currentTarget.blur();
          }}
          className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-4 [&::-webkit-search-cancel-button]:hidden [&:focus-visible]:outline-none" />
        <KeyCap>/</KeyCap>
      </label>
      <TestsPopover tests={f.tests} onChange={tests => onChange({ tests })} />
      <div className="flex gap-1.5" role="group" aria-label="Levels">
        {LEVELS.map(l => <Pill key={l} on={f.levels.includes(l)} className="py-2" onClick={() => toggleLevel(l)}>{l}</Pill>)}
      </div>
      <MenuSelect<WordStatus> label="Status" value={f.status} options={STATUS_LABEL} onChange={status => onChange({ status })} />
      <MenuSelect<WordType> label="Type" value={f.pos} options={TYPE_LABEL} onChange={pos => onChange({ pos })} />
    </div>
  );
}

/** "214 words · Test 12 · B1, B2   Clear filters" */
export function WordsSummary({ f, count, onClear }: { f: Filters; count: number; onClear(): void }) {
  const q = f.q.trim();
  const desc = describeFilters(f);
  return (
    <div className="flex items-baseline gap-3.5 text-[14px] text-ink-2" aria-live="polite">
      <span>
        <b className="text-ink">{plural(count, 'word')}</b>
        {q && !desc ? <> match ‘{q}’</> : <>{q && <> · ‘{q}’</>}{desc && <> · {desc}</>}</>}
      </span>
      {hasFilters(f) && <button type="button" onClick={onClear} className="text-accent hover:underline">Clear filters</button>}
    </div>
  );
}
