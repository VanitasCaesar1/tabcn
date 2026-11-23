/**
 * Section Sheet: no tab bar. One sheet rests at the bottom over full-screen content (a map,
 * a canvas), and its header holds the sections as a segmented control. Drag the sheet
 * between a collapsed strip (just the header), half and full height; choosing a section
 * swaps the sheet's body and keeps its height. Made for apps whose content is the screen
 * itself, where a permanent bar would take a strip from it.
 *
 * It is still a real tab navigator: pass it as the `tabBar`, and each section is a route,
 * so deep links, `tabPress` listeners and Android back keep working. Needs a
 * `TabBarProvider` around the tabs navigator and a `GestureHandlerRootView` around the app:
 *
 * ```tsx
 * // app/(tabs)/_layout.tsx
 * <TabBarProvider>
 *   <Tabs
 *     backBehavior="history"
 *     tabBar={tabBar(
 *       <SectionSheet
 *         sections={{ index: <ExploreList />, guides: <GuideList />, saved: <SavedList /> }}
 *       />,
 *     )}
 *     screenOptions={{ headerShown: false }}
 *   >
 *     <Tabs.Screen name="index" options={{ title: 'Explore' }} />
 *     <Tabs.Screen name="guides" options={{ title: 'Guides' }} />
 *     <Tabs.Screen name="saved" options={{ title: 'Saved' }} />
 *   </Tabs>
 * </TabBarProvider>
 * ```
 *
 * - **Screens draw the content** behind the sheet (each its own full-screen map) and pad
 *   their own controls with `useBottomTabBarHeight()`, which is the collapsed strip's height
 *   from the screen's bottom edge. Half and full height overlay the screen.
 * - **Sheet bodies** come from `sections`, by route name. They render inside the tab bar, so
 *   they see the contexts around the navigator, not the screen's: to link a list to its
 *   screen's map, keep the shared state in a context or store placed around `<Tabs>`.
 *   Bodies stay mounted once shown (faded out and untouchable, not unmounted), so each keeps
 *   its scroll position. Bodies have no text input: the bar hides with the keyboard.
 * - **Back.** Android back first returns a raised sheet to its strip; after that it is the
 *   navigator's. Pass `backBehavior="history"` to go back through the sections visited.
 * - **The one bottom surface.** A bar-anchored panel (a mini player) would push the sheet
 *   away, so the sheet comes straight back and a development warning says so; put such
 *   things inside a section's body instead. Companions fade while the sheet is raised, and
 *   `useTabBarInset()` stays at the strip's height.
 * - **Phones only**: on a tablet pass a side rail as the `tabBar` instead. Without a
 *   `TabBarProvider` the sections are drawn as a plain floating segmented bar.
 *
 * Screen readers hear each section as a tab ("Guides, tab, 2 of 3") at every height, and
 * move the sheet with its grabber, an adjustable control. The sheet is modal only at full
 * height. While a screen reader is on, raising the sheet goes straight to full height and
 * lowering it goes straight back to the strip, and while the sheet rests at its strip the
 * bodies (below the screen's edge) are hidden from screen readers.
 *
 * The sheet glides on tabcnSpring (critically damped, no overshoot); bodies crossfade on
 * tabcnTiming; the section highlight slides; nothing scales, bounces or turns. With
 * "reduce motion" on, every change is instant.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import * as Haptics from 'expo-haptics';
import { type ReactNode, useEffect, useRef, useState } from 'react';
// 'react-native-tabcn/gestures' needs react-native-gesture-handler (an optional peer of tabcn). Importing it
// here names it as this design's own dependency, so `shadcn add` installs it.
import 'react-native-gesture-handler';
import {
  type AccessibilityActionEvent,
  AccessibilityInfo,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import {
  BadgeCount,
  type SnapPoint,
  TabBarRoot,
  TabButton,
  TabIndicator,
  type TabItem,
  TabList,
  TabPanel,
  type TabPanelControls,
  tabcnTiming,
  useTabBar,
  useTabPanel,
} from 'react-native-tabcn';
import { PanelDragArea, PanelScrollView } from 'react-native-tabcn/gestures';

const defaultColors = {
  /** The sheet's fill. */
  surface: '#ffffff',
  /** Hairline along the sheet's top edge. */
  border: 'rgba(0, 0, 0, 0.08)',
  /** The grabber. */
  grabber: 'rgba(0, 0, 0, 0.18)',
  /** The segmented control's track. */
  track: 'rgba(118, 118, 128, 0.12)',
  /** The highlight behind the chosen section. */
  thumb: '#ffffff',
  /** The chosen section's label. */
  foreground: '#151517',
  /** The other sections' labels. */
  muted: 'rgba(21, 21, 23, 0.6)',
  /** Badge fill, drawn after a section's label only when its tab sets `tabBarBadge`. */
  badge: '#ff3b30',
  /** Badge count text. */
  badgeText: '#ffffff',
};

export type SectionSheetColors = typeof defaultColors;

const defaultLabels = {
  /** What screen readers call the grabber, which adjusts the sheet's height. */
  sheet: 'Sheet',
  /** The grabber's value while the sheet rests at its strip. */
  collapsed: 'Collapsed',
  /** Its value at a `'50%'` snap point. */
  halfHeight: 'Half height',
  /** Its value at a last snap point of `'100%'`. */
  fullHeight: 'Full height',
  /** Its value at a snap point given in points. */
  pointsTall: (points: number) => `${points} points tall`,
  /** Its value at any other percentage snap point. */
  percentOfScreen: (percent: number) => `${percent} percent of the screen`,
};

/** What screen readers hear for the sheet, for translation: pass the ones to change as `labels`. */
export type SectionSheetLabels = typeof defaultLabels;

export interface SectionSheetProps {
  /** Each section's sheet body, by route name. A route without one gets an empty body. */
  sections: Readonly<Record<string, ReactNode>>;
  /** Points of the sheet showing at rest, above the bottom safe area. Default 76. */
  collapsedHeight?: number;
  /** Heights the sheet can be raised to, lowest first. Default `['50%', '100%']`. */
  snapPoints?: readonly SnapPoint[];
  /** Radius of the sheet's top corners. Default 24. */
  radius?: number;
  colors?: Partial<SectionSheetColors>;
  /** The sheet's screen-reader name and heights, merged over the English defaults. */
  labels?: Partial<SectionSheetLabels>;
  /** A selection haptic on choosing a section and on settling at another height. Default true. */
  haptics?: boolean;
}

/** The sheet's panel id, for `useSectionSheet()`. */
const PANEL_ID = 'section-sheet';
const DEFAULT_SNAP_POINTS: readonly SnapPoint[] = ['50%', '100%'];

/** The tab bar: an empty floating bar, with the sheet as a panel that never goes away. */
export function SectionSheet({
  sections,
  collapsedHeight = 76,
  snapPoints = DEFAULT_SNAP_POINTS,
  radius = 24,
  colors: custom,
  labels: customLabels,
  haptics = true,
}: SectionSheetProps) {
  const colors = { ...defaultColors, ...custom };
  const labels = { ...defaultLabels, ...customLabels };
  const { state, peek } = useTabPanel(PANEL_ID);

  // Another bar-anchored panel showing pushes the sheet away (one panel per anchor). The
  // sheet is the app's one bottom surface, so it comes straight back.
  const lastState = useRef(state);
  useEffect(() => {
    const pushedOut = state === 'hidden' && lastState.current !== 'hidden';
    lastState.current = state;
    if (!pushedOut) return;
    if (__DEV__) {
      console.warn(
        'SectionSheet: another panel anchored to the bar pushed the sheet away, so it came ' +
          "back. It is the app's one bottom surface: put mini players and similar " +
          "panels inside a section's body.",
      );
    }
    peek();
  }, [state, peek]);

  // The panel only exists under a TabBarProvider; without one, the sections are drawn as a
  // plain floating bar.
  const sheetShown = state !== 'hidden';
  return (
    <>
      <TabBarRoot
        placement="floating"
        offset={sheetShown ? 0 : 12}
        style={
          sheetShown ? styles.emptyBar : [styles.fallbackBar, { backgroundColor: colors.surface }]
        }
      >
        {sheetShown ? null : <Sections colors={colors} haptics={haptics} />}
      </TabBarRoot>
      <TabPanel
        id={PANEL_ID}
        peekHeight={collapsedHeight}
        snapPoints={snapPoints}
        initialState="peek"
      >
        <Sheet
          sections={sections}
          snapPoints={snapPoints}
          radius={radius}
          colors={colors}
          labels={labels}
          haptics={haptics}
        />
      </TabPanel>
    </>
  );
}

/**
 * Moves the sheet from anywhere under the `TabBarProvider`: `snapTo(i)` raises it to
 * `snapPoints[i]` (such as full height when a search starts), `peek()` lowers it to its
 * strip. Don't call `hide()`: the sheet stands in for the tab bar.
 */
export function useSectionSheet(): TabPanelControls {
  return useTabPanel(PANEL_ID);
}

/**
 * Whether a screen reader is on. While one is, the sheet opens only to its highest snap
 * point, so one step down from there is the strip.
 */
function useScreenReader(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isScreenReaderEnabled()
      .then((enabled) => {
        if (live) setOn(enabled);
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setOn);
    return () => {
      live = false;
      sub?.remove();
    };
  }, []);
  return on;
}

/** How a height is read to screen readers. */
function heightName(
  point: SnapPoint | undefined,
  last: boolean,
  labels: SectionSheetLabels,
): string {
  if (point === undefined) return labels.collapsed;
  if (last && point === '100%') return labels.fullHeight;
  if (point === '50%') return labels.halfHeight;
  return typeof point === 'number'
    ? labels.pointsTall(Math.round(point))
    : labels.percentOfScreen(Math.round(Number.parseFloat(point)));
}

function Sheet({
  sections,
  snapPoints,
  radius,
  colors,
  labels,
  haptics,
}: {
  sections: Readonly<Record<string, ReactNode>>;
  snapPoints: readonly SnapPoint[];
  radius: number;
  colors: SectionSheetColors;
  labels: SectionSheetLabels;
  haptics: boolean;
}) {
  const { tabs, activeIndex } = useTabBar();
  const { state, snap, snapTo, peek } = useTabPanel(PANEL_ID);
  const last = snapPoints.length - 1;
  const raised = state === 'open' ? snap : -1;
  const screenReader = useScreenReader();

  // One selection haptic each time the sheet settles at another height.
  const previous = useRef(raised);
  useEffect(() => {
    if (previous.current === raised) return;
    previous.current = raised;
    if (haptics) Haptics.selectionAsync();
  }, [raised, haptics]);

  const onAction = (event: AccessibilityActionEvent) => {
    if (event.nativeEvent.actionName === 'increment') snapTo(Math.min(last, raised + 1));
    if (event.nativeEvent.actionName === 'decrement') {
      if (raised <= 0 || screenReader) peek();
      else snapTo(raised - 1);
    }
  };

  // Bodies stay mounted once their section has been shown, so each keeps its scroll position.
  const activeKey = tabs[activeIndex]?.key;
  const [visited, setVisited] = useState<readonly string[]>(activeKey ? [activeKey] : []);
  if (activeKey && !visited.includes(activeKey)) setVisited([...visited, activeKey]);

  return (
    <View
      style={[
        styles.sheet,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderTopLeftRadius: radius,
          borderTopRightRadius: radius,
        },
      ]}
    >
      <PanelDragArea>
        <View style={styles.header}>
          <View
            accessible
            accessibilityRole="adjustable"
            accessibilityLabel={labels.sheet}
            accessibilityValue={{ text: heightName(snapPoints[raised], raised === last, labels) }}
            accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
            onAccessibilityAction={onAction}
            style={styles.grabberArea}
          >
            <View style={[styles.grabber, { backgroundColor: colors.grabber }]} />
          </View>
          <Sections colors={colors} haptics={haptics} />
        </View>
      </PanelDragArea>
      <View style={styles.bodies}>
        {tabs
          .filter((tab) => visited.includes(tab.key))
          .map((tab) => (
            <Body key={tab.key} shown={tab.focused} readable={state === 'open'}>
              {sections[tab.routeName]}
            </Body>
          ))}
      </View>
    </View>
  );
}

/** The sections, as a segmented control with a highlight that slides to the chosen one. */
function Sections({ colors, haptics }: { colors: SectionSheetColors; haptics: boolean }) {
  const { tabs } = useTabBar();
  return (
    <TabList style={[styles.track, { backgroundColor: colors.track }]}>
      <TabIndicator style={[styles.thumb, { backgroundColor: colors.thumb }]} />
      {tabs.map((tab) => (
        <Section key={tab.key} tab={tab} colors={colors} haptics={haptics} />
      ))}
    </TabList>
  );
}

function Section({
  tab,
  colors,
  haptics,
}: {
  tab: TabItem;
  colors: SectionSheetColors;
  haptics: boolean;
}) {
  return (
    <TabButton
      tab={tab}
      style={styles.section}
      // 32 pt segments: reach 44 pt above and below.
      hitSlop={HIT_SLOP}
      onPressIn={haptics ? () => Haptics.selectionAsync() : undefined}
    >
      <Text
        numberOfLines={1}
        maxFontSizeMultiplier={1.3}
        style={[styles.label, { color: tab.focused ? colors.foreground : colors.muted }]}
      >
        {tab.label}
      </Text>
      <Badge badge={tab.badge} colors={colors} />
    </TabButton>
  );
}

const HIT_SLOP = { top: 6, bottom: 6 };

/**
 * A badge after the section's label, drawn only when the tab sets one: an empty badge ('') is
 * a dot, a number a count. Hidden from screen readers: `TabButton` reads it with the label.
 */
function Badge({ badge, colors }: { badge: TabItem['badge']; colors: SectionSheetColors }) {
  if (badge == null) return null;
  const text = String(badge).trim();
  if (!text) return <View style={[styles.dot, { backgroundColor: colors.badge }]} />;
  const textStyle = [styles.badgeText, { color: colors.badgeText }];
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[styles.count, { backgroundColor: colors.badge }]}
    >
      {typeof badge === 'number' ? (
        <BadgeCount value={badge} textStyle={textStyle} />
      ) : (
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
          style={[textStyle, styles.badgeTextCap]}
        >
          {text}
        </Text>
      )}
    </View>
  );
}

/** A changing body fades out in 90 ms, then the new one in over 160 ms. */
const BODY_OUT = 90;
const BODY_IN = 160;

/**
 * One section's body. Hidden bodies stay mounted but fade out, take no touches and are
 * hidden from screen readers; `display: 'none'` would drop their scroll position on Android.
 * While the sheet rests at its strip, every body sits below the screen's bottom edge, so the
 * shown one is hidden from screen readers too (`readable` is false) until the sheet is raised.
 */
function Body({
  shown,
  readable,
  children,
}: {
  shown: boolean;
  readable: boolean;
  children?: ReactNode;
}) {
  const opacity = useSharedValue(shown ? 1 : 0);
  // Out quickly, then in: crossfading both at once showed the old body through the new one.
  useEffect(() => {
    opacity.value = shown
      ? withDelay(BODY_OUT, withTiming(1, { ...tabcnTiming, duration: BODY_IN }))
      : withTiming(0, { ...tabcnTiming, duration: BODY_OUT });
  }, [shown, opacity]);
  const fade = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      pointerEvents={shown ? 'auto' : 'none'}
      importantForAccessibility={shown && readable ? 'auto' : 'no-hide-descendants'}
      accessibilityElementsHidden={!(shown && readable)}
      style={[StyleSheet.absoluteFill, { opacity: shown ? 1 : 0 }, fade]}
    >
      <PanelScrollView contentContainerStyle={styles.bodyContent}>{children}</PanelScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // A text badge stays on one line and stops growing at this width, ending in an ellipsis.
  badgeTextCap: { maxWidth: 56 },
  emptyBar: {
    // The sheet stands in for the bar: the bar itself takes no room.
    height: 0,
  },
  fallbackBar: {
    borderRadius: 999,
    padding: 4,
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
  },
  sheet: {
    flex: 1,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderCurve: 'continuous',
    overflow: 'hidden',
    boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.08)',
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  grabberArea: {
    alignSelf: 'center',
    // A comfortable touch target around a small grabber.
    paddingTop: 8,
    paddingBottom: 9,
    paddingHorizontal: 24,
  },
  grabber: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
  },
  track: {
    borderRadius: 10,
    borderCurve: 'continuous',
    padding: 2,
  },
  thumb: {
    borderRadius: 8,
    borderCurve: 'continuous',
    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.12)',
  },
  section: {
    flex: 1,
    minWidth: 52,
    height: 32,
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  label: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  count: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 10, lineHeight: 13, fontWeight: '700' },
  bodies: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
});
