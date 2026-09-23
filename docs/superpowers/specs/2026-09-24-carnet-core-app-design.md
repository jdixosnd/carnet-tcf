# Carnet TCF desktop — Sub-project 1: Core app

**Date:** 2026-09-24
**Status:** Approved in brainstorming, pending written-spec review
**Source of truth for visuals & behaviour:** `~/Downloads/App development with Tauri tech stack/design_handoff_carnet_tcf_desktop/README.md` (the "handoff"). Section references like §3.3 point there. This spec records the decisions layered on top of it; where it is silent, the handoff wins.

## 1. Goal and context

Rebuild the single-file web app `TCF Data/4_app/carnet-tcf.html` as a Tauri 2 desktop app, keeping every feature, the web-compatible backup format, and the high-fidelity design in the handoff.

The whole effort is split into three sub-projects, each with its own spec → plan → implementation:

1. **Core app (this spec):** every screen, SRS, games, search, progress, settings, audio, SQLite, backup (code + file).
2. **Desktop integrations:** reminder notifications (§3.10), autostart, window-state, single-instance.
3. **Distribution:** GitHub Actions `windows-latest` build, NSIS + MSI, signed updater via GitHub Releases, update dialog (§3.9).

**Platform decision:** Windows is the only shipping target. Development and testing happen on Linux (Tauri on WebKitGTK); Windows installers are built only in CI (sub-project 3). Windows-specific copy ("Windows voice", "Saved on this PC") stays as designed.

**Success criteria for sub-project 1**
- `npm run tauri dev` on Linux launches the app; all 13 designed screens (except the update dialog, sub-project 3) are implemented, plus the §5 states.
- Every feature in handoff §3.1–3.8 works, apart from the OS behaviour deferred below.
- A backup code produced by the real web app imports correctly, and a code we export imports into the web app (round-trip).
- Vitest and Playwright suites pass; search < 30 ms/keystroke.

**In scope, UI only (OS wiring deferred to sub-project 2/3):** the Settings rows *Daily reminder + time*, *Start with Windows*, *Install updates automatically*, *Check now*. They render and persist their setting values; they do not yet schedule notifications, register autostart, or check for updates. The onboarding reminder switch likewise only persists.

**Out of scope:** update dialog, notifications, autostart, window-state, single-instance, installer, CI, app icon design (use `tauri icon` on a placeholder).

## 2. Architecture

Chosen approach: **in-memory store with SQLite write-through; domain logic ported from the web app.**

- The 4,842 words are read-only and small → loaded once into memory from a bundled resource; filters, session building and search run in memory.
- User data (cards, history, settings, extra_today) loads from SQLite into a Zustand store at startup; every mutation is written through to SQLite immediately.
- Domain logic lives in pure TypeScript modules with no Tauri/React imports, ported from the web app's JS (read directly from `carnet-tcf.html`) so behaviour and backups match exactly.
- Storage is behind a `Repo` interface with two implementations, so the app also runs in a plain browser (Vite dev server, Playwright) without the Tauri runtime.

### 2.1 Project layout

The project root is `/home/sohel/code/TCF` (this git repo).

```
src-tauri/
  Cargo.toml, tauri.conf.json, capabilities/default.json
  src/lib.rs           plugins: sql(sqlite), fs, dialog, clipboard-manager, opener; migration 1
  resources/           GENERATED, git-ignored: words.json, audio_index.json, audio/*.mp3
scripts/
  build-resources.ts   reads an extracted "TCF Data" folder (env TCF_DATA, default ~/Downloads/TCF Data)
                       → resources/words.json (compact rows) + audio_index.json + audio/ packs;
                       also copies them to public/resources for the browser build
src/
  data/       types.ts (Word, Card, DayHist, Settings, Rating, Game…)
              words.ts (load words.json, build per-word + search indexes)
  lib/        day.ts · srs.ts · session.ts · distractors.ts · sound-key.ts
              answer-match.ts · search.ts · backup.ts · stats.ts · format.ts
              audio/ packs.ts (fetch + LRU 12) · player.ts · wsola.ts · tts.ts
  repo/       types.ts (Repo interface) · sqliteRepo.ts · memoryRepo.ts · index.ts
  store/      useCarnet.ts (Zustand: state + actions)
  app/        main.tsx, router.tsx (HashRouter), AppShell (TitleBar + Sidebar), BootGate
  features/   study/ session/ (Flip, MultipleChoice, ListenChoose, ListenType, Complete)
              search/ progress/ settings/ onboarding/
  components/ ui/ (shadcn primitives restyled) + shared (KeyCap, Pill, Segmented, Stepper, PlayButton…)
  styles/     tokens.css (CSS variables, light + dark) · fonts.css (@font-face)
  assets/fonts/  Atkinson Hyperlegible 400/700, Newsreader variable (+italic), Playwrite FR Moderne 400
tests/
  unit (vitest, next to lib files as *.test.ts) · e2e/ (playwright) · fixtures/web-backup.txt
```

The audio packs (~89 MB) are not committed. `npm run resources` regenerates them. Sub-project 3 decides how CI obtains the data.

### 2.2 Boundaries

- `lib/*` is pure: its inputs are data plus `today`, it returns values, it never reads the clock or storage directly (except `day.ts`, which provides `today()`).
- `store/` is the only caller of `repo/`. `features/` read the store via selectors and call store actions only.
- `repo/index.ts` picks `sqliteRepo` when `window.__TAURI_INTERNALS__` exists, else `memoryRepo` (optionally seeded from `localStorage` for dev convenience).

## 3. Data and storage

### 3.1 Words

- `words.json` is an array of rows `[french, english, pos, gender, level, times_heard, tests[], common_forms[], examples[[text, form, test, question]], other_forms[]]`, in rank order (index = rank − 1). It is built from `2_vocabulary/vocabulary.json` (`{word_count, words:[…]}`), whose `part_of_speech` already uses the handoff's 5 categories (noun/verb/adjective/adverb/other).
- Audio index: `audio_index.json` is copied verbatim (`{w:{files,start,len}, s:{…}, ws:[…]}`).
- `words.ts` builds, at startup:
  - `byFrench: Map<string, index>`
  - per-word accent-folded forms
  - the search index of ~13.7k entries `{key (folded), wordIdx, kind: 'head'|'form'|'en', raw}`

### 3.2 SQLite (sqliteRepo)

- The schema is exactly handoff §2.2, declared as `tauri_plugin_sql::Migration` version 1 in `lib.rs`. The DB is `sqlite:carnet.db` in the app data dir.
- `Repo` interface:
  ```ts
  interface Repo {
    loadAll(): Promise<{ cards: Record<string, Card>; hist: Record<number, DayHist>;
                         settings: Partial<Settings>; extraToday: Record<string, number> }>;
    saveReview(card: Card & { word: string }, day: number, hist: DayHist): Promise<void>; // one transaction
    setSetting<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void>;
    addExtraToday(word: string, day: number): Promise<void>;
    replaceAll(data: BackupData): Promise<void>;   // import: one transaction
    eraseProgress(): Promise<void>;                // cards + history + extra_today, keeps settings
    dataPath(): Promise<string>;
  }
  ```
- Settings are stored as JSON strings per key. Defaults (handoff §2.2) live in `data/types.ts`; the store merges loaded values over the defaults.
- Stale `extra_today` rows (day ≠ today) are ignored on load and deleted lazily.
- **Write failure:** the store has already updated optimistically. The repo call is retried up to 3 times with backoff; after that a toast shows "Couldn't save your progress" and the state stays in memory.

### 3.3 Day numbers and backup

- `day.ts`: `today() = Math.floor((Date.now() - new Date().getTimezoneOffset()*60000) / 86400000)`. This must be identical to the web app's function (verify against its source).
- `backup.ts` implements `encode(data): string` and `decode(code): BackupData | Error`.
  - The shape is `{cards:{word:{b,d,r,w,f,l}}, hist:{day:{rev,ok,nw}}, settings}` as UTF-8-safe base64.
  - The implementation is copied from the web app's code.
  - `decode` validates the shape (objects, numeric fields, box 0–7) and returns counts for the preview.
- Backup file: `.carnet` = the same JSON (not base64), via `dialog.save/open` + `fs.writeTextFile/readTextFile`.
- Test fixture: generate a real code by running the web app in headless Chromium (Playwright), rating a few cards, and reading `localStorage['carnet-tcf-v1']` through its export button. Save it to `tests/fixtures/web-backup.txt`.

## 4. Domain logic (lib/)

Everything here is a port of the web app's behaviour as specified in handoff §3.1–3.5; details not restated. Notable decisions:

- **srs.ts** — `GAPS=[0,1,3,7,16,35,80,180]`.
  - `rate(card|undefined, rating, today) → {card, isNew}`.
  - `previewInterval(card, rating)` returns the chip text ("tomorrow", "in 2 days", "today again"…).
  - `status(card) → 'new'|'learning'|'familiar'|'mastered'`.
- **session.ts**
  - `buildSession({words, cards, hist, settings, extraToday, today, extraNew}) → wordIdx[]`: due (oldest first) → extra_today → new in rank order up to the allowance → cap at `sessionSize`.
  - `matchesFilters(word, levels, tests)`.
  - `countMatching`.
  - The queue helper `reinsertForgotten(queue, pos, idx, 4)`.
- **distractors.ts**
  - `mcOptions(idx, direction)`: same POS, rank window ±150, widening ×2 until there are 3 candidates. The correct answer's meaning is never duplicated.
  - `listenOptions(idx)`: same first 2 letters (falling back to 1), length within ±2, and a sound key different from the answer and from each other.
  - Both take an injectable `rng` so tests are deterministic.
  - `stripFrenchHints(english)` removes parentheses containing French.
- **sound-key.ts** — `soundKey(s)`: lowercase → strip accents → merge `-er/-ez/-é/-ai/-ais/-ait` → `e` → drop silent final `s x t d e`. The exact order follows the web app.
- **answer-match.ts** — `matchTyped(input, word) → {ok: boolean, accentHint?: string}`.
  - Accepted: an optional leading article; any heard form; an accent-folded match (ok, with a hint); a different word with the same sound key (ok).
- **search.ts** — `search(query, limit=50) → {wordIdx, matchedForm?}[]`.
  - Ranking: exact headword > exact form > prefix > English word match > substring, with ties broken by rank.
  - Accent- and case-insensitive.
- **stats.ts**
  - `streak(hist, today)`
  - `statusCounts(cards)`
  - `byLevel(words, cards)`
  - `last14(hist, today)`
  - `accuracy`

## 5. Store (store/useCarnet.ts)

- **State:** `ready | error`, `cards`, `hist`, `settings`, `extraToday`, `today`, plus derived selectors (`dueCount`, `newAvailable`, `filteredCount`, `streak`).
- **Actions:**
  - `init()` loads the repo; a failure puts BootGate into `error` (the migration-failed screen).
  - `rate(wordIdx, rating)` runs srs.rate, updates cards and today's hist (`rev++`, `ok++` if the answer was right, `nw++` if the word is new), then calls `repo.saveReview`.
  - `setSetting`.
  - `addToToday`.
  - `learnMore()` does `extraNewToday += 10` (stored as `{day, n}`; a different day counts as 0).
  - `importBackup`.
  - `erase`.
- `today` is recomputed when the window gets focus and on a 1-minute timer, so the day rolls over at midnight.

## 6. UI

### 6.1 Routing and shell

- `HashRouter`. BootGate shows the loading state (fonts + words + repo), then either the migration-error screen ("Open data folder" via the opener plugin, "Quit") or `/welcome` if `!settings.onboarded`, else the app.
- `AppShell` routes: `/study`, `/search`, `/progress`, `/settings`.
  - TitleBar: 36 px, with `data-tauri-drag-region`. Double-click maximizes. Min/max/close use the `@tauri-apps/api/window` API; in a browser these are no-ops.
  - Sidebar: 232 px, collapsing to 72 px (icons + tooltips) below 1100 px.
- Full-bleed routes: `/session` (state passed via the store: queue, game, practice flag) and `/welcome`.
- Global Ctrl+K navigates to `/search` and focuses the field.

### 6.2 Session engine (`features/session/useSession.ts`)

- **State:** `queue`, `pos`, `game` per card (Mix picks at random among flip/mc/listen at card-open time), `practice` (boolean), `results[]`, `missed: Set`.
- **Game components** take `{wordIdx, onResult(rating), audio}`: `FlipCard`, `MultipleChoice` (direction fr-en/en-fr/both), `ListenChoose`, `ListenType`. MC and listen map a right answer to `knew` and a wrong one to `forgot`.
- **On a result:**
  - If this isn't a practice round, call `store.rate`.
  - If the rating is `forgot`, re-insert the card 4 positions later.
  - Advance, and prefetch audio for the next 3 cards.
- **Esc:** if under half done, a confirm dialog asks "End session? Progress so far is saved."; otherwise it goes straight to the Complete screen.
- **Complete screen:** remembered/total, accuracy, new words, streak, due tomorrow, the missed list, "Practise these words" (starts a practice session), Back to study, Learn 10 more.
- **Keyboard:** one `useHotkeys(map)` hook per screen, ignoring keys typed into inputs except Enter/Esc. Keys per handoff §3.3, with R/S for listening.

### 6.3 Screens

These are built to the handoff's exact measurements (§4) and tokens (§6); the handoff is referenced, not duplicated.

- **Study** — heading + date; session card with stats, the game Segmented control and the conditional direction/mode rows; Start / Learn 10 more; filters card with level pills and a tests popover (5×8 grid + All/None); the "N of 4,842" count; notebook bar.
  - States: nothing due ("All done for today" + next due date + Learn 10 more); 0 matches (Start disabled + hint).
- **Session** — top bar (End session + Esc key cap, progress track, n / total) + game + feedback bars.
  - Flip animation: rotateY 320 ms `cubic-bezier(.2,.7,.2,1)`, becoming a crossfade under `prefers-reduced-motion`.
  - Listening ring pulse.
- **Search**
  - A 380 px list pane with arrow-key navigation plus a detail pane.
  - Empty state with recent searches, which are kept in settings under a new key `recentSearches` (max 8, excluded from backups).
  - No-results state.
  - "Practise now" (practice round of 1) and "Add to today's reviews".
- **Progress** — 4 tiles, by-level stacked bars, a 14-day stacked column chart (plain divs) with a hover tooltip and empty slots.
- **Settings**
  - Study, Audio, Appearance, Your data, App and Danger sections, as in §3.7 of the handoff (with the §1 deferrals).
  - Paste code opens a dialog: validate → preview counts → confirm → replace. An invalid code shows the inline "That code isn't a valid Carnet backup".
  - Erase opens a dialog that requires typing "erase".
  - About shows the Piper `fr_FR-siwis-medium` (CC BY 4.0) credit and the transcript source note.
- **Welcome** — 50/50 split: dark left panel; right side with the 3 pace tiles, level pills (selecting a level pre-selects it and every level above it), the reminder switch and time, and Start learning. "Import a backup code" opens the same paste dialog; after a successful import `onboarded` is set to true.
- **Theme** — `settings.theme` sets `data-theme` on `<html>`, and "system" follows `matchMedia('(prefers-color-scheme: dark)')` live. Dark tokens come from handoff §6.
- **Focus rings** — `2px` accent with a 2 px offset (dark: `#8FA6F0`) on every interactive element, via `:focus-visible`.
- **Toasts** — shadcn/sonner, restyled. Used for audio fallback (once per run), save failure, copied code, and backup saved/restored.

### 6.4 Styling

- `tokens.css` defines every §6 colour as CSS variables for `:root` and `[data-theme=dark]`. `tailwind.config` maps them to semantic names (`paper`, `chrome`, `surface`, `line`, `line-strong`, `track`, `ink`…`ink-4`, `accent`…, `forgot|hard|knew-{bg,border,text,sub,solid}`), along with the font families, radii and shadows.
- Fonts are self-hosted from `src/assets/fonts` (OFL, downloaded from Google Fonts at setup). There are no network requests at runtime.
- Icons come from lucide-react at stroke 1.75, 16–20 px.

## 7. Audio (lib/audio)

- **packs.ts**
  - `url(file)`: in Tauri, `convertFileSrc(await resolveResource('resources/' + file))`; in a browser, `/resources/` + file.
  - `getPack(file)`: fetch → ArrayBuffer, held in an LRU cache of 12 with in-flight dedupe.
  - `clipOffset(kind, i)` is precomputed at load as cumulative sums per pack (`start` = first clip index of the pack).
- **player.ts**
  - One `AudioContext`, resumed on the first user gesture.
  - `playWord(i, rate?)` / `playSentence(i, rate?)`: slice → `decodeAudioData` (decoded clips held in an LRU cache of 64) → WSOLA when `rate ≠ 1` → play.
  - A new playback stops the current one.
  - Exposes a `loading`/`playing` state so buttons can show the spinner and the pulse.
  - `prefetch(wordIdxs)` fetches the packs for those words and their sentences.
- **wsola.ts** — ported verbatim from the web app (comment at line ~428 of `carnet-tcf.html`) and typed.
- **tts.ts** — `speechSynthesis` with a `fr-FR` voice.
  - Used when `settings.voice === 'device'`, or on a pack fetch/decode failure (one-time toast "Using Windows voice for audio").
  - If no voice exists at all, it fails silently.
- **CSP** — the handoff CSP, plus `connect-src ipc: http://ipc.localhost asset: http://asset.localhost` and `media-src asset: http://asset.localhost blob:`, as needed for `convertFileSrc` fetches. The asset protocol is enabled with its scope limited to `$RESOURCE/**`.

## 8. Error handling summary

| Failure | Behaviour |
|---|---|
| DB open/migration fails | BootGate blocking screen: message + "Open data folder" + "Quit" |
| words.json fails to load | Same blocking screen (message "App data is missing — reinstall") |
| Review write fails | 3 retries, then toast; in-memory state kept |
| Audio pack fails | TTS fallback + one-time toast |
| Invalid backup code/file | Inline error in the dialog; nothing replaced |
| Import write fails | Transaction rolled back; toast; store reloads from repo |

## 9. Testing

- **Vitest (unit)**
  - `srs`: every rating × box 0–7, the new-word Knew-it jump to box 2, Hard on box 1 giving "today again", chip text.
  - `session`: order, the allowance with newAlreadyToday + extraNew, the extra_today position, the cap, filters (none = all).
  - `answer-match`: heard forms, missing accent + hint, homophone (*cours*/*cour*), optional article, wrong answer.
  - `sound-key`: the table of cases.
  - `distractors`: same POS, rank window, no duplicates, homophone exclusion, deterministic with a seeded rng.
  - `search`: the ranking order, *allons*→*aller*, *to wait*→*attendre*, accent-insensitive, and < 30 ms over the full index.
  - `backup`: decoding the real web fixture, and encode→decode round-trip equality.
  - `stats`: streak including the "today not done yet" rule, and last14.
- **Playwright (e2e)** on `vite preview` using memoryRepo:
  - onboarding
  - a flip session with ratings
  - MC (both directions)
  - listen-choose and listen-type (audio served from `public/resources`)
  - the session-complete → practice flow
  - search + add to today
  - backup copy → erase → paste restore
  - theme toggle
  - reference screenshots of each screen at 1280×800 for visual comparison with `screenshots/*.png`
- **Manual in `tauri dev`**: the SQLite repo persists across restarts, the file backup save/open round-trips, and audio plays from resources.
- **Linux prerequisite** (one-time, user runs with sudo): `libwebkit2gtk-4.1-dev libgtk-3-dev libsoup-3.0-dev librsvg2-dev libayatana-appindicator3-dev build-essential curl wget file`.

## 10. Open items handed to later sub-projects

- Wire reminder, autostart, window-state and single-instance (sub-project 2).
- The data source for CI builds (the audio isn't in git), the updater keys, the GitHub repo, the update dialog, and `wal_checkpoint` before install (sub-project 3).
