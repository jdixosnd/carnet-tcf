// Time-stretch that keeps the pitch (WSOLA), ported from the web app's stretch().
// rate < 1 is slower (longer output), rate > 1 is faster.
export function stretchPCM(x: Float32Array, sr: number, rate: number): Float32Array {
  const N = Math.round(sr * 0.03) & ~1, Hs = N >> 1, Ha = Math.max(1, Math.round(Hs * rate)), T = Math.round(sr * 0.008);
  const outLen = Math.ceil(x.length / rate) + N;
  const y = new Float32Array(outLen), wsum = new Float32Array(outLen), win = new Float32Array(N);
  for (let n = 0; n < N; n++) win[n] = 0.5 - 0.5 * Math.cos((2 * Math.PI * n) / N);
  let prev = 0, out = 0;
  for (let f = 0; ; f++, out += Hs) {
    const ideal = f * Ha;
    if (ideal + N + T >= x.length || out + N >= outLen) break;
    let best = ideal;
    if (f > 0) {
      const nat = prev + Hs;
      let bestC = -Infinity;
      for (let d = -T; d <= T; d += 2) {
        const pos = ideal + d;
        if (pos < 0) continue;
        let cc = 0;
        for (let n = 0; n < Hs; n += 2) cc += x[pos + n] * x[nat + n];
        if (cc > bestC) { bestC = cc; best = pos; }
      }
    }
    for (let n = 0; n < N; n++) { y[out + n] += x[best + n] * win[n]; wsum[out + n] += win[n]; }
    prev = best;
  }
  let end = outLen;
  while (end > 1 && wsum[end - 1] <= 1e-3) end--;
  for (let n = 0; n < end; n++) if (wsum[n] > 1e-3) y[n] /= wsum[n];
  return y.slice(0, end);
}
