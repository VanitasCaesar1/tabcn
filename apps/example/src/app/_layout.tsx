import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

export default function RootLayout() {
  const scheme = useColorScheme();
  return (
    <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ title: 'tabcn' }} />
        <Stack.Screen
          name="designs/[id]"
          // One screen instance per design, so each nested tab navigator keeps its own `id`.
          getId={({ params }) => (params as { id?: string } | undefined)?.id}
          options={{ title: '', headerBackTitle: 'Back' }}
        />
      </Stack>
    </ThemeProvider>
  );
}
