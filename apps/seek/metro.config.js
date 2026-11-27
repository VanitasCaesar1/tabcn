// Seek: a sample app built with PanelUI's components and tabcn's Ask Dock. Expo configures
// Metro for the monorepo; this resolves react-native-tabcn from its source, watches registry/
// (Ask Dock is imported from there, as `npx shadcn add` would copy it in), and runs PanelUI's
// theme through Uniwind with Seek's own night theme.
const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');
const { withUniwindConfig } = require('uniwind/metro');

const config = getDefaultConfig(__dirname);

config.watchFolders = [...(config.watchFolders ?? []), path.resolve(__dirname, '../../registry')];
config.resolver.unstable_conditionNames = [
  'tabcn-source',
  ...(config.resolver.unstable_conditionNames ?? ['require', 'import']),
];

module.exports = withUniwindConfig(config, {
  cssEntryFile: './src/global.css',
  dtsFile: './src/uniwind-types.d.ts',
  extraThemes: ['seek'],
});
