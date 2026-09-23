import { createRun, recordResult, advance, isDone } from './run';

const base = { practice: false, game: 'flip' as const, mcDirection: 'fr-en' as const, isNew: () => false };

test('forgot re-inserts a retry 4 later and counts once', () => {
  let r = createRun([0, 1, 2, 3, 4, 5], base);
  r = recordResult(r, 'forgot');
  expect(r.items.map(x => x.i)).toEqual([0, 1, 2, 3, 0, 4, 5]);
  expect(r.items[4].retry).toBe(true);
  expect(r.wrong).toBe(1);
  expect(r.missed).toEqual([0]);
  r = advance(advance(advance(advance(r))));
  r = recordResult(r, 'forgot');
  expect(r.wrong).toBe(1);
  expect(r.items).toHaveLength(8);
});

test('retry near the end appends', () => {
  let r = createRun([0, 1], base);
  r = advance(r);
  r = recordResult(r, 'forgot');
  expect(r.items.map(x => x.i)).toEqual([0, 1, 1]);
});

test('right answers and new words are counted', () => {
  let r = createRun([0, 1, 2], { ...base, isNew: i => i !== 1 });
  r = recordResult(r, 'knew'); r = advance(r);
  r = recordResult(r, 'hard'); r = advance(r);
  r = recordResult(r, 'forgot'); r = advance(r);
  expect([r.right, r.wrong, r.newSeen]).toEqual([2, 1, 2]);
  expect(isDone(r)).toBe(false);
  r = advance(r);
  expect(isDone(r)).toBe(true);
});

test('mix and both use rng', () => {
  const r = createRun([0, 1, 2], { ...base, game: 'mix', mcDirection: 'both', isNew: i => i === 0, rng: () => 0.99 });
  expect(r.items.map(x => x.game)).toEqual(['listen', 'listen', 'listen']);
  expect(r.items.map(x => x.dir)).toEqual(['fr-en', 'en-fr', 'en-fr']);
});
