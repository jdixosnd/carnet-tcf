import { useMemo, useState } from 'react';
import type { Direction, Rating, Word } from '../../data/types';
import { withArticle } from '../../data/words';
import { useCarnet } from '../../store/useCarnet';
import { maskGloss, options as makeOptions } from '../../lib/distractors';
import { playWord } from '../../lib/audio/player';
import { useHotkeys } from '../../app/useHotkeys';
import { PlayButton } from '../../components/PlayButton';
import { ChoiceGrid, choiceStates } from './ChoiceGrid';
import { FeedbackBar } from './FeedbackBar';
import { feedbackText } from './feedback';
import { levelPos } from './wordMeta';

export function MultipleChoice({ word: w, dir = 'fr-en', onResult }: {
  word: Word; dir?: Direction; practice: boolean; retry: boolean; onResult(r: Rating): void;
}) {
  const words = useCarnet(s => s.words);
  const dix = useCarnet(s => s.dix)!;
  const opts = useMemo(() => makeOptions(words, dix, w.i, dir === 'fr-en' ? 'en' : 'fr'), [words, dix, w.i, dir]);
  const [picked, setPicked] = useState<number | null>(null);
  const answer = opts.indexOf(w.i);
  const ok = picked === answer;

  const pick = (k: number) => {
    if (picked !== null || k >= opts.length) return;
    setPicked(k);
    void playWord(w.i);
  };
  const next = () => { if (picked !== null) onResult(ok ? 'knew' : 'forgot'); };
  useHotkeys({
    '1': () => pick(0), '2': () => pick(1), '3': () => pick(2), '4': () => pick(3),
    Enter: next, Space: next,
  });

  const gloss = maskGloss(w);
  const fb = feedbackText(w, ok);
  return (
    <div className="flex min-h-full w-full flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center gap-9 pb-10 pt-10">
        <div className="flex flex-col items-center gap-2.5">
          <span className="eyebrow">{dir === 'fr-en' ? 'French → English' : 'English → French'} · {levelPos(w)}</span>
          {dir === 'fr-en' ? (
            <div className="flex items-center gap-4">
              <span lang="fr" className="font-serif text-[72px] leading-none">{withArticle(w)}</span>
              <PlayButton audioKey={`w${w.i}`} label="Hear the word" onPlay={() => void playWord(w.i)} size={34} />
            </div>
          ) : (
            <span className={`max-w-[780px] text-center leading-[1.25] ${gloss.length <= 40 ? 'text-[32px]' : 'text-[24px]'}`}>{gloss}</span>
          )}
        </div>
        <ChoiceGrid
          serif={dir === 'en-fr'}
          items={opts.map(o => (dir === 'fr-en' ? maskGloss(words[o]) : <span lang="fr">{withArticle(words[o])}</span>))}
          states={choiceStates(opts.length, answer, picked)}
          onPick={pick}
        />
      </div>
      {picked !== null && <FeedbackBar ok={ok} title={fb.title} sub={fb.sub} onContinue={next} />}
    </div>
  );
}
