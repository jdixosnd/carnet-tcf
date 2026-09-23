import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useRun } from '../../store/useRun';
import { useCarnet } from '../../store/useCarnet';
import { isDone } from '../../lib/run';
import { prefetch, stopAudio } from '../../lib/audio/player';
import { useHotkeys } from '../../app/useHotkeys';
import { Dialog } from '../../components/Dialog';
import { Button } from '../../components/Button';
import type { Rating } from '../../data/types';
import { TopBar } from './TopBar';
import { FlipCard } from './FlipCard';
import { MultipleChoice } from './MultipleChoice';
import { ListenChoose } from './ListenChoose';
import { ListenType } from './ListenType';

export function SessionPage() {
  const run = useRun(s => s.run);
  const words = useCarnet(s => s.words);
  const cards = useCarnet(s => s.cards);
  const listenMode = useCarnet(s => s.settings.listenMode);
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(false);
  const [typeInstead, setTypeInstead] = useState<number | null>(null);

  const finished = !!run && isDone(run);
  useEffect(() => { if (finished) { stopAudio(); navigate('/complete', { replace: true }); } }, [finished, navigate]);
  useEffect(() => {
    if (run && !finished) prefetch(run.items.slice(run.pos, run.pos + 4).map(x => x.i));
  }, [run, finished]);
  useEffect(() => () => stopAudio(), []);

  const end = () => {
    if (!run) return;
    if (run.pos < run.items.length / 2) setConfirm(true);
    else { stopAudio(); navigate('/complete'); }
  };
  useHotkeys({ Escape: () => { if (!confirm) end(); } });

  if (!run) return <Navigate to="/study" replace />;
  const item = run.items[run.pos];
  if (!item) return null;
  const w = words[item.i];
  const onResult = (r: Rating) => {
    useRun.getState().result(r);
    useRun.getState().next();
    setTypeInstead(null);
  };
  const common = { word: w, practice: run.practice, retry: item.retry, onResult };
  const key = `${run.pos}-${item.i}`;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TopBar pos={run.pos} total={run.items.length} onEnd={end} />
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center-safe overflow-auto">
        {item.game === 'flip' && <FlipCard key={key} {...common} card={cards[w.key]} />}
        {item.game === 'mc' && <MultipleChoice key={key} {...common} dir={item.dir} />}
        {item.game === 'listen' && (listenMode === 'type' || typeInstead === run.pos
          ? <ListenType key={key + 't'} {...common} />
          : <ListenChoose key={key} {...common} onSwitchToType={() => setTypeInstead(run.pos)} />)}
      </div>
      <Dialog open={confirm} onOpenChange={setConfirm} title="End this session?">
        <p className="m-0 text-[15px] leading-normal text-ink-2">Your answers so far are saved. Cards you haven't seen stay in today's reviews.</p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setConfirm(false)}>Keep going</Button>
          <Button variant="dark" onClick={() => { setConfirm(false); stopAudio(); navigate('/complete'); }}>End session</Button>
        </div>
      </Dialog>
    </div>
  );
}
