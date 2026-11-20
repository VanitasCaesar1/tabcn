import { resolve } from 'node:path';
import type { NextConfig } from 'next';
import { BASE_PATH } from './src/lib/base-path';

// A static export for GitHub Pages, served from https://vanitascaesar1.github.io/tabcn/.
const config: NextConfig = {
  output: 'export',
  basePath: BASE_PATH,
  trailingSlash: true,
  images: { unoptimized: true },
  // The site reads registry/ and apps/example/src/catalog.ts from the monorepo root.
  turbopack: { root: resolve(process.cwd(), '../..') },
};

export default config;
