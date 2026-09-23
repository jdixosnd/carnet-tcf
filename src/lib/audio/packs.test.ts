import { vi } from 'vitest';
import { locate, PackCache } from './packs';

test('locate finds the pack and byte offset', () => {
  const ix = { files: ['a', 'b'], start: [0, 3], len: [10, 20, 30, 40, 50] };
  expect(locate(ix, 0)).toEqual({ file: 'a', offset: 0, len: 10 });
  expect(locate(ix, 2)).toEqual({ file: 'a', offset: 30, len: 30 });
  expect(locate(ix, 3)).toEqual({ file: 'b', offset: 0, len: 40 });
  expect(locate(ix, 4)).toEqual({ file: 'b', offset: 40, len: 50 });
});

test('PackCache dedupes, evicts least recently used and retries failures', async () => {
  let fail = true;
  const fetchBytes = vi.fn(async (f: string) => {
    if (f === 'x' && fail) { fail = false; throw new Error('net'); }
    return new ArrayBuffer(f.length);
  });
  const c = new PackCache(fetchBytes, 2);
  await Promise.all([c.get('a'), c.get('a')]);
  expect(fetchBytes).toHaveBeenCalledTimes(1);
  await c.get('b');
  await c.get('a');          // a is now most recent
  await c.get('c');          // evicts b
  expect(c.has('a')).toBe(true);
  expect(c.has('b')).toBe(false);
  await expect(c.get('x')).rejects.toThrow('net');
  await expect(c.get('x')).resolves.toBeInstanceOf(ArrayBuffer);
});
