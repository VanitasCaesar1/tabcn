import { Nunito_700Bold } from '@expo-google-fonts/nunito';
import { Outfit_700Bold, Outfit_800ExtraBold, useFonts } from '@expo-google-fonts/outfit';
import { PatrickHand_400Regular } from '@expo-google-fonts/patrick-hand';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

export default function RootLayout() {
  const scheme = useColorScheme();
  // Fonts used by the demos (designs take a `fontFamily` prop; they don't load fonts).
  const [fontsLoaded] = useFonts({
    Outfit_700Bold,
    Outfit_800ExtraBold,
    Nunito_700Bold,
    PatrickHand_400Regular,
  });
  if (!fontsLoaded) return null;
  return (
    <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ title: 'tabcn' }} />
        <Stack.Screen name="designs/[id]" options={{ title: '', headerBackTitle: 'Back' }} />
      </Stack>
    </ThemeProvider>
  );
}
