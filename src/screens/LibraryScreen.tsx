// The Library / Home screen (SPEC.md §5.1 item 1).
import React, { useCallback, useMemo, useState } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { SongListItem } from '../components/SongListItem';
import { SongOptionsMenu, type SongOptionsMenuAnchor } from '../components/SongOptionsMenu';
import {
  useDeleteSongMutation,
  useDuplicateSongMutation,
  useSetSongFavoriteMutation,
  useSongsQuery,
} from '../db/songs';
import type { SongRow } from '../db/schema';
import type { RootStackParamList } from '../navigation/types';
import { useAppTheme } from '../theme/ThemeProvider';

type LibrarySortOption = 'title' | 'artist' | 'recentlyAdded';

function TunerIcon({ color }: { color: string }) {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M8 2v10a4 4 0 0 0 8 0V2" />
      <Line x1={12} y1={16} x2={12} y2={22} />
      <Line x1={9} y1={19} x2={15} y2={19} />
    </Svg>
  );
}

function SettingsIcon({ color }: { color: string }) {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={12} r={3} />
      <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </Svg>
  );
}

function SearchIcon({ color }: { color: string }) {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.75} strokeLinecap="round">
      <Circle cx={11} cy={11} r={8} />
      <Line x1={21} y1={21} x2={16.65} y2={16.65} />
    </Svg>
  );
}

function PlusIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.75} strokeLinecap="round">
      <Line x1={12} y1={5} x2={12} y2={19} />
      <Line x1={5} y1={12} x2={19} y2={12} />
    </Svg>
  );
}

function sortSongs(songs: SongRow[], sortOption: LibrarySortOption): SongRow[] {
  const sortedSongs = [...songs];
  if (sortOption === 'title') {
    sortedSongs.sort((firstSong, secondSong) => firstSong.title.localeCompare(secondSong.title));
  } else if (sortOption === 'artist') {
    sortedSongs.sort((firstSong, secondSong) => firstSong.artist.localeCompare(secondSong.artist));
  } else {
    sortedSongs.sort((firstSong, secondSong) => secondSong.createdAt.localeCompare(firstSong.createdAt));
  }
  return sortedSongs;
}

export function LibraryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { elevationShadow } = useAppTheme();
  const { colorPalette, spacing, fontFamily } = useAppTheme();

  const songsQuery = useSongsQuery();
  const setSongFavoriteMutation = useSetSongFavoriteMutation();
  const deleteSongMutation = useDeleteSongMutation();
  const duplicateSongMutation = useDuplicateSongMutation();

  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<LibrarySortOption>('recentlyAdded');
  const [openMenuSongId, setOpenMenuSongId] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<SongOptionsMenuAnchor | null>(null);

  const closeMenu = useCallback(() => {
    setOpenMenuSongId(null);
    setMenuAnchor(null);
  }, []);

  // Close any open "..." menu the instant this screen loses focus (e.g. navigating
  // to a song's detail view) — without this, the menu was still open when coming
  // back, since LibraryScreen stays mounted underneath the pushed screen.
  useFocusEffect(
    useCallback(() => {
      return () => closeMenu();
    }, [closeMenu]),
  );

  const filteredAndSortedSongs = useMemo(() => {
    const allSongs = songsQuery.data ?? [];
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const filteredSongs = normalizedQuery
      ? allSongs.filter(
        (song) =>
          song.title.toLowerCase().includes(normalizedQuery) ||
          song.artist.toLowerCase().includes(normalizedQuery),
      )
      : allSongs;
    return sortSongs(filteredSongs, sortOption);
  }, [songsQuery.data, searchQuery, sortOption]);

  const songCountLabel = `${songsQuery.data?.length ?? 0} song${(songsQuery.data?.length ?? 0) === 1 ? '' : 's'}`;

  const handleDeleteSong = (song: SongRow) => {
    Alert.alert('Delete song', `Delete "${song.title}"? This can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteSongMutation.mutate(song.id) },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colorPalette.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: colorPalette.text, fontFamily: fontFamily.headingMedium }]}>
            Your Songs
          </Text>
          <Text style={[styles.headerSubtitle, { color: colorPalette.textMuted }]}>{songCountLabel}</Text>
        </View>
        <View style={styles.headerButtons}>
          <Pressable
            hitSlop={8}
            style={styles.headerIconButton}
            onPress={() => navigation.navigate('Tuner')}
          >
            <TunerIcon color={colorPalette.textMuted} />
          </Pressable>
          <Pressable
            hitSlop={8}
            style={styles.headerIconButton}
            onPress={() => navigation.navigate('Settings')}
          >
            <SettingsIcon color={colorPalette.textMuted} />
          </Pressable>
        </View>
      </View>

      <View style={styles.searchAndSortSection}>
        <View style={styles.searchInputWrapper}>
          <View style={styles.searchIcon}>
            <SearchIcon color={colorPalette.textMuted} />
          </View>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search title or artist"
            placeholderTextColor={colorPalette.textMuted}
            style={[
              styles.searchInput,
              { backgroundColor: colorPalette.surface, color: colorPalette.text, borderColor: colorPalette.divider },
            ]}
          />
        </View>

        <View style={[styles.sortSegmentedControl, { borderColor: colorPalette.divider }]}>
          {(
            [
              { value: 'title', label: 'Title' },
              { value: 'artist', label: 'Artist' },
              { value: 'recentlyAdded', label: 'Recent' },
            ] as const
          ).map((sortSegment, segmentIndex) => (
            <Pressable
              key={sortSegment.value}
              onPress={() => setSortOption(sortSegment.value)}
              style={[
                styles.sortSegmentOption,
                segmentIndex > 0 && { borderLeftWidth: 1, borderLeftColor: colorPalette.divider },
                sortOption === sortSegment.value && { backgroundColor: colorPalette.accent + '22' },
              ]}
            >
              <Text
                style={{
                  fontSize: 13,
                  color: sortOption === sortSegment.value ? colorPalette.accent : colorPalette.textMuted,
                }}
              >
                {sortSegment.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <FlatList
        data={filteredAndSortedSongs}
        keyExtractor={(song) => song.id}
        contentContainerStyle={{ paddingHorizontal: spacing.large, paddingBottom: 100 }}
        renderItem={({ item: song }) => (
          <SongListItem
            song={song}
            onPress={() => navigation.navigate('SongDetail', { songId: song.id })}
            onToggleFavorite={() =>
              setSongFavoriteMutation.mutate({ songId: song.id, isFavorite: !song.isFavorite })
            }
            onOpenMenu={(anchor) => {
              setOpenMenuSongId(song.id);
              setMenuAnchor(anchor);
            }}
          />
        )}
        ListEmptyComponent={
          !songsQuery.isLoading ? (
            <Text style={{ color: colorPalette.textMuted, textAlign: 'center', marginTop: 40 }}>
              {searchQuery ? 'No songs match your search.' : 'No songs yet — tap + to add your first one.'}
            </Text>
          ) : null
        }
      />

      <SongOptionsMenu
        anchor={menuAnchor}
        onEdit={() => {
          if (openMenuSongId) navigation.navigate('SongEditor', { songId: openMenuSongId });
        }}
        onDuplicate={() => {
          const openMenuSong = filteredAndSortedSongs.find((song) => song.id === openMenuSongId);
          if (openMenuSong) duplicateSongMutation.mutate(openMenuSong);
        }}
        onDelete={() => {
          const openMenuSong = filteredAndSortedSongs.find((song) => song.id === openMenuSongId);
          if (openMenuSong) handleDeleteSong(openMenuSong);
        }}
        onRequestClose={closeMenu}
      />

      <Pressable
        onPress={() => navigation.navigate('SongEditor', {})}
        style={[styles.floatingAddButton, { backgroundColor: colorPalette.background, borderColor: colorPalette.accent }, elevationShadow.small,]}
      >
        <PlusIcon color={colorPalette.accent} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  headerTitle: {
    fontSize: 28,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 4,
    paddingTop: 2,
  },
  headerIconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchAndSortSection: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 10,
  },
  searchInputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
  },
  searchInput: {
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    paddingLeft: 34,
    paddingRight: 10,
    fontSize: 14,
  },
  sortSegmentedControl: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  sortSegmentOption: {
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  floatingAddButton: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
