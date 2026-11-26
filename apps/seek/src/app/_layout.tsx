/**
 * Seek: a film finder built with PanelUI's components, with tabcn's Ask Dock as its tab bar.
 * The whole app wears "seek", a PanelUI theme of its own (src/global.css). Notifications are
 * expo-hot-toast's: glass toasts at the top, the Dynamic Island capsule, and notifications.
 */
import '../global.css';

import {
  InstrumentSerif_400Regular,
  InstrumentSerif_400Regular_Italic,
  useFonts,
} from '@expo-google-fonts/instrument-serif';
import { Toaster } from 'expo-hot-toast';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { PanelUIProvider } from 'panelui-native';
import { useEffect } from 'react';
import { Uniwind } from 'uniwind';

Uniwind.setTheme('seek');

// Hold the splash until the display face loads, so no title draws in the fallback first (text
// that rendered before the font arrived would keep the fallback until it re-rendered).
SplashScreen.preventAutoHideAsync();

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: '#02040f', card: '#02040f' },
};

export default function RootLayout() {
  const [loaded] = useFonts({ InstrumentSerif_400Regular, InstrumentSerif_400Regular_Italic });
  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);
  if (!loaded) return null;
  return (
    <PanelUIProvider background={false}>
      <ThemeProvider value={theme}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="film/[id]" />
        </Stack>
        <Toaster position="top-center" colorScheme="dark" glass />
      </ThemeProvider>
    </PanelUIProvider>
  );
}
