const { getDefaultConfig } = require('expo/metro-config');

const metroConfiguration = getDefaultConfig(__dirname);

// Drizzle's Expo SQLite migrator imports the generated .sql migration files
// directly (src/db/migrations/migrations.js) — teach Metro to treat them as
// source text rather than an asset.
metroConfiguration.resolver.sourceExts.push('sql');

// Some dual ESM/CJS packages (e.g. zustand's `./middleware` subpath) declare an
// "exports" map whose "import" condition points at an .mjs build containing literal
// `import.meta` syntax. Metro's web bundle is a classic (non-module) script, so that
// syntax throws "Cannot use 'import.meta' outside a module" at parse time in the
// browser. Disabling package-exports resolution falls back to plain "main"-based
// resolution, which picks each package's CJS build instead.
metroConfiguration.resolver.unstable_enablePackageExports = false;

module.exports = metroConfiguration;
