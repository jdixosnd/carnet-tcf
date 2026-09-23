export const fmt = (n: number): string => n.toLocaleString('en-US');
export const plural = (n: number, one: string, many = one + 's'): string => `${fmt(n)} ${n === 1 ? one : many}`;

/** [1,2,3,5,7,8] → "1–3, 5, 7–8" */
export function compressRanges(nums: number[]): string {
  const s = [...new Set(nums)].sort((a, b) => a - b);
  const out: string[] = [];
  for (let i = 0; i < s.length; ) {
    let j = i;
    while (j + 1 < s.length && s[j + 1] === s[j] + 1) j++;
    out.push(j > i ? `${s[i]}–${s[j]}` : `${s[i]}`);
    i = j + 1;
  }
  return out.join(', ');
}
