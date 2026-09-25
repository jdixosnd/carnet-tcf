import { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useMemo, useRef, type MouseEvent } from 'react';
import { defaultRangeExtractor, useVirtualizer, type Range } from '@tanstack/react-virtual';
import { Check, Minus, Play, Square } from 'lucide-react';
import type { Card, Word, WordSort } from '../../data/types';
import { withArticle } from '../../data/words';
import { cardStatus, isNewCard, type Status } from '../../lib/srs';
import { posAbbr, type Entry } from '../../lib/words-query';
import { playWord, stopAudio, useAudioState } from '../../lib/audio/player';
import { Tooltip } from '../../components/Tooltip';
import { Button } from '../../components/Button';
import { cn } from '../../lib/cn';

const LETTER_H = 31;
const ROW_H = 49;
/** Checkbox · play · word · meaning · level · heard · status. "Heard" is dropped below 1100 px. */
export const COLS = 'grid items-center gap-3 px-5 grid-cols-[28px_32px_minmax(0,1.1fr)_minmax(0,1.5fr)_56px_88px_118px] max-[1099px]:grid-cols-[28px_32px_minmax(0,1.1fr)_minmax(0,1.5fr)_56px_118px]';

const STATUS: Record<Status, { label: string; dot: string }> = {
  new: { label: 'New', dot: 'border border-line-strong bg-track' },
  learning: { label: 'Learning', dot: 'bg-accent-light' },
  familiar: { label: 'Familiar', dot: 'bg-accent' },
  mastered: { label: 'Mastered', dot: 'bg-ink' },
};

export function Checkbox({ checked, onClick, label }: { checked: boolean | 'mixed'; onClick(e: MouseEvent): void; label: string }) {
  return (
    <button type="button" role="checkbox" aria-checked={checked} aria-label={label} tabIndex={-1}
      onMouseDown={e => e.preventDefault()} // keep Space/X for the list, not this button
      onClick={e => { e.stopPropagation(); onClick(e); }}
      className={cn('grid size-4 place-items-center rounded-[4px]',
        checked ? 'bg-accent text-on-accent' : 'border-[1.5px] border-line-strong bg-surface hover:border-accent')}>
      {checked === 'mixed' ? <Minus size={11} strokeWidth={3} /> : checked && <Check size={11} strokeWidth={3} />}
    </button>
  );
}

function RowPlay({ i }: { i: number }) {
  const a = useAudioState();
  const on = a.key === `w${i}` && a.status !== 'idle';
  return (
    <button type="button" tabIndex={-1} aria-label={on ? 'Stop' : 'Hear the word'}
      onMouseDown={e => e.preventDefault()}
      onClick={e => { e.stopPropagation(); if (on) stopAudio(); else void playWord(i); }}
      className={cn('press grid size-7 place-items-center rounded-full border text-accent hover:bg-hover', on ? 'border-accent' : 'border-line-strong')}>
      {on ? <Square size={10} strokeWidth={1.75} fill="currentColor" /> : <Play size={11} strokeWidth={1.75} fill="currentColor" className="ml-px" />}
    </button>
  );
}

const Row = memo(function Row({ w, card, today, sort, selected, focused, onToggle, onOpen }: {
  w: Word; card: Card | undefined; today: number; sort: WordSort; selected: boolean; focused: boolean;
  onToggle(i: number, shift: boolean): void; onOpen(i: number): void;
}) {
  const st = cardStatus(card);
  let label = STATUS[st].label;
  if (sort === 'due' && !isNewCard(card)) label = card!.d <= today ? 'today' : `in ${card!.d - today} d`;
  return (
    <div role="row" id={`word-row-${w.i}`} aria-selected={selected} onClick={() => onOpen(w.i)}
      className={cn(COLS, 'h-[49px] cursor-pointer border-b border-chrome',
        selected ? 'bg-accent-soft' : 'hover:bg-paper', focused && 'shadow-[inset_0_0_0_2px_var(--c-accent)]')}>
      <Checkbox checked={selected} label={`Select ${w.fr}`} onClick={e => onToggle(w.i, e.shiftKey)} />
      <RowPlay i={w.i} />
      <span className="flex min-w-0 items-baseline gap-2">
        <span lang="fr" className="truncate font-serif text-[21px] leading-[30px]">{withArticle(w)}</span>
        <span className="shrink-0 text-[12px] text-ink-3">{posAbbr(w)}</span>
      </span>
      <Tooltip side="top" content={w.en}>
        <span className="truncate text-[15px] text-ink-2">{w.en}</span>
      </Tooltip>
      <span className="text-[13px] font-bold text-accent">{w.lvl}</span>
      <span className="tnum text-right text-[14px] text-ink-2 max-[1099px]:hidden">{w.n}×</span>
      <span className="flex items-center gap-2 text-[14px]">
        <span className={cn('size-[9px] shrink-0 rounded-full', STATUS[st].dot)} />
        {label}
      </span>
    </div>
  );
});

export interface WordsTableHandle { scrollToWord(i: number): void; scrollToLetter(l: string): void; }

export const WordsTable = forwardRef<WordsTableHandle, {
  words: Word[]; entries: Entry[]; cards: Record<string, Card>; today: number; sort: WordSort;
  selected: Set<number>; focusI: number | null; allChecked: boolean | 'mixed'; loading: boolean;
  onToggleAll(): void; onToggle(i: number, shift: boolean): void; onOpen(i: number): void;
  onSortWord(): void; onLetter(l: string | null): void; onClear(): void;
}>(function WordsTable(p, ref) {
  const scroller = useRef<HTMLDivElement>(null);
  const { entries } = p;
  const letterIdx = useMemo(() => entries.flatMap((e, k) => (e.kind === 'letter' ? [k] : [])), [entries]);
  const active = useRef(-1);

  const rangeExtractor = useCallback((range: Range) => {
    active.current = [...letterIdx].reverse().find(k => range.startIndex >= k) ?? -1;
    const out = new Set(defaultRangeExtractor(range));
    if (active.current >= 0) out.add(active.current);
    return [...out].sort((a, b) => a - b);
  }, [letterIdx]);

  const v = useVirtualizer({
    count: entries.length,
    getScrollElement: () => scroller.current,
    estimateSize: k => (entries[k].kind === 'letter' ? LETTER_H : ROW_H),
    getItemKey: k => { const e = entries[k]; return e.kind === 'letter' ? `L${e.letter}` : e.i; },
    rangeExtractor,
    overscan: 10,
    // Rows scrolled into view stay clear of the sticky letter header and the selection bar.
    scrollPaddingStart: letterIdx.length ? LETTER_H : 0,
    scrollPaddingEnd: 80,
    paddingEnd: 96,
    initialRect: { width: 900, height: 600 },
  });

  useImperativeHandle(ref, () => ({
    scrollToWord(i) {
      const k = entries.findIndex(e => e.kind === 'word' && e.i === i);
      if (k >= 0) v.scrollToIndex(k, { align: 'auto' });
    },
    scrollToLetter(l) {
      const k = entries.findIndex(e => e.kind === 'letter' && e.letter === l);
      // Straight to the header itself: scrollToIndex would leave room for the previous letter's sticky header.
      if (k >= 0) v.scrollToOffset(v.measurementsCache[k].start);
    },
  }), [entries, v]);

  const items = v.getVirtualItems();
  const cur = active.current >= 0 && entries[active.current]?.kind === 'letter' ? (entries[active.current] as { letter: string }).letter : null;
  const { onLetter } = p;
  useEffect(() => { onLetter(cur); }, [cur, onLetter]);

  const az = p.sort === 'az' || p.sort === 'za';
  return (
    <div role="table" aria-label="Words" aria-rowcount={entries.length}
      className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-[14px] border border-b-0 border-line bg-surface">
      <div role="row" className={cn(COLS, 'shrink-0 border-b border-line py-2.5 text-[12px] font-bold uppercase tracking-[0.08em] text-ink-3')}>
        <Checkbox checked={p.allChecked} label="Select all" onClick={p.onToggleAll} />
        <span />
        <button type="button" onClick={p.onSortWord} className="flex items-center gap-1.5 text-left uppercase tracking-[0.08em] hover:text-ink"
          aria-label={p.sort === 'za' ? 'Word, sorted Z to A' : 'Word, sort A to Z'}>
          Word {az && <span aria-hidden>{p.sort === 'za' ? '↓' : '↑'}</span>}
        </button>
        <span>Meaning</span>
        <span>Level</span>
        <span className="text-right max-[1099px]:hidden">Heard</span>
        <span>Status</span>
      </div>
      <div ref={scroller} className="min-h-0 flex-1 overflow-auto">
        {p.loading ? (
          Array.from({ length: 8 }, (_, k) => (
            <div key={k} className={cn(COLS, 'h-[49px] border-b border-chrome')}>
              <span className="size-4 animate-[skeleton_1.2s_ease-in-out_infinite] rounded-[4px] bg-chrome" />
              <span className="size-7 animate-[skeleton_1.2s_ease-in-out_infinite] rounded-full bg-chrome" />
              <span className="h-4 w-3/4 animate-[skeleton_1.2s_ease-in-out_infinite] rounded bg-chrome" />
              <span className="h-3 w-2/3 animate-[skeleton_1.2s_ease-in-out_infinite] rounded bg-chrome" />
            </div>
          ))
        ) : entries.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 pb-16">
            <p className="m-0 font-serif text-[28px]">No words match these filters</p>
            <Button variant="small" onClick={p.onClear}>Clear filters</Button>
          </div>
        ) : (
          <div className="relative w-full" style={{ height: v.getTotalSize() }}>
            {items.map(it => {
              const e = entries[it.index];
              const sticky = it.index === active.current;
              const style = sticky ? { position: 'sticky' as const, top: 0, zIndex: 1 }
                : { position: 'absolute' as const, top: 0, left: 0, width: '100%', transform: `translateY(${it.start}px)` };
              if (e.kind === 'letter') {
                return (
                  <div key={it.key} style={style} role="rowheader"
                    className="h-[31px] border-b border-chrome bg-paper px-5 font-serif text-[18px] leading-[30px] text-accent">
                    {e.letter}
                  </div>
                );
              }
              const w = p.words[e.i];
              return (
                <div key={it.key} style={style}>
                  <Row w={w} card={p.cards[w.key]} today={p.today} sort={p.sort} selected={p.selected.has(e.i)}
                    focused={p.focusI === e.i} onToggle={p.onToggle} onOpen={p.onOpen} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});
