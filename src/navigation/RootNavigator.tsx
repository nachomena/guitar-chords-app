// SPEC.md §8.1/§8.3 — React Navigation native stack: Library, Song Detail, Song
// Editor, Settings, Tuner, Notation Guide. Each screen builds its own header
// (matching the imported Nocturne design's custom in-app headers), so the native
// stack header is hidden.
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { LibraryScreen } from '../screens/LibraryScreen';
import { NotationGuideScreen } from '../screens/NotationGuideScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { SongDetailScreen } from '../screens/SongDetailScreen';
import { SongEditorScreen } from '../screens/SongEditorScreen';
import { TunerScreen } from '../screens/TunerScreen';
import type { RootStackParamList } from './types';

const RootStack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="Library" component={LibraryScreen} />
      <RootStack.Screen name="SongDetail" component={SongDetailScreen} />
      <RootStack.Screen name="SongEditor" component={SongEditorScreen} />
      <RootStack.Screen name="Settings" component={SettingsScreen} />
      <RootStack.Screen name="Tuner" component={TunerScreen} />
      <RootStack.Screen name="NotationGuide" component={NotationGuideScreen} />
    </RootStack.Navigator>
  );
}
