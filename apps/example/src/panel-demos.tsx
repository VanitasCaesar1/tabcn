/**
 * The parts of the example app's demos that need hooks: panel demos (Mini Player, Context
 * Tray, Quick Create, Bar Sheet, Companion Chip, Sub-Tabs), the feeds behind Section Sheet
 * and Live Tabs, and the scrolling list that shows a bar minimizing. Kept out of demos.tsx,
 * whose top-level object keys are read as design ids by scripts/check-registry.ts.
 *
 * A panel demo renders its paired bar as the tab bar, declares the panel once in the design
 * layout (under its TabBarProvider, beside <Tabs>), and puts its controls on the demo screen.
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
import { AccessibilityInfo, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
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
  useMinimizeOnScroll,
  useTabBar,
  useTabBarInset,
  useTabPanel,
} from 'react-native-tabcn';
import { useTabBarOverride as useExpoRouterOverride } from 'react-native-tabcn/expo-router';
import { useTabBarOverride as useReactNavigationOverride } from 'react-native-tabcn/react-navigation';
import { themed } from '@/panel-theme';

// Each design in the PanelUI theme picked on the demo screen (src/panel-theme.tsx).
const BarSheet = themed('bar-sheet', BarSheetDesign);
const CompanionChip = themed('companion-chip', CompanionChipDesign);
const ContextTray = themed('context-tray', ContextTrayDesign);
const LabeledPlus = themed('labeled-plus', LabeledPlusDesign);
const MiniPlayer = themed('mini-player', MiniPlayerDesign);
const QuickCreate = themed('quick-create', QuickCreateDesign);
const SubTabs = themed('sub-tabs', SubTabsDesign);

/** What a demo screen passes to its extra content. */
export interface DemoExtraProps {
  /** Index of the tab showing it. */
  index: number;
  /** Text colour and button fill that suit the demo's background. */
  text: string;
  chip: string;
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

function DemoButton({
  label,
  onPress,
  chip,
  text,
}: {
  label: string;
  onPress: () => void;
  chip: string;
  text: string;
}) {
  return (
    <Pressable
      role="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: chip, opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <Text style={[styles.buttonText, { color: text }]}>{label}</Text>
    </Pressable>
  );
}

function Note({ text, message }: { text: string; message: string }) {
  return <Text style={[styles.note, { color: text }]}>{message}</Text>;
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

/** Peek / Open / Hide, on every tab. */
export function MiniPlayerControls({ text, chip }: DemoExtraProps) {
  const player = useTabPanel(PLAYER);
  return (
    <View style={styles.block}>
      <Note text={text} message={`Player: ${player.state}. Drag or tap the strip to open it.`} />
      <View style={styles.row}>
        <DemoButton label="Peek" onPress={player.peek} text={text} chip={chip} />
        <DemoButton label="Open" onPress={player.open} text={text} chip={chip} />
        <DemoButton label="Hide" onPress={player.hide} text={text} chip={chip} />
      </View>
    </View>
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

/** What is applied, and Show / Hide for the strip. */
export function FilterChipsControls({ text, chip }: DemoExtraProps) {
  const strip = useTabPanel(FILTERS);
  const value = filterValue.useValue();
  const applied = FILTER_GROUPS.flatMap((group) =>
    group.options.filter((o) => value[group.id]?.includes(o.id)).map((o) => o.label),
  );
  return (
    <View style={styles.block}>
      <Note
        text={text}
        message={
          applied.length > 0
            ? `Applied: ${applied.join(', ')}.`
            : 'Nothing applied. Tap a chip above the bar.'
        }
      />
      <View style={styles.row}>
        <DemoButton label="Show strip" onPress={strip.peek} text={text} chip={chip} />
        <DemoButton label="Hide strip" onPress={strip.hide} text={text} chip={chip} />
      </View>
    </View>
  );
}

// Context Tray (paired with Glass Expand) ----------------------------------------------------

/** The tab whose screen puts the tray in the bar's place (Plan). */
const TRAY_TAB = 2;

/** On the Plan tab the tray replaces the tabs; elsewhere, a hint. */
export function ContextTrayExtra(props: DemoExtraProps) {
  if (props.index === TRAY_TAB) return <ContextTrayScreen {...props} />;
  return (
    <View style={styles.block}>
      <Note text={props.text} message="Open Plan: its screen puts a tray in the bar’s place." />
    </View>
  );
}

function ContextTrayScreen({ text, chip, adapter, goToFirstTab }: DemoExtraProps) {
  const [progress, setProgress] = useState(0.42);
  const done = progress >= 1;
  const tray = (
    <ContextTray
      label={done ? 'Plan complete' : 'Today’s plan'}
      progress={progress}
      // Close returns to the first tab; the tabs crossfade back as this screen blurs.
      onClose={goToFirstTab}
    />
  );
  return (
    <View style={styles.block}>
      {adapter === 'expo-router' ? (
        <ExpoRouterOverride element={tray} />
      ) : (
        <ReactNavigationOverride element={tray} />
      )}
      <Note
        text={text}
        message="The tray stays while this tab is focused. Close returns to the first tab."
      />
      <View style={styles.row}>
        <DemoButton
          label="+10%"
          onPress={() => setProgress((p) => Math.min(1, Math.round((p + 0.1) * 100) / 100))}
          text={text}
          chip={chip}
        />
        <DemoButton label="Finish" onPress={() => setProgress(1)} text={text} chip={chip} />
        <DemoButton label="Reset" onPress={() => setProgress(0)} text={text} chip={chip} />
      </View>
    </View>
  );
}

// Quick Create (paired with Labeled + Plus) --------------------------------------------------

const CREATE = 'create';

/** Labeled + Plus whose + button toggles the menu. */
export function QuickCreateBar() {
  const toggle = useQuickCreate(CREATE);
  return <LabeledPlus onActionPress={toggle} />;
}

/** The action last picked from the menu, shown on the demo screen (Alert does nothing on web). */
const quickCreatePick = demoStore<string | undefined>(undefined);

export function QuickCreatePanel() {
  return (
    <QuickCreate
      id={CREATE}
      actions={[
        {
          label: 'Voice',
          icon: QuickCreateIcons.MicIcon,
          onPress: () => quickCreatePick.set('Voice: start a recording'),
        },
        {
          label: 'Text',
          icon: QuickCreateIcons.TextIcon,
          onPress: () => quickCreatePick.set('Text: start a script'),
        },
        {
          label: 'Upload',
          icon: QuickCreateIcons.UploadIcon,
          onPress: () => quickCreatePick.set('Upload: pick a file'),
        },
      ]}
    />
  );
}

/** The + button is the main control; these do the same from the screen. */
export function QuickCreateControls({ text, chip }: DemoExtraProps) {
  const menu = useTabPanel(CREATE);
  const picked = quickCreatePick.useValue();
  return (
    <View style={styles.block}>
      <Note
        text={text}
        message="Tap + to open the create menu; tap it again or pick an action to close it."
      />
      {picked ? <Note text={text} message={`Last picked: ${picked}.`} /> : null}
      <View style={styles.row}>
        <DemoButton label="Open menu" onPress={menu.open} text={text} chip={chip} />
        <DemoButton label="Close menu" onPress={menu.hide} text={text} chip={chip} />
      </View>
    </View>
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
  return (
    <BarSheet title="Comments" subtitle="128 replies">
      {COMMENTS.map((comment) => (
        <View key={comment.id} style={styles.comment}>
          <Text style={styles.commentAuthor}>{comment.author}</Text>
          <Text style={styles.commentText}>{comment.text}</Text>
        </View>
      ))}
    </BarSheet>
  );
}

/** Open, raise to full height or close the sheet from the screen. */
export function BarSheetControls({ text, chip }: DemoExtraProps) {
  const sheet = useBarSheet();
  const where =
    sheet.state === 'open' ? (sheet.snap >= 1 ? 'open at full height' : 'open at 60%') : 'closed';
  return (
    <View style={styles.block}>
      <Note
        text={text}
        message={`Sheet: ${where}. Drag its header between 60% and full height, or below 60% to close it; tap the grabber to step between them. Switching tabs closes it too.`}
      />
      <View style={styles.row}>
        <DemoButton label="Open sheet" onPress={sheet.open} text={text} chip={chip} />
        <DemoButton label="Full height" onPress={() => sheet.snapTo(1)} text={text} chip={chip} />
        <DemoButton label="Close" onPress={sheet.hide} text={text} chip={chip} />
      </View>
    </View>
  );
}

// Companion Chip and the toast inset (paired with Split Search) ------------------------------

type ChipForm = 'round' | 'pill' | 'count';
const chipForm = demoStore<ChipForm>('round');
const toastMessage = demoStore<string | undefined>(undefined);

function LocateIcon({ color, size }: CompanionChipIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M20 4 4 11l7 2 2 7 7-16Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    </Svg>
  );
}

function SearchIcon({ color, size }: CompanionChipIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={11} cy={11} r={6.5} stroke={color} strokeWidth={1.8} />
      <Path d="m16 16 4 4" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function EyeIcon({ color, size }: CompanionChipIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={1.8} />
    </Svg>
  );
}

/**
 * The companion above the bar's end, in the form chosen on the screen, and a toast host that
 * sits above both with `useTabBarInset()`. Declared once beside the navigator.
 */
export function CompanionChipPanel() {
  const form = chipForm.useValue();
  return (
    <>
      <TabBarCompanion position="above-end">
        {form === 'round' ? (
          <CompanionChip
            variant="round"
            icon={LocateIcon}
            accessibilityLabel="Locate me"
            onPress={() => toastMessage.set('Centred on your location')}
          />
        ) : form === 'pill' ? (
          <CompanionChip
            variant="pill"
            icon={SearchIcon}
            label="Search nearby"
            onPress={() => toastMessage.set('Searching nearby')}
          />
        ) : (
          <CompanionChip variant="count" icon={EyeIcon} label="views" count={32} />
        )}
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

/** Scroll to minimize the bar (the chip follows), switch the chip's form, show a toast. */
export function CompanionChipExtra(props: DemoExtraProps) {
  const { text, chip } = props;
  const form = chipForm.useValue();
  return (
    <ScrollingList
      {...props}
      header={
        <View style={styles.stack}>
          <Note
            text={text}
            message="The chip rides above the bar's end. Scroll to minimize the bar and it follows; type below and both slide away for the keyboard."
          />
          <View style={styles.row}>
            {(['round', 'pill', 'count'] as const).map((f) => (
              <DemoButton
                key={f}
                label={f === form ? `• ${f}` : f}
                onPress={() => chipForm.set(f)}
                text={text}
                chip={chip}
              />
            ))}
            <DemoButton
              label="Show toast"
              onPress={() => toastMessage.set('Saved to your list')}
              text={text}
              chip={chip}
            />
          </View>
          <TextInput
            placeholder="Type to raise the keyboard"
            placeholderTextColor={text}
            style={[styles.input, { color: text, backgroundColor: chip }]}
          />
        </View>
      }
    />
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

export function SubTabsNote({ text }: DemoExtraProps) {
  const choice = subTabChoice.useValue();
  return (
    <View style={styles.block}>
      <Note
        text={text}
        message={`Long-press Library: Albums, Artists and Songs slide up from behind it. With VoiceOver or TalkBack, use its "Show sub-tabs" action.${choice ? ` Last chosen: ${choice}.` : ''}`}
      />
    </View>
  );
}

// Glass Badges: a Chats count that changes -----------------------------------------------------

/** Chats is the third tab. */
const CHATS_TAB = 2;
/** The Chats count, starting at the demo's 8. */
const chatsCount = demoStore(8);

/**
 * Gives the bar inside it the Chats count from `chatsCount` in place of the screen options'
 * badge, so a bump rolls the digits without touching the navigator.
 */
export function ChatsBadge({ children }: { children: ReactNode }) {
  const state = useTabBar();
  const count = chatsCount.useValue();
  const tabs = state.tabs.map((tab) => (tab.index === CHATS_TAB ? { ...tab, badge: count } : tab));
  return <TabBarStateProvider value={{ ...state, tabs }}>{children}</TabBarStateProvider>;
}

export function GlassBadgesControls({ text, chip }: DemoExtraProps) {
  const count = chatsCount.useValue();
  return (
    <View style={styles.block}>
      <Note
        text={text}
        message={`Chats: ${count} unread. Bump it to roll the badge's digits; switch tabs to see its ring crossfade between the glass and the capsule.`}
      />
      <View style={styles.row}>
        <DemoButton
          label="Bump Chats"
          onPress={() => chatsCount.set(chatsCount.get() + 1)}
          text={text}
          chip={chip}
        />
      </View>
    </View>
  );
}

// Cart Pill: a bag that fills ----------------------------------------------------------------

/** Items in the bag, starting at the store shot's 2. */
const cartItems = demoStore(2);

/** The cart count, for the bar. */
export const useCartCount = cartItems.useValue;

export function CartPillControls({ text, chip }: DemoExtraProps) {
  const count = cartItems.useValue();
  return (
    <View style={styles.block}>
      <Note
        text={text}
        message={`Bag: ${count} ${count === 1 ? 'item' : 'items'}. The count is cut out of the basket on the cart button.`}
      />
      <View style={styles.row}>
        <DemoButton
          label="Add to bag"
          onPress={() => cartItems.set(cartItems.get() + 1)}
          text={text}
          chip={chip}
        />
      </View>
    </View>
  );
}

// Section Sheet: a section's body ------------------------------------------------------------

const SECTION_ROWS = Array.from({ length: 12 }, (_, i) => i + 1);

/** A dozen rows for one section of the sheet; the sheet scrolls them at full height. */
export function SectionRows({ title }: { title: string }) {
  return (
    <View style={styles.sectionRows}>
      {SECTION_ROWS.map((n) => (
        <View key={n} style={styles.sectionRow}>
          <View style={styles.sectionThumb} />
          <View style={styles.sectionCopy}>
            <Text style={styles.sectionTitle}>{`${title} ${n}`}</Text>
            <Text style={styles.sectionMeta}>{`${(n * 0.4).toFixed(1)} km away`}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// Live Tabs: a timer and a download, fed from outside the bar ------------------------------

const TIMER_SECONDS = 5 * 60;
const DOWNLOAD_MS = 6000;
const liveRunning = demoStore(true);
const liveRun = demoStore(0);

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/**
 * Writes the live tabs' values with `useLiveTab`, as a screen or a service would: the Timer
 * tab counts down from 5:00 once a second, and the Downloads tab's ring fills every 6 s.
 * Declared once beside the navigator, so it keeps running on every tab.
 */
export function LiveTabsFeed({ timer, download }: { timer: string; download: string }) {
  const { progress: timerProgress, setText: setTimerText } = useLiveTab(timer);
  const { progress: downloadProgress } = useLiveTab(download);
  const running = liveRunning.useValue();
  const run = liveRun.useValue();
  const [remaining, setRemaining] = useState(TIMER_SECONDS);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `run` restarts the countdown.
  useEffect(() => {
    setRemaining(TIMER_SECONDS);
  }, [run]);
  useEffect(() => {
    if (!running) return;
    const tick = setInterval(() => setRemaining((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(tick);
  }, [running]);
  useEffect(() => {
    setTimerText(remaining > 0 ? clock(remaining) : undefined);
    // Glide through each second instead of jumping; a restart snaps back to empty.
    const next = 1 - remaining / TIMER_SECONDS;
    timerProgress.value =
      remaining === TIMER_SECONDS
        ? next
        : withTiming(next, { duration: 1000, easing: Easing.linear });
  }, [remaining, setTimerText, timerProgress]);

  // The download loops 0 → 1 on the UI thread; pausing holds it where it is.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `run` restarts the download.
  useEffect(() => {
    if (!running) {
      cancelAnimation(downloadProgress);
      return;
    }
    downloadProgress.value = 0;
    downloadProgress.value = withRepeat(
      withTiming(1, { duration: DOWNLOAD_MS, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(downloadProgress);
  }, [running, run, downloadProgress]);

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

export function LiveTabsControls({ text, chip }: DemoExtraProps) {
  const running = liveRunning.useValue();
  return (
    <View style={styles.block}>
      <Note
        text={text}
        message="Timer counts down in place of its label, and a ring fills around Downloads. Both are written from outside the bar with useLiveTab."
      />
      <View style={styles.row}>
        <DemoButton
          label={running ? 'Pause' : 'Resume'}
          onPress={() => liveRunning.set(!running)}
          text={text}
          chip={chip}
        />
        <DemoButton
          label="Restart"
          onPress={() => {
            liveRun.set(liveRun.get() + 1);
            liveRunning.set(true);
          }}
          text={text}
          chip={chip}
        />
      </View>
    </View>
  );
}

// Split Search: a list to scroll ------------------------------------------------------------

const ROWS = Array.from({ length: 40 }, (_, i) => `Row ${i + 1}`);

/**
 * A long list whose scroll minimizes the bar (`useMinimizeOnScroll`). Tap the minimized bar,
 * scroll up, or reach the top to bring it back.
 */
export function MinimizeList(props: DemoExtraProps) {
  return (
    <ScrollingList
      {...props}
      header={
        <Note text={props.text} message="Scroll down to minimize the bar; tap it to expand." />
      }
    />
  );
}

/** The minimizing list, with any controls at its top. */
function ScrollingList({ text, chip, barHeight, header }: DemoExtraProps & { header: ReactNode }) {
  const onScroll = useMinimizeOnScroll();
  return (
    <Animated.FlatList
      data={ROWS}
      keyExtractor={(row) => row}
      onScroll={onScroll}
      scrollEventThrottle={16}
      keyboardShouldPersistTaps="handled"
      style={styles.list}
      contentContainerStyle={[styles.listContent, { paddingBottom: barHeight + 16 }]}
      ListHeaderComponent={<View style={styles.listHeader}>{header}</View>}
      renderItem={({ item }) => (
        <View style={[styles.listRow, { backgroundColor: chip }]}>
          <Text style={{ color: text }}>{item}</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  block: { gap: 12, paddingHorizontal: 20, paddingTop: 20 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  button: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999 },
  buttonText: { fontSize: 15, fontWeight: '600' },
  note: { fontSize: 15, lineHeight: 21 },
  list: { flex: 1 },
  listContent: { gap: 8, paddingHorizontal: 20 },
  listHeader: { paddingTop: 20, paddingBottom: 4 },
  listRow: { padding: 16, borderRadius: 14 },
  stack: { gap: 12 },
  input: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, fontSize: 15 },
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
  sectionThumb: { width: 48, height: 48, borderRadius: 10, backgroundColor: '#dfe6da' },
  sectionCopy: { flex: 1, gap: 2 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#151517' },
  sectionMeta: { fontSize: 13, color: 'rgba(21, 21, 23, 0.6)' },
});
