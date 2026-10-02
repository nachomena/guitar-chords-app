// Web counterpart of backup.ts (SPEC.md §8.6): there's no OS share sheet or app file
// system in the browser, so export downloads the JSON file and import reads the
// picked file straight from the browser's File object.
import * as DocumentPicker from 'expo-document-picker';

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
