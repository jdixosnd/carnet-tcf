import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCarnet } from '../../store/useCarnet';
import { LEVELS, type Level } from '../../data/types';
import { Switch } from '../../components/Switch';
import { Button } from '../../components/Button';
import { ImportDialog } from '../settings/ImportDialog';
import { fmt } from '../../lib/format';
import { TOTAL_WORDS } from '../../data/defaults';
import { cn } from '../../lib/cn';

const PACES = [{ n: 10, label: 'Relaxed' }, { n: 15, label: 'Steady' }, { n: 25, label: 'Exam soon' }];

export function WelcomePage() {
  const navigate = useNavigate();
  const [pace, setPace] = useState(15);
  const [level, setLevel] = useState<Level>('A1');
  const [remind, setRemind] = useState(true);
  const [time, setTime] = useState('19:00');
  const [importOpen, setImportOpen] = useState(false);

  const start = () => {
    const { setSetting } = useCarnet.getState();
    const from = LEVELS.indexOf(level);
    setSetting('newPerDay', pace);
    setSetting('levels', from === 0 ? [] : LEVELS.slice(from));
    setSetting('reminderEnabled', remind);
    setSetting('reminderTime', time);
    setSetting('onboarded', true);
    navigate('/study', { replace: true });
  };

  return (
    <div className="grid min-h-0 flex-1 grid-cols-2">
      <div className="flex flex-col gap-6 bg-hero px-16 py-[72px] text-hero-ink">
        <span className="font-script text-[40px]">Carnet</span>
        <h2 className="m-0 font-serif text-[52px] font-normal leading-[1.08] [text-wrap:pretty]">Every word you'll hear in the TCF listening test.</h2>
        <p className="m-0 max-w-[440px] text-[18px] leading-normal text-hero-body">
          {fmt(TOTAL_WORDS)} words from 40 practice tests, each with its meaning, a real sentence and a recording. Works offline.
        </p>
      </div>
      <div className="flex min-h-0 flex-col gap-8 overflow-auto px-16 py-[72px]">
        <div className="flex flex-col gap-3">
          <span id="pace-label" className="text-[17px] font-bold">New words per day</span>
          <div role="radiogroup" aria-labelledby="pace-label" className="grid grid-cols-3 gap-2.5">
            {PACES.map(p => {
              const on = pace === p.n;
              return (
                <button key={p.n} type="button" role="radio" aria-checked={on} aria-label={`${p.n} ${p.label}`} onClick={() => setPace(p.n)}
                  className={cn('press flex flex-col gap-0.5 rounded-[12px] text-left',
                    on ? 'border-2 border-accent bg-accent-soft p-[15px]' : 'border border-line-strong p-4 hover:bg-hover')}>
                  <span className="font-serif text-[30px] leading-tight">{p.n}</span>
                  <span className={cn('text-[13px]', on ? 'text-accent-strong' : 'text-ink-2')}>{p.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <span id="level-label" className="text-[17px] font-bold">Start from level</span>
          <div role="radiogroup" aria-labelledby="level-label" className="flex flex-wrap gap-2">
            {LEVELS.map(l => {
              const on = level === l;
              return (
                <button key={l} type="button" role="radio" aria-checked={on} onClick={() => setLevel(l)}
                  className={cn('press rounded-full px-3.5 py-2 text-[15px]',
                    on ? 'border border-accent bg-accent font-bold text-on-accent' : 'border border-line-strong hover:bg-hover')}>{l}</button>
              );
            })}
          </div>
        </div>
        <div className="flex items-center justify-between pb-1">
          <label htmlFor="welcome-remind" className="text-[16px]">Remind me every day</label>
          <div className="flex items-center gap-3">
            <input type="time" value={time} disabled={!remind} aria-label="Reminder time" onChange={e => e.target.value && setTime(e.target.value)}
              className="tnum bg-transparent text-[15px] text-ink-2 outline-none disabled:opacity-50 [&::-webkit-calendar-picker-indicator]:hidden" />
            <Switch id="welcome-remind" label="Remind me every day" checked={remind} onCheckedChange={setRemind} />
          </div>
        </div>
        <div className="mt-auto flex flex-col gap-3.5">
          <Button variant="primary" className="w-full p-4 text-[17px]" onClick={start}>Start learning</Button>
          <Button variant="link" className="text-center" onClick={() => setImportOpen(true)}>Already use Carnet online? Import a backup code</Button>
        </div>
      </div>
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} onDone={() => navigate('/study', { replace: true })} />
    </div>
  );
}
