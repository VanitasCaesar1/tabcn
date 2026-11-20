// Expo configures Metro for monorepos on its own. The one addition: resolve
// workspace packages through their "tabcn-source" export condition, so the example
// app runs packages/tabcn/src directly and edits show up without a build step.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.unstable_conditionNames = [
  'tabcn-source',
  ...(config.resolver.unstable_conditionNames ?? ['require', 'import']),
];

module.exports = config;
