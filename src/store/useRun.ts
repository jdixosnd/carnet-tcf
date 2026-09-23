// The session in progress (not persisted: ratings are persisted as they happen).
import { create } from 'zustand';
import type { Rating } from '../data/types';
import { advance, createRun, recordResult, type Run } from '../lib/run';
import { isNewCard } from '../lib/srs';
import { useCarnet } from './useCarnet';

interface RunState {
  run: Run | null;
  start(indices: number[], o: { practice: boolean }): void;
  /** Records the current card's result: rates it (unless practice or a retry) and schedules a retry on Forgot. */
  result(r: Rating): void;
  next(): void;
  end(): void;
}

export const useRun = create<RunState>()((set, get) => ({
  run: null,
  start(indices, { practice }) {
    const c = useCarnet.getState();
    set({
      run: createRun(indices, {
        practice, game: c.settings.game, mcDirection: c.settings.mcDirection,
        isNew: i => isNewCard(c.cards[c.words[i].key]),
      }),
    });
  },
  result(r) {
    const run = get().run;
    const item = run?.items[run.pos];
    if (!run || !item) return;
    if (!run.practice && !item.retry) useCarnet.getState().rate(item.i, r);
    set({ run: recordResult(run, r) });
  },
  next() {
    const run = get().run;
    if (run) set({ run: advance(run) });
  },
  end() { set({ run: null }); },
}));
