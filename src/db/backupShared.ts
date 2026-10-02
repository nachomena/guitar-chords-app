// Shared between backup.ts (native) and backup.web.ts.
import type { SongRow } from './schema';
import { mergeImportedSongRows, replaceAllSongsWithImportedRows } from './songs';

function isValidSongRow(candidateValue: unknown): candidateValue is SongRow {
  if (typeof candidateValue !== 'object' || candidateValue === null) return false;
  const candidateRecord = candidateValue as Record<string, unknown>;
  return (
    typeof candidateRecord.id === 'string' &&
    typeof candidateRecord.title === 'string' &&
    typeof candidateRecord.artist === 'string' &&
    typeof candidateRecord.chordSheet === 'string' &&
    typeof candidateRecord.createdAt === 'string' &&
    typeof candidateRecord.updatedAt === 'string'
  );
}

function isValidSongRowArray(candidateValue: unknown): candidateValue is SongRow[] {
  return Array.isArray(candidateValue) && candidateValue.every(isValidSongRow);
}

export type ImportLibraryMode = 'merge' | 'replace';

export type ImportLibraryResult =
  | { status: 'cancelled' }
  | { status: 'invalidFile' }
  | { status: 'success'; mode: ImportLibraryMode; importedSongCount: number };

/**
 * Validates the contents of a previously exported JSON backup, then either merges it
 * into the existing library (skipping duplicates by `id`) or replaces the whole
 * library, per the caller-supplied mode (§8.6 — the user chooses which on import).
 */
export async function importSongLibraryFromJsonText(
  backupJsonText: string,
  importLibraryMode: ImportLibraryMode,
): Promise<ImportLibraryResult> {
  let parsedFileContents: unknown;
  try {
    parsedFileContents = JSON.parse(backupJsonText);
  } catch {
    return { status: 'invalidFile' };
  }

  if (!isValidSongRowArray(parsedFileContents)) {
    return { status: 'invalidFile' };
  }

  if (importLibraryMode === 'replace') {
    await replaceAllSongsWithImportedRows(parsedFileContents);
    return { status: 'success', mode: 'replace', importedSongCount: parsedFileContents.length };
  }

  const mergedSongCount = await mergeImportedSongRows(parsedFileContents);
  return { status: 'success', mode: 'merge', importedSongCount: mergedSongCount };
}
