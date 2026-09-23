import { useEffect, useMemo, useState } from 'react';
import type { Rating, Word } from '../../data/types';
import { withArticle } from '../../data/words';
import { useCarnet } from '../../store/useCarnet';
import { options as makeOptions } from '../../lib/distractors';
import { playWord } from '../../lib/audio/player';
import { useHotkeys } from '../../app/useHotkeys';
import { Button } from '../../components/Button';
import { KeyCap } from '../../components/KeyCap';
import { ChoiceGrid, choiceStates } from './ChoiceGrid';
import { FeedbackBar } from './FeedbackBar';
import { feedbackText } from './feedback';
import { ListenCircle } from './ListenCircle';

export function ListenChoose({ word: w, onResult, onAnswer, onSwitchToType }: {
  word: Word; practice: boolean; retry: boolean; onResult(r: Rating): void; onAnswer?(r: Rating): void; onSwitchToType?(): void;
}) {
  const words = useCarnet(s => s.words);
  const dix = useCarnet(s => s.dix)!;
  const opts = useMemo(() => makeOptions(words, dix, w.i, 'sound'), [words, dix, w.i]);
  const [picked, setPicked] = useState<number | null>(null);
  const answer = opts.indexOf(w.i);
  const ok = picked === answer;
  useEffect(() => { void playWord(w.i); }, [w.i]);

  const pick = (k: number) => {
    if (picked !== null || k >= opts.length) return;
    setPicked(k);
    onAnswer?.(k === answer ? 'knew' : 'forgot');
  };
  const next = () => { if (picked !== null) onResult(ok ? 'knew' : 'forgot'); };
  useHotkeys({
    '1': () => pick(0), '2': () => pick(1), '3': () => pick(2), '4': () => pick(3),
    r: () => void playWord(w.i), s: () => void playWord(w.i, 0.7),
    Enter: next, Space: next,
  });

  const fb = feedbackText(w, ok);
  return (
    <div className="flex min-h-full w-full flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center gap-9 pb-10 pt-10">
        <span className="eyebrow">What did you hear?</span>
        <ListenCircle filled wordIdx={w.i} onPlay={() => void playWord(w.i)} />
        <div className="flex gap-2.5">
          <Button variant="chip" onClick={() => void playWord(w.i)}>Replay <KeyCap>R</KeyCap></Button>
          <Button variant="chip" onClick={() => void playWord(w.i, 0.7)}>Slower 0.7× <KeyCap>S</KeyCap></Button>
          {onSwitchToType && picked === null && <Button variant="chip" className="text-ink-2" onClick={onSwitchToType}>Type it instead</Button>}
        </div>
        <ChoiceGrid serif items={opts.map(o => <span lang="fr">{withArticle(words[o])}</span>)}
          states={choiceStates(opts.length, answer, picked)} onPick={pick} />
      </div>
      {picked !== null && (
        <FeedbackBar ok={ok} onContinue={next}
          title={ok ? fb.title : `Not quite — you heard ${withArticle(w)}`} sub={ok ? fb.sub : `${w.en} · You'll see it again in 4 cards.`} />
      )}
    </div>
  );
}
