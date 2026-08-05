// Manual JSON export/import (SPEC.md §8.6) — the whole "sync" story for v1: moving a
// song to another device is an explicit, user-initiated action rather than automatic.
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { getAllSongs, mergeImportedSongRows, replaceAllSongsWithImportedRows } from './songs';
import type { SongRow } from './schema';

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

function todayAsFileNameDateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Serializes the whole library to a JSON file and hands it to the OS share sheet
 * (AirDrop, email, Google Drive, Files app, etc. — §8.6).
 */
export async function exportSongLibraryToJsonFile(): Promise<void> {
  const allSongs = await getAllSongs();
  const backupFile = new File(Paths.cache, `chord-app-backup-${todayAsFileNameDateStamp()}.json`);
  if (backupFile.exists) backupFile.delete();
  backupFile.create();
  backupFile.write(JSON.stringify(allSongs, null, 2));

  const isSharingAvailable = await Sharing.isAvailableAsync();
  if (!isSharingAvailable) {
    throw new Error('Sharing is not available on this device.');
  }
  await Sharing.shareAsync(backupFile.uri, {
    mimeType: 'application/json',
    dialogTitle: 'Export Chord App library',
  });
}

export type ImportLibraryMode = 'merge' | 'replace';

export type ImportLibraryResult =
  | { status: 'cancelled' }
  | { status: 'invalidFile' }
  | { status: 'success'; mode: ImportLibraryMode; importedSongCount: number };

/**
 * Opens the document picker for a previously exported JSON file, validates it, then
 * either merges it into the existing library (skipping duplicates by `id`) or
 * replaces the whole library, per the caller-supplied mode (§8.6 — the user chooses
 * which on import).
 */
export async function pickJsonFileAndImportLibrary(
  importLibraryMode: ImportLibraryMode,
): Promise<ImportLibraryResult> {
  const documentPickerResult = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });
  if (documentPickerResult.canceled || documentPickerResult.assets.length === 0) {
    return { status: 'cancelled' };
  }

  const pickedFile = new File(documentPickerResult.assets[0].uri);
  let parsedFileContents: unknown;
  try {
    parsedFileContents = JSON.parse(await pickedFile.text());
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
