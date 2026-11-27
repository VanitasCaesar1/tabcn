import { Nunito_700Bold } from '@expo-google-fonts/nunito';
import { Outfit_700Bold, Outfit_800ExtraBold, useFonts } from '@expo-google-fonts/outfit';
import { PatrickHand_400Regular } from '@expo-google-fonts/patrick-hand';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import '../global.css';
import { embed } from '@/embed';
import { PanelThemeProvider } from '@/panel-theme';

// Keep the splash up until the demo fonts load. The navigator itself must mount right
// away: returning null here would drop the deep link the app was opened with.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const scheme = useColorScheme();
  // Fonts used by the demos (designs take a `fontFamily` prop; they don't load fonts).
  const [fontsLoaded] = useFonts({
    Outfit_700Bold,
    Outfit_800ExtraBold,
    Nunito_700Bold,
    PatrickHand_400Regular,
  });
  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);
  const app = (
    // Panel dragging ('react-native-tabcn/gestures') needs gesture handler's root view around the app.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
        {/* The PanelUI theme the design screens show (tabcn, Panel, Moon or Grass). */}
        <PanelThemeProvider>
          <Stack>
            {/* The list draws its own large title, and each design its own back control. */}
            <Stack.Screen name="index" options={{ title: 'tabcn', headerShown: false }} />
            <Stack.Screen name="designs/[id]" options={{ title: '', headerShown: false }} />
          </Stack>
        </PanelThemeProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
  // The site's live previews are the web build in a phone frame, where the browser reports no
  // safe area: the bars sat flush against the frame's bottom edge and its rounded corners clipped
  // their outer tabs. There the app gets an iPhone's insets (status bar and home indicator), so
  // every design and scene lays out as it does on the phone.
  return embed ? <SafeAreaInsetsContext value={PREVIEW_INSETS}>{app}</SafeAreaInsetsContext> : app;
}

/** An iPhone's safe area in portrait: 54 pt under the status bar, 34 over the home indicator. */
const PREVIEW_INSETS = { top: 54, bottom: 34, left: 0, right: 0 };
