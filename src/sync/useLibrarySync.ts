// Mounted once in App: wires the sync engine to the app lifecycle and to TanStack
// Query, so a sync that changes the local songs refreshes every screen.
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import { SONGS_QUERY_KEY } from '../db/songs';
import { requestLibrarySync, setLocalLibraryReplacedListener } from './syncEngine';
import { waitForSyncStoreHydration } from './syncStore';

export function useLibrarySync(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    setLocalLibraryReplacedListener(() => {
      void queryClient.invalidateQueries({ queryKey: SONGS_QUERY_KEY });
    });

    void waitForSyncStoreHydration().then(() => requestLibrarySync(0));

    // On web this fires when the tab or installed app becomes visible again.
    const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') requestLibrarySync(0);
    });

    return () => {
      setLocalLibraryReplacedListener(null);
      appStateSubscription.remove();
    };
  }, [queryClient]);
}
