---
name: transcribe-chord-pdf
description: Convert an attached PDF chord sheet (chords-above-lyrics, or a compact "Chordx2" style like Cifra Club/La Cuerda) into this app's ChordPro-style notation, ready to paste into the Song Editor. Use whenever the user attaches a song PDF and asks to transcribe/convert/add it as a song.
---

# Transcribing a PDF chord sheet into Chord App notation

This app's chord-sheet format is documented in `SPEC.md` §6 and implemented in
`src/chordpro/parser.ts` / `src/chordpro/rendering.ts`. It extends plain ChordPro
with a few non-standard constructs built specifically to make transcribing real-world
PDFs (which are almost always laid out chords-above-lyrics, not inline-bracket) fast
and low-friction. Read this whole skill before transcribing — picking the wrong
construct for a given line produces a technically-valid but visually-wrong result.

## Output format (always)

Two separate pieces, never one blob — the Song Editor has separate top-of-form
fields for metadata and a single "Chord sheet" textarea for the body:

1. **Field values** for Title, Artist, Key, Time signature, Capo. List them plainly,
   don't put them in the code block.
2. **A single fenced code block** containing only the body text (lyrics + chords +
   `{comment}`/`{strum}`/tab directives) — this is what gets pasted into the "Chord
   sheet" textarea. Never include `{title}`/`{artist}`/`{bpm}`/`{time}`/`{capo}`/
   `{duration}` directives in this block; those are entered via the form fields and
   the Editor generates them itself on save.

**Never fabricate BPM or Duration.** If the PDF doesn't state a tempo or the song's
length, leave both blank and tell the user to use the Editor's TAP tempo button (tap
along to the beat a handful of times) or look up/measure the real duration
themselves. Don't guess a plausible-sounding number — a wrong BPM silently breaks
the auto-scroll pacing.

## Reading the PDF

Read tool output for a chord-sheet PDF often includes **two extraction layers**: a
plain sequential-text version (fast to scan, but loses column alignment) and a
visual/layout version (preserves horizontal chord-to-lyric positioning, often as a
second page-like block). Use the visual layer to judge *which* lyric line(s) a chord
heading applies to when it's ambiguous from the plain text alone (e.g. one chord
label sitting above two short lines vs. above one long line).

## Metadata

- **Title / Artist**: from the PDF header (usually "Song Name Artist Name" on the
  first line).
- **Key**: not usually stated — infer it from the chord set. List the chords used
  and check which major or (more often, for these sources) natural/harmonic minor
  key they're diatonic to. A `V7` chord (e.g. `B7` in the key of `Em`) borrowed into
  an otherwise-minor set is a strong tell for harmonic minor and doesn't change the
  key guess.
- **Time signature**: default to `4/4` unless the source states otherwise.
- **Capo**: only if the PDF states one; otherwise `0`.

## Choosing a notation construct, line by line

The source PDF's own convention tells you which construct to use — don't default to
one style for the whole song.

**A. Precise inline placement** — `[Chord]word` — when the source aligns a chord
exactly above a specific syllable/word and that precision is clearly intentional
(common in professionally-typeset tab sites). One chord per bracket, always; never
`[Chord1 Chord2]`.

**B. Chords-above-a-line (no per-syllable placement)** — a chord-only line
immediately followed by a plain lyric line with no brackets at all:
