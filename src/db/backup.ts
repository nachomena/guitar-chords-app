// Manual JSON export/import (SPEC.md §8.6): export downloads the library as a JSON
// file, import reads a previously exported file picked in the browser. (Day-to-day
// moving of songs between devices is handled by gist sync, src/sync/.)
import * as DocumentPicker from 'expo-document-picker';

import type { SongRow } from './schema';
import { getAllSongs, mergeImportedSongRows, replaceAllSongsWithImportedRows } from './songs';

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

function todayAsFileNameDateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Serializes the whole library to a JSON file and downloads it. */
export async function exportSongLibraryToJsonFile(): Promise<void> {
  const allSongs = await getAllSongs();
  const backupBlob = new Blob([JSON.stringify(allSongs, null, 2)], {
    type: 'application/json',
  });
  const backupObjectUrl = URL.createObjectURL(backupBlob);
  const downloadLink = document.createElement('a');
  downloadLink.href = backupObjectUrl;
  downloadLink.download = `chord-app-backup-${todayAsFileNameDateStamp()}.json`;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  downloadLink.remove();
  // Revoking synchronously can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(backupObjectUrl), 10_000);
}

export async function pickJsonFileAndImportLibrary(
  importLibraryMode: ImportLibraryMode,
): Promise<ImportLibraryResult> {
  const documentPickerResult = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
  });
  if (documentPickerResult.canceled || documentPickerResult.assets.length === 0) {
    return { status: 'cancelled' };
  }

  const pickedAsset = documentPickerResult.assets[0];
  const backupJsonText = pickedAsset.file
    ? await pickedAsset.file.text()
    : await (await fetch(pickedAsset.uri)).text();
  return importSongLibraryFromJsonText(backupJsonText, importLibraryMode);
}
