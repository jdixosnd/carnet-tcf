import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { BookOpen, ChartColumn, List, Search, Settings } from 'lucide-react';
import { useCarnet } from '../store/useCarnet';
import { streak } from '../lib/stats';
import { buildQueue } from '../lib/session';
import { plural } from '../lib/format';
import { Tooltip } from '../components/Tooltip';
import { cn } from '../lib/cn';
import { APP_VERSION } from '../data/defaults';

/** Order matters: Ctrl+1…5 follow it. */
export const NAV = [
  { to: '/study', label: 'Study', Icon: BookOpen },
  { to: '/words', label: 'Words', Icon: List },
  { to: '/search', label: 'Search', Icon: Search },
  { to: '/progress', label: 'Progress', Icon: ChartColumn },
  { to: '/settings', label: 'Settings', Icon: Settings },
];

function useNarrow(): boolean {
  const q = '(max-width: 1099px)';
  const [narrow, set] = useState(() => typeof matchMedia !== 'undefined' && matchMedia(q).matches);
  useEffect(() => {
    if (typeof matchMedia === 'undefined') return;
    const mq = matchMedia(q);
    const on = () => set(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return narrow;
}

export function Sidebar() {
  const narrow = useNarrow();
  const { pathname } = useLocation();
  const s = useCarnet();
  const days = streak(s.hist, s.today);
  const due = buildQueue(s.words, s, s.today).dueTotal;
  return (
    <aside className={cn('flex shrink-0 flex-col border-r border-line bg-chrome pb-5 pt-7', narrow ? 'w-[72px] px-3' : 'w-[232px] px-4')}>
      <div className={cn('flex items-baseline gap-2 pb-7', narrow ? 'justify-center px-0' : 'px-2.5')}>
        <span className="font-script text-[22px] leading-[47px] text-ink">{narrow ? 'C' : 'Carnet'}</span>
        {!narrow && <span className="text-[11px] font-bold tracking-[0.14em] text-accent">TCF</span>}
      </div>
      <nav className="flex flex-col gap-0.5" aria-label="Main">
        {NAV.map(({ to, label, Icon }) => {
          const link = (
            <NavLink key={to} to={to} aria-label={narrow ? label : undefined}
              // A string className: Radix Slot (tooltip trigger) can't merge NavLink's function form.
              className={cn(
                'press flex items-center gap-3 rounded-[8px] px-3 py-2.5 text-[15px] leading-[18px] no-underline',
                narrow && 'justify-center',
                pathname.startsWith(to) ? 'bg-surface font-bold text-ink shadow-nav' : 'text-ink-2 hover:bg-hover',
              )}>
              {narrow ? <Icon size={20} strokeWidth={1.75} /> : label}
            </NavLink>
          );
          return narrow ? <Tooltip key={to} content={label}>{link}</Tooltip> : link;
        })}
      </nav>
      <div className={cn('mt-auto flex flex-col gap-3.5', narrow ? 'items-center px-0 text-center' : 'px-2.5')}>
        <div className="flex flex-col gap-1">
          <span className="font-serif text-[28px] leading-none" title={narrow ? `${days} day streak` : undefined}>
            {days}{!narrow && <span className="font-sans text-[15px] text-ink-2"> day streak</span>}
          </span>
          {!narrow && <span className="text-[12px] text-ink-3">{plural(due, 'review')} due today</span>}
        </div>
        {!narrow && <div className="border-t border-line pt-3 text-[11px] text-ink-4">v{APP_VERSION} · Saved on this PC</div>}
      </div>
    </aside>
  );
}
