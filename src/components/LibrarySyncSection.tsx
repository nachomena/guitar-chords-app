// Settings → "Sync across devices": connect a GitHub token, see sync status, sync
// now, or disconnect. See src/sync/syncEngine.ts for how syncing works.
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { connectLibrarySync, disconnectLibrarySync, syncLibraryNow } from '../sync/syncEngine';
import { useSyncStore } from '../sync/syncStore';
import { useAppTheme } from '../theme/ThemeProvider';
import { showAlert } from '../utils/showAlert';

const CREATE_TOKEN_URL = 'https://github.com/settings/personal-access-tokens/new';

function formatLastSyncedAt(lastSyncedAt: string): string {
  return new Date(lastSyncedAt).toLocaleString(undefined, {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export function LibrarySyncSection() {
  const { colorPalette } = useAppTheme();
  const gitHubToken = useSyncStore((state) => state.gitHubToken);
  const syncStatus = useSyncStore((state) => state.syncStatus);
  const syncErrorMessage = useSyncStore((state) => state.syncErrorMessage);
  const lastSyncedAt = useSyncStore((state) => state.lastSyncedAt);
  const [tokenDraft, setTokenDraft] = useState('');

  const isSyncing = syncStatus === 'syncing';
  const buttonStyle = [styles.button, { borderColor: colorPalette.divider }];

  if (!gitHubToken) {
    return (
      <View style={styles.container}>
        <Text style={[styles.helpText, { color: colorPalette.textMuted }]}>
          Keep the same songs on every device. Your library is saved to a secret gist on your GitHub
          account. Create a fine-grained token with no repository access and only the account
          permission “Gists: Read and write”, then paste it here on each device.
        </Text>
        <Pressable onPress={() => void Linking.openURL(CREATE_TOKEN_URL)} style={buttonStyle}>
          <Text style={{ color: colorPalette.accent }}>Create a token on GitHub</Text>
        </Pressable>
        <TextInput
          value={tokenDraft}
          onChangeText={setTokenDraft}
          placeholder="Paste token (github_pat_…)"
          placeholderTextColor={colorPalette.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          style={[
            styles.tokenInput,
            {
              backgroundColor: colorPalette.surface,
              color: colorPalette.text,
              borderColor: colorPalette.divider,
            },
          ]}
        />
        <Pressable
          disabled={tokenDraft.trim() === ''}
          onPress={() => {
            void connectLibrarySync(tokenDraft);
            setTokenDraft('');
          }}
          style={[buttonStyle, { opacity: tokenDraft.trim() === '' ? 0.5 : 1 }]}
        >
          <Text style={{ color: colorPalette.text }}>Connect and sync</Text>
        </Pressable>
      </View>
    );
  }

  let statusText = 'Not synced yet';
  if (isSyncing) statusText = 'Syncing…';
  else if (syncStatus === 'error')
    statusText = `Sync failed: ${syncErrorMessage ?? 'unknown error'}`;
  else if (lastSyncedAt) statusText = `Synced ${formatLastSyncedAt(lastSyncedAt)}`;

  return (
    <View style={styles.container}>
      <Text
        style={[
          styles.statusText,
          { color: syncStatus === 'error' ? colorPalette.destructive : colorPalette.text },
        ]}
      >
        {statusText}
      </Text>
      <Pressable
        disabled={isSyncing}
        onPress={() => void syncLibraryNow()}
        style={[buttonStyle, { opacity: isSyncing ? 0.6 : 1 }]}
      >
        <Text style={{ color: colorPalette.text }}>Sync now</Text>
      </Pressable>
      <Pressable
        onPress={() =>
          showAlert(
            'Stop syncing',
            'This device stops syncing. Songs stay on this device and in the gist.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Stop syncing', style: 'destructive', onPress: disconnectLibrarySync },
            ],
          )
        }
        style={buttonStyle}
      >
        <Text style={{ color: colorPalette.destructive }}>Stop syncing on this device</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  helpText: {
    fontSize: 13,
    lineHeight: 18,
  },
  statusText: {
    fontSize: 13,
  },
  button: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tokenInput: {
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    fontSize: 14,
  },
});
