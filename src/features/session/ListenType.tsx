import { useEffect, useRef, useState } from 'react';
import type { Rating, Word } from '../../data/types';
import { withArticle } from '../../data/words';
import { useCarnet } from '../../store/useCarnet';
import { isCorrect, matchTyped, type Match } from '../../lib/answer-match';
import { playWord } from '../../lib/audio/player';
import { useHotkeys } from '../../app/useHotkeys';
import { Button } from '../../components/Button';
import { ListenCircle } from './ListenCircle';
import { WordCard } from './WordCard';
import { cn } from '../../lib/cn';

const ACCENTS = ['é', 'è', 'ê', 'à', 'â', 'ç', 'î', 'ô', 'û', 'ù', 'ë', 'ï', 'œ'];

/** The corrected word with the fixed letters underlined. */
function Corrected({ w, m }: { w: Word; m: Extract<Match, { kind: 'accent' }> }) {
  const isHead = m.correct === w.key;
  const shown = isHead ? withArticle(w) : m.correct;
  const shift = isHead ? shown.length - w.fr.length : 0;
  return (
    <span lang="fr" className="font-serif text-[22px] text-ink">
      {[...shown].map((ch, k) => m.fixed.includes(k - shift)
        ? <span key={k} className="underline decoration-hard-solid decoration-2 underline-offset-4">{ch}</span>
        : ch)}
    </span>
  );
}

export function ListenType({ word: w, onResult }: { word: Word; practice: boolean; retry: boolean; onResult(r: Rating): void }) {
  const words = useCarnet(s => s.words);
  const [value, setValue] = useState('');
  const [m, setM] = useState<Match | null>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { void playWord(w.i); }, [w.i]);

  const answered = m !== null && m.kind !== 'empty';
  const ok = answered && isCorrect(m);
  const check = () => {
    if (answered) return;
    const r = matchTyped(value, w, words);
    if (r.kind !== 'empty') setM(r);
  };
  const giveUp = () => { if (!answered) setM({ kind: 'wrong', typed: '' }); };
  const next = () => { if (answered) onResult(ok ? 'knew' : 'forgot'); };
  const insert = (ch: string) => {
    const el = input.current;
    if (!el) return;
    const s = el.selectionStart ?? value.length, e = el.selectionEnd ?? value.length;
    setValue(value.slice(0, s) + ch + value.slice(e));
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + 1, s + 1); });
  };

  useHotkeys({
    Enter: () => (answered ? next() : check()),
    r: () => void playWord(w.i), s: () => void playWord(w.i, 0.7),
  });

  return (
    <div data-word={w.fr} className="flex w-full flex-1 flex-col items-center gap-8 pb-10 pt-10">
      <span className="eyebrow">Type what you hear</span>
      <ListenCircle filled={false} wordIdx={w.i} onPlay={() => void playWord(w.i)} />
      <div className="flex w-[560px] flex-col gap-3">
        <div className={cn('flex items-center justify-between gap-4 rounded-[12px] border-2 bg-surface px-[22px] py-[18px]',
          !answered && 'border-line-strong focus-within:border-accent', answered && ok && 'border-knew-solid', answered && !ok && 'border-forgot-solid')}>
          <input ref={input} autoFocus value={value} readOnly={answered} onChange={e => setValue(e.target.value)}
            aria-label="The French word you heard" lang="fr" spellCheck={false} autoComplete="off" autoCapitalize="off"
            placeholder="Type in French"
            className="min-w-0 flex-1 bg-transparent font-serif text-[34px] leading-tight outline-none placeholder:text-ink-4 [&:focus-visible]:outline-none" />
          {answered && <span className={cn('shrink-0 text-[14px] font-bold', ok ? 'text-knew-text' : 'text-forgot-text')}>{ok ? '✓ Correct' : '✕ Not quite'}</span>}
        </div>
        {!answered && (
          <div className="flex flex-wrap items-center gap-1.5" aria-label="Accented letters">
            {ACCENTS.map(c => (
              <button key={c} type="button" onClick={() => insert(c)} lang="fr"
                className="press h-8 w-8 rounded-[6px] border border-line-strong font-serif text-[18px] hover:bg-hover">{c}</button>
            ))}
            <span className="flex-1" />
            <Button variant="small" onClick={giveUp}>I don't know</Button>
            <Button variant="dark" className="px-5 py-[9px] text-[14px]" onClick={check}>Check ↵</Button>
          </div>
        )}
        {m?.kind === 'accent' && (
          <div className="flex items-baseline gap-2.5 rounded-[10px] bg-hard-bg px-[18px] py-3.5 text-[16px] text-hard-sub">
            Mind the accent: <Corrected w={w} m={m} />
          </div>
        )}
        {m?.kind === 'homophone' && (
          <div className="rounded-[10px] bg-hard-bg px-[18px] py-3.5 text-[16px] text-hard-sub">
            “{m.typed}” sounds the same. The word read aloud was <span lang="fr" className="font-serif text-[20px] text-ink">{withArticle(w)}</span>
          </div>
        )}
        {answered && !ok && (
          <div className="rounded-[10px] bg-forgot-bg px-[18px] py-3.5 text-[16px] text-forgot-sub">
            It was: <span lang="fr" className="font-serif text-[22px] text-ink">{withArticle(w)}</span>
          </div>
        )}
      </div>
      {answered && (
        <>
          <WordCard w={w} />
          <Button variant="dark" autoFocus={false} onClick={next} className="px-[26px] py-[13px]">Continue ↵</Button>
        </>
      )}
    </div>
  );
}
