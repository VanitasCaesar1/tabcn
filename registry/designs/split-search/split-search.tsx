/**
 * Split Search: the Apple Store app's tab bar, which is iOS 26's own floating tab bar with a
 * search tab. A Liquid Glass pill holds the labelled tabs; a flat grey capsule glides to the
 * active one, whose icon and label turn blue. The last tab is Search: a round glass button
 * drawn apart from the pill, at its right. Pill and circle share one row, 21 pt from the
 * screen sides and 20.5 pt above its bottom edge, inside the home-indicator area.
 *
 * It minimizes on scroll, as iOS 26 bars do: on a screen that uses `useMinimizeOnScroll()`
 * (under a `TabBarProvider`), scrolling down narrows the pill to a circle holding only the
 * active tab's icon, while the search circle stays; scrolling up, or tapping the minimized
 * circle (`useRestoreTabBar`, no tab change), brings the full pill back.
 *
 * The glass is Apple's Liquid Glass on iOS 26 and later, a frosted blur on older iOS, and a
 * translucent white tint on Android (no blur there). Force one with `material`.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  runOnJS,
  type SharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {
  BadgeCount,
  TabBarRoot,
  TabButton,
  type TabItem,
  TabList,
  tabcnSpring,
  tabcnTiming,
  useFocusProgress,
  useRestoreTabBar,
  useTabBar,
  useTabBarMinimized,
} from 'react-native-tabcn';

const defaultColors = {
  /**
   * Fill over the blur (older iOS), or the whole surface where there's no blur (Android). Over
   * the app's #f2f2f7 page it comes out as the measured #fbfbff.
   */
  background: 'rgba(252, 252, 255, 0.86)',
  /** Tint of the Liquid Glass (iOS 26+). The app's glass is untinted. */
  glassTint: undefined as string | undefined,
  /** The 0.4 pt white rim of the blur and tint surfaces (Liquid Glass draws its own). */
  rim: '#ffffff',
  shadow: 'rgba(0, 0, 0, 0.08)',
  /** The flat selection capsule: #e9e9ed over the pill, as iOS's tertiary fill. */
  capsule: 'rgba(118, 118, 128, 0.13)',
  /** Inactive icons and labels, and the magnifier. */
  foreground: '#191919',
  /** Active icon and label: iOS 26 system blue. */
  active: '#0088ff',
  badge: '#ff3b30',
  badgeText: '#ffffff',
};

export type SplitSearchColors = typeof defaultColors;

/** `glass`: Liquid Glass (iOS 26+). `blur`: frosted blur. `tint`: translucent fill, no blur. */
export type SplitSearchMaterial = 'auto' | 'glass' | 'blur' | 'tint';
type Surface = Exclude<SplitSearchMaterial, 'auto'>;

export interface SplitSearchProps {
  colors?: Partial<SplitSearchColors>;
  /** Default `auto`: glass where available, blur on older iOS, tint on Android. */
  material?: SplitSearchMaterial;
  /** Light haptic tick on press. Default true. */
  haptics?: boolean;
}

/**
 * Measured on the Apple Store app's App Store screenshots (an iPhone 17 Pro screen, 402 pt
 * wide, at 2.388 px per pt): pill and circle 62 pt tall, 8 pt apart, 21 pt from the screen's
 * sides and 20.5 pt above its bottom edge. The capsule is 54 pt tall, 4 pt inside the pill, the
 * label's width plus 16.7 pt each side, at least 73.8 pt wide, and stays 4 pt from the pill's
 * ends. Icon centres 23.7 pt below the pill's top; 10 pt medium labels with the baseline at
 * 48.6 pt. The tabs share the pill's width equally (the app's are within 3 pt of that).
 */
const BAR = 62;
const SIDE = 21;
const BOTTOM = 20.5;
const GAP = 8;
const INSET = 4;
const CAPSULE_PAD = 16.7;
const CAPSULE_MIN = 73.8;
/** The icons' 40-unit box, in points (0.9 pt per unit). */
const ICON = 36;
const ICON_CENTER = 23.7;
/** Top of the label's 12 pt line box, which puts its baseline at 48.6 pt. */
const LABEL_TOP = 39;
/** How far the kept icon moves down to sit centred in the minimized circle. */
const ICON_DROP = BAR / 2 - ICON_CENTER;

function resolveMaterial(material: SplitSearchMaterial): Surface {
  if (material !== 'auto') return material;
  if (isLiquidGlassAvailable()) return 'glass';
  return Platform.OS === 'ios' ? 'blur' : 'tint';
}

export function SplitSearch({
  colors: custom,
  material = 'auto',
  haptics = true,
}: SplitSearchProps) {
  const colors = { ...defaultColors, ...custom };
  const surface = resolveMaterial(material);
  const { tabs, insets, activeIndex } = useTabBar();
  const window = useWindowDimensions();
  const minimized = useTabBarMinimized();
  const restore = useRestoreTabBar();
  // Each pill label's measured width, by tab index: the capsule is sized from it.
  const labelWidths = useSharedValue<Record<number, number>>({});

  // The last route is Search, drawn as its own circle; the rest share the pill.
  const pillTabs = tabs.slice(0, -1);
  const search = tabs.length > 1 ? tabs[tabs.length - 1] : undefined;
  const count = Math.max(1, pillTabs.length);
  const pillWidth = Math.max(BAR, window.width - insets.left - insets.right - SIDE * 2 - GAP - BAR);
  const slot = (pillWidth - INSET * 2) / count;

  // The pill tab the capsule marks: the active one, or the last one while Search is active.
  const [kept, setKept] = useState(() =>
    activeIndex >= 0 && activeIndex < pillTabs.length ? activeIndex : 0,
  );
  if (activeIndex >= 0 && activeIndex < pillTabs.length && activeIndex !== kept) {
    setKept(activeIndex);
  }
  const keptCenter = INSET + slot * (kept + 0.5);

  // While minimized, the circle is one button that expands the bar (as iOS 26 does); the
  // tabs inside it take no taps and aren't read.
  const [compact, setCompact] = useState(false);
  useAnimatedReaction(
    () => minimized.value > 0.5,
    (next, previous) => {
      if (next !== previous) runOnJS(setCompact)(next);
    },
  );

  // The app's bar sits 20.5 pt above the screen edge, inside the home indicator's inset.
  // Elsewhere (no inset, Android navigation bars) it keeps clear of the system area.
  const bottom = Math.max(BOTTOM, Platform.OS === 'ios' ? insets.bottom - 13.5 : insets.bottom + 8);
  const shadow = { boxShadow: `0 3px 20px ${colors.shadow}` };

  const pillStyle = useAnimatedStyle(() => ({
    width: interpolate(minimized.value, [0, 1], [pillWidth, BAR]),
  }));
  // The tabs keep their full-width places and slide, so the kept icon ends up centred.
  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: minimized.value * (BAR / 2 - keptCenter) }],
  }));

  return (
    <TabBarRoot
      placement="floating"
      minimizeBehavior="onScrollDown"
      offset={bottom - insets.bottom}
      style={styles.root}
    >
      <TabList style={styles.list}>
        <Animated.View style={[styles.pill, shadow, pillStyle]}>
          <Glass surface={surface} colors={colors} />
          <View style={[StyleSheet.absoluteFill, styles.round, styles.clip]}>
            <Animated.View style={[styles.row, { width: pillWidth }, rowStyle]}>
              <Capsule
                kept={kept}
                center={keptCenter}
                pillWidth={pillWidth}
                searchActive={search?.focused ?? false}
                minimized={minimized}
                color={colors.capsule}
                labelWidths={labelWidths}
              />
              {pillTabs.map((tab) => (
                <PillTab
                  key={tab.key}
                  tab={tab}
                  colors={colors}
                  haptics={haptics}
                  width={slot}
                  kept={tab.index === kept}
                  hidden={compact}
                  minimized={minimized}
                  labelWidths={labelWidths}
                />
              ))}
            </Animated.View>
          </View>
          {compact ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${pillTabs[kept]?.label ?? 'Tabs'}, show all tabs`}
              onPress={restore}
              onPressIn={haptics ? () => Haptics.selectionAsync() : undefined}
              style={[StyleSheet.absoluteFill, styles.round]}
            />
          ) : null}
        </Animated.View>
        {search ? (
          <SearchTab
            tab={search}
            surface={surface}
            colors={colors}
            haptics={haptics}
            shadow={shadow}
          />
        ) : null}
      </TabList>
    </TabBarRoot>
  );
}

/** The surface behind the pill and the search circle: fills its parent, rounded. */
function Glass({ surface, colors }: { surface: Surface; colors: SplitSearchColors }) {
  if (surface === 'glass') {
    return (
      <GlassView
        pointerEvents="none"
        glassEffectStyle="regular"
        colorScheme="light"
        tintColor={colors.glassTint}
        style={[StyleSheet.absoluteFill, styles.round]}
      />
    );
  }
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[StyleSheet.absoluteFill, styles.round, styles.clip]}>
        {surface === 'blur' ? (
          <BlurView intensity={30} tint="light" style={StyleSheet.absoluteFill} />
        ) : null}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
      </View>
      <View
        style={[StyleSheet.absoluteFill, styles.round, styles.rim, { borderColor: colors.rim }]}
      />
    </View>
  );
}

/**
 * The selection capsule. It glides (critically damped, no overshoot) to the next tab and
 * takes that tab's width; it fades out while Search is active or the bar is minimized, and
 * reappears in place when a tab is chosen after Search.
 */
function Capsule({
  kept,
  center,
  pillWidth,
  searchActive,
  minimized,
  color,
  labelWidths,
}: {
  kept: number;
  center: number;
  pillWidth: number;
  searchActive: boolean;
  minimized: SharedValue<number>;
  color: string;
  labelWidths: SharedValue<Record<number, number>>;
}) {
  const x = useSharedValue(0);
  const width = useSharedValue(0);
  const ready = useSharedValue(false);
  const shown = useSharedValue(searchActive ? 0 : 1);

  useEffect(() => {
    shown.value = withTiming(searchActive ? 0 : 1, tabcnTiming);
  }, [searchActive, shown]);

  useAnimatedReaction(
    () => {
      const label = labelWidths.value[kept];
      if (label === undefined) return null;
      const w = Math.min(pillWidth - INSET * 2, Math.max(CAPSULE_MIN, label + CAPSULE_PAD * 2));
      const left = Math.min(Math.max(center - w / 2, INSET), pillWidth - INSET - w);
      return { left, w };
    },
    (next) => {
      if (!next) return;
      // Jumps on first layout, and when it is coming back from Search (it is invisible).
      if (!ready.value || shown.value < 0.5) {
        x.value = next.left;
        width.value = next.w;
        ready.value = true;
        return;
      }
      x.value = withSpring(next.left, tabcnSpring);
      width.value = withSpring(next.w, tabcnSpring);
    },
    // No dependency list: on native it is ignored with a warning, and the reaction already
    // re-runs when `kept`, `center` or `pillWidth` (captured above) change.
  );

  const style = useAnimatedStyle(() => ({
    width: width.value,
    opacity: ready.value ? shown.value * (1 - minimized.value) : 0,
    transform: [{ translateX: x.value }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.capsule, { backgroundColor: color }, style]}
    />
  );
}

function PillTab({
  tab,
  colors,
  haptics,
  width,
  kept,
  hidden,
  minimized,
  labelWidths,
}: {
  tab: TabItem;
  colors: SplitSearchColors;
  haptics: boolean;
  width: number;
  /** The tab the minimized bar keeps. */
  kept: boolean;
  /** The bar is minimized: the circle over it takes the taps, so the tab is not read. */
  hidden: boolean;
  minimized: SharedValue<number>;
  labelWidths: SharedValue<Record<number, number>>;
}) {
  // Grey to blue crossfade; nothing scales or changes shape.
  const progress = useFocusProgress(tab);
  const activeIcon = useAnimatedStyle(() => ({ opacity: progress.value }));
  // The grey copy stays opaque under the blue one until the last stretch, then drops out so
  // the active glyph rests alone (no outline or fringe left under a filled icon).
  const inactiveIcon = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.8, 1], [1, 0], 'clamp'),
  }));
  const icon = useAnimatedStyle(() => ({
    opacity: kept ? 1 : 1 - minimized.value,
    transform: [{ translateY: kept ? minimized.value * ICON_DROP : 0 }],
  }));
  const label = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [colors.foreground, colors.active]),
    opacity: 1 - minimized.value,
  }));

  return (
    <TabButton
      tab={tab}
      style={[styles.tab, { width }]}
      pointerEvents={hidden ? 'none' : 'auto'}
      accessibilityElementsHidden={hidden}
      importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'}
      onPressIn={haptics ? () => Haptics.selectionAsync() : undefined}
    >
      <Animated.View style={[styles.icon, { left: (width - ICON) / 2 }, icon]}>
        <Animated.View style={[StyleSheet.absoluteFill, inactiveIcon]}>
          {tab.renderIcon?.({ focused: false, color: colors.foreground, size: ICON })}
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, activeIcon]}>
          {tab.renderIcon?.({ focused: true, color: colors.active, size: ICON })}
        </Animated.View>
        <Badge tab={tab} colors={colors} />
      </Animated.View>
      <View pointerEvents="none" style={styles.labelBox}>
        <Animated.Text
          numberOfLines={1}
          style={[styles.label, label]}
          onLayout={(e) => {
            const w = e.nativeEvent.layout.width;
            labelWidths.modify((all) => {
              'worklet';
              all[tab.index] = w;
              return all;
            }, true);
          }}
        >
          {tab.label}
        </Animated.Text>
      </View>
    </TabButton>
  );
}

/**
 * The search tab: a round glass button. Active, its magnifier turns blue over a disc of the
 * capsule's grey (iOS's own look for it; the app's screenshots don't show it).
 */
function SearchTab({
  tab,
  surface,
  colors,
  haptics,
  shadow,
}: {
  tab: TabItem;
  surface: Surface;
  colors: SplitSearchColors;
  haptics: boolean;
  shadow: { boxShadow: string };
}) {
  const progress = useFocusProgress(tab);
  const active = useAnimatedStyle(() => ({ opacity: progress.value }));
  const inactive = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.8, 1], [1, 0], 'clamp'),
  }));
  return (
    <TabButton
      tab={tab}
      style={[styles.search, shadow]}
      onPressIn={haptics ? () => Haptics.selectionAsync() : undefined}
    >
      <Glass surface={surface} colors={colors} />
      <Animated.View
        pointerEvents="none"
        style={[styles.disc, { backgroundColor: colors.capsule }, active]}
      />
      <View style={styles.searchIcon}>
        <Animated.View style={[StyleSheet.absoluteFill, inactive]}>
          {tab.renderIcon?.({ focused: false, color: colors.foreground, size: ICON })}
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, active]}>
          {tab.renderIcon?.({ focused: true, color: colors.active, size: ICON })}
        </Animated.View>
        <Badge tab={tab} colors={colors} />
      </View>
    </TabButton>
  );
}

/** iOS's red count badge at the icon's top right. Read with the tab's label, not on its own. */
function Badge({ tab, colors }: { tab: TabItem; colors: SplitSearchColors }) {
  if (tab.badge == null) return null;
  const text = { color: colors.badgeText };
  return (
    <View
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[styles.badge, { backgroundColor: colors.badge }]}
    >
      {typeof tab.badge === 'number' ? (
        <BadgeCount value={tab.badge} textStyle={[styles.badgeText, text]} />
      ) : (
        <Text style={[styles.badgeText, text]}>{tab.badge}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignSelf: 'stretch',
    marginHorizontal: SIDE,
  },
  list: {
    justifyContent: 'space-between',
  },
  pill: {
    height: BAR,
    borderRadius: BAR / 2,
  },
  round: {
    borderRadius: BAR / 2,
  },
  clip: {
    overflow: 'hidden',
  },
  rim: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  row: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: BAR,
    flexDirection: 'row',
    paddingHorizontal: INSET,
  },
  capsule: {
    position: 'absolute',
    left: 0,
    top: INSET,
    height: BAR - INSET * 2,
    borderRadius: (BAR - INSET * 2) / 2,
  },
  tab: {
    height: BAR,
    alignItems: 'center',
  },
  icon: {
    position: 'absolute',
    top: ICON_CENTER - ICON / 2,
    width: ICON,
    height: ICON,
  },
  searchIcon: {
    width: ICON,
    height: ICON,
  },
  labelBox: {
    position: 'absolute',
    top: LABEL_TOP,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  label: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '500',
    includeFontPadding: false,
  },
  search: {
    width: BAR,
    height: BAR,
    borderRadius: BAR / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disc: {
    position: 'absolute',
    top: INSET,
    left: INSET,
    width: BAR - INSET * 2,
    height: BAR - INSET * 2,
    borderRadius: (BAR - INSET * 2) / 2,
  },
  badge: {
    position: 'absolute',
    top: 2,
    left: ICON / 2 + 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '600',
  },
});
