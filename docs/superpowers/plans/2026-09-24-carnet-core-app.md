# Carnet TCF Core App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Tauri 2 desktop app (developed on Linux, shipped for Windows later) that reproduces every feature of the Carnet TCF web app, with the new high-fidelity design, SQLite storage and web-compatible backups.

**Architecture:** Read-only word data and audio index are bundled resources loaded into memory at startup. User progress lives in a Zustand store backed by a `Repo` (SQLite via `tauri-plugin-sql` inside Tauri, a localStorage-backed memory repo in a plain browser). All domain logic is pure TypeScript in `src/lib`, ported from the web app's script and unit-tested with Vitest. React screens only read the store and call its actions.

**Tech Stack:** Tauri 2.11 (Rust, plugins sql/dialog/fs/clipboard-manager/opener), React 18, Vite, TypeScript strict, Tailwind CSS v4 (CSS-first `@theme`), Radix primitives styled shadcn-style, react-router-dom 6 (HashRouter), Zustand 5, lucide-react, sonner, @fontsource (local fonts), Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-24-carnet-core-app-design.md` (it references the design handoff `~/Downloads/App development with Tauri tech stack/design_handoff_carnet_tcf_desktop/README.md` — "handoff" below — for all measurements, tokens and copy; `design/*.dc.html` hold exact inline styles; `screenshots/*.png` are the visual targets).

**Web app source (for porting):** `TCF Data/4_app/carnet-tcf.html`, script lines ~305–1165. An extracted copy lives in the session scratchpad; re-extract with `awk 'length($0)<3000'` if needed.

## Global Constraints

- React **18** (not 19). TypeScript `strict: true`. No SSR. HashRouter.
- Product name "Carnet TCF", identifier `com.carnet.tcf`, version `1.4.2`, window 1280×800, min 1024×700, `decorations: false`.
- Card key = `french.toLowerCase()` (web's `w.key`). Day number = `Math.floor((d.getTime() - d.getTimezoneOffset()*60000) / 86400000)`.
- SRS gaps `[0,1,3,7,16,35,80,180]`. Hard: `box = max(1, box)`, `due = today + floor(gap[box]/2)` (box 1 Hard → "today again"). Knew on a new word → box 2. Forgot → box 1, due tomorrow, re-inserted 4 cards later as a *retry* (retries are never re-graded).
- Practice rounds change neither cards nor history.
- Backup code = `base64(utf8(JSON.stringify({cards, hist, settings})))`, byte-identical to the web app's `btoa(unescape(encodeURIComponent(...)))`. Exported `settings` carry **both** web keys (`newPerDay, sessionLen, mode, dir, listenAns, levels, test, audio, voice, rate`) and desktop keys; import prefers desktop keys and falls back to mapping web keys.
- Words source = the web app's embedded `words-data` rows (same 4,842 words and order as `vocabulary.json`, POS codes `n v adj adv prep pron det conj interj`, gender `'' m f mf`, 10th field = space-separated extra forms).
- Generated resources live in `src-tauri/resources/` (git-ignored). Tauri loads them via `convertFileSrc(await resolveResource('resources/...'))`; the Vite dev/preview server serves the same folder at `/resources/*`. Nothing is copied into `public/`.
- Fonts are bundled from `@fontsource*` packages — no network at runtime.
- Every colour comes from a CSS variable in `src/styles/tokens.css`; no hard-coded hex values in components.
- Copy, sizes and colours follow the handoff §4/§6 exactly.

## Review Focus

1. **Day rollover while the app stays open** — at midnight, "today" must advance (due counts, history row, extra_today) without a restart. Test: `store` test that advances a fake clock across midnight and checks `today` and `dueCount` change (Task 11).
2. **Importing a backup from the real web app whose settings use web key names** (`sessionLen`, `mode:'choice'`, `test: 7`) — must map to `sessionSize`, `game:'mc'`, `tests:[7]`. Test in Task 8 against the real fixture.
3. **Typed answers with odd input** — leading/trailing spaces, curly apostrophe `’`, capital letters, article `l'`/`se` prefix, empty string (must be ignored, not graded wrong). Tests in Task 6.
4. **Filters that match nothing** (`tests: []`, or a level set with no words in the selected tests) — Start disabled, count shows 0, no crash in distractor code for tiny pools. Tests in Tasks 4 and 5.
5. **Audio pack fetch failure** — must fall back to speech synthesis once with a toast and never throw into React. Test in Task 12 (player with a failing fetch).

---

## File map

```
package.json, vite.config.ts, tsconfig.json, index.html, vitest.config (in vite.config), playwright.config.ts
scripts/build-resources.ts
src-tauri/{Cargo.toml, build.rs, tauri.conf.json, capabilities/default.json, src/main.rs, src/lib.rs, icons/}
src/main.tsx
src/styles/{tokens.css, fonts.css, index.css}
src/data/{types.ts, defaults.ts, words.ts, resources.ts}
src/lib/{text.ts, day.ts, srs.ts, session.ts, run.ts, distractors.ts, answer-match.ts, search.ts, backup.ts, stats.ts, format.ts}  (+ *.test.ts)
src/lib/audio/{wsola.ts, packs.ts, tts.ts, player.ts} (+ tests)
src/repo/{types.ts, memoryRepo.ts, sqliteRepo.ts, index.ts}
src/store/{useCarnet.ts, useRun.ts}
src/app/{App.tsx, BootGate.tsx, AppShell.tsx, TitleBar.tsx, Sidebar.tsx, useHotkeys.ts, theme.ts}
src/components/{Button.tsx, Pill.tsx, Segmented.tsx, Stepper.tsx, Switch.tsx, Slider.tsx, KeyCap.tsx, PlayButton.tsx, Dialog.tsx, Popover.tsx, Tooltip.tsx, Card.tsx, Eyebrow.tsx, Example.tsx}
src/features/study/{StudyPage.tsx, SessionCard.tsx, FiltersCard.tsx, TestsPopover.tsx, NotebookCard.tsx}
src/features/session/{SessionPage.tsx, TopBar.tsx, FlipCard.tsx, MultipleChoice.tsx, ListenChoose.tsx, ListenType.tsx, FeedbackBar.tsx, WordCard.tsx, CompletePage.tsx}
src/features/search/{SearchPage.tsx, ResultList.tsx, WordDetail.tsx}
src/features/progress/{ProgressPage.tsx, LevelBars.tsx, Last14.tsx}
src/features/settings/{SettingsPage.tsx, PasteCodeDialog.tsx, EraseDialog.tsx, AboutDialog.tsx, backupActions.ts}
src/features/onboarding/WelcomePage.tsx
tests/fixtures/web-backup.txt, tests/e2e/*.spec.ts, scripts/make-web-fixture.ts
```

---

### Task 1: Scaffold, resources, tokens, fonts

**Files:** Create everything under "project config", `scripts/build-resources.ts`, `src-tauri/*`, `src/styles/*`, `src/main.tsx` (placeholder App), `src/data/resources.ts`.

**Interfaces — Produces:**
- `npm run resources` → `src-tauri/resources/{words.json, audio_index.json, audio/*.mp3}` (env `TCF_DATA` = folder containing `4_app/`).
- `resourceUrl(path: string): Promise<string>` in `src/data/resources.ts`.
- npm scripts: `dev`, `build`, `preview`, `test` (vitest run), `e2e` (playwright), `tauri`, `resources`.

- [ ] **Step 1: npm project + deps**

```bash
npm init -y
npm i react@18 react-dom@18 react-router-dom@6 zustand lucide-react sonner \
  @radix-ui/react-dialog @radix-ui/react-popover @radix-ui/react-switch @radix-ui/react-slider @radix-ui/react-tooltip \
  @tauri-apps/api @tauri-apps/plugin-sql @tauri-apps/plugin-dialog @tauri-apps/plugin-fs @tauri-apps/plugin-clipboard-manager @tauri-apps/plugin-opener \
  @fontsource/atkinson-hyperlegible @fontsource-variable/newsreader @fontsource/playwrite-fr-moderne
npm i -D typescript vite @vitejs/plugin-react tailwindcss @tailwindcss/vite @types/react@18 @types/react-dom@18 @types/node \
  vitest jsdom @testing-library/react @playwright/test tsx @tauri-apps/cli
```

`package.json` scripts: `"dev":"vite","build":"tsc -b && vite build","preview":"vite preview","test":"vitest run","e2e":"playwright test","tauri":"tauri","resources":"tsx scripts/build-resources.ts"`; `"type":"module"`.

- [ ] **Step 2: `vite.config.ts`** — React + Tailwind plugins, `server.port 1420 strictPort`, `clearScreen:false`, a tiny plugin serving `src-tauri/resources` at `/resources` for both `configureServer` and `configurePreviewServer` (stream file with correct content-type; 404 if missing), and `test: { environment: 'jsdom', include: ['src/**/*.test.ts?(x)'] }`.

```ts
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import fs from 'node:fs'; import path from 'node:path';
const RES = path.resolve(__dirname, 'src-tauri/resources');
const TYPES: Record<string,string> = { '.json':'application/json', '.mp3':'audio/mpeg' };
function serveResources(): Plugin {
  const mw = (req: any, res: any, next: any) => {
    if (!req.url?.startsWith('/resources/')) return next();
    const p = path.join(RES, decodeURIComponent(req.url.slice('/resources/'.length).split('?')[0]));
    if (!p.startsWith(RES) || !fs.existsSync(p)) { res.statusCode = 404; return res.end(); }
    res.setHeader('Content-Type', TYPES[path.extname(p)] ?? 'application/octet-stream');
    fs.createReadStream(p).pipe(res);
  };
  return { name: 'serve-resources', configureServer: s => { s.middlewares.use(mw); }, configurePreviewServer: s => { s.middlewares.use(mw); } };
}
export default defineConfig({
  plugins: [react(), tailwind(), serveResources()],
  clearScreen: false,
  server: { port: 1420, strictPort: true },
  test: { environment: 'jsdom', include: ['src/**/*.test.{ts,tsx}'] },
});
```

- [ ] **Step 3: `scripts/build-resources.ts`** — read `${TCF_DATA}/4_app/carnet-tcf.html`, regex `<script type="application/json" id="words-data">(.*?)</script>`, `JSON.parse`, assert 4,842 rows, write `src-tauri/resources/words.json` (minified). Copy `4_app/audio_index.json` and `4_app/audio/*.mp3` (skip if same size exists). Default `TCF_DATA` = `~/Downloads/TCF Data/TCF Data` if exists, else `~/Downloads/TCF Data`; fail with a clear message naming the env var.

- [ ] **Step 4: Tauri** — `npx tauri init` non-interactively (`--ci --app-name "Carnet TCF" --window-title "Carnet TCF" --frontend-dist ../dist --dev-url http://localhost:1420 --before-dev-command "npm run dev" --before-build-command "npm run build"`), then edit:
  - `Cargo.toml`: `tauri = { version = "2", features = ["protocol-asset"] }`, `tauri-plugin-sql = { version = "2", features = ["sqlite"] }`, `tauri-plugin-dialog`, `tauri-plugin-fs`, `tauri-plugin-clipboard-manager`, `tauri-plugin-opener` (all `"2"`).
  - `src/lib.rs`:

```rust
use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![Migration {
        version: 1,
        description: "create user tables",
        sql: "CREATE TABLE cards (word TEXT PRIMARY KEY, box INTEGER NOT NULL, due INTEGER NOT NULL, right INTEGER NOT NULL DEFAULT 0, wrong INTEGER NOT NULL DEFAULT 0, first_day INTEGER NOT NULL, last_day INTEGER NOT NULL);
              CREATE INDEX cards_due ON cards(due);
              CREATE TABLE history (day INTEGER PRIMARY KEY, reviewed INTEGER NOT NULL DEFAULT 0, remembered INTEGER NOT NULL DEFAULT 0, new_words INTEGER NOT NULL DEFAULT 0);
              CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
              CREATE TABLE extra_today (word TEXT PRIMARY KEY, day INTEGER NOT NULL);",
        kind: MigrationKind::Up,
    }];
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().add_migrations("sqlite:carnet.db", migrations).build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running Carnet TCF");
}
```

  - `tauri.conf.json`: productName/identifier/version from Global Constraints; window as specified; `app.security.csp` = handoff CSP + `connect-src 'self' ipc: http://ipc.localhost asset: http://asset.localhost` and `media-src 'self' blob: asset: http://asset.localhost`; `app.security.assetProtocol = { enable: true, scope: ["$RESOURCE/**"] }`; `bundle.resources = ["resources/**/*"]`; `bundle.targets = ["nsis","msi"]`; `bundle.windows.nsis.installMode = "currentUser"`.
  - `capabilities/default.json`: `core:default`, `core:window:allow-minimize`, `core:window:allow-toggle-maximize`, `core:window:allow-close`, `core:window:allow-start-dragging`, `sql:default`, `sql:allow-execute`, `dialog:allow-save`, `dialog:allow-open`, `fs:allow-read-text-file`, `fs:allow-write-text-file` (scope `[{ "path": "**" }]`), `clipboard-manager:allow-write-text`, `clipboard-manager:allow-read-text`, `opener:default`, `opener:allow-open-path` (scope `$APPDATA/**`).
  - Icons: `npx tauri icon` on a generated 1024px PNG of a `#2B47A0` rounded square (write with a small node script using an SVG → `sharp` is NOT available; instead commit a hand-written 1024×1024 SVG and run `npx tauri icon icon.svg` which accepts SVG).

- [ ] **Step 5: `src/data/resources.ts`**

```ts
import { isTauri } from '../repo/env';
export async function resourceUrl(rel: string): Promise<string> {
  if (!isTauri()) return `/resources/${rel}`;
  const { resolveResource } = await import('@tauri-apps/api/path');
  const { convertFileSrc } = await import('@tauri-apps/api/core');
  return convertFileSrc(await resolveResource(`resources/${rel}`));
}
```
and `src/repo/env.ts`: `export const isTauri = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;`

- [ ] **Step 6: Styles** — `src/styles/tokens.css`: every handoff §6 token as `--c-*` variables on `:root`, dark overrides on `:root[data-theme=dark]` (dark values from handoff §6; derive unspecified dark ones: ink-3 `#8E8B85`, ink-4 `#7A7872`, track `#2A2E38`, accent-strong `#C9D4FA`, accent-light `#4A5C99`, danger `#2A1C1A`, focus `#8FA6F0`, *-solid same as light text colours of dark set). `src/styles/index.css`: `@import "tailwindcss"; @import "./fonts.css"; @import "./tokens.css";` and a `@theme` block mapping `--color-paper: var(--c-paper)` etc. for all tokens, `--font-serif: "Newsreader Variable", Georgia, serif; --font-sans: "Atkinson Hyperlegible", system-ui, sans-serif; --font-script: "Playwrite FR Moderne", cursive; --font-mono: Consolas, "DejaVu Sans Mono", monospace`. Base: `body { background: var(--c-paper); color: var(--c-ink); font-family: var(--font-sans); }`, `:focus-visible { outline: 2px solid var(--c-focus); outline-offset: 2px; }`, `@media (prefers-reduced-motion: reduce) { *{ animation-duration:1ms!important; transition-duration:1ms!important } }`. `fonts.css` imports `@fontsource/atkinson-hyperlegible/400.css`, `/700.css`, `@fontsource-variable/newsreader/index.css`, `@fontsource-variable/newsreader/wght-italic.css`, `@fontsource/playwrite-fr-moderne/400.css`.

- [ ] **Step 7: Verify** — `npm run resources && npm run build && npm run test -- --passWithNoTests`; then `cargo check --manifest-path src-tauri/Cargo.toml` (requires the Linux system libs; if missing, record it and continue — frontend work does not depend on it).

- [ ] **Step 8: Commit** `chore: scaffold Tauri + React + Tailwind, resources pipeline, tokens and fonts`

---

### Task 2: Types, text helpers, words loader

**Files:** Create `src/data/types.ts`, `src/data/defaults.ts`, `src/lib/text.ts`, `src/data/words.ts`; Test `src/lib/text.test.ts`, `src/data/words.test.ts`.

**Interfaces — Produces:**

```ts
// types.ts
export type Level = 'A1'|'A2'|'B1'|'B2'|'C1'|'C2';
export const LEVELS: Level[] = ['A1','A2','B1','B2','C1','C2'];
export type Pos = 'n'|'v'|'adj'|'adv'|'prep'|'pron'|'det'|'conj'|'interj';
export type Gender = ''|'m'|'f'|'mf';
export type Example = [text: string, form: string, test: number, question: number];
export type WordRow = [string, string, Pos, Gender, Level, number, number[], string[], Example[], string];
export interface Word { i: number; fr: string; en: string; pos: Pos; g: Gender; lvl: Level; n: number; tests: number[];
  forms: string[]; more: string[]; ex: Example[]; key: string; nfr: string; nforms: string[]; allForms: string[];
  nen: string; first: string; senses: string[]; snd: string; }
export interface Card { b: number; d: number; r: number; w: number; f: number; l: number; }
export interface DayHist { rev: number; ok: number; nw: number; }
export type Rating = 'forgot'|'hard'|'knew';
export type Game = 'flip'|'mc'|'listen'|'mix';
export type Direction = 'fr-en'|'en-fr';
export interface Settings { newPerDay: number; sessionSize: number; voice: 'recorded'|'device'; speed: number;
  theme: 'light'|'dark'|'system'; levels: Level[]; tests: number[]|null; game: Game; mcDirection: Direction|'both';
  listenMode: 'choose'|'type'; reminderEnabled: boolean; reminderTime: string; autoUpdate: boolean; autostart: boolean;
  onboarded: boolean; extraNewToday: { day: number; n: number }; recentSearches: string[]; }
export interface UserData { cards: Record<string, Card>; hist: Record<number, DayHist>; settings: Settings; extraToday: Record<string, number>; }
// defaults.ts
export const DEFAULT_SETTINGS: Settings = { newPerDay: 15, sessionSize: 40, voice: 'recorded', speed: 1, theme: 'system',
  levels: [], tests: null, game: 'flip', mcDirection: 'fr-en', listenMode: 'choose', reminderEnabled: true, reminderTime: '19:00',
  autoUpdate: true, autostart: false, onboarded: false, extraNewToday: { day: 0, n: 0 }, recentSearches: [] };
export const POS_NAME: Record<Pos,string> = { n:'noun', v:'verb', adj:'adjective', adv:'adverb', pron:'pronoun', prep:'preposition', det:'determiner', conj:'conjunction', interj:'interjection' };
export const GENDER_NAME: Record<Exclude<Gender,''>,string> = { m:'masculine', f:'feminine', mf:'masculine or feminine' };
// text.ts
export function norm(s: string): string;       // web norm()
export function soundKey(s: string): string;   // web soundKey()
export function escRe(s: string): string;
export function shuffle<T>(a: T[], rng?: () => number): T[];
// words.ts
export function hydrate(rows: WordRow[]): Word[];
export async function loadWords(): Promise<{ words: Word[]; audio: AudioIndex }>;
export interface AudioIndex { w: PackIndex; s: PackIndex; ws: number[] }
export interface PackIndex { files: string[]; start: number[]; len: number[] }
export function withArticle(w: Word): string; // 'la facture', "l'eau", 'le réveil'; non-nouns unchanged
```

- [ ] **Step 1: Failing tests** (`text.test.ts`)

```ts
import { norm, soundKey } from './text';
test('norm folds accents, case, curly apostrophes and spaces', () => {
  expect(norm('  Réveil’s  Été ')).toBe("reveil's ete");
});
test.each([
  ['cour','cours'], ['parler','parlé'], ['parlez','parlait'], ['vert','verre'],
])('soundKey(%s) === soundKey(%s)', (a, b) => expect(soundKey(a)).toBe(soundKey(b)));
test('soundKey differs for different words', () => expect(soundKey('chat')).not.toBe(soundKey('chien')));
```
Note `parlait` → web rule strips only `(er|ez|ai|et)$` then `[estxdzp]+$`: `parlait`→ strip `t`→ `parlai`? No: first replace applies to `parlait` (ends in `it`, no match), then trailing `[estxdzp]+` removes `t` → `parlai`. `parler` → `parle` → strip `e` → `parl`. So `parlez`/`parlait` differ; replace the third case with `['parlez','parler']` (both → `parl`). Keep tests consistent with the ported function — the web behaviour is the source of truth.

`words.test.ts`: `hydrate` on two literal rows (`['la facture'…]` style: `['facture','invoice, bill','n','f','B1',12,[1,3],['factures'],[['Voici la facture.','facture',3,4]],'']`) → `key==='facture'`, `nforms` contains `'factures'`, `first==='invoice, bill'`, `withArticle` → `'la facture'`; for `['eau',…,'f',…]` → `"l'eau"`; for gender `mf` (`élève`) → `"l'élève"`; for `['ami',…,'m']` → `"l'ami"`; `['homme','man','n','m']` → `"l'homme"` (h muet heuristic: vowel or `h` → `l'`).

- [ ] **Step 2: Run** `npx vitest run src/lib/text.test.ts src/data/words.test.ts` → FAIL (modules missing).

- [ ] **Step 3: Implement** — port exactly:

```ts
export const norm = (s: string) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’]/g, "'").replace(/\s+/g, ' ').trim();
export function soundKey(s: string) {
  let k = norm(s).replace(/[^a-z]/g, '').replace(/(.)\1+/g, '$1');
  k = k.replace(/(er|ez|ai|et)$/, 'e').replace(/[estxdzp]+$/, '');
  return k || norm(s);
}
export const escRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export function shuffle<T>(a: T[], rng: () => number = Math.random) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
```
`hydrate`: `more = r[9] ? r[9].split(' ') : []`, `allForms = [...forms, ...more]`, `nforms = allForms.map(norm)`, `nen = norm(en)`, `first = nen.split(';')[0].trim()`, `senses = nen.split(';').map(x => x.trim().replace(/^to /,'').replace(/\s*\(.*?\)\s*/g,' ').trim())`, `snd = soundKey(fr)`. `withArticle`: only when `pos==='n'`; `/^[aeiouyhâàéèêëîïôûù]/i` → `l'` + fr, else `f` → `la `, `m`/`mf` → `le `. `loadWords` fetches `resourceUrl('words.json')` and `resourceUrl('audio_index.json')`, throws `Error('words')` on failure.

- [ ] **Step 4: Run tests → PASS.** **Step 5: Commit** `feat: word types, text helpers and loader`.

---

### Task 3: Days and SRS

**Files:** `src/lib/day.ts`, `src/lib/srs.ts`; tests alongside.

**Interfaces — Produces:**

```ts
// day.ts
export function dayNum(d?: Date): number;
export function dayToUTCDate(day: number): Date;   // new Date(day*86400000), read with getUTC*
export function shortDate(day: number): string;    // '11 Sep'
export function longDate(d?: Date): string;        // 'Wednesday 24 September'
// srs.ts
export const GAPS: readonly number[];
export function isNewCard(c?: Card): boolean;      // !c || !c.b
export function nextCard(c: Card|undefined, r: Rating, today: number): Card;
export function intervalDays(c: Card|undefined, r: Rating): number;
export function intervalLabel(days: number): string; // 0 'today again', 1 'tomorrow', 2..29 'in N days', 30..59 'in 1 month', else 'in N months'
export type Status = 'new'|'learning'|'familiar'|'mastered';
export function cardStatus(c?: Card): Status;
```

- [ ] **Step 1: Failing tests** (`srs.test.ts`) — table over boxes 0..7 × ratings:

```ts
import { nextCard, intervalLabel, cardStatus, GAPS } from './srs';
const T = 20000;
const card = (b: number) => (b === 0 ? undefined : { b, d: T, r: 0, w: 0, f: T - 30, l: T - 1 });
test.each([0,1,2,3,4,5,6,7])('knew from box %i', b => {
  const c = nextCard(card(b), 'knew', T);
  const nb = b === 0 ? 2 : Math.min(b + 1, 7);
  expect(c).toMatchObject({ b: nb, d: T + GAPS[nb], l: T });
});
test.each([0,1,2,3,4,5,6,7])('hard from box %i', b => {
  const nb = Math.max(1, b);
  expect(nextCard(card(b), 'hard', T)).toMatchObject({ b: nb, d: T + Math.floor(GAPS[nb] / 2) });
});
test.each([0,1,2,3,4,5,6,7])('forgot from box %i', b => {
  expect(nextCard(card(b), 'forgot', T)).toMatchObject({ b: 1, d: T + 1 });
});
test('new card gets first day and counters', () => {
  expect(nextCard(undefined, 'knew', T)).toEqual({ b: 2, d: T + 3, r: 1, w: 0, f: T, l: T });
  expect(nextCard(undefined, 'forgot', T)).toEqual({ b: 1, d: T + 1, r: 0, w: 1, f: T, l: T });
});
test('existing counters and first day are kept', () => {
  expect(nextCard({ b: 3, d: T, r: 4, w: 2, f: 100, l: T - 7 }, 'knew', T)).toEqual({ b: 4, d: T + 16, r: 5, w: 2, f: 100, l: T });
});
test('labels', () => {
  expect([0,1,2,7,29,30,59,60,180].map(intervalLabel)).toEqual(['today again','tomorrow','in 2 days','in 7 days','in 29 days','in 1 month','in 1 month','in 2 months','in 6 months']);
});
test('status', () => {
  expect([undefined, card(1), card(2), card(3), card(4), card(5), card(7)].map(cardStatus))
    .toEqual(['new','learning','learning','familiar','familiar','mastered','mastered']);
});
```
`day.test.ts`: `dayNum(new Date(2026, 8, 24, 0, 30))` equals `dayNum(new Date(2026, 8, 24, 23, 30))`, and `+1` for the next local midnight; `shortDate(dayNum(new Date(2026,8,11,12)))==='11 Sep'`; `longDate(new Date(2026,8,24))==='Wednesday 24 September'`.

- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement**

```ts
export const GAPS = [0, 1, 3, 7, 16, 35, 80, 180] as const;
export const isNewCard = (c?: Card) => !c || !c.b;
export function nextCard(prev: Card | undefined, r: Rating, t: number): Card {
  const c: Card = isNewCard(prev) ? { b: 0, d: t, r: 0, w: 0, f: prev?.f ?? t, l: t } : { ...prev! };
  if (r === 'forgot') { c.b = 1; c.d = t + 1; c.w++; }
  else if (r === 'hard') { c.b = Math.max(1, c.b); c.d = t + Math.floor(GAPS[c.b] / 2); c.r++; }
  else { c.b = c.b === 0 ? 2 : Math.min(c.b + 1, 7); c.d = t + GAPS[c.b]; c.r++; }
  c.l = t; return c;
}
export const intervalDays = (c: Card | undefined, r: Rating) => nextCard(c, r, 0).d;
```
`dayNum` exactly as Global Constraints. `shortDate`: `d.getUTCDate() + ' ' + d.toLocaleString('en-GB',{month:'short',timeZone:'UTC'})`. `longDate`: `toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})` then reorder to `Weekday D Month` (en-GB already yields `Wednesday 24 September`).

- [ ] **Step 4: PASS.** **Step 5: Commit** `feat: day numbers and spaced repetition`.

---

### Task 4: Session building and the session run reducer

**Files:** `src/lib/session.ts`, `src/lib/run.ts`; tests alongside.

**Interfaces — Produces:**

```ts
// session.ts
export function matchesFilters(w: Word, levels: Level[], tests: number[] | null): boolean;
export function newAllowance(s: Settings, hist: Record<number, DayHist>, today: number): number;
export interface Queue { due: number[]; extra: number[]; fresh: number[]; dueTotal: number; freshTotal: number; queue: number[]; matching: number; }
export function buildQueue(words: Word[], d: UserData, today: number): Queue;
export function nextDueDay(words: Word[], d: UserData, today: number): number | null;
// run.ts
export interface Item { i: number; game: 'flip'|'mc'|'listen'; dir: Direction; retry: boolean; }
export interface Run { items: Item[]; pos: number; practice: boolean; total: number; right: number; wrong: number;
  missed: number[]; newSeen: number; startNew: Set<number>; }
export function createRun(indices: number[], o: { practice: boolean; game: Game; mcDirection: Direction|'both'; isNew: (i: number) => boolean; rng?: () => number }): Run;
export function recordResult(run: Run, rating: Rating): Run;   // pure; re-inserts a retry on 'forgot'
export function advance(run: Run): Run;                        // pos + 1
export const isDone = (run: Run) => run.pos >= run.items.length;
```

Rules (`buildQueue`):
- `due`: words matching filters whose card is not new and `d <= today`, sorted by `d` then index.
- `extra`: keys in `extraToday` whose value is `today`, mapped to word index, not already in `due` (filters ignored — the user explicitly added them).
- `fresh`: words matching filters with a new card, not in `extra`, in index (rank) order; `freshTotal` = their count.
- `queue = [...due, ...extra, ...fresh.slice(0, newAllowance)].slice(0, sessionSize)`; `dueTotal = due.length + extra.length`.
- `matching` = count of words matching filters.
- `newAllowance = max(0, newPerDay + (extraNewToday.day === today ? extraNewToday.n : 0) - (hist[today]?.nw ?? 0))`.
- Filters: `levels` empty = all; `tests === null` = all; `tests` empty array = none.

Rules (`createRun`): per index, `game` = setting, or for `mix` random of flip/mc/listen via `rng`; `dir` = setting, or for `both`: new words `fr-en`, else random. `recordResult`: if item is not a retry, count right (`rating !== 'forgot'`) / wrong, push to `missed` on forgot, `newSeen++` if `startNew.has(i)`; on forgot splice a copy `{...item, retry: true}` at `min(items.length, pos + 4)`. Retries don't touch counters.

- [ ] **Step 1: Failing tests** — build a synthetic 30-word list with `hydrate` of generated rows (levels alternating A1/B1, tests `[1]` for even, `[2]` for odd).

```ts
test('due first (oldest), then extra, then new in rank order, capped', () => {
  const d = user({ cards: { w5: c(3, T - 2), w3: c(2, T - 5), w9: c(1, T + 1) }, extraToday: { w20: T }, settings: { newPerDay: 3, sessionSize: 6 } });
  const q = buildQueue(words, d, T);
  expect(q.due).toEqual([3, 5]); expect(q.extra).toEqual([20]);
  expect(q.queue).toEqual([3, 5, 20, 0, 1, 2]);
});
test('new allowance subtracts today and adds Learn 10 more', () => {
  expect(newAllowance({ ...DEFAULT_SETTINGS, newPerDay: 15, extraNewToday: { day: T, n: 10 } }, { [T]: { rev: 9, ok: 9, nw: 9 } }, T)).toBe(16);
  expect(newAllowance({ ...DEFAULT_SETTINGS, newPerDay: 15, extraNewToday: { day: T - 1, n: 10 } }, {}, T)).toBe(15);
});
test('filters: levels AND tests; [] tests matches nothing', () => {
  expect(buildQueue(words, user({ settings: { levels: ['B1'], tests: [2] } }), T).matching).toBe(15);
  const none = buildQueue(words, user({ settings: { tests: [] } }), T);
  expect(none.matching).toBe(0); expect(none.queue).toEqual([]);
});
test('extra_today from another day is ignored', () => {
  expect(buildQueue(words, user({ extraToday: { w4: T - 1 } }), T).extra).toEqual([]);
});
// run.ts
test('forgot re-inserts a retry 4 later and counts once', () => {
  let r = createRun([0,1,2,3,4,5], { practice: false, game: 'flip', mcDirection: 'fr-en', isNew: () => false });
  r = recordResult(r, 'forgot');
  expect(r.items.map(x => x.i)).toEqual([0,1,2,3,0,4,5]); expect(r.items[4].retry).toBe(true);
  expect(r.wrong).toBe(1); expect(r.missed).toEqual([0]);
  r = advance(advance(advance(advance(r))));        // at the retry
  r = recordResult(r, 'forgot');
  expect(r.wrong).toBe(1); expect(r.items.length).toBe(8);
});
test('retry near the end appends', () => {
  let r = createRun([0,1], { practice: false, game: 'flip', mcDirection: 'fr-en', isNew: () => false });
  r = advance(r); r = recordResult(r, 'forgot');
  expect(r.items.map(x => x.i)).toEqual([0,1,1]);
});
test('mix and both use rng', () => {
  const r = createRun([0,1,2], { practice: false, game: 'mix', mcDirection: 'both', isNew: i => i === 0, rng: () => 0.99 });
  expect(r.items.map(x => x.game)).toEqual(['listen','listen','listen']);
  expect(r.items.map(x => x.dir)).toEqual(['fr-en','en-fr','en-fr']);
});
```
(`user()` = helper merging partial data over `{cards:{},hist:{},settings:DEFAULT_SETTINGS,extraToday:{}}`; `c(b,d)` = card; words keyed `w0…w29`.)

- [ ] **Step 2: FAIL. Step 3: implement per rules. Step 4: PASS. Step 5: Commit** `feat: session queue building and run reducer`.

---

### Task 5: Distractors and gloss masking

**Files:** `src/lib/distractors.ts` + test.

**Interfaces — Produces:**

```ts
export interface DistractorIndex { byPos: Record<string, number[]>; rankInPos: Map<number, number>; }
export function buildDistractorIndex(words: Word[]): DistractorIndex;
export function distractors(words: Word[], ix: DistractorIndex, i: number, mode: 'en'|'fr'|'sound', n?: number, rng?: () => number): number[];
export function options(words: Word[], ix: DistractorIndex, i: number, mode: 'en'|'fr'|'sound', rng?: () => number): number[]; // shuffled [i, ...distractors]
export function maskGloss(w: Word): string;  // web maskGloss (hide French inside the English)
```
Port `distractors()` from the web app verbatim (lines 562–588), replacing `W` with `words`, `shuffle` with `shuffle(…, rng)`. Mode meanings: `'en'` = English options (FR→EN), `'fr'` = French options (EN→FR), `'sound'` = listening. Port `maskWords`/`maskGloss` (lines 532–541).

- [ ] **Step 1: Failing tests** on the real word list (load `src-tauri/resources/words.json` from disk via `fs` in the test; skip with a clear message if missing):
  - for 200 random indices and each mode: 3 distinct distractors, none equal to `i`, no duplicate `first` (mode en) / `nfr` (fr/sound);
  - mode `en`/`fr`: every distractor has the same `pos` when the POS pool has ≥ 12 words;
  - mode `sound`: no distractor has the same `snd` as the answer; for `cour`, `cours` is never offered;
  - tiny pool: a synthetic 3-word list returns ≤ 2 distractors and does not loop forever;
  - `maskGloss` for a word whose English contains `(avoir envie de)` and headword `envie` → the parenthesis becomes `(avoir … de)`.
- [ ] **Steps 2–4: FAIL → implement → PASS. Step 5: Commit** `feat: distractors and gloss masking`.

---

### Task 6: Typed-answer matching

**Files:** `src/lib/answer-match.ts` + test.

**Interfaces — Produces:**

```ts
export type Match =
  | { kind: 'empty' }
  | { kind: 'exact'; typed: string }
  | { kind: 'accent'; typed: string; correct: string; fixed: number[] }   // indices in `correct` whose letters differ
  | { kind: 'homophone'; typed: string }
  | { kind: 'wrong'; typed: string };
export function matchTyped(input: string, w: Word, words: Word[]): Match;
export const isCorrect = (m: Match) => m.kind === 'exact' || m.kind === 'accent' || m.kind === 'homophone';
```
Port `checkTyped` (lines 895–906): strip leading `(le|la|les|un|une|l'|se|s')\s*`, lowercase, curly → straight apostrophe, collapse spaces. Targets = `[fr, ...allForms]` lowercased. Exact → `exact`; `norm` equal → `accent` with `correct` = the matching target and `fixed` = indices where `correct[k] !== typed[k]` (same length after NFC); another word with `nfr`/`nforms` equal to `norm(raw)` and same `snd` → `homophone`; else `wrong`. Empty after stripping → `empty` (caller ignores).

- [ ] **Step 1: Failing tests** (use real words `réveil`, `cour`, `aller`, `facture`):

```ts
expect(matchTyped('réveil', reveil, words).kind).toBe('exact');
expect(matchTyped('  Le Réveil ', reveil, words).kind).toBe('exact');
expect(matchTyped('reveil', reveil, words)).toMatchObject({ kind: 'accent', correct: 'réveil', fixed: [1] });
expect(matchTyped('allons', aller, words).kind).toBe('exact');
expect(matchTyped('cours', cour, words).kind).toBe('homophone');
expect(matchTyped('l’eau', eau, words).kind).toBe('exact');
expect(matchTyped('   ', reveil, words).kind).toBe('empty');
expect(matchTyped('la', reveil, words).kind).toBe('empty');
expect(matchTyped('chat', reveil, words).kind).toBe('wrong');
```
- [ ] **Steps 2–4. Step 5: Commit** `feat: typed answer matching`.

---

### Task 7: Search

**Files:** `src/lib/search.ts` + test.

**Interfaces — Produces:**

```ts
export interface Hit { i: number; score: number; form?: string }   // form = original heard form when matched through a form
export function search(words: Word[], q: string, limit?: number): Hit[];  // default 60
```
Port web `search()` (lines 972–996) using precomputed `nfr`, `nforms`, `nen`, `senses`. Record `form` when the winning score came from `nforms` (92 exact form / 55 form prefix): `form = w.allForms[k]`. Sort `score desc, i asc` (rank). Compile the English regex once per query.

- [ ] **Step 1: Failing tests** (real words):
  - `search(words,'allons')[0]` → `aller` with `form: 'allons'`;
  - `search(words,'to wait')[0]` → `attendre`;
  - `search(words,'ETE')` includes `été`/`être` handling: first hit's `nfr === 'ete'`;
  - ranking: for `q='voir'` the first hit is `voir` (exact) before `voiture` (prefix);
  - `search(words,'')` → `[]`; `search(words,'zzzzqq')` → `[]`;
  - performance: 200 queries of random 1–6 letter prefixes average `< 30 ms` (use `performance.now()`).
- [ ] **Steps 2–4. Step 5: Commit** `feat: search`.

---

### Task 8: Backup encode/decode + real web fixture

**Files:** `src/lib/backup.ts` + test; `scripts/make-web-fixture.ts`; `tests/fixtures/web-backup.txt`.

**Interfaces — Produces:**

```ts
export interface BackupData { cards: Record<string, Card>; hist: Record<number, DayHist>; settings: Partial<Settings>; }
export class BackupError extends Error {}
export function toBackupJson(d: UserData): string;              // JSON of {cards, hist, settings: exportSettings(d.settings)}
export function encodeBackup(d: UserData): string;              // base64(utf8(toBackupJson(d)))
export function parseBackupJson(text: string): BackupData;      // throws BackupError
export function decodeBackup(code: string): BackupData;         // strips whitespace, base64 → utf8 → parseBackupJson
export function exportSettings(s: Settings): Record<string, unknown>;
export function importSettings(raw: Record<string, unknown>): Partial<Settings>;
export function backupCounts(b: BackupData): { words: number; days: number; reviews: number };
```
- `exportSettings`: desktop keys except `recentSearches`, `extraNewToday`, `onboarded`, plus web keys: `sessionLen: sessionSize`, `mode: {flip:'flip', mc:'choice', listen:'listen', mix:'mix'}[game]`, `dir: mcDirection`, `listenAns: listenMode`, `test: tests?.length === 1 ? tests[0] : 0`, `audio: voice`, `voice: ''`, `rate: speed`.
- `importSettings`: for each desktop key, take it if present and valid; otherwise map the web key (`sessionLen`→`sessionSize`, `mode` (`choice`→`mc`), `dir`, `listenAns`, `test` (`0` → `null`, `n` → `[n]`), `audio`, `rate`→`speed` clamped 0.6–1.2). Validate types; drop invalid values silently.
- `parseBackupJson`: JSON must be an object with `cards` object; each card has integer `b` 0–7 and integer `d`; missing `r/w/f/l` default to `0/0/d/d`; `hist` optional, each value integers `rev/ok/nw` (default 0). Anything else → `BackupError("That code isn't a valid Carnet backup")`.
- utf8 base64: `btoa(String.fromCharCode(...new TextEncoder().encode(json)))` (chunked for large strings) and the inverse with `TextDecoder` — equal output to `btoa(unescape(encodeURIComponent(json)))`.

- [ ] **Step 1: Fixture script** `scripts/make-web-fixture.ts`: Playwright chromium; serve `${TCF_DATA}/4_app` with `node:http` on a free port; open `carnet-tcf.html`; set Level filter via clicking `A2`; select Test 7; click `Start`; for 3 cards: `Space`, then press `3`,`1`,`2`; press Escape; go to `#progress`; set Cards per session to 20; click `#copy-backup`; read `#backup-out` value; write to `tests/fixtures/web-backup.txt`. Run it: `npx playwright install chromium && npx tsx scripts/make-web-fixture.ts`.
- [ ] **Step 2: Failing tests**:

```ts
const code = fs.readFileSync('tests/fixtures/web-backup.txt', 'utf8');
test('decodes the real web backup', () => {
  const b = decodeBackup(code);
  expect(Object.keys(b.cards).length).toBeGreaterThanOrEqual(3);
  expect(b.settings).toMatchObject({ sessionSize: 20, levels: ['A2'], tests: [7], game: 'flip' });
});
test('round trip is lossless for cards and hist', () => {
  const b = decodeBackup(code);
  const d: UserData = { cards: b.cards, hist: b.hist, settings: { ...DEFAULT_SETTINGS, ...b.settings }, extraToday: {} };
  const again = decodeBackup(encodeBackup(d));
  expect(again.cards).toEqual(b.cards); expect(again.hist).toEqual(b.hist);
});
test('byte-identical to the web encoding', () => {
  const d: UserData = { cards: { 'été': { b: 2, d: 5, r: 1, w: 0, f: 2, l: 2 } }, hist: {}, settings: DEFAULT_SETTINGS, extraToday: {} };
  const json = toBackupJson(d);
  expect(encodeBackup(d)).toBe(Buffer.from(json, 'utf8').toString('base64'));
});
test('our export is readable by web settings (mode choice, sessionLen)', () => {
  const s = exportSettings({ ...DEFAULT_SETTINGS, game: 'mc', sessionSize: 60, tests: [3] });
  expect(s).toMatchObject({ mode: 'choice', sessionLen: 60, test: 3 });
});
test.each(['', 'abc', btoa('{"x":1}'), btoa('{"cards":{"a":{"b":9,"d":1}}}')])('rejects %s', bad => {
  expect(() => decodeBackup(bad)).toThrow(BackupError);
});
```
- [ ] **Steps 3–5: FAIL → implement → PASS. Step 6: Commit** `feat: web-compatible backup codes with real fixture`.

---

### Task 9: Stats

**Files:** `src/lib/stats.ts` + test.

**Interfaces — Produces:**

```ts
export function streak(hist: Record<number, DayHist>, today: number): number;       // web streak()
export interface StatusCounts { new: number; learning: number; familiar: number; mastered: number; total: number }
export function statusCounts(words: Word[], cards: Record<string, Card>, pred?: (w: Word) => boolean): StatusCounts;
export function byLevel(words: Word[], cards: Record<string, Card>): Record<Level, StatusCounts>;
export interface DayBar { day: number; rev: number; ok: number; nw: number }
export function lastDays(hist: Record<number, DayHist>, today: number, n?: number): DayBar[];  // default 14, oldest first
export function totals(hist: Record<number, DayHist>): { reviews: number; remembered: number; pct: number | null };
export function dueOn(cards: Record<string, Card>, day: number): number;           // cards with b>0 and d === day
export function dueBy(cards: Record<string, Card>, day: number): number;            // b>0 and d <= day
```
- [ ] **Step 1: Failing tests**: streak with activity today (3 consecutive days → 3), with today empty but yesterday active (→ counts from yesterday), with a gap (stops); `lastDays` length 14, last is today, empty days zero; `totals` pct rounding and `null` when zero; `statusCounts` over 3 cards.
- [ ] **Steps 2–4. Step 5: Commit** `feat: progress statistics`.

---

### Task 10: Repos (memory + SQLite)

**Files:** `src/repo/types.ts`, `src/repo/memoryRepo.ts`, `src/repo/sqliteRepo.ts`, `src/repo/index.ts`; test `src/repo/memoryRepo.test.ts`.

**Interfaces — Produces:**

```ts
export interface Repo {
  loadAll(): Promise<{ cards: Record<string, Card>; hist: Record<number, DayHist>; settings: Partial<Settings>; extraToday: Record<string, number> }>;
  saveReview(word: string, card: Card, day: number, hist: DayHist): Promise<void>;
  setSetting<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void>;
  addExtraToday(word: string, day: number): Promise<void>;
  clearExtraBefore(day: number): Promise<void>;
  replaceAll(b: BackupData): Promise<void>;
  eraseProgress(): Promise<void>;
  dataPath(): Promise<string>;
}
export async function openRepo(): Promise<Repo>;   // index.ts: isTauri() ? sqliteRepo : memoryRepo
```
- `memoryRepo(storage = localStorage, key = 'carnet-desktop-dev')`: keeps a `UserData`-like object, writes JSON to storage after each mutation (try/catch). `dataPath()` → `'Browser storage (development)'`.
- `sqliteRepo`: `Database.load('sqlite:carnet.db')`. `loadAll` via 4 SELECTs (parse settings JSON per row, skip rows that fail to parse). `saveReview`: one `execute` per statement:
  - `INSERT INTO cards(word,box,due,right,wrong,first_day,last_day) VALUES($1..$7) ON CONFLICT(word) DO UPDATE SET box=excluded.box, due=excluded.due, right=excluded.right, wrong=excluded.wrong, last_day=excluded.last_day`
  - `INSERT INTO history(day,reviewed,remembered,new_words) VALUES($1,$2,$3,$4) ON CONFLICT(day) DO UPDATE SET reviewed=excluded.reviewed, remembered=excluded.remembered, new_words=excluded.new_words` (absolute values, so a retry is idempotent)
  - `DELETE FROM extra_today WHERE word=$1`
  - `replaceAll` / `eraseProgress`: build a single SQL string `BEGIN; DELETE …; INSERT … VALUES (…),(…); COMMIT;` with literals escaped by `sqlStr = (s) => "'" + s.replace(/'/g, "''") + "'"` and integers via `Number.isInteger` guard, executed in **one** `execute` call (the plugin's pool may run separate calls on different connections, so a multi-call transaction is unsafe). Chunk inserts in groups of 500 rows inside the same string.
  - `dataPath`: `join(await appDataDir(), 'carnet.db')`.
- [ ] **Step 1: Failing tests** for memoryRepo with a fake `Storage`: saveReview then new instance `loadAll` returns it; replaceAll replaces cards/hist and keeps settings; eraseProgress keeps settings and clears cards/hist/extra; corrupted storage JSON → empty data, no throw.
- [ ] **Steps 2–4.** SQLite repo is verified manually in Task 21. **Step 5: Commit** `feat: memory and SQLite repositories`.

---

### Task 11: Store

**Files:** `src/store/useCarnet.ts` + `src/store/useCarnet.test.ts`.

**Interfaces — Consumes:** Repo, lib/*. **Produces:**

```ts
interface CarnetState extends UserData {
  status: 'loading'|'ready'|'error'; error?: string;
  words: Word[]; audio: AudioIndex | null; dix: DistractorIndex | null; today: number; dbPath: string;
  init(opts?: { repo?: Repo; words?: Word[]; audio?: AudioIndex }): Promise<void>;
  tick(): void;                                   // recompute today (called on focus + every 60s)
  rate(i: number, r: Rating): void;               // updates cards + hist[today], persists with retry
  setSetting<K extends keyof Settings>(k: K, v: Settings[K]): void;
  addToToday(i: number): void;
  learnMore(): void;                              // extraNewToday += 10 for today
  importBackup(b: BackupData): Promise<void>;     // replaceAll + settings merge + onboarded true
  erase(): Promise<void>;
}
export const useCarnet: UseBoundStore<StoreApi<CarnetState>>;
export const selectQueue = (s: CarnetState) => buildQueue(s.words, s, s.today);   // memoise in components with useMemo on [cards, settings, extraToday, today]
```
- `rate`: `c = nextCard(cards[key], r, today)`; `h = {...hist[today] ?? zero}`; `h.rev++`; `if (r !== 'forgot') h.ok++`; `if (isNewCard(cards[key])) h.nw++`; set state; remove key from `extraToday`; `persist(() => repo.saveReview(key, c, today, h))`.
- `persist(fn)`: try up to 3 times (200/800/2000 ms); after the last failure call `toast.error("Couldn't save your progress")`.
- `setSetting` writes each key separately; `theme` changes are applied by `app/theme.ts` subscribing to the store.
- `init`: `openRepo()`, `loadWords()` in parallel; merge settings over defaults; drop `extraToday` entries whose day ≠ today (and `clearExtraBefore(today)`); set `dbPath`; `status:'ready'`. Any throw → `status:'error', error: 'db' | 'words'`.
- [ ] **Step 1: Failing tests** with an injected memory repo + synthetic words: `rate` new word knew → `hist[today].nw === 1`, card box 2, repo has it; `learnMore` twice → `extraNewToday.n === 20`; `tick` after mocking `Date` to the next day changes `today` and `extraNewToday` of yesterday no longer counts (Review Focus 1: use `vi.setSystemTime`); `importBackup` sets `onboarded` true and replaces cards; failing repo `saveReview` (rejects) still updates state and calls the toast after retries (use fake timers).
- [ ] **Steps 2–4. Step 5: Commit** `feat: zustand store with write-through persistence`.

---

### Task 12: Audio

**Files:** `src/lib/audio/{wsola.ts, packs.ts, tts.ts, player.ts}`; tests `wsola.test.ts`, `packs.test.ts`, `player.test.ts`.

**Interfaces — Produces:**

```ts
// wsola.ts — pure
export function stretchPCM(x: Float32Array, sampleRate: number, rate: number): Float32Array;   // port of web stretch()
// packs.ts
export interface ClipLoc { file: string; offset: number; len: number }
export function locate(ix: PackIndex, i: number): ClipLoc;              // precomputed offsets
export class PackCache { constructor(fetchBytes: (file: string) => Promise<ArrayBuffer>, max?: number /* 12 */);
  get(file: string): Promise<ArrayBuffer>; has(file: string): boolean; }
// tts.ts
export function speak(text: string, rate: number): boolean;
export function stopSpeech(): void;
// player.ts
export type AudioState = { key: string | null; status: 'idle'|'loading'|'playing' };
export interface PlayerConfig { index: AudioIndex; words: Word[]; getVoice(): 'recorded'|'device'; getSpeed(): number; onFallback(): void; fetchBytes?: (file: string) => Promise<ArrayBuffer>; }
export function initPlayer(c: PlayerConfig): void;
export function playWord(i: number, rate?: number): Promise<void>;       // rate default = speed setting
export function playSentence(i: number, rate?: number): Promise<void>;   // i = word index; uses ws[i], -1 → tts of example text
export function prefetch(wordIdxs: number[]): void;
export function stopAudio(): void;
export function subscribeAudio(fn: (s: AudioState) => void): () => void;
export function useAudioState(): AudioState;                               // React hook via useSyncExternalStore
```
- `locate`: for pack `p` (largest `p` with `start[p] <= i`), offset = sum of `len[start[p] .. i-1]`. Precompute once per index into arrays.
- `PackCache`: Map insertion order LRU, in-flight dedupe, deletes on rejection.
- `player`: one `AudioContext` created lazily and resumed on first use; decoded-clip LRU (64) keyed `w12`/`s40`; stretched buffers cached per `key@rate`; stretch when `Math.abs(rate-1) > 0.01`; `playToken` guards against overlapping plays; `voice === 'device'` → `speak(word.fr | example text)`; any fetch/decode error → `onFallback()` (store shows the toast once per run) and `speak(...)`. Never throws to callers.
- **Default fetchBytes**: `fetch(await resourceUrl(file)).then(r => { if (!r.ok) throw …; return r.arrayBuffer(); })`.
- [ ] **Step 1: Failing tests**: `stretchPCM` of a 1 s 440 Hz sine at 22,050 Hz with rate 0.7 → length within ±3 % of `22050/0.7`, and zero-crossing rate within ±3 % of the input (pitch kept); rate 1.2 → shorter. `locate` with index `{files:['a','b'], start:[0,3], len:[10,20,30,40,50]}` → `locate(2) = {file:'a', offset:30, len:30}`, `locate(4) = {file:'b', offset:40, len:50}`. `PackCache` max 2: third `get` evicts the least recently used; concurrent `get` of same file calls fetch once; rejected fetch is retried next time. Player: with `fetchBytes` rejecting and `speechSynthesis` stubbed, `playWord(0)` resolves, `onFallback` called once, `speak` called with the headword (Review Focus 5).
- [ ] **Steps 2–4. Step 5: Commit** `feat: audio packs, WSOLA time-stretch, player with speech fallback`.

---

### Task 13: UI primitives, shell, boot, theme, hotkeys

**Files:** `src/components/*`, `src/app/*`, `src/main.tsx`.

**Interfaces — Produces:**
- `Button` (`variant: 'primary'|'dark'|'secondary'|'outline'|'danger'|'link'`, `size: 'lg'|'md'|'sm'`), `Pill` (`on`), `Segmented<T>({ value, options: {value:T,label:string}[], onChange })`, `Stepper({ value, min, max, step, onChange })`, `Switch`, `Slider`, `KeyCap`, `PlayButton({ onPlay, loading?, playing?, size, label? })`, `Dialog` (Radix; scrim `rgba(30,34,48,.38)` below the title bar, panel 480 px, radius 16, padding 32, fade+scale .96→1 180 ms), `Popover`, `Tooltip`, `Card` (surface, line border, radius 14), `Eyebrow` (13 px 700 uppercase .08em ink-3), `Example({ ex, withPlay, onPlay })` (italic Newsreader with « », highlighted form).
- `useHotkeys(map: Record<string, (e: KeyboardEvent) => void>, deps)`: ignores events whose target is input/textarea/select except `Enter` and `Escape`; ignores modified keys except `Ctrl+K`.
- `App`: `<Toaster>` (sonner, styled with tokens) + `HashRouter` routes: `/` → redirect `/study`; `AppShell` wraps `study|search|progress|settings`; `/session`, `/complete`, `/welcome` full-bleed. `BootGate` calls `init()` once; shows a paper-coloured splash while loading; on `error` shows the blocking screen (title "Carnet TCF couldn't open your data", body per error kind, buttons "Open data folder" → `openPath(appDataDir())` via plugin-opener, "Quit" → `getCurrentWindow().close()`); redirects to `/welcome` when `!settings.onboarded`.
- `TitleBar` (36 px, `data-tauri-drag-region`, double-click → `toggleMaximize`, 46 px buttons with lucide `Minus`/`Square`/`X` 16 px stroke 1.75, hover `bg-[var(--c-track)]`, close hover `#C42B1C` via `--c-close` token + white glyph; window calls no-op outside Tauri).
- `Sidebar` per AppChrome.dc.html; collapses to 72 px icons + tooltips via `matchMedia('(max-width: 1099px)')`; footer streak/reviews due/`v1.4.2 · Saved on this PC`.
- `theme.ts`: `applyTheme(pref)` sets `document.documentElement.dataset.theme` to `light|dark` (system follows `matchMedia('(prefers-color-scheme: dark)')` with a change listener).
- Global: `Ctrl+K` → navigate `/search` + focus `#search-input`; `window` focus + `setInterval(60_000)` → `tick()`.
- [ ] **Step 1:** Component test for `Segmented` (click changes value, arrow keys move selection) and `useHotkeys` (ignores keys in input except Enter). **Step 2:** implement. **Step 3:** `npm run dev`, open in Chromium via Playwright screenshot at 1280×800 of `/#/study` (placeholder page) — title bar + sidebar match `AppChrome.dc.html`. **Step 4: Commit** `feat: app shell, primitives, theming and boot gate`.

---

### Task 14: Study page

**Files:** `src/features/study/*`.

Build to handoff §4 "01 Study" and `screenshots/01-study.png`:
- Date line `longDate()`; H2 `${queue.length} cards waiting today` (`1 card`, and when 0 → "All done for today").
- Session card: stats `dueTotal` "reviews due" and `min(newAllowance, freshTotal)` "new words"; GAME `Segmented` (Flip cards / Multiple choice / Listening / Mix) bound to `settings.game`; conditional rows: MC or Mix → direction (FR→EN / EN→FR / Both → `mcDirection`), Listening or Mix → mode (Choose / Type → `listenMode`). Buttons: primary `Start session · N cards` (disabled + hint "No words match these filters. Pick more levels or tests." when `matching === 0`; when `queue.length === 0` but `matching > 0` show "All done for today" state with "Next review: {shortDate(nextDue)}" and hide Start), secondary `Learn 10 more` (disabled when `freshTotal === 0`) → `learnMore()` then start.
- Filters card: LEVELS pills toggle (all six on ≡ `[]`), TESTS field label: `All tests` when `null`, `No tests` when `[]`, otherwise compressed ranges (`Tests 1–12, 20`) — add `compressRanges(nums)` to `src/lib/format.ts` with a unit test (`[1,2,3,5,7,8]` → `1–3, 5, 7–8`). Popover: 5×8 grid of 1–40 toggle buttons + All / None. Count line `${fmt(matching)} of 4,842 words match these filters`.
- Notebook card: `statusCounts(words, cards)` stacked bar + legend + `N of 4,842 words started`.
- Start → `useRun.getState().start(queue, { practice: false })` then `navigate('/session')`.
- `src/store/useRun.ts`: `{ run: Run | null; start(indices, { practice }): void; result(r: Rating): void; next(): void; end(): void }` — `result` calls `useCarnet.getState().rate` unless `run.practice || item.retry`, then `recordResult`.
- [ ] Unit test `compressRanges` + `fmt` (`fmt(4842) === '4,842'`). Implement. Screenshot compare with `01-study.png` (Playwright, memory repo seeded with a web fixture to show numbers). **Commit** `feat: study page`.

---

### Task 15: Session page + flip cards

**Files:** `src/features/session/{SessionPage, TopBar, FlipCard, WordCard}.tsx`.

- `SessionPage`: redirects to `/study` if no run; renders `TopBar` (End session + `Esc` KeyCap, track with `pos/items.length` fill, `${pos+1} / ${items.length}`), then the current item's game; when `isDone(run)` → `navigate('/complete')`. Esc: if `pos < items.length / 2` open a Dialog "End this session? Your answers so far are saved." (Keep going / End session) else go to Complete. Prefetch audio for items `pos..pos+3`. Game remounts per item via `key={pos}`.
- `FlipCard` per handoff §4 02/03 and screenshot 13: front (`Review · box N` / `New word`/`Practice` in top-left; `B1 · verb` top-right; `withArticle(w)` Newsreader 80; Listen / Slower 0.7× pills; Show answer dark button + "or press Space"); back (headword 56 + ▶, meaning 24, divider, first example, `▶ Play sentence · Test N · Question M`, footer `Also heard: forms · heard N times in M tests`); rating grid Forgot/Hard/Knew it with sub `1 · ${intervalLabel(...)}` (practice/retry: `again` / `got it` / `got it`). Space flips (rotateY 320 ms `cubic-bezier(.2,.7,.2,1)`, `backface-visibility:hidden`; reduced motion → crossfade). Keys 1–3 rate. Flipping autoplays the word.
- `WordCard`: meaning + example block reused by MC/listen feedback.
- [ ] Component test: FlipCard renders front, Space flips, `3` calls `onResult('knew')`. Screenshot vs `02-flip-front.png`, `03-flip-back.png`, `13-dark-flip-back.png`. **Commit** `feat: session page and flip cards`.

---

### Task 16: Multiple choice, listening, complete

**Files:** `MultipleChoice.tsx`, `ListenChoose.tsx`, `ListenType.tsx`, `FeedbackBar.tsx`, `CompletePage.tsx`.

- `MultipleChoice` (§4 04): label `FRENCH → ENGLISH · B2 · NOUN, FEMININE`; prompt fr-en: `withArticle` Newsreader 72 + ▶; en-fr: `maskGloss(w)` 24–32 px (`text-[32px]` ≤ 40 chars else 24 px). Options from `options(words, dix, i, dir==='fr-en'?'en':'fr')` (computed once with `useMemo`), 2 columns × 380 px, keys 1–4; en options show `maskGloss(W[o])`. After answer: correct green, wrong pick red, `FeedbackBar` (right: bg knew "Correct" + meaning; wrong: bg forgot "It was: …" + "You'll see it again in 4 cards"; Continue ↵ dark). Enter/Space continues. Word audio plays after answering.
- `ListenChoose` (§4 05): autoplay on mount; 132 px play circle with ring pulse while `useAudioState().key` is this word and playing; chips "Replay R", "Slower 0.7× S", "Type it instead" (switches this item to type mode locally); options via `options(..., 'sound')` in Newsreader 26.
- `ListenType` (§4 06): 96 px outline circle; input 560 px Newsreader 34, autofocus; Enter checks via `matchTyped` (ignore `empty`); states: exact/homophone → green border `✓ Correct` (homophone adds "“cours” sounds the same. The word read aloud was cour"); accent → green + reminder box (`Mind the accent:` + corrected word with `fixed` letters underlined in hard-solid); wrong → red + `It was: le réveil`. Then `WordCard` + Continue. Accent-key row (é è ê à â ç î ô û ù ë ï œ) inserts at caret. "I don't know" button → wrong. R/S keys work when focus is not in the input (and `Ctrl+R`/`Ctrl+S` are not captured).
- MC/listen → `onResult(correct ? 'knew' : 'forgot')` on Continue (not on answer), so the feedback stays visible.
- `CompletePage` (§4 07): `Bien joué !` (Parfait ! when nothing missed; À bientôt ! when nothing answered), H2 `${right} of ${right+wrong} remembered`, stats accuracy %, new words (`run.newSeen`), day streak, due tomorrow (`dueOn(cards, today+1)`), buttons Back to study / Learn 10 more; right card `${missed.length} to look at again` list + Practise these words (practice run of unique missed) + note; "Nothing missed" state.
- [ ] Component tests: MC with fixed rng — pressing `1` on a wrong option marks it and shows "It was"; Enter calls `onResult('forgot')`. ListenType: typing `reveil` + Enter shows the accent reminder and `onResult('knew')` on Continue. Screenshots vs 04–07. **Commit** `feat: multiple choice, listening games and session complete`.

---

### Task 17: Search page

**Files:** `src/features/search/*`.

Per §4 08: grid `380px minmax(0,1fr)`; input `#search-input` with Ctrl K keycap, debounced 60 ms; count line `N results`; rows (Newsreader 22 + short meaning = `en.split(';')[0]` 14 px + level) with `matched 'allons'` when `hit.form`; selected row accent-soft + 3 px accent bar; ArrowUp/Down move selection, Enter keeps focus. Empty query → "Search 4,842 words in French or English" + recent searches (click fills query; store query into `recentSearches` when a result is opened, dedupe, max 8). No results → `No word matches 'xyz'`. Detail pane: eyebrow `A1 · VERB · RANK 9`, headword 64 + ▶, meaning 22, three tiles (Heard N times / In tests X of 40 / Your status + `next review ${intervalLabel(d - today)}`), Forms heard (`allForms.join(' · ')`), both examples (▶ on first), actions pinned bottom: Practise now (practice run of `[i]`) and Add to today's reviews (disabled with "Due today" when already due/added).
- [ ] Component test: typing `allons` shows `aller` first with `matched 'allons'`; ArrowDown changes the detail. Screenshot vs `08-search.png`. **Commit** `feat: search page`.

---

### Task 18: Progress page

Per §4 09: H2; 4 tiles (Mastered, Familiar, Learning, Not started); By level card (rows `32px 1fr 88px`, 12 px stacked bars, `started / total`); Last 14 days card (columns flex-1 gap 8, stacked new `accent-light` over reviewed `accent`, max-scaled to 140 px, axis labels first/middle `shortDate`, last `Today`; hover Tooltip `Wed 17 Sep · 42 reviewed · 38 remembered · 6 new`; empty days show a 2 px track slot); summary `N reviews in total · P% remembered`.
- [ ] Screenshot vs `09-progress.png`. **Commit** `feat: progress page`.

---

### Task 19: Settings page, backup and erase dialogs

Per §4 10 and §3.7:
- Study: New words per day stepper 0–100 step 5, Cards per session 10–200 step 10, Daily reminder switch + time `<input type="time">` (UI only).
- Audio: Voice segmented Recorded / Windows voice; Reading speed slider 0.6–1.2 step 0.1 with value label `1.0×`; "Test voice" plays `bonjour`.
- Appearance: Theme Light / Dark / System.
- Your data: DB path tile (Consolas 13) from `dbPath`; Save backup file… (`dialog.save({ defaultPath: 'carnet-backup-YYYY-MM-DD.carnet', filters: [{ name: 'Carnet backup', extensions: ['carnet'] }] })` → `writeTextFile(path, toBackupJson(data))`; browser fallback: download via blob link); Restore from file… (`dialog.open` → `readTextFile` → `parseBackupJson` → same confirm dialog as paste); Copy backup code (clipboard-manager `writeText`, browser `navigator.clipboard`) → toast "Backup code copied"; Paste code → `PasteCodeDialog` (textarea → Check → counts preview `N words · D days of history` → "Replace my progress" → `importBackup`; invalid → inline "That code isn't a valid Carnet backup").
- App: Start with Windows switch (`autostart`, UI only), Install updates automatically (`autoUpdate`, UI only), `Version 1.4.2` + Check now (disabled, tooltip "Available in the Windows release"), About → `AboutDialog` (voice credit "Voice: Piper fr_FR-siwis-medium (CC BY 4.0)", data note "Transcripts from formation-tcfcanada.com, for personal study.", fonts OFL).
- Danger: box with Erase all progress… → `EraseDialog` requiring the text `erase` → `erase()` → toast "Progress erased".
- `backupActions.ts` wraps Tauri vs browser differences (dynamic imports only when `isTauri()`).
- [ ] Component test: PasteCodeDialog with the fixture code shows counts; with `abc` shows the inline error. Screenshot vs `10-settings.png`. **Commit** `feat: settings, backup and erase`.

---

### Task 20: Welcome (first run)

Per §4 12: split 50/50; left dark panel (`Carnet` Playwrite 40, H2 "Every word you'll hear in the TCF listening test." Newsreader 52/1.08, body 18/1.5 muted); right: 3 pace tiles (10 Relaxed / 15 Steady / 25 Exam soon), starting level pills (single choice; selecting `B1` sets `levels = ['B1','B2','C1','C2']`, `A1` → `[]`), reminder switch + time, full-width Start learning (sets `newPerDay`, `levels`, `reminderEnabled`, `reminderTime`, `onboarded: true`, navigates `/study`), link "Already use Carnet online? Import a backup code" → `PasteCodeDialog` (success → `/study`).
- [ ] Screenshot vs `12-welcome.png`. **Commit** `feat: first-run welcome`.

---

### Task 21: End-to-end tests, visual pass, Tauri run

**Files:** `playwright.config.ts`, `tests/e2e/{onboarding,flip,mc,listen,search,backup,theme}.spec.ts`.

- Config: `webServer: { command: 'npm run build && npm run preview -- --port 4173', port: 4173 }`, viewport 1280×800, chromium, `use.baseURL`.
- Specs:
  - onboarding: fresh storage → welcome → choose 25 → Start learning → study shows `25 new words`.
  - flip: start session → Space → 3 ×3 → progress `4 / N`; Esc → confirm dialog → End session → Complete page shows "3 of 3 remembered".
  - mc: set Multiple choice + EN→FR → answer with `1` → feedback bar → Enter.
  - listen: Listening + Type → type the correct word (read the current word from `data-word` attribute on the card, added for testability) → ✓ Correct.
  - search: Ctrl+K → `allons` → `aller` → Add to today's reviews → Study shows reviews due +1.
  - backup: copy code (grant clipboard permissions) → Settings erase (type `erase`) → paste code → progress restored.
  - theme: Dark → `html[data-theme=dark]`; System follows `page.emulateMedia({ colorScheme: 'dark' })`.
- Visual pass: script saves screenshots of every screen to `test-results/screens/` and compare side by side with `screenshots/*.png` by eye; fix discrepancies.
- Tauri: `npm run tauri dev` → verify SQLite persists across restart, file backup save/open, audio plays, window buttons + drag work. Record any Linux-only issues.
- [ ] Run `npm test && npm run e2e`, all green. **Commit** `test: end-to-end coverage and visual polish`.

---

## Self-review notes

- Spec coverage: §3.1 words (T1–2), §3.2 SQLite (T1, T10), §3.3 day/backup (T3, T8), §4 lib (T3–9), §5 store (T11), §6 UI (T13–20), §7 audio (T12), §8 errors (T10–13, T19), §9 testing (all + T21).
- Deviations from spec, recorded: resources served from `src-tauri/resources` by a Vite middleware instead of copying to `public/resources` (avoids embedding 89 MB into the binary); distractor windows follow the web app (±250 within POS) rather than the spec's ±150 because behavioural parity with the web app is the stated goal; words come from the web app's embedded rows (identical words/order to `vocabulary.json`) so POS/forms match the web logic exactly.
