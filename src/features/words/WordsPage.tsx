import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useCarnet } from '../../store/useCarnet';
import { useRun } from '../../store/useRun';
import { useHotkeys } from '../../app/useHotkeys';
import { DEFAULT_WORDS_FILTERS } from '../../data/defaults';
import type { WordsFilters as Filters, WordSort } from '../../data/types';
import { flatten, prepare, queryWords, sortWords } from '../../lib/words-query';
import { wordsCsv } from '../../lib/csv';
import { fmt, plural } from '../../lib/format';
import { playWord } from '../../lib/audio/player';
import { Segmented } from '../../components/Segmented';
import { Button } from '../../components/Button';
import { Dialog } from '../../components/Dialog';
import { WordsFilters, WordsSummary } from './WordsFilters';
import { WordsTable, type WordsTableHandle } from './WordsTable';
import { AlphaRail } from './AlphaRail';
import { SelectionBar } from './SelectionBar';
import { WordDrawer } from './WordDrawer';
import { saveCsvFile } from './exportCsv';

const SORTS = [
  { value: 'az', label: 'A–Z' }, { value: 'heard', label: 'Most heard' }, { value: 'due', label: 'Due soonest' },
] as const;

const same = (a: Filters, b: Filters) => JSON.stringify(a) === JSON.stringify(b);
const inRadios = (e: KeyboardEvent) => !!(e.target as HTMLElement).closest?.('[role=radiogroup]');

export function WordsPage() {
  const words = useCarnet(s => s.words);
  const cards = useCarnet(s => s.cards);
  const today = useCarnet(s => s.today);
  const navigate = useNavigate();

  const [f, setF] = useState<Filters>(() => ({ ...DEFAULT_WORDS_FILTERS, ...useCarnet.getState().settings.wordsFilters }));
  const [text, setText] = useState(f.q);
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const [focusI, setFocusI] = useState<number | null>(null);
  const [ring, setRing] = useState(false); // the focus ring shows while moving with the keyboard
  const [openI, setOpenI] = useState<number | null>(null);
  const [letter, setLetter] = useState<string | null>(null);
  const [confirmKnown, setConfirmKnown] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const table = useRef<WordsTableHandle>(null);
  const anchor = useRef<number | null>(null);

  const change = useCallback((p: Partial<Filters>) => setF(cur => ({ ...cur, ...p })), []);
  useEffect(() => {
    const id = setTimeout(() => change({ q: text }), 80);
    return () => clearTimeout(id);
  }, [text, change]);
  useEffect(() => {
    const s = useCarnet.getState();
    if (!same(f, s.settings.wordsFilters)) s.setSetting('wordsFilters', f);
  }, [f]);

  const idx = useMemo(() => queryWords(words, cards, today, f), [words, cards, today, f]);
  const entries = useMemo(() => flatten(words, idx, f.sort), [words, idx, f.sort]);
  const present = useMemo(() => {
    const prep = prepare(words);
    return new Set(idx.map(i => prep[i].letter));
  }, [words, idx]);
  const inList = useMemo(() => new Set(idx), [idx]);
  const latest = useRef({ idx, inList });
  latest.current = { idx, inList };

  const hidden = useMemo(() => [...selected].filter(i => !inList.has(i)).length, [selected, inList]);
  const shown = selected.size - hidden;
  const allChecked = idx.length > 0 && shown === idx.length ? true : shown > 0 ? 'mixed' : false;

  const clear = () => { setText(''); setF(cur => ({ ...DEFAULT_WORDS_FILTERS, sort: cur.sort })); };
  const selectAll = () => setSelected(cur => new Set([...cur, ...idx]));
  const toggleAll = () => {
    if (allChecked === true) setSelected(cur => new Set([...cur].filter(i => !inList.has(i))));
    else selectAll();
  };

  const onToggle = useCallback((i: number, shift: boolean) => {
    const { idx: list } = latest.current;
    setSelected(cur => {
      const next = new Set(cur);
      const a = anchor.current === null ? -1 : list.indexOf(anchor.current);
      const b = list.indexOf(i);
      if (shift && a >= 0 && b >= 0) {
        for (let k = Math.min(a, b); k <= Math.max(a, b); k++) next.add(list[k]);
      } else if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
    anchor.current = i;
    setFocusI(i);
    setRing(false);
  }, []);
  const onOpen = useCallback((i: number) => { setFocusI(i); setRing(false); setOpenI(i); }, []);

  const move = (d: number, extend: boolean) => {
    if (!idx.length) return;
    const pos = focusI === null ? -1 : idx.indexOf(focusI);
    const n = pos < 0 ? (d > 0 ? 0 : idx.length - 1) : Math.max(0, Math.min(idx.length - 1, pos + d));
    const i = idx[n];
    if (extend) setSelected(cur => new Set([...cur, ...(pos >= 0 ? [idx[pos]] : []), i]));
    setFocusI(i);
    setRing(true);
    table.current?.scrollToWord(i);
  };

  /** The selection in the current sort order (hidden words last). */
  const selectedInOrder = () => [
    ...idx.filter(i => selected.has(i)),
    ...sortWords(words, cards, [...selected].filter(i => !inList.has(i)), f.sort),
  ];

  const markKnown = () => {
    setConfirmKnown(false);
    const n = selected.size;
    const prev = useCarnet.getState().markKnown([...selected]);
    setSelected(new Set());
    toast(`${plural(n, 'word')} marked as known`, {
      duration: 6000,
      action: { label: 'Undo', onClick: () => useCarnet.getState().restoreCards(prev) },
    });
  };
  const addToday = () => {
    const n = useCarnet.getState().addManyToToday([...selected]);
    setSelected(new Set());
    toast(n ? `${plural(n, 'word')} added to today` : "Already in today's reviews");
  };
  const practise = () => {
    useRun.getState().start(selectedInOrder(), { practice: true });
    navigate('/session');
  };
  const exportCsv = async () => {
    const list = selected.size ? selectedInOrder() : idx;
    try {
      if (await saveCsvFile(wordsCsv(words, list, cards))) toast(`Exported ${plural(list.length, 'word')}`);
    } catch (e) {
      console.error('export', e);
      toast.error("Couldn't save the CSV file");
    }
  };

  const toggleFocused = () => {
    if (focusI === null) return;
    onToggle(focusI, false);
    setRing(true);
  };

  useHotkeys({
    '/': () => input.current?.focus(),
    // (The sort control moves between its own options with the arrows.)
    ArrowDown: e => { if (!inRadios(e)) move(1, e.shiftKey); },
    ArrowUp: e => { if (!inRadios(e)) move(-1, e.shiftKey); },
    Enter: e => {
      if ((e.target as HTMLElement).tagName === 'INPUT') { input.current?.blur(); if (focusI === null) move(1, false); return; }
      if (focusI !== null) setOpenI(focusI);
    },
    Space: () => { if (focusI !== null) void playWord(focusI); },
    x: () => toggleFocused(),
    X: () => toggleFocused(),
    'Ctrl+a': e => {
      const t = e.target as HTMLElement;
      if (t.tagName === 'INPUT') (t as HTMLInputElement).select();
      else selectAll();
    },
    Escape: () => {
      if (selected.size) setSelected(new Set());
      else setFocusI(null);
    },
  });

  const sortSeg = (v: 'az' | 'heard' | 'due') => change({ sort: v as WordSort });
  const az = f.sort === 'az' || f.sort === 'za';

  return (
    <div className="relative flex h-full min-h-[620px] flex-col">
      <div className="flex flex-col gap-[18px] px-12 pt-8">
        <div className="flex items-end justify-between gap-6">
          <div className="flex items-baseline gap-3.5">
            <h2 className="m-0 font-serif text-[44px] font-normal leading-[1.1]">Words</h2>
            <span className="text-[15px] text-ink-2">{fmt(words.length)} in the notebook</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Segmented label="Sort" size="sm" value={az ? 'az' : f.sort} options={[...SORTS]} onChange={sortSeg} />
            <Button variant="small" className="py-2" onClick={() => void exportCsv()}>Export CSV</Button>
          </div>
        </div>
        <WordsFilters f={f} text={text} onText={setText} onChange={change} inputRef={input} />
        <WordsSummary f={f} count={idx.length} onClear={clear} />
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_28px] gap-3 pl-12 pr-5 pt-3.5">
        <WordsTable ref={table} words={words} entries={entries} cards={cards} today={today} sort={f.sort}
          selected={selected} focusI={ring ? focusI : null} allChecked={allChecked} loading={!words.length}
          onToggleAll={toggleAll} onToggle={onToggle} onOpen={onOpen} onLetter={setLetter} onClear={clear}
          onSortWord={() => change({ sort: f.sort === 'az' ? 'za' : 'az' })} />
        {az ? <AlphaRail present={present} current={letter} onJump={l => table.current?.scrollToLetter(l)} /> : <span />}
      </div>
      {selected.size > 0 && (
        <SelectionBar count={selected.size} hidden={hidden} filtered={idx.length} allFilteredSelected={shown === idx.length}
          onSelectAll={selectAll} onToday={addToday} onPractise={practise}
          onKnown={() => (selected.size > 20 ? setConfirmKnown(true) : markKnown())} />
      )}
      <WordDrawer w={openI === null ? null : words[openI]} onClose={() => setOpenI(null)} />
      <Dialog open={confirmKnown} onOpenChange={setConfirmKnown} title={`Mark ${plural(selected.size, 'word')} as known?`}>
        <p className="m-0 text-[16px] leading-normal text-ink-2">
          They move to box 5 and come back for review in 35 days. You can undo this for a few seconds afterwards.
        </p>
        <div className="mt-7 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setConfirmKnown(false)}>Cancel</Button>
          <Button variant="primary" onClick={markKnown}>Mark as known</Button>
        </div>
      </Dialog>
    </div>
  );
}
