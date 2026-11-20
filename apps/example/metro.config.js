// Expo configures Metro for monorepos on its own. The one addition: resolve
// workspace packages through their "tabcn-source" export condition, so the example
// app runs packages/tabcn/src directly and edits show up without a build step.
const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// registry/ isn't a workspace package, so Metro doesn't watch it by default. The
// example imports designs from there (@registry/*), so watch it for live reloads.
config.watchFolders = [...(config.watchFolders ?? []), path.resolve(__dirname, '../../registry')];

config.resolver.unstable_conditionNames = [
  'tabcn-source',
  ...(config.resolver.unstable_conditionNames ?? ['require', 'import']),
];

module.exports = config;
