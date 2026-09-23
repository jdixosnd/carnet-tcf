import { norm, soundKey, shuffle } from './text';

test('norm folds accents, case, curly apostrophes and spaces', () => {
  expect(norm('  Réveil’s  Été ')).toBe("reveil's ete");
});

test.each([
  ['cour', 'cours'],
  ['parler', 'parlez'],
  ['parler', 'parlé'],
  ['vert', 'verre'],
])('soundKey(%s) === soundKey(%s)', (a, b) => expect(soundKey(a)).toBe(soundKey(b)));

test('soundKey differs for different words', () => {
  expect(soundKey('chat')).not.toBe(soundKey('chien'));
});

test('shuffle with a fixed rng is deterministic and keeps elements', () => {
  const a = shuffle([1, 2, 3, 4], () => 0);
  expect(a.slice().sort()).toEqual([1, 2, 3, 4]);
  expect(shuffle([1, 2, 3, 4], () => 0)).toEqual(a);
});
