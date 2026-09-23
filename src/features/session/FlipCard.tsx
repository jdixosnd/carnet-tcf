import { useEffect, useRef, useState } from 'react';
import { Play } from 'lucide-react';
import type { Card, Rating, Word } from '../../data/types';
import { withArticle } from '../../data/words';
import { intervalDays, intervalLabel } from '../../lib/srs';
import { playWord } from '../../lib/audio/player';
import { useHotkeys } from '../../app/useHotkeys';
import { Button } from '../../components/Button';
import { PlayButton } from '../../components/PlayButton';
import { Example } from '../../components/Example';
import { cardKind, heardLine, levelPos } from './wordMeta';
import { SentenceMeta } from './SentenceMeta';
import { cn } from '../../lib/cn';

const RATINGS: { r: Rating; label: string; key: string; cls: string; sub: string }[] = [
  { r: 'forgot', label: 'Forgot', key: '1', cls: 'bg-forgot-bg border-forgot-border hover:border-forgot-text text-forgot-text', sub: 'text-forgot-sub' },
  { r: 'hard', label: 'Hard', key: '2', cls: 'bg-hard-bg border-hard-border hover:border-hard-text text-hard-text', sub: 'text-hard-sub' },
  { r: 'knew', label: 'Knew it', key: '3', cls: 'bg-knew-bg border-knew-border hover:border-knew-text text-knew-text', sub: 'text-knew-sub' },
];

const HALF = 160; // half of the 320 ms flip
type Phase = 'front' | 'out' | 'in-start' | 'back';

export function FlipCard({ word: w, card, practice, retry, onResult }: {
  word: Word; card?: Card; practice: boolean; retry: boolean; onResult(r: Rating): void; onAnswer?(r: Rating): void;
}) {
  const [phase, setPhase] = useState<Phase>('front');
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // A double-click on the previous card's rating would land on this card's "Show answer".
  const shownAt = useRef(Date.now());
  useEffect(() => () => clearTimeout(timer.current), []);
  const back = phase === 'in-start' || phase === 'back';

  const flip = () => {
    if (phase !== 'front') return;
    setPhase('out');
    timer.current = setTimeout(() => {
      setPhase('in-start');
      requestAnimationFrame(() => requestAnimationFrame(() => setPhase('back')));
      // Fallback when rAF doesn't run (tests, hidden window).
      timer.current = setTimeout(() => setPhase(p => (p === 'in-start' ? 'back' : p)), 50);
      void playWord(w.i);
    }, HALF);
  };
  const rate = (r: Rating) => { if (back) onResult(r); };

  useHotkeys({
    Space: flip, Enter: flip,
    '1': () => rate('forgot'), '2': () => rate('hard'), '3': () => rate('knew'),
  });

  const sub = (r: Rating) => {
    if (practice || retry) return r === 'forgot' ? 'again' : 'got it';
    return intervalLabel(intervalDays(card, r));
  };

  const motion = cn(
    'transition-[transform,opacity] motion-reduce:transition-opacity',
    phase === 'out' && 'duration-[160ms] ease-in [transform:rotateY(90deg)] motion-reduce:[transform:none] motion-reduce:opacity-0',
    phase === 'in-start' && 'duration-0 [transform:rotateY(-90deg)] motion-reduce:[transform:none] motion-reduce:opacity-0',
    (phase === 'back' || phase === 'front') && 'duration-[160ms] ease-flip',
  );
  const shell = 'w-[680px] rounded-[18px] border border-line bg-surface shadow-card [backface-visibility:hidden]';
  const meta = (
    <div className="flex justify-between text-[13px] text-ink-3">
      <span>{cardKind(card, practice, retry)}</span>
      <span className="font-bold text-accent">{levelPos(w)}</span>
    </div>
  );

  if (!back) {
    return (
      <div className="flex flex-col items-center gap-7 pb-[60px] [perspective:1400px]">
        <div data-word={w.fr} className={cn(shell, motion, 'relative flex h-[420px] flex-col items-center justify-center gap-6')}>
          <div className="absolute inset-x-[26px] top-[22px]">{meta}</div>
          <span lang="fr" className="font-serif text-[80px] leading-none">{withArticle(w)}</span>
          <div className="flex gap-2.5">
            <Button variant="chip" onClick={() => void playWord(w.i)}><Play size={14} strokeWidth={1.75} fill="currentColor" /> Listen</Button>
            <Button variant="chip" className="text-ink-2" onClick={() => void playWord(w.i, 0.7)}>Slower 0.7×</Button>
          </div>
        </div>
        <div className="flex flex-col items-center gap-2.5">
          <Button variant="dark" autoFocus onClick={e => { if (e.detail === 0 || Date.now() - shownAt.current > 250) flip(); }}>Show answer</Button>
          <span className="text-[13px] text-ink-3">or press Space</span>
        </div>
      </div>
    );
  }

  const ex = w.ex[0];
  return (
    <div className="flex flex-col items-center gap-7 pb-10 [perspective:1400px]">
      <div data-word={w.fr} className={cn(shell, motion, 'flex h-[440px] flex-col gap-5 px-10 py-7')}>
        {meta}
        <div className="flex items-center gap-4">
          <span lang="fr" className="font-serif text-[56px] leading-none">{withArticle(w)}</span>
          <PlayButton audioKey={`w${w.i}`} label="Hear the word" onPlay={() => void playWord(w.i)} size={32} />
        </div>
        <span className="text-[24px] leading-[1.3]">{w.en}</span>
        {ex && (
          <div className="flex flex-col gap-2 border-t border-line pt-[18px]">
            <Example ex={ex} className="line-clamp-2 text-[24px] leading-[1.35]" />
            <SentenceMeta w={w} />
          </div>
        )}
        <span className="mt-auto text-[13px] text-ink-3">{heardLine(w)}</span>
      </div>
      <div className="grid grid-cols-[repeat(3,200px)] gap-3" role="group" aria-label="How well did you know it?">
        {RATINGS.map(x => (
          <button key={x.r} type="button" onClick={() => onResult(x.r)}
            className={cn('press flex flex-col items-center gap-1 rounded-[12px] border p-3.5', x.cls)}>
            <span className="text-[16px] font-bold">{x.label}</span>
            <span className={cn('text-[13px]', x.sub)}>{x.key} · {sub(x.r)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
