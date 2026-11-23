import { useColorScheme } from 'react-native';

/** The app's own screens (the list of designs): near-black in dark mode, as React Bits is. */
const palette = {
  light: {
    background: '#f4f4f6',
    card: '#ffffff',
    field: '#e7e7ec',
    border: 'rgba(0, 0, 0, 0.08)',
    text: '#0b0b0f',
    muted: '#6b6b76',
    faint: '#9c9ca6',
  },
  dark: {
    background: '#09090b',
    card: '#141417',
    field: '#1b1b1f',
    border: 'rgba(255, 255, 255, 0.08)',
    text: '#f5f5f7',
    muted: '#8e8e98',
    faint: '#5d5d66',
  },
};

export type AppColors = (typeof palette)['light'];

export function useColors(): AppColors {
  return palette[useColorScheme() === 'dark' ? 'dark' : 'light'];
}
