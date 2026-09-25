// SQLite repository (inside Tauri) via tauri-plugin-sql. Schema: src-tauri/migrations/001_init.sql.
import type { Card, DayHist, Settings } from '../data/types';
import type { LoadedData, Repo } from './types';

/** The subset of @tauri-apps/plugin-sql's Database that we use. */
export interface Db {
  execute(sql: string, bind?: unknown[]): Promise<unknown>;
  select<T>(sql: string, bind?: unknown[]): Promise<T[]>;
}

const str = (s: string) => `'${s.replace(/'/g, "''")}'`;
const int = (n: number) => {
  if (!Number.isInteger(n)) throw new Error(`not an integer: ${n}`);
  return String(n);
};

export function sqliteRepo(open: () => Promise<Db>, path: () => Promise<string>): Repo {
  let dbp: Promise<Db> | null = null;
  const db = () => (dbp ??= open().catch(e => { dbp = null; throw e; }));

  /**
   * Runs several statements as one transaction in a single execute() call: the plugin's connection pool
   * may put separate calls on different connections, so BEGIN/COMMIT across calls isn't safe.
   * Values are inlined as escaped literals because bound parameters don't span statements.
   */
  const batch = async (stmts: string[]) => {
    const d = await db();
    try {
      await d.execute(['BEGIN', ...stmts, 'COMMIT'].join(';\n') + ';');
    } catch (e) {
      // sqlx doesn't roll back a transaction it didn't open; close it so the connection isn't left inside it.
      await d.execute('ROLLBACK').catch(() => {});
      throw e;
    }
  };

  const insertCards = (cards: Record<string, Card>, upsert = ''): string[] => {
    const rows = Object.entries(cards).map(([w, c]) =>
      `(${str(w)},${int(c.b)},${int(c.d)},${int(c.r)},${int(c.w)},${int(c.f)},${int(c.l)})`);
    const out: string[] = [];
    for (let i = 0; i < rows.length; i += 500)
      out.push(`INSERT INTO cards (word,box,due,right,wrong,first_day,last_day) VALUES ${rows.slice(i, i + 500).join(',')}${upsert}`);
    return out;
  };
  /** Comma-separated quoted words, 500 per chunk. */
  const inList = (words: string[]): string[] => {
    const out: string[] = [];
    for (let i = 0; i < words.length; i += 500) out.push(words.slice(i, i + 500).map(str).join(','));
    return out;
  };
  const insertHist = (hist: Record<number, DayHist>): string[] => {
    const rows = Object.entries(hist).map(([d, h]) => `(${int(Number(d))},${int(h.rev)},${int(h.ok)},${int(h.nw)})`);
    const out: string[] = [];
    for (let i = 0; i < rows.length; i += 500)
      out.push(`INSERT INTO history (day,reviewed,remembered,new_words) VALUES ${rows.slice(i, i + 500).join(',')}`);
    return out;
  };

  return {
    async loadAll(): Promise<LoadedData> {
      const d = await db();
      const [cards, hist, settings, extra] = await Promise.all([
        d.select<{ word: string; box: number; due: number; right: number; wrong: number; first_day: number; last_day: number }>('SELECT * FROM cards'),
        d.select<{ day: number; reviewed: number; remembered: number; new_words: number }>('SELECT * FROM history'),
        d.select<{ key: string; value: string }>('SELECT key, value FROM settings'),
        d.select<{ word: string; day: number }>('SELECT word, day FROM extra_today'),
      ]);
      const out: LoadedData = { cards: {}, hist: {}, settings: {}, extraToday: {} };
      for (const c of cards) out.cards[c.word] = { b: c.box, d: c.due, r: c.right, w: c.wrong, f: c.first_day, l: c.last_day };
      for (const h of hist) out.hist[h.day] = { rev: h.reviewed, ok: h.remembered, nw: h.new_words };
      for (const s of settings) {
        try { (out.settings as Record<string, unknown>)[s.key] = JSON.parse(s.value); } catch { /* skip a corrupt row */ }
      }
      for (const e of extra) out.extraToday[e.word] = e.day;
      return out;
    },

    async saveReview(word, c, day, h) {
      const d = await db();
      await d.execute(
        `INSERT INTO cards (word,box,due,right,wrong,first_day,last_day) VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT(word) DO UPDATE SET box=excluded.box, due=excluded.due, right=excluded.right, wrong=excluded.wrong, last_day=excluded.last_day`,
        [word, c.b, c.d, c.r, c.w, c.f, c.l]);
      // Absolute values, so retrying a failed write is idempotent.
      await d.execute(
        `INSERT INTO history (day,reviewed,remembered,new_words) VALUES ($1,$2,$3,$4)
         ON CONFLICT(day) DO UPDATE SET reviewed=excluded.reviewed, remembered=excluded.remembered, new_words=excluded.new_words`,
        [day, h.rev, h.ok, h.nw]);
      await d.execute('DELETE FROM extra_today WHERE word = $1', [word]);
    },

    async setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
      await (await db()).execute(
        'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        [key, JSON.stringify(value)]);
    },

    async addExtraToday(word, day) {
      await (await db()).execute(
        'INSERT INTO extra_today (word, day) VALUES ($1, $2) ON CONFLICT(word) DO UPDATE SET day = excluded.day', [word, day]);
    },

    async addExtraTodayMany(words, day) {
      const stmts: string[] = [];
      for (let i = 0; i < words.length; i += 500) {
        const rows = words.slice(i, i + 500).map(w => `(${str(w)},${int(day)})`).join(',');
        stmts.push(`INSERT INTO extra_today (word, day) VALUES ${rows} ON CONFLICT(word) DO UPDATE SET day = excluded.day`);
      }
      if (stmts.length) await batch(stmts);
    },

    async putCards(put, remove) {
      const stmts = [
        ...insertCards(put, ' ON CONFLICT(word) DO UPDATE SET box=excluded.box, due=excluded.due, right=excluded.right, wrong=excluded.wrong, first_day=excluded.first_day, last_day=excluded.last_day'),
        ...inList(remove).map(l => `DELETE FROM cards WHERE word IN (${l})`),
      ];
      if (stmts.length) await batch(stmts);
    },

    async clearExtraBefore(day) {
      await (await db()).execute('DELETE FROM extra_today WHERE day < $1', [day]);
    },

    async replaceAll(b) {
      const settings = Object.entries(b.settings).map(([k, v]) =>
        `INSERT INTO settings (key, value) VALUES (${str(k)}, ${str(JSON.stringify(v))}) ON CONFLICT(key) DO UPDATE SET value = excluded.value`);
      await batch(['DELETE FROM cards', 'DELETE FROM history', 'DELETE FROM extra_today', ...insertCards(b.cards), ...insertHist(b.hist), ...settings]);
      // Guard against a driver that silently ran only part of the batch.
      const [{ n }] = await (await db()).select<{ n: number }>('SELECT COUNT(*) AS n FROM cards');
      if (n !== Object.keys(b.cards).length) throw new Error(`import wrote ${n} of ${Object.keys(b.cards).length} cards`);
    },

    async eraseProgress() {
      await batch(['DELETE FROM cards', 'DELETE FROM history', 'DELETE FROM extra_today']);
    },

    dataPath: path,
  };
}

/** The real repo inside Tauri. */
export async function openSqliteRepo(): Promise<Repo> {
  const [{ default: Database }, { appConfigDir, join }] = await Promise.all([
    import('@tauri-apps/plugin-sql'), import('@tauri-apps/api/path'),
  ]);
  // tauri-plugin-sql keeps the database in the app config dir (the same folder as app data on Windows).
  return sqliteRepo(() => Database.load('sqlite:carnet.db'), async () => join(await appConfigDir(), 'carnet.db'));
}
