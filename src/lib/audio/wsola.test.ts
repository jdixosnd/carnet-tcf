import { stretchPCM } from './wsola';

const SR = 22050;
const sine = (hz: number, secs: number) => Float32Array.from({ length: SR * secs }, (_, n) => Math.sin((2 * Math.PI * hz * n) / SR));
const crossingsPerSec = (x: Float32Array) => {
  let c = 0;
  for (let n = 1; n < x.length; n++) if ((x[n - 1] < 0) !== (x[n] < 0)) c++;
  return c / (x.length / SR);
};

test('0.7× makes it longer and keeps the pitch', () => {
  const x = sine(440, 1);
  const y = stretchPCM(x, SR, 0.7);
  expect(Math.abs(y.length - SR / 0.7) / (SR / 0.7)).toBeLessThan(0.03);
  expect(Math.abs(crossingsPerSec(y) - crossingsPerSec(x)) / crossingsPerSec(x)).toBeLessThan(0.03);
});

test('1.2× makes it shorter', () => {
  const y = stretchPCM(sine(440, 1), SR, 1.2);
  expect(y.length).toBeLessThan(SR);
  expect(Math.abs(y.length - SR / 1.2) / (SR / 1.2)).toBeLessThan(0.05);
});
