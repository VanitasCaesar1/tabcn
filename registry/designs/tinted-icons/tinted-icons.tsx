/**
 * Tinted Icons: Snapchat's tab bar. A flat, solid black bar docked flush to the bottom edge,
 * with no hairline, blur, shadow or labels: five grey outline icons in equal slots. Each tab
 * has its own colour, and the active tab shows it twice: its outline turns that colour (the
 * same outline, never a filled glyph) and a small triangle in the same colour points up at it
 * from the bar's bottom edge. Map is green, Chat blue, Camera yellow, Stories purple and
 * Spotlight red.
 *
 * Motion: the icons crossfade from grey to their tint and back on tabcnTiming. The triangle
 * slides to the new tab on tabcnSpring (critically damped, no overshoot) while its colour
 * changes from the old tab's tint to the new one. Nothing scales, lifts or rotates; presses
 * show no dim or scale; with reduce motion on, everything jumps to the new tab at once.
 * A tab can give the bar its own surface while it is active (Snapchat's Spotlight bar is a
 * dark grey, not black): pass `surfaces`, and the bar colour and the grey of the other icons
 * crossfade on tabcnTiming.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 *
 * Measured on Snapchat's App Store screenshots (a 375 pt iPhone 8-class screen at 2.579 px
 * per pt, Stories and Map shots matching to the pixel): the bar is 48 pt tall with five 75 pt
 * slots across the full width; icon centres sit 23.7 pt below the top edge. The triangle's tip
 * is 42.7 pt below the top edge; 5.4 pt of it shows, 8.1 pt wide at the bottom, its sides at
 * 45 degrees near the tip. Inactive icons are #707173. Measured tints: Map #39ca8d, Stories
 * #cc4afc, Spotlight #f23d58. Chat and Camera never show active in the screenshots, so their
 * tints (#2ea8ff, Snap yellow #fffc00) are taken from Snapchat's brand colours. Spotlight's
 * bar is #1e1e1c with #b9c0c8 icons. That phone has no home indicator, so the triangle is cut
 * by the screen's bottom edge; here it stays at the bottom of the 48 pt row, and the bar's
 * colour runs on under the home indicator.
 */
import * as Haptics from 'expo-haptics';
import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { I18nManager, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut as FadeOutAnimation,
  interpolate,
  ReduceMotion,
  runOnJS,
  type SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import {
  BadgeCount,
  TabBarRoot,
  TabButton,
  type TabItem,
  TabList,
  tabcnTiming,
  useFocusProgress,
  useTabBar,
  useTabIndicator,
} from 'react-native-tabcn';

const defaultColors = {
  /** The bar, on every tab without its own entry in `surfaces`. */
  background: '#000000',
  /** Icons of the tabs that aren't active. */
  inactive: '#707173',
  /** Badges: the screenshots show none, so this borrows Snapchat's red. */
  badge: '#f23d58',
  badgeText: '#ffffff',
};

export type TintedIconsColors = typeof defaultColors;

/**
 * Snapchat's tab colours, in its tab order: Map, Chat, Camera, Stories, Spotlight.
 * Map, Stories and Spotlight are measured; Chat and Camera follow Snapchat's brand colours.
 */
export const tintedIconsTints: readonly string[] = [
  '#39ca8d',
  '#2ea8ff',
  '#fffc00',
  '#cc4afc',
  '#f23d58',
];

/** The bar's look while a given tab is active. */
export interface TintedIconsSurface {
  background: string;
  /** Icons of the other tabs over this surface. Default `colors.inactive`. */
  inactive?: string;
}

/** Snapchat's Spotlight bar: a near-black grey with lighter grey icons. */
export const tintedIconsDark: TintedIconsSurface = {
  background: '#1e1e1c',
  inactive: '#b9c0c8',
};

export interface TintedIconsProps {
  colors?: Partial<TintedIconsColors>;
  /**
   * Each tab's colour, by position: the first entry is the first tab's. With more tabs than
   * colours, the list starts over. Default `tintedIconsTints`.
   */
  tints?: readonly string[];
  /**
   * A surface for the bar while a tab is active, by tab position (0 is the first tab). Tabs
   * not listed use `colors.background` and `colors.inactive`. For Snapchat's Spotlight tab
   * in fifth place: `{ 4: tintedIconsDark }`.
   */
  surfaces?: Partial<Record<number, TintedIconsSurface>>;
  /** Light haptic tick on press. Default true. */
  haptics?: boolean;
}

/** Bar height above the bottom safe area; the icons are centred in it. */
const BAR = 48;
/** Icon box in points: the 40-unit glyphs are drawn at 0.75 pt per unit. */
const ICON = 30;
/** The visible part of the triangle under the active icon. */
const MARK_WIDTH = 8.4;
const MARK_HEIGHT = 5.4;
/**
 * The triangle in an 8.4 x 5.4 pt box: a slightly rounded tip, sides at 45 degrees for the
 * first 2.7 pt, then curving down to meet the bar's bottom edge almost upright.
 */
const MARK_PATH = 'M3.9 0.3Q4.2 0 4.5 0.3L6.9 2.7Q8.3 4.1 8.3 5.4H0.1Q0.1 4.1 1.5 2.7Z';

const NO_SURFACES: Partial<Record<number, TintedIconsSurface>> = {};

const AnimatedPath = Animated.createAnimatedComponent(Path);

export function TintedIcons({
  colors: custom,
  tints = tintedIconsTints,
  surfaces = NO_SURFACES,
  haptics = true,
}: TintedIconsProps) {
  const colors = { ...defaultColors, ...custom };
  const { tabs, activeIndex } = useTabBar();
  const surface = surfaces[activeIndex];
  const background = surface?.background ?? colors.background;
  const inactive = surface?.inactive ?? colors.inactive;
  const tintAt = (index: number) => tints[index % tints.length] ?? colors.inactive;
  const activeTint = activeIndex >= 0 ? tintAt(activeIndex) : colors.inactive;

  // The bar's colour runs from the old surface to the new one (a crossfade, no movement).
  const fill = useSharedValue(background);
  useEffect(() => {
    fill.value = withTiming(background, tabcnTiming);
  }, [background, fill]);
  const fillStyle = useAnimatedStyle(() => ({ backgroundColor: fill.value }));

  const { current, previous, clear } = useInactiveColor(inactive);

  return (
    // The root holds the active surface's colour, so it covers the bottom safe area too (the
    // bar's colour runs on under the home indicator) and stays put when a screen swaps the
    // tabs out. The fill drawn over it crossfades from the old colour to the new one.
    <TabBarRoot placement="docked" style={{ backgroundColor: background }}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, fillStyle]} />
      <TabList style={styles.bar}>
        <Mark color={activeTint} />
        {tabs.map((tab) => (
          <Tab
            key={tab.key}
            tab={tab}
            tint={tintAt(tab.index)}
            inactive={current}
            previous={previous}
            onFaded={clear}
            colors={colors}
            haptics={haptics}
          />
        ))}
      </TabList>
    </TabBarRoot>
  );
}

/**
 * The grey of the inactive icons. When a surface changes it, the old grey is kept as
 * `previous` until it has faded out over the new one.
 */
function useInactiveColor(color: string) {
  const [state, setState] = useState<{ current: string; previous: string | null }>({
    current: color,
    previous: null,
  });
  if (state.current !== color) {
    setState({ current: color, previous: state.current });
  }
  const clear = useCallback(() => setState((s) => (s.previous ? { ...s, previous: null } : s)), []);
  return { ...state, clear };
}

/**
 * The triangle under the active icon. It slides between slot centres on tabcnSpring, and its
 * colour moves from the old tab's tint to the new one on tabcnTiming.
 */
function Mark({ color }: { color: string }) {
  const { activeIndex } = useTabBar();
  const { x, width, ready } = useTabIndicator();
  const fill = useSharedValue(color);
  useEffect(() => {
    fill.value = withTiming(color, tabcnTiming);
  }, [color, fill]);
  const style = useAnimatedStyle(() => ({
    opacity: ready.value && activeIndex >= 0 ? 1 : 0,
    transform: [{ translateX: x.value + (width.value - MARK_WIDTH) / 2 }],
  }));
  const fillProps = useAnimatedProps(() => ({ fill: fill.value }));
  return (
    <Animated.View pointerEvents="none" style={[styles.mark, PHYSICAL_LEFT, style]}>
      <Svg width={MARK_WIDTH} height={MARK_HEIGHT} viewBox={`0 0 ${MARK_WIDTH} ${MARK_HEIGHT}`}>
        <AnimatedPath d={MARK_PATH} animatedProps={fillProps} />
      </Svg>
    </Animated.View>
  );
}

function Tab({
  tab,
  tint,
  inactive,
  previous,
  onFaded,
  colors,
  haptics,
}: {
  tab: TabItem;
  tint: string;
  inactive: string;
  previous: string | null;
  onFaded: () => void;
  colors: TintedIconsColors;
  haptics: boolean;
}) {
  const progress = useFocusProgress(tab);
  return (
    <TabButton
      tab={tab}
      style={styles.tab}
      onPressIn={haptics ? () => Haptics.selectionAsync() : undefined}
    >
      <View style={styles.iconBox}>
        <Icons
          tab={tab}
          tint={tint}
          inactive={inactive}
          previous={previous}
          onFaded={onFaded}
          progress={progress}
        />
        <Badge tab={tab} colors={colors} />
      </View>
    </TabButton>
  );
}

/**
 * The outline in grey and in the tab's tint. The tinted copy fades in over the grey one,
 * which stays until the last stretch and then drops out, so the icon never dims mid-way.
 * A grey from the previous surface fades out on top of the new grey.
 */
function Icons({
  tab,
  tint,
  inactive,
  previous,
  onFaded,
  progress,
}: {
  tab: TabItem;
  tint: string;
  inactive: string;
  previous: string | null;
  onFaded: () => void;
  progress: SharedValue<number>;
}) {
  const grey = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.8, 1], [1, 0], 'clamp'),
  }));
  const tinted = useAnimatedStyle(() => ({ opacity: progress.value }));
  return (
    <>
      <Animated.View style={[StyleSheet.absoluteFill, grey]}>
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          {tab.renderIcon?.({ focused: false, color: inactive, size: ICON })}
        </View>
        {previous ? (
          <FadeOut key={previous} onDone={onFaded}>
            {tab.renderIcon?.({ focused: false, color: previous, size: ICON })}
          </FadeOut>
        ) : null}
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, styles.center, tinted]}>
        {tab.renderIcon?.({ focused: true, color: tint, size: ICON })}
      </Animated.View>
    </>
  );
}

/** Starts opaque when mounted and fades out on tabcnTiming, then calls `onDone`. */
function FadeOut({ onDone, children }: { onDone: () => void; children: ReactNode }) {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withTiming(0, tabcnTiming, (finished) => {
      'worklet';
      if (finished) runOnJS(onDone)();
    });
  }, [opacity, onDone]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.center, style]}>
      {children}
    </Animated.View>
  );
}

/**
 * Snapchat's bar shows no badges; this one sits on the icon's top-right corner: a dot for an
 * empty badge, a count capsule otherwise. It fades in and out on tabcnTiming (instant with
 * reduce motion on). The tab's accessibility label already reads it.
 */
function Badge({ tab, colors }: { tab: TabItem; colors: TintedIconsColors }) {
  if (tab.badge == null) return null;
  const text = String(tab.badge).trim();
  const fill = { backgroundColor: colors.badge };
  if (text === '') {
    return (
      <Animated.View
        entering={badgeIn}
        exiting={badgeOut}
        pointerEvents="none"
        style={[styles.dot, fill]}
      />
    );
  }
  const textStyle = [styles.badgeText, { color: colors.badgeText }];
  return (
    <Animated.View
      entering={badgeIn}
      exiting={badgeOut}
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[styles.badge, fill]}
    >
      {typeof tab.badge === 'number' ? (
        <BadgeCount value={tab.badge} textStyle={textStyle} />
      ) : (
        <Text style={textStyle}>{text}</Text>
      )}
    </Animated.View>
  );
}

const BADGE_EASING = tabcnTiming.easing ?? Easing.linear;
const badgeIn = FadeIn.duration(tabcnTiming.duration ?? 200)
  .easing(BADGE_EASING)
  .reduceMotion(ReduceMotion.System);
const badgeOut = FadeOutAnimation.duration(tabcnTiming.duration ?? 200)
  .easing(BADGE_EASING)
  .reduceMotion(ReduceMotion.System);

/**
 * Tab frames are physical (from the left edge), but in a right-to-left layout React Native reads
 * `left` as the start edge, the right, unless the app turned that swap off. Pin to the physical
 * left either way, so `translateX` by a frame's `x` lands on the tab.
 */
const PHYSICAL_LEFT =
  I18nManager.isRTL && (I18nManager.getConstants?.().doLeftAndRightSwapInRTL ?? true)
    ? { right: 0 }
    : { left: 0 };

const styles = StyleSheet.create({
  // Docked full width with square corners and no top line; five equal slots edge to edge.
  bar: { height: BAR },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  iconBox: { width: ICON, height: ICON },
  center: { alignItems: 'center', justifyContent: 'center' },
  // The triangle's flat side rests on the 48 pt row's bottom edge.
  mark: {
    position: 'absolute',
    top: BAR - MARK_HEIGHT,
    width: MARK_WIDTH,
    height: MARK_HEIGHT,
  },
  dot: { position: 'absolute', top: 4, right: 3, width: 8, height: 8, borderRadius: 4 },
  badge: {
    position: 'absolute',
    top: 0,
    left: ICON - 11,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 12, fontWeight: '600', includeFontPadding: false },
});
