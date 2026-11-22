import { resolve } from 'node:path';
import type { NextConfig } from 'next';
import { BASE_PATH } from './src/lib/base-path';

// A static export for GitHub Pages, served from https://vanitascaesar1.github.io/tabcn/.
const config: NextConfig = {
  output: 'export',
  basePath: BASE_PATH,
  trailingSlash: true,
  images: { unoptimized: true },
  // The repo's own AGENTS.md covers agents; don't let the dev server write one here.
  agentRules: false,
  // The site reads registry/ and apps/example/src/catalog.ts from the monorepo root.
  turbopack: { root: resolve(process.cwd(), '../..') },
  // The live previews load public/preview/ by its folder URL, as GitHub Pages serves it. The dev
  // server only serves files by name, so point the folder at its index.html there.
  ...(process.env.NODE_ENV === 'development' && {
    rewrites: async () => [{ source: '/preview/', destination: '/preview/index.html' }],
  }),
};

export default config;
