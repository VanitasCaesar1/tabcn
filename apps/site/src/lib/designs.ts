// Build-time data for every page: the catalog (ids, titles, layout groups) from the example app,
// descriptions from registry/registry.json, and facts read from each design's source. Server
// only: it reads the file system while the static export renders.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { catalog, type DesignKind, LAYOUT_LABELS, type Layout } from '../../../example/src/catalog';
import registry from '../../../../registry/registry.json';
import type { DesignProps } from '../../../../scripts/design-props';
import { asset } from './base-path';
import { GROUP_NOTES, GROUP_OF, SITE_GROUPS, type SiteGroupId, siteGroupOf } from './groups';
import { absoluteUrl } from './site';

export { legacyGroup } from './groups';

const root = join(process.cwd(), '../..');
const publicDir = join(process.cwd(), 'public');

export interface Design {
  id: string;
  /** Reference image number, or 0 for a design from outside the reference set. */
  ref: number;
  title: string;
  /** A tab bar (passed to `tabBar()`), or a panel drawn behind one (needs `TabBarProvider`). */
  kind: DesignKind;
  description: string;
  layout: Layout;
  layoutLabel: string;
  /** The site group it's listed under: one of the board's four, or the panels. */
  group: SiteGroupId;
  /** The demo screen's colour behind the bar (`#rrggbb`), from the example app's demos. */
  background: string;
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
  /** Absolute URL of the link-preview image: its own, or the site's while it's missing. */
  ogImage: string;
  /** basePath-aware URLs of the tab bar stills, one per tab state, in order. */
  stills: string[];
  /** basePath-aware URLs of the cropped loop (public/bars) and its poster, or null. */
  loop: string | null;
  loopPoster: string | null;
  /** A small picture of the bar (138 x 48) for the sidebar, search and list rows. */
  thumb: string | null;
  /** For a panel without its own crop yet: a still to show in its place. */
  fallbackPoster: string | null;
  /** The newest design, as the hero's "New" link picks it. */
  isNew: boolean;
  /** A panel's bar in the example app (its title), or null. */
  pairedBar: string | null;
  /** How many tabs the example app's demo shows, or null if it can't be read. */
  tabs: number | null;
  /** The component's props, read from its source by scripts/design-props.ts. */
  props: DesignProps;
}

/** The part of a design the client components need. */
export interface DesignSummary {
  id: string;
  title: string;
  description: string;
  layout: Layout;
  layoutLabel: string;
  group: SiteGroupId;
  thumb: string | null;
  background: string;
}

function ogImage(id: string) {
  return existsSync(join(publicDir, 'og', `${id}.jpg`))
    ? absoluteUrl(`/og/${id}.jpg`)
    : absoluteUrl('/og.jpg');
}

function media(file: string) {
  return existsSync(join(publicDir, 'videos', file)) ? asset(`/videos/${file}`) : null;
}

const stillFiles = existsSync(join(publicDir, 'stills'))
  ? readdirSync(join(publicDir, 'stills'))
  : [];

/** `public/stills/<id>-<n>.jpg`, sorted by n. */
function stills(id: string) {
  return stillFiles
    .map((file) => ({ file, n: Number(file.match(new RegExp(`^${id}-(\\d+)\\.jpg$`))?.[1]) }))
    .filter((s) => s.n > 0)
    .sort((a, b) => a.n - b.n)
    .map((s) => asset(`/stills/${s.file}`));
}

// The demos file imports React Native, so it's read as text: each design's block in `demos`
// lists its tabs as `{ label: ... }` lines inside `tabs: [ ... ]`.
const demosSource = readFileSync(join(root, 'apps/example/src/demos.tsx'), 'utf8');
const demosBody = demosSource.slice(demosSource.indexOf('export const demos'));

function tabCount(id: string) {
  const block = demoBlock(id);
  if (!block) return null;
  const list = block.match(/tabs: \[([\s\S]*?)\n {4}\]/)?.[1];
  const n = list?.match(/\{ label:/g)?.length ?? 0;
  return n > 0 ? n : null;
}

function demoBlock(id: string) {
  const start = demosBody.search(new RegExp(`^  '?${id}'?: \\{$`, 'm'));
  if (start < 0) return null;
  const rest = demosBody.slice(start + 1);
  const next = rest.search(/^ {2}'?[\w-]+'?: \{$/m);
  return next < 0 ? rest : rest.slice(0, next);
}

const HEX = /^#[0-9a-f]{6}$/i;

/**
 * The demo screen's `background`: a hex literal, or a named constant declared at the top of
 * demos.tsx or exported by the registry file it imports from. Throws if neither is found, so a
 * new design can't ship without its tile colour.
 */
function demoBackground(id: string) {
  const value = demoBlock(id)?.match(/^ {4}background: (.+),$/m)?.[1]?.trim();
  if (!value) throw new Error(`${id}: no background in apps/example/src/demos.tsx`);
  const literal = value.match(/^'(#[0-9a-fA-F]{6})'$/)?.[1];
  if (literal) return literal.toLowerCase();
  if (!/^\w+$/.test(value)) throw new Error(`${id}: can't read background ${value}`);
  const constant = new RegExp(`^(?:export )?const ${value} = '(#[0-9a-fA-F]{6})'`, 'm');
  const local = demosSource.match(constant)?.[1];
  if (local) return local.toLowerCase();
  const from = demosSource
    .match(new RegExp(`^import \\{[^}]*\\b${value}\\b[^}]*\\} from '@registry/([\\w/-]+)';`, 'm'))
    ?.at(1);
  const file = from ? join(root, 'registry/designs', `${from}.tsx`) : null;
  const imported = file && existsSync(file) ? readFileSync(file, 'utf8').match(constant)?.[1] : null;
  if (imported && HEX.test(imported)) return imported.toLowerCase();
  throw new Error(`${id}: can't resolve background ${value} to a hex colour`);
}

// The bar loops and thumbnails cut by scripts/bar-loops.py.
const barsDir = join(publicDir, 'bars');
const bar = (file: string) => (existsSync(join(barsDir, file)) ? asset(`/bars/${file}`) : null);

// Written by scripts/build-props.ts before `next build` (it needs the TypeScript compiler,
// which the site doesn't bundle).
const propsFile = join(process.cwd(), 'generated/design-props.json');
if (!existsSync(propsFile)) {
  throw new Error('generated/design-props.json is missing: run `bun scripts/build-props.ts`');
}
const propsData = JSON.parse(readFileSync(propsFile, 'utf8')) as Record<string, DesignProps>;

/** The tab bar each panel's page shows it with (the pairing in the example app). */
const PANEL_USAGE: Record<
  string,
  { bar: string; barId: string; lines: string[]; imports: string[]; tabcn?: string[] }
> = {
    'mini-player': {
      bar: 'SoftPill',
      barId: 'soft-pill',
      imports: ["import { MiniPlayer } from '@/components/tabcn/mini-player';"],
      lines: [
        '      {/* Dragging needs <GestureHandlerRootView style={{ flex: 1 }}> around the',
        '          app, in app/_layout.tsx (react-native-gesture-handler). */}',
        '      {/* Declared once beside <Tabs>, so it stays across tabs. Show it with',
        "          useTabPanel('player').peek() when a track starts. */}",
        '      <MiniPlayer track={track} playing={playing} onPlayPause={toggle} onNext={next} />',
      ],
    },
    'quick-create': {
      bar: 'LabeledPlus',
      barId: 'labeled-plus',
      imports: [
        "import { QuickCreate, useQuickCreate } from '@/components/tabcn/quick-create';",
        "import { MicIcon, TextIcon } from '@/components/tabcn/quick-create-icons';",
      ],
      lines: [
        '      {/* Slides up from the bar’s + button (its usePanelAnchor(\'action\')). */}',
        '      <QuickCreate',
        '        actions={[',
        "          { label: 'Voice', icon: MicIcon, onPress: startRecording },",
        "          { label: 'Text', icon: TextIcon, onPress: newScript },",
        '        ]}',
        '      />',
      ],
    },
    'bar-sheet': {
      bar: 'SoftPill',
      barId: 'soft-pill',
      imports: ["import { BarSheet } from '@/components/tabcn/bar-sheet';"],
      lines: [
        '      {/* Dragging needs <GestureHandlerRootView style={{ flex: 1 }}> around the',
        '          app, in app/_layout.tsx (react-native-gesture-handler). */}',
        '      {/* Declared once beside <Tabs>. Open it from any screen with',
        '          useBarSheet().open, or move it with snapTo(index). */}',
        '      <BarSheet title="Comments" subtitle="128 replies">',
        '        <CommentList />',
        '      </BarSheet>',
      ],
    },
    'companion-chip': {
      bar: 'SplitSearch',
      barId: 'split-search',
      tabcn: ['TabBarCompanion', 'TabBarProvider'],
      imports: ["import { CompanionChip } from '@/components/tabcn/companion-chip';"],
      lines: [
        '      {/* Sits above the bar’s end and moves with it. From a screen, pass',
        '          visible={useIsFocused()} to show it on that screen only. */}',
        '      <TabBarCompanion position="above-end">',
        '        <CompanionChip',
        '          variant="round"',
        '          icon={LocateIcon}',
        '          accessibilityLabel="Locate me"',
        '          onPress={recenter}',
        '        />',
        '      </TabBarCompanion>',
      ],
    },
  };

/** Panels with no PANEL_USAGE entry, and the bar their demo draws them with. */
const PANEL_BARS: Record<string, string> = {
  'context-tray': 'glass-expand',
  'sub-tabs': 'soft-pill',
};

function load(): Design[] {
  return catalog.map((entry, index) => {
    const item = registry.items.find((i) => i.name === entry.id);
    if (!item) throw new Error(`${entry.id} is in the catalog but not in registry/registry.json`);
    const main = item.files.find((f) => f.path.endsWith(`/${entry.id}.tsx`));
    if (!main) throw new Error(`${entry.id}: registry entry has no ${entry.id}.tsx`);
    const source = readFileSync(join(root, main.path), 'utf8');
    const component = source.match(/^export function (\w+)\(/m)?.[1];
    if (!component) throw new Error(`${entry.id}: no exported component in ${main.path}`);
    const props = propsData[entry.id];
    if (!props) throw new Error(`${entry.id}: no props in generated/design-props.json`);
    const iconsEntry = item.files.find((f) => f.path.endsWith('/icons.tsx'));
    const icons = iconsEntry
      ? [
          ...readFileSync(join(root, iconsEntry.path), 'utf8').matchAll(
            /^export function (\w+Icon)\(/gm,
          ),
        ].map((m) => m[1] as string)
      : [];
    const loop = bar(`${entry.id}.mp4`);
    const loopPoster = bar(`${entry.id}.jpg`);
    const hasLoop = loop !== null && loopPoster !== null;
    const stillList = stills(entry.id);
    const fallbackPoster =
      entry.kind === 'panel' && !hasLoop ? (stillList[1] ?? stillList[0] ?? null) : null;
    const pairedId = PANEL_USAGE[entry.id]?.barId ?? PANEL_BARS[entry.id];
    return {
      id: entry.id,
      ref: entry.ref,
      title: entry.title,
      kind: entry.kind,
      description: item.description,
      layout: entry.layout,
      layoutLabel: LAYOUT_LABELS[entry.layout],
      group: siteGroupOf(entry.layout),
      background: demoBackground(entry.id),
      component,
      hasAction: /^\s+onActionPress: /m.test(source),
      icons,
      iconsFile: iconsEntry ? iconsEntry.target.replace(/\.tsx$/, '') : null,
      video: media(`${entry.id}.mp4`),
      poster: media(`${entry.id}.jpg`),
      ogImage: ogImage(entry.id),
      stills: stillList,
      loop: hasLoop ? loop : null,
      loopPoster: hasLoop ? loopPoster : null,
      thumb: bar(`${entry.id}-thumb.jpg`) ?? (hasLoop ? loopPoster : fallbackPoster),
      fallbackPoster,
      isNew: index === catalog.length - 1,
      pairedBar: pairedId ? (catalog.find((c) => c.id === pairedId)?.title ?? null) : null,
      tabs: tabCount(entry.id),
      props,
    };
  });
}


export const designs = load();

const layoutOrder = Object.keys(LAYOUT_LABELS) as Layout[];

/**
 * The five site groups in SITE_GROUPS order. Inside a group, designs go layout by layout (in
 * LAYOUT_LABELS order, each a sub-head in the sidebar), then in catalog order.
 */
export const groups = SITE_GROUPS.map(({ id, label }) => {
  const layouts = layoutOrder
    .filter((layout) => (GROUP_OF[layout] ?? 'panels') === id)
    .map((layout) => ({
      layout,
      label: LAYOUT_LABELS[layout],
      items: designs.filter((d) => d.layout === layout),
    }))
    .filter((l) => l.items.length > 0);
  return { id, label, note: GROUP_NOTES[id], layouts, items: layouts.flatMap((l) => l.items) };
}).filter((g) => g.items.length > 0);

/** The reading order: the sidebar's and the catalogue's, which Previous / Next walk too. */
export const ordered = groups.flatMap((g) => g.items);

/** The groups with their counts, for the filter, sidebar and footer. */
export const siteGroups = groups.map(({ id, label, items }) => ({ id, label, count: items.length }));

export function groupLabel(id: SiteGroupId) {
  return SITE_GROUPS.find((g) => g.id === id)?.label ?? id;
}

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

export function summary({
  id,
  title,
  description,
  layout,
  layoutLabel,
  group,
  thumb,
  background,
}: Design): DesignSummary {
  return { id, title, description, layout, layoutLabel, group, thumb, background };
}

/** The Expo Router layout a user writes to use this design. */
export function usageSnippet(d: Design) {
  if (d.id === 'sub-tabs') return SUB_TABS_SNIPPET;
  if (d.kind === 'panel') return panelSnippet(d);
  if (d.id === 'side-rail') return railSnippet(d);
  if (d.id === 'section-sheet') return SECTION_SHEET_SNIPPET;
  if (d.id === 'live-tabs') return LIVE_TABS_SNIPPET;
  return barSnippet(d);
}

/** Sub-Tabs has two parts: `useSubTabs` on one tab inside the bar, and the drawer beside it. */
const SUB_TABS_SNIPPET = `${[
  '// In your bar design (a copy of any tabcn bar): the tab that owns the drawer.',
  "import { View } from 'react-native';",
  "import { TabButton, type TabItem } from 'react-native-tabcn';",
  "import { useSubTabs } from '@/components/tabcn/sub-tabs';",
  '',
  'function LibraryTab({ tab }: { tab: TabItem }) {',
  "  const sub = useSubTabs('library', { width: 168 });",
  '  return (',
  '    <TabButton tab={tab} {...sub.tabProps}>',
  '      {tab.renderIcon?.({ focused: tab.focused, color, size: 22 })}',
  '      <View {...sub.anchorProps} />',
  '    </TabButton>',
  '  );',
  '}',
  '',
  '// app/(tabs)/_layout.tsx: the drawer, declared once beside <Tabs>',
  "import { router } from 'expo-router';",
  "import { Tabs } from 'expo-router/js-tabs';",
  "import { TabBarProvider } from 'react-native-tabcn';",
  "import { tabBar } from 'react-native-tabcn/expo-router'; // or 'react-native-tabcn/react-navigation'",
  "import { SubTabs } from '@/components/tabcn/sub-tabs';",
  "import { MyTabBar } from '@/components/tabcn/my-tab-bar';",
  '',
  'export default function TabLayout() {',
  '  return (',
  '    <TabBarProvider>',
  '      <Tabs tabBar={tabBar(<MyTabBar />)} screenOptions={{ headerShown: false }} />',
  '      <SubTabs',
  '        name="library"',
  '        items={[',
  "          { label: 'Albums', onPress: () => router.navigate('/library/albums') },",
  "          { label: 'Artists', onPress: () => router.navigate('/library/artists') },",
  '        ]}',
  '      />',
  '    </TabBarProvider>',
  '  );',
  '}',
].join('\n')}\n`;

/** Section Sheet is the tab bar; each section's sheet body comes from `sections`. */
const SECTION_SHEET_SNIPPET = `${[
  "import { Tabs } from 'expo-router/js-tabs';",
  "import { TabBarProvider } from 'react-native-tabcn';",
  "import { tabBar } from 'react-native-tabcn/expo-router'; // or 'react-native-tabcn/react-navigation'",
  "import { SectionSheet } from '@/components/tabcn/section-sheet';",
  '',
  'export default function TabLayout() {',
  '  return (',
  '    // Needs the provider, and <GestureHandlerRootView style={{ flex: 1 }}> around the app.',
  '    <TabBarProvider>',
  '      <Tabs',
  '        backBehavior="history"',
  '        tabBar={tabBar(',
  '          <SectionSheet',
  '            sections={{ index: <ExploreList />, guides: <GuideList />, saved: <SavedList /> }}',
  '          />,',
  '        )}',
  '        screenOptions={{ headerShown: false }}',
  '      >',
  "        <Tabs.Screen name=\"index\" options={{ title: 'Explore' }} />",
  "        <Tabs.Screen name=\"guides\" options={{ title: 'Guides' }} />",
  "        <Tabs.Screen name=\"saved\" options={{ title: 'Saved' }} />",
  '      </Tabs>',
  '    </TabBarProvider>',
  '  );',
  '}',
].join('\n')}\n`;

/** Live Tabs draws what screens write with `useLiveTab`. */
const LIVE_TABS_SNIPPET = `${[
  '// app/(tabs)/_layout.tsx',
  "import { Tabs } from 'expo-router/js-tabs';",
  "import { TabBarProvider } from 'react-native-tabcn';",
  "import { tabBar } from 'react-native-tabcn/expo-router'; // or 'react-native-tabcn/react-navigation'",
  "import { LiveTabs } from '@/components/tabcn/live-tabs';",
  '',
  'export default function TabLayout() {',
  '  return (',
  '    <TabBarProvider>',
  '      <Tabs tabBar={tabBar(<LiveTabs />)} screenOptions={{ headerShown: false }} />',
  '    </TabBarProvider>',
  '  );',
  '}',
  '',
  '// Anywhere under the provider, such as the Timer screen, once a second:',
  "import { useLiveTab } from 'react-native-tabcn';",
  '',
  "const timer = useLiveTab('timer'); // the tab's route name",
  'timer.progress.value = elapsed / duration; // fills the ring; 0 or 1 hides it',
  "timer.setText(remaining > 0 ? format(remaining) : undefined); // replaces the label",
].join('\n')}\n`;

/**
 * Panels need a `TabBarProvider` around the navigator. Mini Player and Quick Create are
 * declared beside `<Tabs>`; Context Tray is set by a screen with `useTabBarOverride`.
 */
function panelSnippet(d: Design) {
  if (d.id === 'context-tray') {
    return `${[
      '// app/(tabs)/_layout.tsx: the provider lets screens drive the bar',
      "import { Tabs } from 'expo-router/js-tabs';",
      "import { TabBarProvider } from 'react-native-tabcn';",
      "import { tabBar } from 'react-native-tabcn/expo-router';",
      "import { GlassExpand } from '@/components/tabcn/glass-expand';",
      '',
      'export default function TabLayout() {',
      '  return (',
      '    <TabBarProvider>',
      '      <Tabs tabBar={tabBar(<GlassExpand />)} screenOptions={{ headerShown: false }} />',
      '    </TabBarProvider>',
      '  );',
      '}',
      '',
      '// app/(tabs)/plan.tsx: the tray shows in the bar’s place while this screen is focused',
      "import { router } from 'expo-router';",
      "import { useTabBarOverride } from 'react-native-tabcn/expo-router'; // or 'react-native-tabcn/react-navigation'",
      "import { ContextTray } from '@/components/tabcn/context-tray';",
      '',
      'export default function PlanScreen() {',
      '  useTabBarOverride(',
      '    <ContextTray label="Today’s plan" progress={0.42} onClose={() => router.navigate(\'/\')} />,',
      '  );',
      '  // …',
      '}',
    ].join('\n')}\n`;
  }
  const usage = PANEL_USAGE[d.id];
  const bar = usage?.bar ?? 'MyTabBar';
  const barProps = d.id === 'quick-create' ? ' onActionPress={toggleCreate}' : '';
  const lines = [
    "import { Tabs } from 'expo-router/js-tabs';",
    `import { ${(usage?.tabcn ?? ['TabBarProvider']).join(', ')} } from 'react-native-tabcn';`,
    "import { tabBar } from 'react-native-tabcn/expo-router'; // or 'react-native-tabcn/react-navigation'",
    `import { ${bar} } from '@/components/tabcn/${usage?.barId ?? 'my-tab-bar'}';`,
    ...(usage?.imports ?? []),
    '',
    ...(d.id === 'quick-create'
      ? [
          '// The bar, with its + button toggling the menu (any bar that marks its button with',
          "// usePanelAnchor('action') works).",
          'function Bar() {',
          '  const toggleCreate = useQuickCreate();',
          `  return <${bar}${barProps} />;`,
          '}',
          '',
        ]
      : []),
    'export default function TabLayout() {',
    '  return (',
    '    // Panels need the provider around the tabs navigator.',
    '    <TabBarProvider>',
    `      <Tabs tabBar={tabBar(<${d.id === 'quick-create' ? 'Bar' : bar} />)} screenOptions={{ headerShown: false }} />`,
    ...(usage?.lines ?? []),
    '    </TabBarProvider>',
    '  );',
    '}',
  ];
  return `${lines.join('\n')}\n`;
}

/** Side Rail: a rail on wide windows (`tabBarPosition: 'left'`), a bottom bar on phones. */
function railSnippet(d: Design) {
  const [first, second] = d.icons;
  const lines = [
    "import { Tabs } from 'expo-router/js-tabs';",
    "import { useWindowDimensions } from 'react-native';",
    "import { tabBar } from 'react-native-tabcn/expo-router'; // or 'react-native-tabcn/react-navigation'",
    `import { ${d.component} } from '@/components/tabcn/${d.id}';`,
    ...(first && second && d.iconsFile
      ? [`import { ${first}, ${second} } from '@/${d.iconsFile}';`]
      : []),
    '',
    'export default function TabLayout() {',
    '  const { width } = useWindowDimensions();',
    '  return (',
    '    <Tabs',
    `      tabBar={tabBar(<${d.component} />)}`,
    "      screenOptions={{ headerShown: false, tabBarPosition: width >= 600 ? 'left' : 'bottom' }}",
    '    >',
    first
      ? `      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ${first} }} />`
      : `      <Tabs.Screen name="index" options={{ title: 'Home' }} />`,
    second
      ? `      <Tabs.Screen name="starred" options={{ title: 'Starred', tabBarIcon: ${second} }} />`
      : `      <Tabs.Screen name="starred" options={{ title: 'Starred' }} />`,
    '    </Tabs>',
    '  );',
    '}',
  ];
  return `${lines.join('\n')}\n`;
}

function barSnippet(d: Design) {
  const [first, second] = d.icons.length >= 2 ? d.icons : [];
  const props = d.hasAction ? ` onActionPress={() => router.push('/new')}` : '';
  const lines = [
    "import { Tabs } from 'expo-router/js-tabs';",
    ...(d.hasAction ? ["import { router } from 'expo-router';"] : []),
    "import { tabBar } from 'react-native-tabcn/expo-router'; // or 'react-native-tabcn/react-navigation'",
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
