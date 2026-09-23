import { useRun } from './useRun';
import { useCarnet } from './useCarnet';
import { memoryRepo } from '../repo/memoryRepo';
import { synthWords } from '../test/fixtures';

const words = synthWords();
const audio = { w: { files: [], start: [], len: [] }, s: { files: [], start: [], len: [] }, ws: [] };

beforeEach(async () => { await useCarnet.getState().init({ repo: memoryRepo(null), words, audio }); });

test('a normal run rates cards; a retry does not rate again', () => {
  useRun.getState().start([0, 1], { practice: false });
  useRun.getState().result('forgot');
  useRun.getState().next();
  useRun.getState().result('knew');
  useRun.getState().next();
  expect(useRun.getState().run!.items.map(x => x.i)).toEqual([0, 1, 0]);
  useRun.getState().result('knew');
  const t = useCarnet.getState().today;
  expect(useCarnet.getState().hist[t]).toEqual({ rev: 2, ok: 1, nw: 2 });
  expect(useCarnet.getState().cards.w0.b).toBe(1);
});

test('a practice run never touches cards or history', () => {
  useRun.getState().start([0, 1], { practice: true });
  useRun.getState().result('knew');
  useRun.getState().next();
  useRun.getState().result('forgot');
  expect(useCarnet.getState().cards).toEqual({});
  expect(useCarnet.getState().hist).toEqual({});
  expect(useRun.getState().run!.missed).toEqual([1]);
});

test('the game and direction come from settings', () => {
  useCarnet.getState().setSetting('game', 'mc');
  useCarnet.getState().setSetting('mcDirection', 'en-fr');
  useRun.getState().start([3], { practice: false });
  expect(useRun.getState().run!.items[0]).toMatchObject({ game: 'mc', dir: 'en-fr' });
});
