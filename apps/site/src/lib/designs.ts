// Build-time data for every page: the catalog (ids, titles, layout groups) from the example app,
// descriptions from registry/registry.json, and facts read from each design's source. Server
// only: it reads the file system while the static export renders.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { catalog, LAYOUT_LABELS, type Layout } from '../../../example/src/catalog';
import registry from '../../../../registry/registry.json';
import { asset } from './base-path';

const root = join(process.cwd(), '../..');
const publicDir = join(process.cwd(), 'public');

export interface Design {
  id: string;
  ref: number;
  title: string;
  description: string;
  layout: Layout;
  layoutLabel: string;
  /** The exported component, e.g. `SlidingCapsule`. */
  component: string;
  /** The design takes a required `onActionPress` (it has a separate action button). */
  hasAction: boolean;
  /** Icon components exported from the design's icons file, if it ships one. */
  icons: string[];
  iconsFile: string | null;
  /** basePath-aware URLs, or null while the recording is missing. */
  video: string | null;
  poster: string | null;
}

/** The part of a design the client components need. */
export interface DesignSummary {
  id: string;
  title: string;
  description: string;
  layout: Layout;
  layoutLabel: string;
}

function media(file: string) {
  return existsSync(join(publicDir, 'videos', file)) ? asset(`/videos/${file}`) : null;
}

function load(): Design[] {
  return catalog.map((entry) => {
    const item = registry.items.find((i) => i.name === entry.id);
    if (!item) throw new Error(`${entry.id} is in the catalog but not in registry/registry.json`);
    const main = item.files.find((f) => f.path.endsWith(`/${entry.id}.tsx`));
    if (!main) throw new Error(`${entry.id}: registry entry has no ${entry.id}.tsx`);
    const source = readFileSync(join(root, main.path), 'utf8');
    const component = source.match(/^export function (\w+)\(/m)?.[1];
    if (!component) throw new Error(`${entry.id}: no exported component in ${main.path}`);
    const iconsEntry = item.files.find((f) => f.path.endsWith('/icons.tsx'));
    const icons = iconsEntry
      ? [
          ...readFileSync(join(root, iconsEntry.path), 'utf8').matchAll(
            /^export function (\w+Icon)\(/gm,
          ),
        ].map((m) => m[1] as string)
      : [];
    return {
      id: entry.id,
      ref: entry.ref,
      title: entry.title,
      description: item.description,
      layout: entry.layout,
      layoutLabel: LAYOUT_LABELS[entry.layout],
      component,
      hasAction: /^\s+onActionPress: /m.test(source),
      icons,
      iconsFile: iconsEntry ? iconsEntry.target.replace(/\.tsx$/, '') : null,
      video: media(`${entry.id}.mp4`),
      poster: media(`${entry.id}.jpg`),
    };
  });
}

export const designs = load();

/** Sidebar groups, in the order of LAYOUT_LABELS; designs keep catalog order inside each. */
export const groups = (Object.keys(LAYOUT_LABELS) as Layout[])
  .map((id) => ({
    id,
    label: LAYOUT_LABELS[id],
    items: designs.filter((d) => d.layout === id),
  }))
  .filter((g) => g.items.length > 0);

/** The reading order: the sidebar's, which Previous / Next walk too. */
export const ordered = groups.flatMap((g) => g.items);

export const categories = groups.map(({ id, label }) => ({ id, label }));

export function getDesign(id: string) {
  return designs.find((d) => d.id === id);
}

export function neighbours(id: string) {
  const i = ordered.findIndex((d) => d.id === id);
  return {
    previous: i > 0 ? ordered[i - 1] : undefined,
    next: i >= 0 && i < ordered.length - 1 ? ordered[i + 1] : undefined,
  };
}

export function summary({ id, title, description, layout, layoutLabel }: Design): DesignSummary {
  return { id, title, description, layout, layoutLabel };
}

/** The Expo Router layout a user writes to use this design. */
export function usageSnippet(d: Design) {
  const [first, second] = d.icons.length >= 2 ? d.icons : [];
  const props = d.hasAction ? ` onActionPress={() => router.push('/new')}` : '';
  const lines = [
    "import { Tabs } from 'expo-router/js-tabs';",
    ...(d.hasAction ? ["import { router } from 'expo-router';"] : []),
    "import { tabBar } from 'tabcn/expo-router'; // or 'tabcn/react-navigation'",
    `import { ${d.component} } from '@/components/tabcn/${d.id}';`,
    ...(first && second && d.iconsFile
      ? [`import { ${first}, ${second} } from '@/${d.iconsFile}';`]
      : []),
    '',
    'export default function TabLayout() {',
    '  return (',
    '    <Tabs',
    `      tabBar={tabBar(<${d.component}${props} />)}`,
    '      screenOptions={{ headerShown: false }}',
    '    >',
    first && second
      ? `      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ${first} }} />`
      : `      <Tabs.Screen name="index" options={{ title: 'Home' }} />`,
    first && second
      ? `      <Tabs.Screen name="explore" options={{ title: 'Explore', tabBarIcon: ${second} }} />`
      : `      <Tabs.Screen name="explore" options={{ title: 'Explore' }} />`,
    '    </Tabs>',
    '  );',
    '}',
  ];
  return `${lines.join('\n')}\n`;
}
