import { useMemo } from 'react';
import { useCarnet } from '../../store/useCarnet';
import { byLevel, lastDays, statusCounts, totals } from '../../lib/stats';
import { fmt } from '../../lib/format';
import { shortDate, weekdayDate } from '../../lib/day';
import { LEVELS } from '../../data/types';
import { Card } from '../../components/Card';
import { Tooltip } from '../../components/Tooltip';
import { StackBar } from '../study/StudyPage';

const Tile = ({ n, label }: { n: number; label: string }) => (
  <div className="flex flex-col gap-1 rounded-[12px] border border-line bg-surface px-5 py-[18px]">
    <span className="tnum font-serif text-[40px] leading-none">{fmt(n)}</span>
    <span className="text-[14px] text-ink-2">{label}</span>
  </div>
);

export function ProgressPage() {
  const words = useCarnet(s => s.words);
  const cards = useCarnet(s => s.cards);
  const hist = useCarnet(s => s.hist);
  const today = useCarnet(s => s.today);
  const all = useMemo(() => statusCounts(words, cards), [words, cards]);
  const lv = useMemo(() => byLevel(words, cards), [words, cards]);
  const days = useMemo(() => lastDays(hist, today), [hist, today]);
  const t14 = useMemo(() => totals(Object.fromEntries(days.map(d => [d.day, d]))), [days]);
  const max = Math.max(10, ...days.map(d => d.rev));

  return (
    <div className="flex h-full min-h-[640px] flex-col gap-6 px-12 py-10">
      <h2 className="m-0 font-serif text-[44px] font-normal leading-[1.1]">Progress</h2>
      <div className="grid grid-cols-4 gap-3.5">
        <Tile n={all.mastered} label="Mastered · box 5+" />
        <Tile n={all.familiar} label="Familiar · box 3–4" />
        <Tile n={all.learning} label="Learning · box 1–2" />
        <Tile n={all.new} label="Not started" />
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-5">
        <Card className="flex flex-col gap-3.5 px-6 py-[22px]">
          <span className="text-[17px] font-bold">By level</span>
          {LEVELS.map(l => {
            const c = lv[l];
            return (
              <div key={l} className="grid grid-cols-[32px_minmax(0,1fr)_88px] items-center gap-3">
                <span className="text-[14px] font-bold">{l}</span>
                <StackBar counts={c} height={12} />
                <span className="tnum text-right text-[13px] text-ink-2">{fmt(c.total - c.new)} / {fmt(c.total)}</span>
              </div>
            );
          })}
          <p className="m-0 mt-auto text-[13px] leading-normal text-ink-3">
            A word's level is the easiest TCF question it appears in.
          </p>
        </Card>
        <Card className="flex min-h-0 flex-col gap-3.5 px-6 py-[22px]">
          <div className="flex items-baseline justify-between">
            <span className="text-[17px] font-bold">Last 14 days</span>
            <span className="text-[13px] text-ink-2">
              {fmt(t14.reviews)} reviews{t14.pct !== null && ` · ${t14.pct}% remembered`}
            </span>
          </div>
          <div className="flex min-h-[120px] flex-1 items-end gap-2 border-b border-line" role="img"
            aria-label={`Reviews per day for the last 14 days: ${days.map(d => d.rev).join(', ')}`}>
            {days.map(d => {
              const old = Math.max(0, d.rev - d.nw);
              return (
                <Tooltip key={d.day} side="top" content={
                  <span>{d.day === today ? 'Today' : weekdayDate(d.day)} · {d.rev} reviewed · {d.ok} remembered · {d.nw} new</span>
                }>
                  <div className="flex h-full flex-1 flex-col justify-end" tabIndex={0} aria-label={`${shortDate(d.day)}: ${d.rev} reviewed`}>
                    {d.rev === 0 ? <div className="h-0.5 rounded-full bg-track" /> : (
                      <>
                        <div className="rounded-t-[3px] bg-accent-light" style={{ height: `${(100 * d.nw) / max}%` }} />
                        <div className={d.nw ? 'rounded-b-[2px] bg-accent' : 'rounded-[3px] rounded-b-[2px] bg-accent'} style={{ height: `${(100 * old) / max}%` }} />
                      </>
                    )}
                  </div>
                </Tooltip>
              );
            })}
          </div>
          <div className="flex justify-between text-[12px] text-ink-3">
            <span>{shortDate(days[0].day)}</span>
            <span>{shortDate(days[7].day)}</span>
            <span>Today</span>
          </div>
          <div className="flex gap-5 text-[13px] text-ink-2">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[2px] bg-accent" />Reviewed</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[2px] bg-accent-light" />New</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
