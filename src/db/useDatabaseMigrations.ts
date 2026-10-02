import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';

import { database } from './client';
import migrations from './migrations/migrations';

/** Applies the Drizzle SQLite migrations on startup (native builds). */
export function useDatabaseMigrations(): { success: boolean; error?: Error } {
  return useMigrations(database, migrations);
}
