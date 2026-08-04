# Chord App — Product & Technical Specification

**Status:** Draft v1
**Owner:** Ignacio
**Last updated:** 2026-08-04

## 1. Vision

A personal mobile app (iOS + Android) for storing and performing guitar chord sheets —
similar in spirit to Ultimate Guitar or La Cuerda, but built around **your own chord
transcriptions**. The core differentiator is a **tempo-driven auto-scroll**: each song
has a BPM, and the lyrics/chords scroll automatically at that pace so you can play
hands-free, with the ability to pause and resume at any time.

This is a personal-use tool first (single primary user, your own library). v1 is
**local-only, no backend, no login** — everything lives on the device — but the data
model is shaped so a sync backend could be bolted on later without a rewrite.

## 2. Goals

- Add songs with title, artist, and full lyrics with chords placed inline (ChordPro-style).
- View a song in a clean "performance mode": large text, chords rendered above the
  lyric they belong to, dark-mode friendly for stage/practice use.
- Auto-scroll the performance view automatically at a speed derived from the song's
  BPM/beats-per-line or its duration (§5.2) — no manual tempo control in the viewer —
  with **pause/resume** (manual or mic-triggered, §5.5).
- Organize songs: search, filter/sort by artist or title, favorites/tags.
- Back up / move your library between your own devices via manual export/import
  (JSON file) — no account or server required in v1.
- Tune your guitar via a built-in chromatic tuner, so you don't need a separate app
  before playing.
- Show the strumming pattern inline, and let it change at different points in the
  same song (verse vs. chorus, etc.) — §5.8.
- Include tablature (TAB) blocks for intros/solos/riffs, preserved exactly as written
  — §5.9.
- Ship on both iOS and Android from one codebase.

## 3. Non-Goals (v1)

- No audio playback / streaming of real recordings (see §7 roadmap — designed for later).
- No social features (sharing songs with other users, public library, comments).
- No automatic chord recognition from audio.
- No multi-user collaboration on the same song.
- No printing/PDF export (candidate for v2).
- No live/on-the-fly key transposition control in the viewer — you write chords in
  the key you intend to play them in; capo is shown as an informational label only
  (§5.3).

## 4. Target User & Core Use Case

Primary user: you, a guitar player who wants to look up their own chord sheet on a
phone/tablet propped on a stand while playing, either:
- **Free mode**: read the chart, scroll manually.
- **Timed mode**: hit play, the chart auto-scrolls at the song's tempo, hands stay on
  the guitar; pause instantly if you lose the spot (manually, or automatically — see
  §5.5 — if you stop playing).

## 5. Product Spec

### 5.1 Screens

1. **Library (Home)**
   - List of songs (title + artist), search bar, sort (title/artist/recently added),
     filter by tag/favorite.
   - Floating "+" button → New Song.
   - Tap a song → Song Detail / Performance view.
   - Swipe or long-press → Edit / Delete / Duplicate / Favorite.

2. **Song Detail / Performance View**
   - Renders the chord sheet: chord symbols shown above the lyric syllable they apply
     to, monospace-friendly layout so alignment is preserved.
   - Sticky header: song title/artist, back button, and a **Capo label** (e.g.
     "Capo 2") shown only if the song has a capo value set — purely informational,
     not editable here (set in the Editor).
   - Transport bar (bottom or top, collapsible):
     - Play/Pause auto-scroll — speed is fully automatic, derived from the song's
       stored BPM/beats-per-line or duration (§5.2); no BPM display or nudge control
       in the viewer.
     - **Follow** toggle — turns mic-based auto-pause (§5.5) on/off; reflects
       whether it's currently active.
     - "Aa" font-size button — opens a small panel with two **independent** steppers,
       **Lyrics** and **Chords**, so chord symbols can be sized up/down separately
       from the lyric text (e.g. bigger chords for reading at a glance, smaller
       lyrics to fit more per screen). Starts from the defaults set in Settings
       (§5.1 item 4), adjustable per session.
   - Manual scroll always available (dragging overrides auto-scroll and pauses it;
     resume continues from the new position).
   - Tap any chord symbol → chord diagram preview (see §5.7).
   - Strumming pattern shown as a small inline label wherever it's set/changes in the
     song (see §5.8).
   - TAB blocks (intros/solos/riffs) rendered as a distinct monospace block inline in
     the chart (see §5.9).

3. **Song Editor (Add/Edit)**
   - Fields: Title, Artist, Key (optional), Duration (mm:ss — the primary
     scroll-speed source, §5.2), BPM (with a tap-tempo helper — tap along to the
     song to estimate its BPM, since there's no live tempo control left in the
     viewer to fine-tune it later; used as the scroll-speed fallback only when
     Duration isn't set), Time signature (default 4/4), Capo, Tags.
   - Body: a text editor for the chord sheet, using inline chord notation
     (see §6 Chord Notation Format), with a live preview toggle. Uses a **monospace
     font** so TAB blocks (§5.9) stay visually aligned while typing, same as the
     Performance view.
   - "?" **Notation Guide** button in the toolbar (see §5.10) — a quick reference for
     the `[Chord]`/`{comment}`/`{strum}`/`{start_of_tab}` syntax, right where you're
     most likely to need reminding of it.
   - Chord auto-complete/validation (recognizes standard chord names, flags typos).
   - Save / Cancel; autosave draft locally to avoid losing edits.

4. **Settings**
   - Default **lyric** font size, default **chord** font size (independent, §5.1
     item 2), theme (light/dark/system).
   - Notation Guide (§5.10) — same reference as the Editor's "?" button, reachable
     here too so it's not editor-only.
   - Follow Mode detection: **Precise / Simple** toggle (§5.5) — a fallback if
     on-device pitch detection proves unreliable in your room/setup.
   - Export library (JSON backup) — share via the OS share sheet (AirDrop, email,
     Google Drive, Files app, etc.).
   - Import library (JSON) — pick a file, merge or replace.
   - About / version.

5. **Tuner**
   - Accessible from a persistent icon (e.g. in the Library header, or a bottom-tab
     icon) so it's reachable in one tap from anywhere.
   - See §5.6 for behavior.

### 5.2 Auto-scroll engine (v1)

Two ways to drive scroll speed, chosen automatically per song based on what data it
has (a song only needs to fill in one of these — whichever is easier for that song):

1. **Total duration** (primary): you enter how long the song takes to play (mm:ss)
   and the chart scrolls linearly across that time — no per-line beat accounting
   needed, and tied directly to the song's actual real-world length rather than a
   computed estimate, so it's the more reliable of the two when both are available.
2. **BPM + beats-per-line** (fallback, used only when no duration is set): each line
   advances proportionally to how many musical beats it spans — useful when you know
   a rough tempo but haven't timed the song exactly yet.

Selection order at playback time: if the song has a `durationSec` → use the duration
engine (**duration always wins** when both are set); else if it has BPM **and**
beats-per-line set for its lines → use the BPM engine; else auto-scroll is
unavailable for that song (manual scroll still works).

- **Duration engine**: `scrollProgress = elapsedMs / (durationSec * 1000)`;
  `scrollY = scrollProgress * totalContentHeight` — a straight linear interpolation
  across the whole chart, no per-line data required.
- **BPM engine**: the chord sheet is broken into lines (from newlines in the source
  text). You assign (once, during editing, or via a quick default) how many **beats**
  each line spans — default: infer from time signature (`beatsPerLine =
  timeSignature.numerator`), overridable per line for intros, held notes, etc.
  - `msPerBeat = 60000 / bpm`
  - `msPerLine = msPerBeat * beatsPerLine`
- Either way, the engine advances a virtual playhead in time and maps elapsed time to
  a target scroll offset, animating the scroll view smoothly between lines (no
  line-snapping jumps).
- **Pause/Resume**: pause freezes the virtual playhead; resume continues from the same
  elapsed time (not restarting). Triggered manually (transport button) or
  automatically (§5.5, mic-based auto-pause).
- **Manual override**: touching/dragging the scroll view pauses auto-scroll and
  re-anchors the virtual playhead to the new visual position on release, so resuming
  continues sensibly from where you scrolled to.
- No live tempo control in the viewer — BPM/beats-per-line and duration are fixed
  per-song values set in the Editor (§5.1); if a song's tempo feels off during
  playback, that's a signal to go adjust its BPM/duration in the Editor, not something
  you nudge live.
- **Count-in (optional, nice-to-have)**: a 1-bar metronome click/flash before scroll
  starts, so you know when to start playing.
- Engineering note: this is intentionally a **pluggable time source** — both the BPM
  clock and the duration clock are just different implementations of "elapsed time →
  target scroll offset." A future audio-sync mode (§7) is a third time source
  (`audioPlayer.currentTime`) using the exact same scroll-mapping logic.

### 5.3 Capo

- Capo is a per-song value set once in the Editor (§5.1) — not a live control. If a
  song's shown in a capo'd position, that's simply how you chose to write the chord
  sheet.
- Shown in the Performance view as a small informational label near the title (e.g.
  "Capo 2") so you know to place the capo before playing — purely display, not
  editable from the viewer.
- No live transposition/key-change in v1 (§3 Non-Goals) — chords are written exactly
  as you intend to play them, so there's nothing to compute or toggle at playback
  time.

### 5.4 Library management

- Search by title/artist (client-side filter on the loaded library; fine at personal-
  library scale).
- Tags (free-form, e.g. "acoustic", "band X", "practice").
- Favorites (boolean flag, quick filter).
- Sort: title A-Z, artist A-Z, recently added, recently played.

### 5.5 Mic-based auto-pause ("Follow Mode")

While auto-scroll is playing, the app listens via the microphone and detects whether
you're actually playing guitar (real note onsets/pitch, not just "is there sound") —
if you stop playing, the scroll auto-pauses; when you start again, it auto-resumes
from the same spot.

- **Opt-in**: off by default, enabled per-session via a toggle on the transport bar
  (labelled e.g. "Follow"); mic permission is only requested the first time you enable
  it, and the app is fully usable without ever granting it (manual play/pause always
  works).
- **Detection**: analyzes the mic input for note onsets in the guitar's fundamental
  frequency range (~80Hz–1200Hz), not just volume — distinguishes "you stopped
  playing" from background noise/talking, and (unlike simple silence detection) isn't
  fooled by ambient room noise.
- **Auto-pause**: if no onset is detected for a grace period (default: max(2 seconds,
  2 beats at the song's BPM) — configurable), pause the scroll.
- **Auto-resume**: only auto-resumes a pause that *Follow Mode itself* triggered (a
  manual pause always requires a manual resume, so you can safely put the guitar down
  mid-song without it jumping forward on the next stray noise). Requires a short run
  of consistent onsets (not a single detected note) before resuming, to avoid
  false-positive resumes from a cough, a door closing, etc.
- **Privacy**: audio is analyzed on-device only, in memory, in real time — never
  recorded to a file, stored, or transmitted anywhere.
- **Detection mode fallback**: a manual **Precise / Simple** toggle in Settings.
  "Precise" (default) is the onset/pitch detection described above. "Simple" is a
  basic volume/silence-threshold mode (pause when input level drops below a
  threshold for the grace period, no pitch analysis) — a safety net for rooms/setups
  where pitch detection turns out to be unreliable, at the cost of being more easily
  fooled by background noise.
- Engineering risk note: this is the most technically involved piece of v1 (see §8.8)
  — recommend prototyping the detection pipeline early, before building the rest of
  the app around it, to confirm feasibility and tune thresholds before committing to
  the UX around it.

### 5.6 Guitar Tuner

A chromatic tuner screen, reusing the same mic-capture + pitch-detection pipeline
built for Follow Mode (§5.5/§8.8) — here running in **continuous pitch-tracking**
mode instead of onset/silence detection.

- **Auto string detection**: no need to pick a string manually — the app continuously
  listens, finds the detected pitch's nearest note among standard tuning (E2 A2 D3 G3
  B3 E4), and shows that string as the active one. (A manual string picker is offered
  as a fallback for edge cases like a harmonic being misread as the wrong string.)
- **Display**: string name (e.g. "A"), detected frequency, and how far off in cents —
  shown as a **needle/gauge** (reference: GuitarTuna's tuner UI) that swings toward
  center and turns green within a small tolerance (e.g. ±5 cents) of the target
  pitch. A continuous needle reads pitch drift more precisely than a coarse flat/
  in-tune/sharp indicator would.
- **Tunings**: standard tuning (EADGBE) only in v1; a picker for common alternates
  (Drop D, Open G, etc.) is a natural v2 addition once standard tuning is working well.
- **Mic permission**: shares the same permission flow as Follow Mode (§8.8) — if
  already granted there, no extra prompt; if not, requested the first time the Tuner
  screen is opened.
- Reuses the pitch-detection algorithm from §8.8, just in a different mode (continuous
  tracking + note-matching, vs. onset/silence detection) — no new audio-capture
  infrastructure needed.

### 5.7 Chord Diagram Preview

Tapping any chord symbol in the Performance view (or the Editor's live preview) opens
a small diagram showing how to play it — a fretboard grid with dots for finger
positions, "X"/"O" above muted/open strings, drawn with code (SVG), not image assets.

- **Interaction**: tap a chord chip → a popover/bottom-sheet appears near/below it
  with the diagram; tap elsewhere or swipe down to dismiss. Doesn't interrupt
  auto-scroll if it's playing (diagram overlays on top; scroll keeps advancing behind
  it, unless you're paused already).
- **Multiple voicings**: many chords have more than one common shape (open position,
  barre, etc.) — if the data source has more than one, show a small dot-indicator row
  to swipe between them, defaulting to the first/most common voicing.
- **Lookup by chord name as written**: since there's no live transpose (§5.3), the
  diagram is simply looked up by the exact chord symbol parsed from the song text —
  no transform step involved.
- **Fallback**: if a chord name isn't found in the diagram data (rare, exotic
  voicings), show "No diagram available" rather than blocking the tap entirely.

### 5.8 Strumming Pattern

Many songs change strum pattern between sections (e.g. a soft down-strokes-only
verse, a fuller down-up chorus) — the pattern is written inline in the chord sheet
(§6) wherever it changes and rendered as a small static label at that point, the same
way a chord chip is rendered above a lyric.

- **Notation**: a `{strum: ...}` directive line, e.g. `{strum: D-DU-UDU-}`, using one
  character per stroke slot: `D` = downstroke, `U` = upstroke, `X` = muted/percussive
  hit, `-` = rest/no stroke. Slot resolution (eighth vs. sixteenth notes) is
  auto-detected from the string's length rather than fixed — 8 characters is read as
  one 4/4 bar of eighth notes, 16 as one 4/4 bar of sixteenth notes (scaled
  accordingly for other time signatures). Two or more bars can be written together
  separated by `|`, e.g. `{strum: D-D-D-DU|D-D-D-DU}`, rendered as separate grouped
  rows. This mirrors how `[Chord]` markers work — plain text, no special editor UI
  required, though the Editor (§5.1) offers a simple tap-to-build helper (tap
  down/up/mute/rest buttons in sequence to compose the string) for anyone who doesn't
  want to type the raw notation by hand.
- **Text-label fallback**: if the value after `{strum:}` isn't made up of `D`/`U`/`X`/
  `-`/`|` characters (e.g. `{strum: Finger picking}`), it's rendered as a plain text
  label instead of arrow glyphs — covers fingerpicking or other non-strummed sections
  that don't have a down/up pattern to show.
- **Scope**: a `{strum: ...}` directive applies to every line after it until the next
  `{strum: ...}` directive (or `{strum: none}` to stop showing one, e.g. for a spoken/
  freeform bridge) — there's no separate "section" concept in the data model; the
  directive itself marks where a section's feel starts, consistent with how
  `beatsPerLine` overrides already work (§5.2).
- **Display**: rendered as a row of glyphs (↓ down, ↑ up, x mute, – rest) on its own
  line in the chart wherever the directive appears — a static label you read once per
  section (not animated/beat-synced — decided against building a live version, the
  static label is sufficient).
- **Independent of the scroll engine**: since it's a static label, it works the same
  whether the song uses the BPM engine or the duration engine (§5.2) — no beat-timing
  dependency in v1.

### 5.9 Tablature (TAB) Blocks

For intros, solos, riffs, or anything better shown as a note-by-note tab rather than
chords-over-lyrics, a block of raw six-line ASCII tab can be embedded directly in the
chord sheet and is rendered exactly as typed, in monospace, with no chord/lyric
parsing applied inside it.

- **Notation**: reuses the standard ChordPro `{start_of_tab}` / `{end_of_tab}` (short
  aliases `{sot}` / `{eot}`) directive pair — everything between them is treated as
  verbatim monospace text, e.g.:
  ```
  {comment: Intro}
  {start_of_tab}
  e|-------0-----0-|
  B|-----1-----1---|
  G|---0-------0---|
  D|---------------|
  A|---------------|
  E|---------------|
  {end_of_tab}
  ```
- **Section labels**: the standard `{comment: ...}` directive (e.g.
  `{comment: Verse 1}`, `{comment: Estribillo}`, `{comment: Solo}`) can be placed
  anywhere — before a verse, a chorus, a TAB block, wherever — free text, no fixed
  vocabulary. Rendered clearly set apart from the lyric/chord content: bold,
  uppercase, in the theme's accent color, with extra spacing above it so a new
  section visually breaks from the previous one at a glance while scrolling. Doesn't
  affect the scroll engine (§5.2) — it's a label only, still just "another line" for
  timing purposes.
- **Display**: each TAB block renders as a visually distinct region (e.g. a bordered/
  shaded box) so it reads as clearly separate from the surrounding chords-over-lyrics
  content, still inline in the normal scroll flow — no separate screen or modal.
- **Scroll engine integration**: no special-casing needed — each raw line inside a TAB
  block is just another line to the scroll engine (§5.2). On the BPM engine it gets
  the same default/overridable `beatsPerLine` as any other line (useful here: a
  4-bar solo written as 4 tab lines naturally gets ~4 beats each if you leave the
  default, or you override per line same as you would for a held chord); on the
  duration engine it's simply part of the total scrolled content.
- **Editing**: typed as plain monospace text like everything else in the chord sheet
  (§5.1) — no special tab-editing UI in v1 (e.g. no fretboard-tap tab builder); you
  paste or type the ASCII tab directly, same as you'd write it anywhere else.

### 5.10 Notation Guide

A static, always-available reference for the chord-sheet syntax (§6) — with the
format spanning chords, section labels, strum patterns, and TAB blocks by now, a
quick cheat-sheet beats having to remember it all or hunt through a past song for an
example.

- **Reachable from**: the Editor toolbar (§5.1 item 3, where you need it most, while
  actively typing) and Settings (§5.1 item 4, for a persistent entry point regardless
  of context).
- **Content**: one short example per directive, showing the raw text next to how it
  renders — `[Chord]word`, `{comment: ...}`, `{strum: ...}` (including the D/U/X/-/|
  glyph legend and the text-label fallback), `{start_of_tab}`/`{end_of_tab}`, and the
  song-level metadata directives (`title`, `artist`, `key`, `bpm`, `time`, `capo`,
  `duration`).
- **Implementation**: purely static content (no data model involved) — a simple
  scrollable screen/modal, cheap to build and to keep in sync as the format grows.

## 6. Chord Notation Format

Inline **ChordPro-style** notation: chords are written in square brackets immediately
before the syllable/word they apply to.

```
{title: Wonderwall}
{artist: Oasis}
{key: Fsharpm}
{bpm: 87}
{time: 4/4}
{duration: 4:18}

{strum: D-DU-UDU-}
[Em7]Today is gonna be the [G]day
That they're gonna throw it [Dsus4]back to [A7sus4]you
[Em7]By now you should've [G]somehow
[Dsus4]Realized what you gotta [A7sus4]do

{strum: D-D-D-D-}
[C]And all the [D]roads we [G]have to [Em7]walk are winding
```

- `{directive: value}` lines hold song metadata and structure. Song-level metadata
  (only meaningful at the top of the file): `title`, `artist`, `key`, `bpm`, `time`,
  `capo`, plus the non-standard `duration` (mm:ss, §5.2). Body directives (meant to
  repeat throughout, wherever relevant): the non-standard `strum` (§5.8), and the
  standard ChordPro `comment` and `start_of_tab`/`end_of_tab` (`sot`/`eot`) pair for
  TAB blocks (§5.9).
- Every other line is lyric text with `[Chord]` markers inline. **One chord per
  bracket, always** — never group multiple chords in a single `[...]` (e.g. write
  `[Cadd9] [D]`, not `[Cadd9 D]`); this keeps each chord tied to one exact character
  position for rendering, transposition-free lookup (§5.7), and wrapping correctly on
  a narrow phone screen.
- A line with no lyrics (e.g. an instrumental bar) is written as just chords:
  `[Em] [G] [D] [A]`.
- Section labels (`Intro`, `Verse 1`, `Chorus`, `Outro`, etc.), including repeat
  counts, use `{comment: ...}` — e.g. `{comment: Intro (x2)}` — not square brackets,
  since `[...]` is reserved for chords.
- This is stored as **one plain-text field per song** (`chordSheet: string`). A parser
  (see §8.4) turns it into a render-ready structure
  (`{ lines: { text: string; chords: { index: number; symbol: string }[] }[] }`) and
  reads the `{...}` directives into the song's structured metadata fields.
- Rationale: plain text is simple to store, diff, back up, export, and hand-edit; it's
  also the closest thing to a de-facto standard, so any future import/export
  compatibility with other tools is easier.

## 7. Roadmap (post-v1)

| Version | Scope |
|---|---|
| v1 (MVP) | Everything in §5, BPM-driven and duration-driven scroll, mic-based auto-pause ("Follow Mode"), chromatic guitar tuner, tap-to-preview chord diagrams (SVG, via `chords-db`), static inline strumming-pattern labels, TAB blocks for intros/solos, in-app Notation Guide, independent lyric/chord font sizing, **local-only storage** (no backend/login), ChordPro-style editor, manual JSON export/import |
| v2 | Optional cloud sync (e.g. Supabase) for multi-device use — added only if manual export/import becomes a real pain point; optional audio-sync scroll mode (attach a recording, scroll follows real playback); alternate tunings in the tuner (Drop D, Open G, etc.); PDF export/print |
| v3 | Multi-user support (if ever opened up), setlists (ordered song lists for a gig), Apple Watch/tvOS companion for the transport controls |

## 8. Technical Spec

### 8.1 Stack

| Layer | Choice |
|---|---|
| Language | TypeScript (strict mode) |
| Mobile framework | React Native via **Expo** (managed workflow) |
| Navigation | **React Navigation** (native stack navigator; Library, Song Detail, Song Editor, Settings, Tuner as screens) |
| State management | Zustand (UI/player state) + TanStack Query (wraps the local DB calls for caching/invalidation) |
| Backend | **None in v1** — fully local, no server, no login |
| Local storage | SQLite on-device via `expo-sqlite`, accessed through **Drizzle ORM** (typed schema + migrations, and the same schema can target Postgres later with minimal changes) |
| Backup/restore | Manual JSON export/import: `expo-file-system` to write/read a backup file, `expo-sharing` to hand it to the OS share sheet (AirDrop, email, Google Drive, Files, etc.), `expo-document-picker` to import |
| Animations / scroll | `react-native-reanimated` + `react-native-gesture-handler` for the auto-scroll engine and drag-to-override |
| Mic input / audio analysis | Streaming raw PCM via a native audio module (e.g. `@siteed/expo-audio-stream` or an equivalent config-plugin-based streaming mic library) + an on-device onset/pitch detection algorithm (see §8.8) |
| Chord diagrams | `react-native-svg` for rendering + `@tombatossals/chords-db` (bundled JSON) for fret-position data — no image assets (see §8.9) |
| Styling | `nativewind` (Tailwind for RN) or plain `StyleSheet` — designer's call, not load-bearing |
| Build/Deploy | **Expo Dev Client** + EAS Build + EAS Submit (App Store / Play Store), EAS Update for OTA JS updates — plain Expo Go can't be used once a real-time mic-streaming native module is added (see §8.8/§9) |
| Testing | Jest + React Native Testing Library (unit/component), Detox or Maestro (E2E) — optional for a personal project, recommended once the app stabilizes |

**Why no backend in v1:** for a single-user app, a server only buys you *automatic*
multi-device sync — everything else (storage, search, editing) works fine fully local.
Skipping it means no accounts, no hosting to think about, no network dependency, and a
much smaller v1 to ship. If manual export/import between your own devices turns out to
be annoying in practice, add sync in v2 (Supabase's free tier comfortably covers a
personal library — see §9) without needing to redesign the data model, since it's
already shaped with the fields a sync layer would need (`id`, `updatedAt`).

### 8.2 Data model (local SQLite, via Drizzle ORM)

```ts
// src/db/schema.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const songs = sqliteTable('songs', {
  id:          text('id').primaryKey(),        // uuid, generated client-side
  title:       text('title').notNull(),
  artist:      text('artist').notNull(),
  originalKey: text('original_key'),            // e.g. "F#m"
  bpm:         integer('bpm'),
  timeSigNum:  integer('time_sig_num').default(4),
  timeSigDen:  integer('time_sig_den').default(4),
  capo:        integer('capo').default(0),
  durationSec: integer('duration_sec'),           // used by the duration scroll engine, §5.2
  chordSheet:  text('chord_sheet').notNull(),    // ChordPro-style source, see §6
  tags:        text('tags').default('[]'),        // JSON-encoded string[]
  isFavorite:  integer('is_favorite', { mode: 'boolean' }).default(false),
  createdAt:   text('created_at').notNull(),      // ISO string
  updatedAt:   text('updated_at').notNull(),       // ISO string
});
```

- `chordSheet` is the single source of truth for lyrics + chords (see §6).
- `bpm`/`timeSig*`/`capo` are structured columns even though they're also expressible
  as `{directive}` lines in `chordSheet` — on save, the editor parses the directives
  out of the text and writes them to these columns too, so the app can query/sort/
  filter without re-parsing every song's text (e.g. "songs with no BPM set yet").
- `id` (client-generated uuid) and `updatedAt` are included from day one even though
  nothing consumes them yet in v1 — they're exactly what a future sync layer (or the
  JSON export/import format) needs, so no migration is required to add sync later.
- No `ownerId`/RLS needed — the whole DB belongs to whoever's device it's on.

### 8.3 App architecture

```
App.tsx                    # NavigationContainer + RootNavigator
src/
  navigation/
    RootNavigator.tsx       # native stack: Library, SongDetail, SongEditor, Settings, Tuner
    types.ts                 # navigation param list types
  screens/
    LibraryScreen.tsx
    SongDetailScreen.tsx     # Performance view
    SongEditorScreen.tsx
    SettingsScreen.tsx
    TunerScreen.tsx
    NotationGuideScreen.tsx  # §5.10
  db/
    client.ts               # expo-sqlite database handle
    schema.ts                # Drizzle schema (§8.2)
    migrations/               # Drizzle-generated migration files
    songs.ts                  # CRUD queries, wrapped in TanStack Query hooks
    backup.ts                 # export-to-JSON / import-from-JSON
  chordpro/
    parser.ts              # text -> ParsedSong (lines, chords, directives)
    types.ts
  scroll-engine/
    useScrollEngine.ts      # time source -> scrollOffset, pause/resume, nudge
    timeSources/
      bpmClock.ts           # v1: wall-clock + bpm
      (audioClock.ts)        # v2 placeholder: driven by audio player position
  components/
    ChordSheetView.tsx      # renders parsed song with chords positioned over lyrics
    TransportBar.tsx
    SongListItem.tsx
  state/
    playerStore.ts          # zustand: isPlaying, bpm, position, transpose amount
```

### 8.4 Chord sheet parser

- Input: raw `chord_sheet` text (§6 format).
- Output: `ParsedSong { meta: {title, artist, bpm, key, time, capo, duration}, lines:
  ParsedLine[] }`, where `ParsedLine` is a union of:
  - a lyric line: `{ type: 'lyric', text: string, chords: {charIndex: number, symbol: string}[] }`
  - a strum-marker line: `{ type: 'strum', pattern: string }` (from `{strum: ...}`, §5.8)
  - a comment/section-label line: `{ type: 'comment', text: string }` (from `{comment: ...}`, §5.9)
  - a tab line: `{ type: 'tab', text: string }` (one per raw line between
    `{start_of_tab}`/`{end_of_tab}`, §5.9)

  so `ChordSheetView` can render each in place, in document order — consecutive `tab`
  lines are grouped into one bordered block by the renderer.
- Implementation: a small hand-written parser (regex-based line scanner) is enough —
  no need for a full ChordPro library given the deliberately reduced directive set in
  §6. Keep it pure/unit-testable (`parse(text: string): ParsedSong`), independent of
  React, so it can be tested directly with Jest.
- Rendering: `ChordSheetView` lays out each line as lyric text with chord symbols
  absolutely positioned above the character offset they were parsed at (measured via
  `onTextLayout` / a monospace font assumption for simplicity in v1).

### 8.5 Auto-scroll engine details

- `useScrollEngine({ bpm, beatsPerLine, lineHeights, isPlaying })` returns
  `{ scrollY, play, pause, seekToLine, nudgeBpm }`, built on
  `react-native-reanimated`'s `useSharedValue` + `withTiming`/a manual frame loop
  (`useFrameCallback`) so the scroll position updates smoothly every frame rather than
  jumping line-to-line.
- Pausing simply stops the frame callback from advancing the virtual clock; resuming
  restarts it from the stored elapsed time.
- Manual drag: `react-native-gesture-handler`'s pan gesture on the scroll view sets
  `isPlaying = false` and, on release, recomputes the virtual elapsed time from the new
  scroll offset (inverse of the offset→time mapping) so a subsequent `play()` continues
  from the right place.

### 8.6 Backup & restore (replaces auth/sync in v1)

- No login, no account, no network calls — the app works fully offline from first
  launch.
- **Export**: serialize all rows in `songs` to a single JSON file (`chord-app-backup-
  2026-08-04.json`), write it via `expo-file-system`, hand it to the OS share sheet via
  `expo-sharing` (AirDrop to your other device, save to Google Drive/iCloud, email to
  yourself, etc.).
- **Import**: pick a previously exported JSON file via `expo-document-picker`, validate
  it against the schema, then either merge (skip/overwrite duplicates by `id`) or
  replace the whole library — user chooses which on import.
- This is the whole "sync" story for v1: moving a song to another device is an
  explicit, user-initiated action rather than automatic. Revisit with real cloud sync
  (§7 v2) only if this proves annoying in daily use.

### 8.7 Non-functional requirements

- **Performance**: library scale is small (personal use, likely well under 1,000
  songs), so no pagination/virtualization concerns beyond a standard `FlatList`; local
  SQLite queries are effectively instant at this scale.
- **Offline**: the entire app works offline, always — there is no network dependency
  in v1.
- **Accessibility**: adjustable font size (already in scope, §5.1) covers the main
  need; respect system dark mode.
- **Security**: no data ever leaves the device in v1 (no server, no third-party
  service), which is the simplest possible security posture; the only "leak" surface is
  a user-initiated export file, which is the user's own responsibility once shared.

### 8.8 Mic input pipeline (Follow Mode §5.5 & Tuner §5.6)

Both features share one audio-capture + pitch-detection pipeline; they differ only in
how the detected pitch is used downstream:
- **Follow Mode**: cares about onsets/silence over time (is a note happening or not).
- **Tuner**: cares about the precise, continuously-tracked frequency of whatever note
  is currently ringing, matched to the nearest standard-tuning note.

- **Audio capture**: plain Expo/`expo-av` only exposes file-based recording, not a
  live PCM stream, so this needs a streaming-audio native module (e.g.
  `@siteed/expo-audio-stream`, or an equivalent) delivering short raw-PCM buffers
  (e.g. ~2048 samples / ~46ms at 44.1kHz) to JS at a steady rate.
- **Onset/pitch detection**: run a lightweight pitch-detection algorithm (autocorrelation-
  or YIN-based) on each buffer to determine (a) is a fundamental frequency present in
  the guitar range (~80Hz–1200Hz) and (b) has it changed enough since the last buffer
  to count as a new note onset (vs. a sustained note still ringing). Autocorrelation on
  a ~2048-sample buffer is cheap enough to run on the JS thread at this rate; if it
  turns out to jank the UI, move it to a `react-native-worklets-core`/native worklet.
  A pure-JS library (e.g. `pitchfinder`) covers the core algorithm — plan to prototype
  with it first before considering a custom native DSP module.
  - **v1 build note**: this is more than volume/silence thresholding but is intentionally
    stopping short of full instrument/note recognition against the actual chord
    chart — it only needs to answer "is a plucked/strummed note happening right now,"
    not "is it the *correct* note." Matching against the expected chord is an
    interesting future enhancement, not v1 scope.
- **Grace period / hysteresis**: track a rolling "last onset detected at" timestamp;
  auto-pause fires when `now - lastOnsetAt > gracePeriod` (§5.5 default: max(2s, 2
  beats)); auto-resume requires `N` consecutive buffers with a detected onset (not
  just one) before triggering, to filter out one-off noises.
- **Simple detection mode** (§5.5 fallback toggle): skips the pitch/onset algorithm
  entirely and just compares per-buffer RMS amplitude against a threshold — same
  grace-period/hysteresis logic, just a cheaper and less discriminating signal (won't
  distinguish an actual note from other loud-enough sound). Cheap to implement since
  it reuses the same buffer stream, just a different, simpler function computing
  "is there activity" from each buffer.
- **Tuner mode**: instead of the onset/grace-period logic above, continuously track
  the estimated fundamental frequency and convert it to cents-off-target against the
  nearest of the 6 standard-tuning note frequencies (E2=82.41Hz, A2=110.00Hz,
  D3=146.83Hz, G3=196.00Hz, B3=246.94Hz, E4=329.63Hz):
  `cents = 1200 * log2(detectedHz / targetHz)`. Smooth the displayed value (e.g. a
  short rolling average) so the needle doesn't jitter frame-to-frame.
- **Permission handling**: request `RECORD_AUDIO` (Android) / microphone usage
  (iOS, with a clear `NSMicrophoneUsageDescription`) the first time the user enables
  Follow Mode *or* opens the Tuner, whichever comes first; if denied, disable both
  features and fall back gracefully (manual pause/resume for Follow Mode; the Tuner
  screen shows a "microphone access needed" state with a link to Settings) without
  blocking any other app functionality.
- **Platform/tooling implication**: because this requires a real native module for
  streaming mic access, the project needs an **Expo Dev Client** build (via a config
  plugin) rather than running in the plain Expo Go app — still fully within Expo's
  managed tooling (EAS Build handles this), just not testable via Expo Go alone. This
  supersedes the "no native module identified" assumption from the original stack
  choice (§9).
- **Battery/CPU**: continuous mic capture + per-buffer analysis has a real power cost;
  only run it while Follow Mode is explicitly toggled on and the transport is playing
  (never in the background, never when the toggle is off).

### 8.9 Chord diagram rendering (§5.7)

- **Data**: `@tombatossals/chords-db` — an open-source JSON dataset of fret positions
  per chord name for guitar (also covers ukulele/mandolin, unused here), including
  multiple voicings per chord where they exist. Bundled directly into the app (it's a
  few hundred KB of JSON, not worth lazy-loading over the network for a fully-offline
  app).
- **Lookup**: `chordSheet` parsing (§8.4) already extracts every distinct chord symbol
  used in a song; each is looked up in the bundled data by name at render/tap time —
  no per-song storage of diagram data, it's always derived from the chord name.
- **Name normalization**: some real-world sources (e.g. Brazilian/Portuguese chord
  sites like Cifra Club) use alternate chord-naming conventions — e.g. `C7M` for what
  `chords-db` expects as `Cmaj7`. A small alias table normalizes known variants (`7M`
  → `maj7`, etc.) before lookup, so the diagram preview still works regardless of
  which convention a transcribed song uses. Starts with a small set of known
  variants and is easy to extend if more sources turn out to use others.
- **Component**: `ChordDiagram.tsx` takes a position object
  (`{ frets: number[], fingers?: number[], barres?: {fret, from, to}[] }`) and draws a
  fixed-size SVG grid via `react-native-svg`: horizontal lines for strings, vertical
  lines for frets, circles for finger dots (numbered if finger data is present), a
  rounded rect for barre chords, and X/O glyphs above muted/open strings.
- **Presentation**: shown in a `Modal` (or a bottom-sheet library like
  `@gorhom/bottom-sheet` for a nicer swipe-to-dismiss feel) anchored near the tapped
  chord chip; voicing selector (if >1 shape exists) is a simple horizontal swipe/dot-
  pager inside the same sheet.
- **Editor integration**: the same `ChordDiagram` component is reused in the Song
  Editor's live preview (§5.1) — tapping a chord while writing a song shows the
  diagram too, useful for double-checking a shape while transcribing.

## 9. Assumptions Made

- **No backend in v1.** For a single-user app, a server only buys automatic multi-
  device sync; everything else works fine fully local. Manual JSON export/import
  covers moving your library between your own devices without the cost/complexity of
  hosting anything.
- If sync is added later (v2), **Supabase** is the recommended option: it's a managed
  service (you don't host a server yourself), and its free tier (500MB DB, 1GB
  storage, unlimited-in-practice for one user) comfortably covers a personal chord
  library at $0 — the data model already has the fields (`id`, `updatedAt`) that
  migration would need.
- Offline editing is unaffected by this — since v1 has no server at all, *everything*
  (reading and editing) always works offline.
- Chord diagrams use `@tombatossals/chords-db`'s existing shape data rather than
  hand-authoring positions — covers essentially all standard chords, with a graceful
  "no diagram available" fallback for anything exotic it doesn't have (§8.9).
- Expo **managed** tooling is still used throughout (EAS Build/Update), but a plain
  Expo Go install is no longer sufficient for v1 — the mic-based auto-pause feature
  (§5.5/§8.8) needs a streaming-audio native module, which requires an **Expo Dev
  Client** build. This is a step up in setup (one extra build step) but not a switch
  to bare React Native.
- Mic-based auto-pause and the Tuner are the highest-risk, most novel pieces of v1
  (real-time on-device pitch detection) — but since they now share one pipeline
  (§8.8), the same early spike de-risks both at once: build the pitch-detection core
  first, then layer Follow Mode's onset/grace-period logic and the Tuner's
  continuous-tracking/cents display on top of the confirmed-working detector.
- Tuner v1 supports **standard tuning (EADGBE) only**; alternate tunings (Drop D,
  Open G, etc.) are deferred to v2 (§7) since they're just a different target-note
  table, not new detection logic.
- TAB blocks reuse the standard ChordPro `{start_of_tab}`/`{end_of_tab}` and
  `{comment}` directives rather than inventing new syntax (§5.9/§6) — keeps the format
  closer to real ChordPro, so any future import from other tools/sites is more likely
  to just work.
- Chord notation stays **inline-bracket only** (`[Chord]word`, one chord per bracket)
  — no chords-above-lyrics input/paste-conversion mode in v1. Confirmed against two
  real chord-sheet PDFs you provided (Wildflower, Good Riddance): both use the
  traditional chords-above-lyrics layout, so transcribing means manually re-placing
  each chord inline rather than pasting as-is. Revisit only if manual transcription
  turns out to be too slow in practice.
- Strum pattern resolution (8 vs. 16 slots) is auto-detected from string length
  rather than fixed, and `|` separates multi-bar patterns — validated against real
  16-slot, 2-bar patterns in the same source songs.

## 10. Open Questions

None outstanding — all prior open questions were resolved (2026-08-04) and folded
into the relevant sections above: navigation (§8.1, React Navigation), duration-vs-BPM
priority (§5.2, duration always wins), Follow Mode's grace period (§5.5, kept at
default) and its Precise/Simple detection fallback (§5.5/§8.8), the Tuner's
needle/gauge display (§5.6, no reference-tone playback), and no live beat-synced
strum indicator (§5.8). New questions can be added here as they come up.
