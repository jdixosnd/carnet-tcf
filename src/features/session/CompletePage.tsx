import { useMemo } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useRun } from '../../store/useRun';
import { useCarnet } from '../../store/useCarnet';
import { useStudy } from '../study/useStudy';
import { withArticle } from '../../data/words';
import { dueOn, streak } from '../../lib/stats';
import { fmt } from '../../lib/format';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { shortMeaning } from './feedback';

const Stat = ({ v, label }: { v: string; label: string }) => (
  <div className="flex flex-col gap-1">
    <span className="tnum font-serif text-[40px] leading-none">{v}</span>
    <span className="text-[14px] text-ink-2">{label}</span>
  </div>
);

export function CompletePage() {
  const run = useRun(s => s.run);
  const words = useCarnet(s => s.words);
  const cards = useCarnet(s => s.cards);
  const hist = useCarnet(s => s.hist);
  const today = useCarnet(s => s.today);
  const navigate = useNavigate();
  const { learnMore, q } = useStudy();
  const missed = useMemo(() => [...new Set(run?.missed ?? [])], [run]);
  if (!run) return <Navigate to="/study" replace />;

  const answered = run.right + run.wrong;
  const script = !answered ? 'À bientôt !' : missed.length ? 'Bien joué !' : 'Parfait !';
  const head = answered ? `${fmt(run.right)} of ${fmt(answered)} remembered` : 'Session ended';
  const accuracy = answered ? `${Math.round((100 * run.right) / answered)}%` : '—';

  const back = () => { useRun.getState().end(); navigate('/study'); };
  const practise = () => { useRun.getState().start(missed, { practice: true }); navigate('/session'); };

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_440px] gap-12 overflow-auto px-24 py-[72px]">
      <div className="flex flex-col gap-8">
        <span className="font-script text-[28px] text-accent">{script}</span>
        <h2 className="m-0 font-serif text-[56px] font-normal leading-[1.05]">{head}</h2>
        <div className="flex gap-12 border-t border-line pt-7">
          <Stat v={accuracy} label="accuracy" />
          {run.practice ? (
            <p className="m-0 max-w-[320px] self-center text-[15px] text-ink-2">Practice round: your review schedule didn't change.</p>
          ) : (
            <>
              <Stat v={fmt(run.newSeen)} label="new words" />
              <Stat v={fmt(streak(hist, today))} label="day streak" />
              <Stat v={fmt(dueOn(cards, today + 1))} label="due tomorrow" />
            </>
          )}
        </div>
        <div className="mt-auto flex gap-3">
          <Button variant="primary" autoFocus onClick={back}>Back to study</Button>
          <Button variant="secondary" disabled={q.freshTotal === 0} onClick={learnMore}>Learn 10 more</Button>
        </div>
      </div>
      <Card className="flex min-h-0 flex-col gap-3.5 p-6">
        {missed.length ? (
          <>
            <span className="text-[17px] font-bold">{missed.length} to look at again</span>
            <div className="flex min-h-0 flex-col gap-3.5 overflow-auto">
              {missed.map(i => (
                <div key={i} className="flex items-baseline justify-between gap-3 border-b border-chrome pb-2.5">
                  <span lang="fr" className="font-serif text-[21px]">{withArticle(words[i])}</span>
                  <span className="text-right text-[14px] text-ink-2">{shortMeaning(words[i])}</span>
                </div>
              ))}
            </div>
            <Button variant="secondary" className="mt-auto py-3 text-[15px]" onClick={practise}>Practise these words</Button>
            <span className="text-center text-[12px] text-ink-3">Practice rounds don't change your schedule</span>
          </>
        ) : (
          <>
            <span className="text-[17px] font-bold">Nothing missed</span>
            <p className="m-0 text-[15px] leading-normal text-ink-2">{answered ? 'Every card was right the first time.' : 'You ended before answering any cards.'}</p>
          </>
        )}
      </Card>
    </div>
  );
}
