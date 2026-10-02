// CRUD queries against the songs table, wrapped in TanStack Query hooks. See
// SPEC.md §8.3 (db/songs.ts) and §5.4 (library management — search/sort/filter all
// happen client-side over the full loaded list, which is fine at personal-library
// scale per §8.7).
import * as Crypto from 'expo-crypto';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import type { SongRow } from './schema';
import { songStorage } from './songStorage';

export const SONGS_QUERY_KEY = ['songs'] as const;

export type SongInputFields = {
  title: string;
  artist: string;
  originalKey: string | null;
  bpm: number | null;
  timeSignatureNumerator: number;
  timeSignatureDenominator: number;
  capo: number;
  durationSeconds: number | null;
  chordSheet: string;
  tags: string[];
};

function currentTimestampAsIsoString(): string {
  return new Date().toISOString();
}

function songInputFieldsToRow(
  songInputFields: SongInputFields,
): Omit<SongRow, 'id' | 'createdAt' | 'updatedAt' | 'isFavorite'> {
  return {
    title: songInputFields.title,
    artist: songInputFields.artist,
    originalKey: songInputFields.originalKey,
    bpm: songInputFields.bpm,
    timeSignatureNumerator: songInputFields.timeSignatureNumerator,
    timeSignatureDenominator: songInputFields.timeSignatureDenominator,
    capo: songInputFields.capo,
    durationSeconds: songInputFields.durationSeconds,
    chordSheet: songInputFields.chordSheet,
    tags: JSON.stringify(songInputFields.tags),
  };
}

export async function getAllSongs(): Promise<SongRow[]> {
  return songStorage.selectAllSongRows();
}

export async function getSongById(songId: string): Promise<SongRow | undefined> {
  return songStorage.selectSongRowById(songId);
}

export async function createSong(songInputFields: SongInputFields): Promise<SongRow> {
  const timestamp = currentTimestampAsIsoString();
  const newRow: SongRow = {
    id: Crypto.randomUUID(),
    ...songInputFieldsToRow(songInputFields),
    isFavorite: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await songStorage.insertSongRows([newRow]);
  return newRow;
}

export async function updateSong(
  songId: string,
  songInputFields: SongInputFields,
): Promise<void> {
  await songStorage.updateSongRowFields(songId, {
    ...songInputFieldsToRow(songInputFields),
    updatedAt: currentTimestampAsIsoString(),
  });
}

export async function deleteSong(songId: string): Promise<void> {
  await songStorage.deleteSongRow(songId);
}

export async function duplicateSong(songToDuplicate: SongRow): Promise<SongRow> {
  const timestamp = currentTimestampAsIsoString();
  const duplicatedRow: SongRow = {
    ...songToDuplicate,
    id: Crypto.randomUUID(),
    title: `${songToDuplicate.title} (copy)`,
    isFavorite: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await songStorage.insertSongRows([duplicatedRow]);
  return duplicatedRow;
}

export async function setSongFavorite(
  songId: string,
  isFavorite: boolean,
): Promise<void> {
  await songStorage.updateSongRowFields(songId, {
    isFavorite,
    updatedAt: currentTimestampAsIsoString(),
  });
}

/** Replaces the entire library — used by JSON import's "Replace" mode (§8.6). */
export async function replaceAllSongsWithImportedRows(
  importedRows: SongRow[],
): Promise<void> {
  await songStorage.deleteAllSongRows();
  await songStorage.insertSongRows(importedRows);
}

/**
 * Merges imported rows into the existing library, skipping any whose `id` already
 * exists — used by JSON import's "Merge" mode (§8.6).
 */
export async function mergeImportedSongRows(importedRows: SongRow[]): Promise<number> {
  const existingSongs = await getAllSongs();
  const existingSongIds = new Set(existingSongs.map((existingSong) => existingSong.id));
  const rowsToInsert = importedRows.filter(
    (importedRow) => !existingSongIds.has(importedRow.id),
  );
  await songStorage.insertSongRows(rowsToInsert);
  return rowsToInsert.length;
}

// ---------------------------------------------------------------------------
// TanStack Query hooks
// ---------------------------------------------------------------------------

export function useSongsQuery(): UseQueryResult<SongRow[]> {
  return useQuery({ queryKey: SONGS_QUERY_KEY, queryFn: getAllSongs });
}

export function useSongQuery(songId: string | undefined): UseQueryResult<SongRow | undefined> {
  return useQuery({
    queryKey: [...SONGS_QUERY_KEY, songId],
    queryFn: () => (songId ? getSongById(songId) : undefined),
    enabled: songId !== undefined,
  });
}

export function useCreateSongMutation(): UseMutationResult<
  SongRow,
  Error,
  SongInputFields
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSong,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SONGS_QUERY_KEY }),
  });
}

export function useUpdateSongMutation(): UseMutationResult<
  void,
  Error,
  { songId: string; songInputFields: SongInputFields }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ songId, songInputFields }) => updateSong(songId, songInputFields),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SONGS_QUERY_KEY }),
  });
}

export function useDeleteSongMutation(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteSong,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SONGS_QUERY_KEY }),
  });
}

export function useDuplicateSongMutation(): UseMutationResult<SongRow, Error, SongRow> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: duplicateSong,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SONGS_QUERY_KEY }),
  });
}

export function useSetSongFavoriteMutation(): UseMutationResult<
  void,
  Error,
  { songId: string; isFavorite: boolean }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ songId, isFavorite }) => setSongFavorite(songId, isFavorite),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SONGS_QUERY_KEY }),
  });
}
