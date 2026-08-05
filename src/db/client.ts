import { openDatabaseSync } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';

import * as schema from './schema';

const DATABASE_FILE_NAME = 'chord-app.db';

const expoSqliteDatabase = openDatabaseSync(DATABASE_FILE_NAME, {
  enableChangeListener: true,
});

export const database = drizzle(expoSqliteDatabase, { schema });

export { expoSqliteDatabase, DATABASE_FILE_NAME };
