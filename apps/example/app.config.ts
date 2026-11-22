import type { ConfigContext, ExpoConfig } from 'expo/config';

// app.json is the config. The site's live previews (apps/site/scripts/build-preview.ts) export a
// web build served under /tabcn/preview/ on GitHub Pages: a single-page app there, since Pages
// has no server to render routes, with every URL under that base.
//
// TABCN_RTL=1 lays every demo out right to left without changing the device's language, to check
// the designs' RTL paths: `TABCN_RTL=1 bunx expo start`. Expo Go reads `extra.forcesRTL`.
export default ({ config: base }: ConfigContext): ExpoConfig => {
  const config = process.env.TABCN_RTL
    ? { ...base, extra: { ...base.extra, forcesRTL: true } }
    : base;
  const baseUrl = process.env.TABCN_PREVIEW_BASE_URL;
  if (!baseUrl) return config as ExpoConfig;
  return {
    ...config,
    web: { ...config.web, output: 'single' },
    experiments: { ...config.experiments, baseUrl },
  } as ExpoConfig;
};
