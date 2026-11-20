import { Nunito_700Bold } from '@expo-google-fonts/nunito';
import { Outfit_700Bold, Outfit_800ExtraBold, useFonts } from '@expo-google-fonts/outfit';
import { PatrickHand_400Regular } from '@expo-google-fonts/patrick-hand';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

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
  return (
    // Panel dragging ('tabcn/gestures') needs gesture handler's root view around the app.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="index" options={{ title: 'tabcn' }} />
          <Stack.Screen name="designs/[id]" options={{ title: '', headerBackTitle: 'Back' }} />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
