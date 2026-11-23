// The code a visitor copies for a design: the Expo Router layout that uses it, for the settings
// picked in the design page's Customize panel, and the plain text "Copy for AI" puts on the
// clipboard. Pure functions with no file-system access, so the design page can rebuild them in
// the browser as the settings change (designs.ts calls them at build time too).
import type { DemoControls } from '../../../example/src/demo-controls';
import type { PreviewSettings } from '../../../example/src/preview-settings';
import { absoluteUrl } from './site';

/** The part of a design the snippets need: plain data, so it can go to a client component. */
export interface UsageDesign {
  id: string;
  title: string;
  kind: 'bar' | 'panel';
  description: string;
  component: string;
  hasAction: boolean;
  icons: string[];
  iconsFile: string | null;
  panelUI: boolean;
  /** The demo's own tab count, or null if it can't be read. */
  tabs: number | null;
  controls: DemoControls;
}

/** What the Customize panel picked. Right to left is not a preview setting; it rides along here. */
export interface UsageSettings extends PreviewSettings {
  rtl?: boolean;
}

/** The routes the snippet lists, in order, as many as the tab count asks for. */
const SCREENS = [
  { name: 'index', title: 'Home' },
  { name: 'explore', title: 'Explore' },
  { name: 'library', title: 'Library' },
  { name: 'inbox', title: 'Inbox' },
  { name: 'profile', title: 'Profile' },
  { name: 'search', title: 'Search' },
  { name: 'saved', title: 'Saved' },
  { name: 'settings', title: 'Settings' },
];

const FOUNDATION =
  'npx expo install react-native-tabcn react-native-reanimated react-native-worklets';

/** The Expo Router layout a user writes to use this design, for the settings picked. */
export function usageFor(d: UsageDesign, s: UsageSettings = {}) {
  if (d.id === 'sub-tabs') return SUB_TABS_SNIPPET;
  if (d.kind === 'panel') return panelSnippet(d);
  if (d.id === 'side-rail') return railSnippet(d, s);
  if (d.id === 'section-sheet') return SECTION_SHEET_SNIPPET;
  if (d.id === 'account-dock') return ACCOUNT_DOCK_SNIPPET;
  if (d.id === 'live-tabs') return LIVE_TABS_SNIPPET;
  return barSnippet(d, s);
}

/** The text "Copy for AI" copies: what the design is, how to install it, and the code. */
export function aiPromptFor(d: UsageDesign, s: UsageSettings, install: string) {
  const what = d.kind === 'panel' ? 'panel' : 'tab bar';
  const chosen = [
    ...(s.tabs ? [`${s.tabs} tabs`] : []),
    ...(s.accent && d.controls.accent ? [`accent ${s.accent}`] : []),
    ...(s.labels !== undefined && d.controls.labels
      ? [s.labels ? 'labels on' : 'labels off']
      : []),
    ...(s.theme && s.theme !== 'tabcn' && d.panelUI ? [`PanelUI ${s.theme} theme`] : []),
    ...(s.rtl ? ['right-to-left layout'] : []),
  ];
  return [
    `Add the ${d.title} ${what} from tabcn (React Native and Expo) to this app.`,
    '',
    d.description,
    '',
    'Install the foundation package once per app:',
    FOUNDATION,
    '',
    `Copy the ${d.title} design into the project with the shadcn CLI:`,
    install,
    'Then run `npx expo install --fix` so the packages it added match the Expo SDK.',
    '',
    'Use it in app/(tabs)/_layout.tsx:',
    '```tsx',
    usageFor(d, s).trimEnd(),
    '```',
    '',
    "With React Navigation instead of Expo Router, import tabBar from 'react-native-tabcn/react-navigation' and pass it to createBottomTabNavigator's tabBar.",
    ...(s.rtl
      ? [
          'The app lays out right to left (I18nManager.forceRTL): the bar mirrors with it, with no prop to set.',
        ]
      : []),
    ...(chosen.length ? ['', `Settings picked on the site: ${chosen.join(', ')}.`] : []),
    '',
    `Design page: ${absoluteUrl(`/designs/${d.id}/`)}`,
    '',
  ].join('\n');
}

/** A prop's value as JSX: strings quoted, anything else in braces. */
function jsxValue(value: unknown) {
  return typeof value === 'string' ? JSON.stringify(value) : `{${JSON.stringify(value)}}`;
}

/** The props the snippet passes to the design for the settings picked. */
function chosenProps(d: UsageDesign, s: UsageSettings) {
  const props: string[] = [];
  if (d.hasAction) props.push("onActionPress={() => router.push('/new')}");
  const themed = Boolean(s.theme && s.theme !== 'tabcn' && d.panelUI);
  // `colors.<key>` names a key of the design's `colors` prop (demo-controls.ts); it merges with
  // PanelUI's colours when a theme is on.
  const colorKey = d.controls.accent?.startsWith('colors.')
    ? d.controls.accent.slice('colors.'.length)
    : null;
  if (s.accent && d.controls.accent && !colorKey) {
    props.push(`${d.controls.accent}=${jsxValue(s.accent)}`);
  }
  if (s.labels !== undefined && d.controls.labels) {
    const { prop, on, off } = d.controls.labels;
    props.push(`${prop}=${jsxValue(s.labels ? on : off)}`);
  }
  if (s.accent && colorKey) {
    const entry = `${colorKey}: ${JSON.stringify(s.accent)}`;
    props.push(themed ? `colors={{ ...colors, ${entry} }}` : `colors={{ ${entry} }}`);
  } else if (themed) {
    props.push('colors={colors}');
  }
  return props;
}

/** `tabBar={tabBar(<X ... />)}`, on one line, or one prop per line once it gets long. */
function tabBarLine(component: string, props: string[]) {
  const inline = `      tabBar={tabBar(<${component}${props.map((p) => ` ${p}`).join('')} />)}`;
  if (props.length < 2 && inline.length <= 96) return [inline];
  return [
    '      tabBar={tabBar(',
    `        <${component}`,
    ...props.map((p) => `          ${p}`),
    '        />,',
    '      )}',
  ];
}

/** The screens: the first two named Home and Explore as before, then more for a higher count. */
function screenLines(d: UsageDesign, count: number, names = SCREENS) {
  const withIcons = d.icons.length >= 2;
  return names.slice(0, count).map(({ name, title }, i) => {
    const icon = withIcons ? d.icons[i] : undefined;
    return icon
      ? `      <Tabs.Screen name="${name}" options={{ title: '${title}', tabBarIcon: ${icon} }} />`
      : `      <Tabs.Screen name="${name}" options={{ title: '${title}' }} />`;
  });
}

function iconImport(d: UsageDesign, count: number) {
  if (d.icons.length < 2 || !d.iconsFile) return [];
  const used = d.icons.slice(0, Math.max(2, Math.min(count, d.icons.length)));
  return [`import { ${used.join(', ')} } from '@/${d.iconsFile}';`];
}

function themeLines(d: UsageDesign, s: UsageSettings) {
  const on = !!s.theme && s.theme !== 'tabcn' && d.panelUI;
  return {
    imports: on ? ["import { usePanelUIColors } from '@/components/tabcn/panelui-colors';"] : [],
    body: on ? [`  const colors = usePanelUIColors('${d.id}');`] : [],
  };
}

function barSnippet(d: UsageDesign, s: UsageSettings) {
  const count = clampTabs(s.tabs);
  const theme = themeLines(d, s);
  const lines = [
    "import { Tabs } from 'expo-router/js-tabs';",
    ...(d.hasAction ? ["import { router } from 'expo-router';"] : []),
    "import { tabBar } from 'react-native-tabcn/expo-router'; // or 'react-native-tabcn/react-navigation'",
    `import { ${d.component} } from '@/components/tabcn/${d.id}';`,
    ...iconImport(d, count),
    ...theme.imports,
    '',
    'export default function TabLayout() {',
    ...theme.body,
    '  return (',
    '    <Tabs',
    ...tabBarLine(d.component, chosenProps(d, s)),
    '      screenOptions={{ headerShown: false }}',
    '    >',
    ...screenLines(d, count),
    '    </Tabs>',
    '  );',
    '}',
  ];
  return `${lines.join('\n')}\n`;
}

/** Side Rail: a rail on wide windows (`tabBarPosition: 'left'`), a bottom bar on phones. */
function railSnippet(d: UsageDesign, s: UsageSettings) {
  const count = clampTabs(s.tabs);
  const theme = themeLines(d, s);
  const names = [SCREENS[0], { name: 'starred', title: 'Starred' }, ...SCREENS.slice(2)].filter(
    (n): n is { name: string; title: string } => n !== undefined,
  );
  const lines = [
    "import { Tabs } from 'expo-router/js-tabs';",
    "import { useWindowDimensions } from 'react-native';",
    "import { tabBar } from 'react-native-tabcn/expo-router'; // or 'react-native-tabcn/react-navigation'",
    `import { ${d.component} } from '@/components/tabcn/${d.id}';`,
    ...iconImport(d, count),
    ...theme.imports,
    '',
    'export default function TabLayout() {',
    '  const { width } = useWindowDimensions();',
    ...theme.body,
    '  return (',
    '    <Tabs',
    ...tabBarLine(d.component, chosenProps(d, s)),
    "      screenOptions={{ headerShown: false, tabBarPosition: width >= 600 ? 'left' : 'bottom' }}",
    '    >',
    ...screenLines(d, count, names),
    '    </Tabs>',
    '  );',
    '}',
  ];
  return `${lines.join('\n')}\n`;
}

const clampTabs = (n: number | undefined) =>
  Math.max(2, Math.min(n ?? 2, SCREENS.length));

/** The tab bar each panel's page shows it with (the pairing in the example app). */
export const PANEL_USAGE: Record<
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
      "      {/* Slides up from the bar’s + button (its usePanelAnchor('action')). */}",
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
  'filter-chips': {
    bar: 'SoftPill',
    barId: 'soft-pill',
    imports: [
      "import { FilterChips } from '@/components/tabcn/filter-chips';",
      "import { SortIcon, TruckIcon } from '@/components/tabcn/filter-chips-icons';",
    ],
    lines: [
      '      {/* Declared once beside <Tabs>, or on the screen that filters (hide it on blur',
      "          with useTabPanel('filters').hide). Only Apply calls onChange. */}",
      '      <FilterChips',
      '        groups={[',
      "          { id: 'sort', label: 'Sort', icon: SortIcon, options: sortOptions },",
      "          { id: 'delivery', label: 'Delivery', icon: TruckIcon, multiple: true, options: deliveryOptions },",
      '        ]}',
      '        value={filters}',
      '        onChange={setFilters}',
      '      />',
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
export const PANEL_BARS: Record<string, string> = {
  'context-tray': 'glass-expand',
  'sub-tabs': 'soft-pill',
};

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

/** Account Dock is the tab bar; its sheet is a panel, so it needs the provider. */
const ACCOUNT_DOCK_SNIPPET = `${[
  "import { Tabs } from 'expo-router/js-tabs';",
  "import { TabBarProvider } from 'react-native-tabcn';",
  "import { tabBar } from 'react-native-tabcn/expo-router'; // or 'react-native-tabcn/react-navigation'",
  "import { AccountDock } from '@/components/tabcn/account-dock';",
  '',
  'export default function TabLayout() {',
  "  // Your own data: workspaces, accounts and the person's status.",
  '  const { workspaces, workspaceId, setWorkspaceId } = useWorkspaces();',
  '  const { accounts, accountId, setAccountId } = useAccounts();',
  '  const [status, setStatus] = usePresence();',
  '  return (',
  '    <TabBarProvider>',
  '      <Tabs',
  '        tabBar={tabBar(',
  '          <AccountDock',
  '            workspaces={workspaces}',
  '            workspaceId={workspaceId}',
  '            onWorkspaceChange={setWorkspaceId}',
  '            accounts={accounts}',
  '            accountId={accountId}',
  '            onAccountChange={setAccountId}',
  '            status={status}',
  '            onStatusChange={setStatus}',
  '          />,',
  '        )}',
  '        screenOptions={{ headerShown: false }}',
  '      />',
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
function panelSnippet(d: UsageDesign) {
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
      "    <ContextTray label=\"Today’s plan\" progress={0.42} onClose={() => router.navigate('/')} />,",
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
