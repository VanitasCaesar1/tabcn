import { useColorScheme } from 'react-native';

const palette = {
  light: { text: '#0b0b0f', muted: '#6b6b76', card: '#ffffff' },
  dark: { text: '#f5f5f7', muted: '#9a9aa5', card: '#1c1c21' },
};

export function useColors() {
  return palette[useColorScheme() === 'dark' ? 'dark' : 'light'];
}
