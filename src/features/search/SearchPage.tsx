import { useEffect, useMemo, useRef, useState } from 'react';
import { Search as SearchIcon } from 'lucide-react';
import { useCarnet } from '../../store/useCarnet';
import { search, type Hit } from '../../lib/search';
import { withArticle } from '../../data/words';
import { fmt, plural } from '../../lib/format';
import { KeyCap } from '../../components/KeyCap';
import { WordDetail } from './WordDetail';
import { TOTAL_WORDS } from '../../data/defaults';
import { cn } from '../../lib/cn';

let lastQuery = ''; // kept while the app runs, so coming back to Search shows the same results

export function SearchPage() {
  const words = useCarnet(s => s.words);
  const recent = useCarnet(s => s.settings.recentSearches);
  const [text, setText] = useState(lastQuery);
  const [query, setQuery] = useState(lastQuery);
  const [sel, setSel] = useState(0);
  const list = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setTimeout(() => { setQuery(text); lastQuery = text; setSel(0); }, 60);
    return () => clearTimeout(id);
  }, [text]);
  const hits: Hit[] = useMemo(() => search(words, query), [words, query]);
  const current = hits[Math.min(sel, hits.length - 1)];

  const remember = () => {
    const q = query.trim();
    if (!q) return;
    const next = [q, ...recent.filter(r => r !== q)].slice(0, 8);
    if (next.join('\n') !== recent.join('\n')) useCarnet.getState().setSetting('recentSearches', next);
  };
  const move = (d: number) => {
    if (!hits.length) return;
    const n = Math.max(0, Math.min(hits.length - 1, sel + d));
    setSel(n);
    list.current?.querySelectorAll('[role=option]')[n]?.scrollIntoView({ block: 'nearest' });
  };

  const empty = !query.trim();
  return (
    <div className="grid h-full grid-cols-[380px_minmax(0,1fr)]">
      <div className="flex min-h-0 flex-col border-r border-line">
        <div className="flex flex-col gap-2.5 px-6 pb-4 pt-7">
          <label className="flex items-center gap-2.5 rounded-[10px] border-2 border-line-strong bg-surface px-3.5 py-3 focus-within:border-accent">
            <SearchIcon size={18} strokeWidth={1.75} className="shrink-0 text-ink-3" />
            <input id="search-input" type="search" autoFocus value={text} placeholder="Search"
              aria-label="Search words in French or English" spellCheck={false} autoComplete="off"
              onChange={e => setText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
                if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
                if (e.key === 'Enter') remember();
                if (e.key === 'Escape' && text) { e.stopPropagation(); setText(''); }
              }}
              className="min-w-0 flex-1 bg-transparent text-[18px] outline-none placeholder:text-ink-4 [&::-webkit-search-cancel-button]:hidden [&:focus-visible]:outline-none" />
            <KeyCap>Ctrl K</KeyCap>
          </label>
          <span className="text-[13px] text-ink-3">
            {empty ? 'French or English · any form of a word' : `French or English · ${plural(hits.length, 'result')}`}
          </span>
        </div>
        <div ref={list} role="listbox" aria-label="Results" className="min-h-0 flex-1 overflow-auto">
          {empty && recent.length > 0 && (
            <div className="flex flex-col gap-2 px-6 pt-2">
              <span className="eyebrow">Recent searches</span>
              <div className="flex flex-wrap gap-1.5">
                {recent.map(r => (
                  <button key={r} type="button" onClick={() => setText(r)}
                    className="press rounded-full border border-line-strong px-3 py-1.5 text-[14px] text-ink-2 hover:bg-hover">{r}</button>
                ))}
              </div>
            </div>
          )}
          {hits.map((h, k) => {
            const w = words[h.i];
            const on = k === sel;
            return (
              <div key={h.i} role="option" aria-selected={on} tabIndex={-1}
                onClick={() => { setSel(k); remember(); }}
                className={cn('flex cursor-pointer flex-col gap-0.5 py-3.5 pr-6',
                  on ? 'border-l-[3px] border-accent bg-accent-soft pl-[21px]' : 'border-b border-chrome pl-6 hover:bg-hover')}>
                <div className="flex items-baseline justify-between gap-3">
                  <span lang="fr" className="font-serif text-[22px]">{withArticle(w)}</span>
                  <span className={cn('text-[12px] font-bold', on ? 'text-accent-strong' : 'text-ink-3')}>{w.lvl}</span>
                </div>
                <span className="truncate text-[14px] text-ink-2">
                  {w.en.split(';')[0]}{h.form && <> · matched “{h.form}”</>}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="min-h-0 overflow-auto">
        {current ? <WordDetail w={words[current.i]} /> : (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-12 text-center">
            {empty ? (
              <>
                <h3 className="m-0 font-serif text-[34px] font-normal">Search {fmt(TOTAL_WORDS)} words in French or English</h3>
                <p className="m-0 max-w-[440px] text-[15px] leading-normal text-ink-3">Any form works: <i lang="fr">allons</i> finds <i lang="fr">aller</i>, and <i>to wait</i> finds <i lang="fr">attendre</i>.</p>
              </>
            ) : (
              <h3 className="m-0 font-serif text-[34px] font-normal">No word matches “{query.trim()}”</h3>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
