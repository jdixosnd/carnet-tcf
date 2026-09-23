import { useMemo } from 'react';
import { useCarnet } from '../../store/useCarnet';
import { useStudy } from './useStudy';
import { Card, Eyebrow } from '../../components/Card';
import { Button } from '../../components/Button';
import { Pill } from '../../components/Pill';
import { Segmented } from '../../components/Segmented';
import { TestsPopover } from './TestsPopover';
import { longDate, shortDate } from '../../lib/day';
import { fmt, plural } from '../../lib/format';
import { newAllowance, nextDueDay } from '../../lib/session';
import { statusCounts } from '../../lib/stats';
import { LEVELS, type Level } from '../../data/types';
import { TOTAL_WORDS } from '../../data/defaults';

const Stat = ({ n, label }: { n: number; label: string }) => (
  <div className="flex flex-col gap-1">
    <span className="tnum font-serif text-[48px] leading-none">{fmt(n)}</span>
    <span className="text-[14px] text-ink-2">{label}</span>
  </div>
);

export function StudyPage() {
  const { q, startSession, learnMore } = useStudy();
  const s = useCarnet();
  const { settings, setSetting } = s;
  const newWords = Math.min(newAllowance(settings, s.hist, s.today), q.freshTotal);
  const nextDue = useMemo(() => (q.queue.length ? null : nextDueDay(s.words, s, s.today)), [q.queue.length, s]);
  const counts = useMemo(() => statusCounts(s.words, s.cards), [s.words, s.cards]);
  const started = counts.total - counts.new;
  const noMatch = q.matching === 0;
  const allDone = !noMatch && !q.queue.length;

  const toggleLevel = (l: Level) => {
    const cur = settings.levels;
    const next = cur.includes(l) ? cur.filter(x => x !== l) : [...cur, l].sort();
    setSetting('levels', next.length === LEVELS.length ? [] : next);
  };

  const title = noMatch ? 'No words match these filters' : allDone ? 'All done for today' : `${plural(q.queue.length, 'card')} waiting today`;

  return (
    <div className="flex flex-col gap-7 px-12 py-10">
      <div className="flex flex-col gap-1.5">
        <span className="text-[14px] text-ink-3">{longDate()}</span>
        <h2 className="m-0 font-serif text-[44px] font-normal leading-[1.1]">{title}</h2>
      </div>

      <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-6">
        <Card className="flex flex-col gap-6 p-7">
          <div className="flex gap-10">
            <Stat n={q.dueTotal} label={q.dueTotal === 1 ? 'review due' : 'reviews due'} />
            <Stat n={newWords} label={newWords === 1 ? 'new word' : 'new words'} />
          </div>
          <div className="flex flex-col gap-2.5">
            <Eyebrow>Game</Eyebrow>
            <Segmented label="Game" value={settings.game} onChange={v => setSetting('game', v)} options={[
              { value: 'flip', label: 'Flip cards' }, { value: 'mc', label: 'Multiple choice' },
              { value: 'listen', label: 'Listening' }, { value: 'mix', label: 'Mix' },
            ]} />
            {settings.game === 'mc' && (
              <div className="flex items-center gap-3">
                <span className="w-[76px] text-[13px] text-ink-3">Direction</span>
                <Segmented size="sm" label="Direction" value={settings.mcDirection} onChange={v => setSetting('mcDirection', v)} options={[
                  { value: 'fr-en', label: 'FR → EN' }, { value: 'en-fr', label: 'EN → FR' }, { value: 'both', label: 'Both' },
                ]} />
              </div>
            )}
            {settings.game === 'listen' && (
              <div className="flex items-center gap-3">
                <span className="w-[76px] text-[13px] text-ink-3">Listening</span>
                <Segmented size="sm" label="Listening answers" value={settings.listenMode} onChange={v => setSetting('listenMode', v)} options={[
                  { value: 'choose', label: 'Choose' }, { value: 'type', label: 'Type' },
                ]} />
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {!allDone && (
              <Button variant="primary" disabled={noMatch} onClick={startSession}>
                Start session · {plural(q.queue.length, 'card')}
              </Button>
            )}
            <Button variant={allDone ? 'primary' : 'secondary'} disabled={noMatch || q.freshTotal === 0} onClick={learnMore}>Learn 10 more</Button>
            {noMatch && <span className="text-[14px] text-ink-3">Pick more levels or tests to start.</span>}
            {allDone && (
              <span className="text-[14px] text-ink-2">
                {nextDue !== null ? `Next review: ${shortDate(nextDue)}.` : 'Nothing is scheduled yet.'}
                {q.freshTotal === 0 ? ' Every word in these filters is started.' : ''}
              </span>
            )}
          </div>
        </Card>

        <Card className="flex flex-col gap-5 p-6">
          <div className="flex flex-col gap-2.5">
            <Eyebrow>Levels</Eyebrow>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Levels">
              {LEVELS.map(l => <Pill key={l} on={settings.levels.includes(l)} onClick={() => toggleLevel(l)}>{l}</Pill>)}
            </div>
          </div>
          <div className="flex flex-col gap-2.5">
            <Eyebrow>Tests</Eyebrow>
            <TestsPopover tests={settings.tests} onChange={t => setSetting('tests', t)} />
          </div>
          <span className="text-[13px] text-ink-3" data-testid="match-count">
            {fmt(q.matching)} of {fmt(TOTAL_WORDS)} words match these filters
          </span>
        </Card>
      </div>

      <Card className="flex flex-col gap-3.5 px-7 py-6">
        <div className="flex items-baseline justify-between">
          <span className="text-[17px] font-bold">Your notebook</span>
          <span className="text-[14px] text-ink-2">{fmt(started)} of {fmt(counts.total)} words started</span>
        </div>
        <StackBar counts={counts} height={14} />
        <div className="flex flex-wrap gap-7 text-[14px] text-ink-2">
          <Legend color="bg-ink" label={`Mastered ${fmt(counts.mastered)}`} />
          <Legend color="bg-accent" label={`Familiar ${fmt(counts.familiar)}`} />
          <Legend color="bg-accent-light" label={`Learning ${fmt(counts.learning)}`} />
          <Legend color="bg-track border border-line-strong" label={`New ${fmt(counts.new)}`} />
        </div>
      </Card>
    </div>
  );
}

export function StackBar({ counts, height }: { counts: { mastered: number; familiar: number; learning: number; total: number }; height: number }) {
  const pct = (n: number) => `${counts.total ? (100 * n) / counts.total : 0}%`;
  return (
    <div className="flex overflow-hidden bg-track" style={{ height, borderRadius: height / 2 }}
      role="img" aria-label={`${counts.mastered} mastered, ${counts.familiar} familiar, ${counts.learning} learning of ${counts.total}`}>
      <div className="bg-ink" style={{ width: pct(counts.mastered) }} />
      <div className="bg-accent" style={{ width: pct(counts.familiar) }} />
      <div className="bg-accent-light" style={{ width: pct(counts.learning) }} />
    </div>
  );
}

const Legend = ({ color, label }: { color: string; label: string }) => (
  <span className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-[2px] ${color}`} />{label}</span>
);
