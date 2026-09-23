import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCarnet } from '../../store/useCarnet';
import { useRun } from '../../store/useRun';
import { buildQueue } from '../../lib/session';

/** Today's queue for the current filters, plus the actions that start sessions. */
export function useStudy() {
  const words = useCarnet(s => s.words);
  const cards = useCarnet(s => s.cards);
  const hist = useCarnet(s => s.hist);
  const settings = useCarnet(s => s.settings);
  const extraToday = useCarnet(s => s.extraToday);
  const today = useCarnet(s => s.today);
  const navigate = useNavigate();
  const q = useMemo(() => buildQueue(words, { cards, hist, settings, extraToday }, today), [words, cards, hist, settings, extraToday, today]);

  const startSession = () => {
    if (!q.queue.length) return;
    useRun.getState().start(q.queue, { practice: false });
    navigate('/session');
  };
  const learnMore = () => {
    const c = useCarnet.getState();
    c.learnMore();
    const s = useCarnet.getState();
    const next = buildQueue(s.words, s, s.today);
    if (!next.queue.length) return;
    useRun.getState().start(next.queue, { practice: false });
    navigate('/session');
  };
  return { q, startSession, learnMore };
}
