import type { ConfigContext, ExpoConfig } from 'expo/config';

// app.json is the config. The site's live previews (apps/site/scripts/build-preview.ts) export a
// web build served under /tabcn/preview/ on GitHub Pages: a single-page app there, since Pages
// has no server to render routes, with every URL under that base.
export default ({ config }: ConfigContext): ExpoConfig => {
  const baseUrl = process.env.TABCN_PREVIEW_BASE_URL;
  if (!baseUrl) return config as ExpoConfig;
  return {
    ...config,
    web: { ...config.web, output: 'single' },
    experiments: { ...config.experiments, baseUrl },
  } as ExpoConfig;
};
