/**
 * The parts of the example app's demos that need hooks: panel demos (Mini Player, Context
 * Tray, Quick Create, Bar Sheet, Companion Chip, Sub-Tabs) and the feeds behind Section Sheet
 * and Live Tabs. Kept out of demos.tsx,
 * whose top-level object keys are read as design ids by scripts/check-registry.ts.
 *
 * A panel demo renders its paired bar as the tab bar, declares the panel once in the design
 * layout (under its TabBarProvider, beside <Tabs>), and puts its controls under the scene's
 * title, drawn quietly so the app scene still reads as an app.
 *
 * These run under both demos: Expo Router's (src/app/designs/[id]/) and plain React
 * Navigation's (src/app/react-navigation.tsx). Anything that depends on the navigator (the
 * bar's height, going to the first tab, the override hook's entry) comes in through
 * `DemoExtraProps`, so nothing here reads one navigator's context under the other.
 */

import { BarSheet as BarSheetDesign, useBarSheet } from '@registry/bar-sheet/bar-sheet';
import {
  CompanionChip as CompanionChipDesign,
  type CompanionChipIconProps,
} from '@registry/companion-chip/companion-chip';
import { ContextTray as ContextTrayDesign } from '@registry/context-tray/context-tray';
import {
  FilterChips as FilterChipsDesign,
  type FilterGroup,
  type FilterValue,
} from '@registry/filter-chips/filter-chips';
import * as FilterChipsIcons from '@registry/filter-chips/filter-chips-icons';
import { LabeledPlus as LabeledPlusDesign } from '@registry/labeled-plus/labeled-plus';
import { MiniPlayer as MiniPlayerDesign } from '@registry/mini-player/mini-player';
import * as QuickCreateIcons from '@registry/quick-create/icons';
import {
  QuickCreate as QuickCreateDesign,
  useQuickCreate,
} from '@registry/quick-create/quick-create';
import { SubTabs as SubTabsDesign, useSubTabs } from '@registry/sub-tabs/sub-tabs';
import { type ReactNode, useEffect, useState, useSyncExternalStore } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path, Rect } from 'react-native-svg';
import {
  TabBarCompanion,
  TabBarRoot,
  TabBarStateProvider,
  TabButton,
  type TabButtonProps,
  type TabIconProps,
  TabIndicator,
  type TabItem,
  TabList,
  tabcnTiming,
  useLiveTab,
  useTabBar,
  useTabBarInset,
} from 'react-native-tabcn';
import { useTabBarOverride as useExpoRouterOverride } from 'react-native-tabcn/expo-router';
import { useTabBarOverride as useReactNavigationOverride } from 'react-native-tabcn/react-navigation';
import { themed } from '@/panel-theme';
import { SceneActionsProvider } from '@/scenes/kit';

// Each design in the PanelUI theme picked on the demo screen (src/panel-theme.tsx).
const BarSheet = themed('bar-sheet', BarSheetDesign);
const CompanionChip = themed('companion-chip', CompanionChipDesign);
const ContextTray = themed('context-tray', ContextTrayDesign);
const LabeledPlus = themed('labeled-plus', LabeledPlusDesign);
const MiniPlayer = themed('mini-player', MiniPlayerDesign);
const QuickCreate = themed('quick-create', QuickCreateDesign);
const SubTabs = themed('sub-tabs', SubTabsDesign);

/**
 * What a demo screen passes to a demo's `extra`: a wrapper around the tab's scene that hangs the
 * demo's behaviour on the scene's own controls (SceneActions) or runs it on its own. It draws
 * nothing of its own, so the screen reads as the app, not as a demo.
 */
export interface DemoExtraProps {
  /** Index of the tab showing it. */
  index: number;
  /** The tab's scene. */
  children: ReactNode;
  /** The navigator the demo runs under: picks the matching 'react-native-tabcn/<adapter>' entry. */
  adapter: 'expo-router' | 'react-navigation';
  /** The navigator's `useBottomTabBarHeight()`: what the bar covers at the bottom. */
  barHeight: number;
  /** Navigates to the tab navigator's first tab. */
  goToFirstTab: () => void;
}

/** `useTabBarOverride` from the entry that matches the demo's navigator. */
function ExpoRouterOverride({ element }: { element: ReactNode }) {
  useExpoRouterOverride(element);
  return null;
}

function ReactNavigationOverride({ element }: { element: ReactNode }) {
  useReactNavigationOverride(element);
  return null;
}

/**
 * A value shared by a demo's panel (declared once in the design layout) and its controls (on
 * each tab's screen), which sit in different parts of the tree.
 */
function demoStore<T>(initial: T) {
  let value = initial;
  const listeners = new Set<() => void>();
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };
  const get = () => value;
  return {
    get,
    set(next: T) {
      if (Object.is(next, value)) return;
      value = next;
      for (const listener of listeners) listener();
    },
    useValue: () => useSyncExternalStore(subscribe, get, get),
  };
}

// Mini Player (paired with Soft Pill) --------------------------------------------------------

const PLAYER = 'player';

// Abstract covers drawn for the demo by assets/covers/generate.py.
const TRACKS = [
  {
    title: 'Slow Tide',
    artist: 'Harbor Lights',
    duration: 214,
    artwork: require('../assets/covers/slow-tide.jpg'),
  },
  {
    title: 'Paper Planes',
    artist: 'Juniper Fields',
    duration: 187,
    artwork: require('../assets/covers/paper-planes.jpg'),
  },
  {
    title: 'Night Bus',
    artist: 'The Quiet Hours',
    duration: 242,
    artwork: require('../assets/covers/night-bus.jpg'),
  },
];

/** The panel, with local playback so it moves: progress ticks while playing. */
export function MiniPlayerPanel() {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [elapsed, setElapsed] = useState(48);
  const track = TRACKS[index % TRACKS.length] ?? TRACKS[0];
  const duration = track?.duration ?? 1;
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => setElapsed((s) => (s + 1) % duration), 1000);
    return () => clearInterval(timer);
  }, [playing, duration]);
  if (!track) return null;
  const go = (step: number) => {
    setIndex((i) => (i + step + TRACKS.length) % TRACKS.length);
    setElapsed(0);
  };
  return (
    <MiniPlayer
      id={PLAYER}
      track={track}
      playing={playing}
      progress={elapsed / duration}
      onPlayPause={() => setPlaying((p) => !p)}
      onNext={() => go(1)}
      onPrevious={() => go(-1)}
      initialState="peek"
    />
  );
}

// Filter Chips (paired with Soft Pill) -------------------------------------------------------

const FilterChips = themed('filter-chips', FilterChipsDesign);
const FILTERS = 'filters';

const FILTER_GROUPS: FilterGroup[] = [
  {
    id: 'sort',
    label: 'Sort',
    icon: FilterChipsIcons.SortIcon,
    options: [
      { id: 'recommended', label: 'Recommended' },
      { id: 'price-low', label: 'Lowest price' },
      { id: 'price-high', label: 'Highest price' },
      { id: 'rated', label: 'Top rated' },
      { id: 'newest', label: 'Newest' },
      { id: 'discount', label: 'Biggest discount' },
    ],
  },
  {
    id: 'delivery',
    label: 'Delivery',
    icon: FilterChipsIcons.TruckIcon,
    multiple: true,
    options: [
      { id: 'today', label: 'Ships today' },
      { id: 'free', label: 'Free delivery' },
      { id: 'pickup', label: 'Store pickup' },
    ],
  },
  {
    id: 'arrives',
    label: 'Arrives by',
    icon: FilterChipsIcons.CalendarIcon,
    options: [
      { id: 'tomorrow', label: 'Tomorrow' },
      { id: 'week', label: 'This week' },
      { id: 'month', label: 'This month' },
    ],
  },
  {
    id: 'category',
    label: 'Category',
    icon: FilterChipsIcons.GridIcon,
    multiple: true,
    options: [
      { id: 'phones', label: 'Phones' },
      { id: 'laptops', label: 'Laptops' },
      { id: 'audio', label: 'Audio' },
      { id: 'watches', label: 'Watches' },
      { id: 'cameras', label: 'Cameras' },
    ],
  },
];

const filterValue = demoStore<FilterValue>({});

/** The strip, on every tab, with what is applied kept in a store the screens read too. */
export function FilterChipsPanel() {
  const value = filterValue.useValue();
  return (
    <FilterChips id={FILTERS} groups={FILTER_GROUPS} value={value} onChange={filterValue.set} />
  );
}

// Context Tray (paired with Glass Expand) ----------------------------------------------------

/** The tab whose screen puts the tray in the bar's place (Plan). */
const TRAY_TAB = 2;

/** On the Plan tab the tray takes the bar's place; elsewhere, the scene as it is. */
export function ContextTrayExtra(props: DemoExtraProps) {
  return (
    <>
      {props.index === TRAY_TAB ? <PlanTray {...props} /> : null}
      {props.children}
    </>
  );
}

/** The tray for today's plan, which fills by itself while the tab is open. */
function PlanTray({ adapter, goToFirstTab }: DemoExtraProps) {
  const [progress, setProgress] = useState(0.2);
  useEffect(() => {
    const tick = setInterval(
      () => setProgress((p) => Math.min(1, Math.round((p + 0.1) * 100) / 100)),
      700,
    );
    return () => clearInterval(tick);
  }, []);
  const done = progress >= 1;
  const tray = (
    <ContextTray
      label={done ? 'Plan complete' : 'Today’s plan'}
      progress={progress}
      // Close returns to the first tab; the tabs crossfade back as this screen blurs.
      onClose={goToFirstTab}
    />
  );
  return adapter === 'expo-router' ? (
    <ExpoRouterOverride element={tray} />
  ) : (
    <ReactNavigationOverride element={tray} />
  );
}

// Quick Create (paired with Labeled + Plus) --------------------------------------------------

const CREATE = 'create';

/** Labeled + Plus whose + button toggles the menu. */
export function QuickCreateBar() {
  const toggle = useQuickCreate(CREATE);
  return <LabeledPlus onActionPress={toggle} />;
}

export function QuickCreatePanel() {
  return (
    <QuickCreate
      id={CREATE}
      actions={[
        // Picking an action closes the menu; the demo has nothing behind them.
        { label: 'Voice', icon: QuickCreateIcons.MicIcon, onPress: () => {} },
        { label: 'Text', icon: QuickCreateIcons.TextIcon, onPress: () => {} },
        { label: 'Upload', icon: QuickCreateIcons.UploadIcon, onPress: () => {} },
      ]}
    />
  );
}

// Bar Sheet (paired with Soft Pill) -----------------------------------------------------------

const COMMENTS = Array.from({ length: 24 }, (_, i) => ({
  id: `c${i}`,
  author: ['Maya', 'Theo', 'Priya', 'Jonas', 'Aiko', 'Sam'][i % 6] ?? 'Sam',
  text: [
    'The light in this one is unreal.',
    'Saving this for the weekend.',
    'Which lens did you use?',
    'Went there last spring, it was quiet early in the morning.',
    'The colours are so calm.',
    'More of these, please.',
  ][i % 6],
}));

/** The sheet, declared once beside the navigator: a scrolling list of comments. */
export function BarSheetPanel() {
  const sheet = useBarSheet();
  return (
    <BarSheet
      title="Comments"
      subtitle="128 replies"
      accessory={
        <Pressable
          role="button"
          accessibilityLabel="Close comments"
          hitSlop={10}
          onPress={sheet.hide}
          style={({ pressed }) => [styles.close, { opacity: pressed ? 0.5 : 1 }]}
        >
          <Svg width={14} height={14} viewBox="0 0 14 14">
            <Path
              d="M2 2l10 10M12 2 2 12"
              stroke="#141416"
              strokeWidth={1.8}
              strokeLinecap="round"
            />
          </Svg>
        </Pressable>
      }
    >
      {COMMENTS.map((comment) => (
        <View key={comment.id} style={styles.comment}>
          <Text style={styles.commentAuthor}>{comment.author}</Text>
          <Text style={styles.commentText}>{comment.text}</Text>
        </View>
      ))}
    </BarSheet>
  );
}

/** A post's comment button opens the sheet. */
export function BarSheetActions({ children }: DemoExtraProps) {
  const sheet = useBarSheet();
  return (
    <SceneActionsProvider value={{ comment: { label: 'Comments', onPress: sheet.open } }}>
      {children}
    </SceneActionsProvider>
  );
}

// Companion Chip and the toast inset (paired with Split Search) ------------------------------

const toastMessage = demoStore<string | undefined>(undefined);

function LocateIcon({ color, size }: CompanionChipIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M20 4 4 11l7 2 2 7 7-16Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    </Svg>
  );
}

/**
 * The companion above the bar's end (the pill form), and a toast host that sits above both with
 * `useTabBarInset()`. Declared once beside the navigator.
 */
export function CompanionChipPanel() {
  return (
    <>
      <TabBarCompanion position="above-end">
        <CompanionChip
          variant="pill"
          icon={LocateIcon}
          label="Nearest store"
          onPress={() => toastMessage.set('Harbor Street store, 0.4 km away')}
        />
      </TabBarCompanion>
      <DemoToast />
    </>
  );
}

/**
 * A plain toast, standing in for a toast library's host: it sits 8 pt above whatever tabcn
 * draws at the bottom (the bar, its gap and the companion), and follows that edge when the
 * bar minimizes. It fades in and out on tabcnTiming and slides on tabcnTiming when the edge
 * moves; with "reduce motion" on, both are instant.
 */
function DemoToast() {
  const message = toastMessage.useValue();
  const inset = useTabBarInset();
  // Keep the last text while the toast fades out.
  const [shownText, setShownText] = useState(message);
  if (message && message !== shownText) setShownText(message);

  const opacity = useSharedValue(0);
  const bottom = useSharedValue(inset + 8);
  useEffect(() => {
    opacity.value = withTiming(message ? 1 : 0, tabcnTiming);
    if (!message) return;
    AccessibilityInfo.announceForAccessibility(message);
    const timer = setTimeout(() => toastMessage.set(undefined), 2500);
    return () => clearTimeout(timer);
  }, [message, opacity]);
  useEffect(() => {
    bottom.value = withTiming(inset + 8, tabcnTiming);
  }, [inset, bottom]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value, bottom: bottom.value }));

  return (
    <Animated.View pointerEvents="none" style={[styles.toastHost, style]}>
      <View style={styles.toast}>
        <Text style={styles.toastText}>{shownText}</Text>
      </View>
    </Animated.View>
  );
}

/**
 * A product's add button shows the toast over the bar and chip; the search field takes typing,
 * so both slide away for the keyboard. Scrolling the scene minimizes the bar and the chip follows.
 */
export function CompanionChipActions({ children }: DemoExtraProps) {
  return (
    <SceneActionsProvider
      value={{
        addToBag: { label: 'Add to bag', onPress: () => toastMessage.set('Added to your bag') },
        search: { label: 'Search the shop' },
      }}
    >
      {children}
    </SceneActionsProvider>
  );
}

// Sub-Tabs (a Soft Pill whose Library tab owns a drawer) -------------------------------------

const LIBRARY = 'library';
/** Library is the third tab. */
const LIBRARY_TAB = 2;
const subTabChoice = demoStore<string | undefined>(undefined);

const PILL = { background: '#fafafa', capsule: '#e5e6e8', foreground: '#151517' };

/**
 * Library's icon in the Sub-Tabs demo: a stack, a card over two shorter layers, drawn for the
 * demo on a 24-unit grid to sit beside Soft Pill's glyphs.
 */
export function LibraryIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={4} y={3.5} width={16} height={10} rx={2.5} stroke={color} strokeWidth={2.2} />
      <Path d="M6.5 17 H17.5 M9 20.5 H15" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}

/** Soft Pill, copied, with `useSubTabs` on its Library tab. */
export function SubTabsBar() {
  const { tabs } = useTabBar();
  return (
    <TabBarRoot placement="floating">
      <TabList style={styles.pill}>
        <TabIndicator inset={{ x: -3.75, y: 0 }} style={styles.capsule} />
        {tabs.map((tab) =>
          tab.index === LIBRARY_TAB ? (
            <LibraryTab key={tab.key} tab={tab} />
          ) : (
            <PillTab key={tab.key} tab={tab} />
          ),
        )}
      </TabList>
    </TabBarRoot>
  );
}

function LibraryTab({ tab }: { tab: TabItem }) {
  const sub = useSubTabs(LIBRARY, { width: 168 });
  return (
    <PillTab tab={tab} {...sub.tabProps}>
      <View {...sub.anchorProps} />
    </PillTab>
  );
}

function PillTab({
  tab,
  children,
  ...rest
}: { tab: TabItem; children?: ReactNode } & Pick<
  TabButtonProps,
  'onLongPress' | 'accessibilityActions' | 'accessibilityState'
>) {
  return (
    <TabButton tab={tab} style={styles.pillTab} {...rest}>
      {tab.renderIcon?.({ focused: tab.focused, color: PILL.foreground, size: 18 })}
      {/* One weight in both states, so the label never changes width as the tab changes. */}
      <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={styles.pillLabel}>
        {tab.label}
      </Text>
      {children}
    </TabButton>
  );
}

/** The drawer, declared once beside the navigator. The last-chosen sub-tab shows as selected. */
export function SubTabsPanel() {
  const choice = subTabChoice.useValue();
  return (
    <SubTabs
      name={LIBRARY}
      items={['Albums', 'Artists', 'Songs'].map((label) => ({
        label,
        selected: label === choice,
        onPress: () => subTabChoice.set(label),
      }))}
    />
  );
}

// Glass Badges: a Chats count that changes -----------------------------------------------------

/** Chats is the third tab. */
const CHATS_TAB = 2;
/**
 * Gives the bar inside it a Chats count that grows as messages come in, from the demo's 8 up to
 * 12 and back as they're read, in place of the screen options' badge, so its digits roll.
 */
export function ChatsBadge({ children }: { children: ReactNode }) {
  const state = useTabBar();
  const [count, setCount] = useState(8);
  useEffect(() => {
    const tick = setInterval(() => setCount((c) => (c >= 12 ? 8 : c + 1)), 2000);
    return () => clearInterval(tick);
  }, []);
  const tabs = state.tabs.map((tab) => (tab.index === CHATS_TAB ? { ...tab, badge: count } : tab));
  return <TabBarStateProvider value={{ ...state, tabs }}>{children}</TabBarStateProvider>;
}

// Cart Pill: a bag that fills ----------------------------------------------------------------

/** Items in the bag, starting at the store shot's 2. */
const cartItems = demoStore(2);

/** The cart count, for the bar. */
export const useCartCount = cartItems.useValue;

/** A product's add button puts it in the bag. */
export function CartPillActions({ children }: DemoExtraProps) {
  return (
    <SceneActionsProvider
      value={{
        addToBag: { label: 'Add to bag', onPress: () => cartItems.set(cartItems.get() + 1) },
      }}
    >
      {children}
    </SceneActionsProvider>
  );
}

// Section Sheet: a section's body ------------------------------------------------------------

const SECTION_ROWS: Record<string, { name: string; note: string }[]> = {
  Explore: [
    { name: 'Mill Park', note: 'Park · 0.4 km' },
    { name: 'Harbor Market', note: 'Market · 0.7 km' },
    { name: 'Long Table', note: 'Bakery · 0.9 km' },
    { name: 'Old Pier', note: 'Viewpoint · 1.2 km' },
    { name: 'Glass House', note: 'Gallery · 1.4 km' },
    { name: 'Elm Avenue Books', note: 'Bookshop · 1.6 km' },
  ],
  Guides: [
    { name: 'A slow Sunday by the river', note: '8 places · by Aiko' },
    { name: 'Best coffee near Harbor Street', note: '12 places · by Tomás' },
    { name: 'Rainy day museums', note: '6 places · by June' },
    { name: 'Late-night food', note: '9 places · by Rafa' },
    { name: 'Walks under an hour', note: '5 places · by Noor' },
    { name: 'Where locals swim', note: '4 places · by Mira' },
  ],
  Saved: [
    { name: 'Café Arden', note: 'Café · Want to go' },
    { name: 'The Corner House', note: 'Restaurant · Booked Friday' },
    { name: 'North Ridge trail', note: 'Hike · 6.2 km loop' },
    { name: 'Tidewater Pool', note: 'Swimming · Open until 20:00' },
    { name: 'Studio Nine', note: 'Cinema · 3 films tonight' },
    { name: 'Market Hall', note: 'Food hall · Saturdays' },
  ],
};

/** One section of the sheet: places with notes, twice, so it scrolls at full height. */
export function SectionRows({ title }: { title: string }) {
  const rows = SECTION_ROWS[title] ?? [];
  return (
    <View style={styles.sectionRows}>
      {[0, 1]
        .flatMap((round) => rows.map((row) => ({ ...row, key: `${round}-${row.name}` })))
        .map((row) => (
          <View key={row.key} style={styles.sectionRow}>
            <View style={styles.sectionThumb}>
              <Text style={styles.sectionInitial}>{row.name[0]}</Text>
            </View>
            <View style={styles.sectionCopy}>
              <Text style={styles.sectionTitle}>{row.name}</Text>
              <Text style={styles.sectionMeta}>{row.note}</Text>
            </View>
          </View>
        ))}
    </View>
  );
}

// Live Tabs: a timer and a download, fed from outside the bar ------------------------------

const TIMER_SECONDS = 5 * 60;
const DOWNLOAD_MS = 6000;

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/**
 * Writes the live tabs' values with `useLiveTab`, as a screen or a service would: the Timer
 * tab counts down from 5:00 once a second, and the Downloads tab's ring fills every 6 s.
 * Declared once beside the navigator, so it keeps running on every tab.
 */
export function LiveTabsFeed({ timer, download }: { timer: string; download: string }) {
  const { progress: timerProgress, setText: setTimerText } = useLiveTab(timer);
  const { progress: downloadProgress } = useLiveTab(download);
  const [remaining, setRemaining] = useState(TIMER_SECONDS);

  useEffect(() => {
    const tick = setInterval(() => setRemaining((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(tick);
  }, []);
  useEffect(() => {
    setTimerText(remaining > 0 ? clock(remaining) : undefined);
    // Glide through each second instead of jumping.
    const next = 1 - remaining / TIMER_SECONDS;
    timerProgress.value =
      remaining === TIMER_SECONDS
        ? next
        : withTiming(next, { duration: 1000, easing: Easing.linear });
  }, [remaining, setTimerText, timerProgress]);

  // The download loops 0 → 1 on the UI thread.
  useEffect(() => {
    downloadProgress.value = 0;
    downloadProgress.value = withRepeat(
      withTiming(1, { duration: DOWNLOAD_MS, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(downloadProgress);
  }, [downloadProgress]);

  // Leaving the demo clears the tabs.
  useEffect(
    () => () => {
      setTimerText(undefined);
      timerProgress.value = 0;
      downloadProgress.value = 0;
    },
    [setTimerText, timerProgress, downloadProgress],
  );
  return null;
}

const styles = StyleSheet.create({
  close: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20, 20, 22, 0.06)',
  },
  comment: { gap: 2, paddingVertical: 10 },
  commentAuthor: { fontSize: 14, fontWeight: '600', color: '#141416' },
  commentText: { fontSize: 15, lineHeight: 21, color: '#3a3a3e' },
  toastHost: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  toast: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(20, 20, 22, 0.92)',
  },
  toastText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  pill: {
    borderRadius: 999,
    paddingVertical: 3.8,
    paddingHorizontal: 8,
    backgroundColor: PILL.background,
    boxShadow: '0 10px 28px rgba(60, 40, 20, 0.14)',
    maxWidth: '100%',
  },
  capsule: { borderRadius: 999, backgroundColor: PILL.capsule },
  pillTab: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5.5,
    paddingTop: 2.5,
    // Soft Pill's 63 pt where it fits; narrower on a small phone, as Soft Pill does.
    width: 63,
    flexShrink: 1,
    minWidth: 50,
    height: 50.7,
  },
  pillLabel: { fontSize: 9.5, fontWeight: '600', color: PILL.foreground },
  sectionRows: { gap: 4, paddingBottom: 24 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  sectionThumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ecebe6',
  },
  sectionInitial: { fontSize: 17, fontWeight: '600', color: 'rgba(21, 21, 23, 0.55)' },
  sectionCopy: { flex: 1, gap: 2 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#151517' },
  sectionMeta: { fontSize: 13, color: 'rgba(21, 21, 23, 0.6)' },
});
