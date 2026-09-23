import { Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Word } from '../../data/types';
import { withArticle } from '../../data/words';
import { GENDER_NAME, POS_NAME } from '../../data/defaults';
import { useCarnet } from '../../store/useCarnet';
import { useRun } from '../../store/useRun';
import { cardStatus, intervalLabel, isNewCard } from '../../lib/srs';
import { fmt, plural } from '../../lib/format';
import { playSentence, playWord } from '../../lib/audio/player';
import { PlayButton } from '../../components/PlayButton';
import { Button } from '../../components/Button';
import { Example } from '../../components/Example';

const STATUS = { new: 'Not started', learning: 'Learning', familiar: 'Familiar', mastered: 'Mastered' } as const;

const Tile = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col gap-0.5 rounded-[10px] border border-line bg-surface px-4 py-3.5">
    <span className="text-[12px] text-ink-3">{label}</span>
    <span className="text-[18px] font-bold">{value}</span>
  </div>
);

export function WordDetail({ w }: { w: Word }) {
  const card = useCarnet(s => s.cards[w.key]);
  const today = useCarnet(s => s.today);
  const inExtra = useCarnet(s => s.extraToday[w.key] === s.today);
  const navigate = useNavigate();
  const st = cardStatus(card);
  const due = !isNewCard(card) && card.d <= today;
  const status = st === 'new' ? STATUS.new : `${STATUS[st]} · ${due ? 'due today' : intervalLabel(card!.d - today)}`;
  const g = w.pos === 'n' && w.g ? `, ${GENDER_NAME[w.g]}` : '';

  return (
    <div className="flex min-h-full flex-col gap-6 px-11 py-9">
      <div className="flex flex-col gap-2">
        <span className="eyebrow text-accent!">{w.lvl} · {POS_NAME[w.pos]}{g} · rank {fmt(w.i + 1)}</span>
        <div className="flex items-center gap-4">
          <h2 lang="fr" className="m-0 font-serif text-[64px] font-normal leading-none">{withArticle(w)}</h2>
          <PlayButton audioKey={`w${w.i}`} label="Hear the word" onPlay={() => void playWord(w.i)} size={36} />
        </div>
        <span className="text-[22px]">{w.en}</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Tile label="Heard" value={plural(w.n, 'time')} />
        <Tile label="In tests" value={`${w.tests.length} of 40`} />
        <Tile label="Your status" value={status} />
      </div>
      {w.allForms.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="eyebrow">Forms heard</span>
          <span lang="fr" className="text-[17px] leading-[1.6]">{w.allForms.join(' · ')}</span>
        </div>
      )}
      {w.ex.length > 0 && (
        <div className="flex flex-col gap-3.5">
          <span className="eyebrow">Examples</span>
          {w.ex.map((ex, k) => (
            <div key={k} className="flex flex-col gap-1">
              <Example ex={ex} className="text-[21px] leading-[1.35]" />
              <span className="flex items-center gap-1.5 text-[13px] text-ink-3">
                {k === 0 && (
                  <button type="button" aria-label="Play sentence" onClick={() => void playSentence(w.i)} className="press hover:text-accent">
                    <Play size={12} strokeWidth={1.75} fill="currentColor" />
                  </button>
                )}
                Test {ex[2]} · Question {ex[3]}
              </span>
            </div>
          ))}
        </div>
      )}
      <div className="mt-auto flex gap-3 pt-2">
        <Button variant="primary" className="px-5 py-3 text-[15px]"
          onClick={() => { useRun.getState().start([w.i], { practice: true }); navigate('/session'); }}>Practise now</Button>
        <Button variant="secondary" className="px-[18px] py-[11px] text-[15px]" disabled={inExtra || due}
          onClick={() => useCarnet.getState().addToToday(w.i)}>
          {inExtra || due ? "In today's reviews ✓" : "Add to today's reviews"}
        </Button>
      </div>
    </div>
  );
}
