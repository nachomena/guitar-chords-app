# Chord App

Your own guitar chord sheets, on any device. Write songs in a simple ChordPro-style
notation, play them with hands-free auto-scroll, and tune up with the built-in tuner.

**Live app:** https://nachomena.github.io/guitar-chords-app/

It runs in any modern browser on desktop and mobile. On a phone, use **Add to Home
Screen** (Safari) or **Install app** (Chrome) to open it full screen like a native app.

## Features

- **Library**: search by title or artist, sort by title, artist or most recent, and
  mark favorites.
- **Song editor**: chords go inline in square brackets (`[G]Hello [C]world`), with
  metadata directives for key, BPM, time signature, capo and duration. Repeated
  sections (`([A] [D]) x2`), strumming patterns and tab blocks are supported. The
  in-app **Notation Guide** lists everything.
- **Performance view**: chords drawn above the lyrics, tap a chord to see its
  diagram, and **auto-scroll** paced by the song's BPM or duration. The screen stays
  awake while it plays.
- **Tuner**: chromatic tuner for standard tuning, using the microphone.
- **QR code**: show a QR code that opens a lyrics search for the current song.
- **Light and dark themes**, and adjustable lyric and chord font sizes.

## Your data

Songs are stored in your browser's local storage, on your device. Nothing is sent
anywhere unless you turn on sync.

- **Sync across devices** (Settings): the library is saved to a secret gist on your
  GitHub account and kept in step on every device where you connect. You need a
  [fine-grained personal access token](https://github.com/settings/personal-access-tokens/new)
  with no repository access and only the account permission **Gists: Read and
  write**. Paste the same token on each device. Edits merge song by song (the most
  recent change wins) and deletions carry over.
- **Backup** (Settings): export the whole library as a JSON file, and import it
  again (merge into or replace the current library).

Each browser keeps its own copy, so clearing site data or switching browsers starts
empty until you sync or import. On iPhone, add the app to the Home Screen so Safari
doesn't clear its storage after a week of not opening it.

## Development

Requires Node.js 22 (see `.nvmrc`).

```sh
npm ci
npm start            # dev server at http://localhost:8081
npm run check        # lint, format check, typecheck and tests
npm run build:web    # static build in dist/
```

Other scripts: `npm run lint`, `npm run format` (rewrites files with Prettier),
`npm run typecheck`, `npm test`.

### Stack

[Expo](https://docs.expo.dev/) SDK 54 with React Native for Web, React Navigation,
TanStack Query, and zustand. The tuner records with `@siteed/audio-studio` and
detects pitch with `pitchfinder`; chord diagrams come from `@tombatossals/chords-db`.

### Project layout

```
App.tsx               app shell: fonts, providers, navigation
src/
  screens/            one file per screen (Library, Song detail, Editor, Tuner, ...)
  components/         shared UI (chord sheet renderer, chord diagram, menus)
  chordpro/           notation parser and line layout for rendering
  chords/             chord-name → diagram lookup
  scroll-engine/      auto-scroll pacing and playback
  audio/              microphone capture and pitch detection for the tuner
  db/                 song storage (localStorage), CRUD hooks, JSON backup
  sync/               GitHub gist sync: API client, merge rules, sync engine
  state/              persisted app settings
  theme/              color and type tokens, theme provider
public/               index.html template, PWA manifest and icons
docs/SPEC.md          original design spec and notation reference
```

### Deployment

Every push to `main` runs `.github/workflows/deploy-web.yml`, which checks the code,
builds the site and publishes it to GitHub Pages. Pull requests run the same checks
in `.github/workflows/ci.yml`. The site is served from `/guitar-chords-app`
(`experiments.baseUrl` in `app.json`); change that if the repository is renamed.

## License

[MIT](LICENSE)
