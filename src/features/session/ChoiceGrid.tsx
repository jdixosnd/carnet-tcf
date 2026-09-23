import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export type ChoiceState = 'idle' | 'correct' | 'wrong' | 'dim';

/** 2 × 380 px answer grid with 1–4 key caps. */
export function ChoiceGrid({ items, states, onPick, serif }: {
  items: ReactNode[]; states: ChoiceState[]; onPick(k: number): void; serif?: boolean;
}) {
  const answered = states.some(s => s === 'correct' || s === 'wrong');
  return (
    <div role="group" aria-label="Answers" className="grid grid-cols-[repeat(2,380px)] gap-3.5">
      {items.map((label, k) => {
        const st = states[k];
        return (
          <button key={k} type="button" data-state={st} disabled={answered} onClick={() => onPick(k)}
            className={cn(
              'press flex items-center gap-4 rounded-[12px] p-5 text-left disabled:cursor-default',
              serif ? 'font-serif text-[26px] leading-[1.15]' : 'text-[19px] leading-[1.3]',
              st === 'correct' && 'border-2 border-knew-solid bg-knew-bg font-bold text-knew-text',
              st === 'wrong' && 'border-2 border-forgot-solid bg-forgot-bg text-forgot-text',
              (st === 'idle' || st === 'dim') && 'border border-line-strong bg-surface text-ink-2',
              st === 'idle' && 'hover:border-accent hover:text-ink',
              st === 'dim' && 'opacity-70',
              serif && st !== 'correct' && st !== 'wrong' && 'text-ink',
            )}>
            <span className={cn('shrink-0 rounded-[5px] border px-2 py-0.5 font-sans text-[13px] font-normal',
              st === 'correct' ? 'border-knew-solid' : st === 'wrong' ? 'border-forgot-solid' : 'border-line-strong')}>{k + 1}</span>
            <span className="min-w-0">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function choiceStates(n: number, answer: number, picked: number | null): ChoiceState[] {
  return Array.from({ length: n }, (_, k) => {
    if (picked === null) return 'idle';
    if (k === answer) return 'correct';
    if (k === picked) return 'wrong';
    return 'dim';
  });
}
