const { getDefaultConfig } = require('expo/metro-config');

const metroConfiguration = getDefaultConfig(__dirname);

// Drizzle's Expo SQLite migrator imports the generated .sql migration files
// directly (src/db/migrations/migrations.js) — teach Metro to treat them as
// source text rather than an asset.
metroConfiguration.resolver.sourceExts.push('sql');

module.exports = metroConfiguration;
