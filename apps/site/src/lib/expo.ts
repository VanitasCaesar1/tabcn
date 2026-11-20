// The Expo Go link that opens the example app at one design. The app is published with EAS
// Update as @vanitascaesar/tabcn-example (channel "main", runtime exposdk:58.0.0, which is what
// Expo Go loads). The part after `/--/` is the app route; the example app routes on it
// (apps/example/src/use-expo-go-links.ts). Routes land on the tab each reference shows selected.
const PROJECT_ID = '10b950f2-937a-4203-9689-d81cc1e69d36';

const ROUTES: Record<string, string> = {
  'glass-expand': 'designs/glass-expand/t3',
  'top-notch': 'designs/top-notch',
  'chip-rail': 'designs/chip-rail',
  'sticker-tiles': 'designs/sticker-tiles',
  'segment-search': 'designs/segment-search',
  'pill-plus': 'designs/pill-plus',
  'solid-dark': 'designs/solid-dark',
  'outline-dark': 'designs/outline-dark',
  orbs: 'designs/orbs/t2',
  'center-cta': 'designs/center-cta',
  'soft-pill': 'designs/soft-pill/t3',
  'dark-capsule': 'designs/dark-capsule/t4',
  'gradient-stickers': 'designs/gradient-stickers/t5',
  'light-icons': 'designs/light-icons/t4',
  'playful-tiles': 'designs/playful-tiles',
  'sliding-capsule': 'designs/sliding-capsule',
  'labeled-plus': 'designs/labeled-plus',
  'frosted-media': 'designs/frosted-media/t3',
  'glow-glass': 'designs/glow-glass',
  'mono-type': 'designs/mono-type',
};

export const EXPO_GO_URL: ((id: string) => string) | null = (id) =>
  `exp://u.expo.dev/${PROJECT_ID}/--/${ROUTES[id] ?? `designs/${id}`}?channel-name=main&runtime-version=exposdk%3A58.0.0`;

export const RUN_EXAMPLE_URL = 'https://github.com/VanitasCaesar1/tabcn#development';
