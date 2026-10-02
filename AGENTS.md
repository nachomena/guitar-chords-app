# Agent guide

Chord App is a **web-only** Expo app (React Native for Web) deployed to GitHub Pages.
There are no iOS/Android builds: don't add native modules, `Platform.OS` branches or
`.ios`/`.android`/`.web` file variants.

## Versions

Expo **SDK 54** (React Native 0.81, React 19.1). When reading Expo docs, use the
SDK 54 pages: https://docs.expo.dev/versions/v54.0.0/. Install Expo packages with
`npx expo install` so versions match the SDK.

## Commands

- `npm run check`: lint, format check, typecheck and tests. Run it before every
  commit; CI runs the same thing.
- `npm run format`: apply Prettier.
- `npm run build:web`: static export to `dist/`. Run it when touching config,
  dependencies or anything loaded at startup.
- `npm start`: dev server at http://localhost:8081

## Conventions

- Names are descriptive and spelled out (`songInputFields`, not `fields`); match the
  surrounding code.
- Comments explain _why_, and reference the spec as `SPEC.md §x.y` (the spec lives at
  `docs/SPEC.md`).
- Pure logic (parsing, pacing, merge rules) lives in plain modules with a `*.test.ts`
  next to it; add or update tests with any change to that logic.
- Use `showAlert` (`src/utils/showAlert.ts`), not `Alert.alert`, which does nothing
  on web.
- Songs are read and written only through `src/db/songs.ts`, so every change also
  schedules a gist sync.

## Data compatibility

Users' songs live in `localStorage` (key `chord-app.songs.v1`) and in their sync gist
(`chord-app-library.json`, `formatVersion` 1). Don't change either format without a
migration: existing libraries must keep loading.
