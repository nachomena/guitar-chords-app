// Manual JSON export/import (SPEC.md §8.6) — the whole "sync" story for v1: moving a
// song to another device is an explicit, user-initiated action rather than automatic.
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { getAllSongs } from './songs';
import {
  importSongLibraryFromJsonText,
  type ImportLibraryMode,
  type ImportLibraryResult,
} from './backupShared';

export type { ImportLibraryMode, ImportLibraryResult };

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
  return importSongLibraryFromJsonText(await pickedFile.text(), importLibraryMode);
}
