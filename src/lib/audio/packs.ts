// Audio packs: complete MP3 clips placed back to back; a clip's offset is the sum of the
// lengths before it in its pack.
import type { PackIndex } from '../../data/types';

export interface ClipLoc { file: string; offset: number; len: number; }

const offsets = new WeakMap<PackIndex, { pack: number[]; offset: number[] }>();

export function locate(ix: PackIndex, i: number): ClipLoc {
  let o = offsets.get(ix);
  if (!o) {
    o = { pack: [], offset: [] };
    let p = 0, off = 0;
    for (let k = 0; k < ix.len.length; k++) {
      if (p + 1 < ix.start.length && k === ix.start[p + 1]) { p++; off = 0; }
      o.pack.push(p); o.offset.push(off);
      off += ix.len[k];
    }
    offsets.set(ix, o);
  }
  return { file: ix.files[o.pack[i]], offset: o.offset[i], len: ix.len[i] };
}

/** Whole packs held in memory, least recently used evicted first; concurrent requests share one fetch. */
export class PackCache {
  private m = new Map<string, Promise<ArrayBuffer>>();
  constructor(private fetchBytes: (file: string) => Promise<ArrayBuffer>, private max = 12) {}

  has(file: string): boolean { return this.m.has(file); }

  get(file: string): Promise<ArrayBuffer> {
    let p = this.m.get(file);
    if (p) { this.m.delete(file); this.m.set(file, p); return p; }
    p = this.fetchBytes(file);
    this.m.set(file, p);
    p.catch(() => { if (this.m.get(file) === p) this.m.delete(file); });
    while (this.m.size > this.max) this.m.delete(this.m.keys().next().value!);
    return p;
  }
}
