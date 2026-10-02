import { useCallback, useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';

import { useDatabaseMigrations } from './src/db/useDatabaseMigrations';
import { RootNavigator } from './src/navigation/RootNavigator';
import { AppThemeProvider, useAppTheme } from './src/theme/ThemeProvider';

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function NavigationRoot() {
  const { isDarkTheme } = useAppTheme();
  return (
    <NavigationContainer>
      <StatusBar style={isDarkTheme ? 'light' : 'dark'} />
      <RootNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  const [areFontsLoaded, fontLoadError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
  });
  const { success: didMigrationsSucceed, error: migrationError } = useDatabaseMigrations();

  const isAppReady = (areFontsLoaded || fontLoadError !== null) && didMigrationsSucceed;

  const handleRootLayout = useCallback(() => {
    if (isAppReady) {
      void SplashScreen.hideAsync();
    }
  }, [isAppReady]);

  useEffect(() => {
    handleRootLayout();
  }, [handleRootLayout]);

  if (migrationError) {
    // The local SQLite migration failed to apply — every screen depends on the
    // songs table existing, so there's nothing useful to render past this.
    throw migrationError;
  }

  if (!isAppReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AppThemeProvider>
            <NavigationRoot />
          </AppThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
