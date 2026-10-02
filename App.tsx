import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';

import { RootNavigator } from './src/navigation/RootNavigator';
import { useLibrarySync } from './src/sync/useLibrarySync';
import { AppThemeProvider } from './src/theme/ThemeProvider';

const queryClient = new QueryClient();

function NavigationRoot() {
  useLibrarySync();
  return (
    <NavigationContainer>
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
  const isAppReady = areFontsLoaded || fontLoadError !== null;

  if (!isAppReady) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AppThemeProvider>
          <NavigationRoot />
        </AppThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
