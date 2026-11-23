/**
 * Top Notch: a white docked bar with icons and labels; a short pill slides along
 * the top edge to the active tab, and icon and label colours crossfade.
 * The default active and inactive colours are kept as the reference has them, even where the
 * inactive labels are low in contrast; pass `colors` to raise it.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { I18nManager, type LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  interpolate,
  interpolateColor,
  ReduceMotion,
  type SharedValue,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated';
import {
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
  /** The bar, which also fills the home-indicator area. */
  background: '#f6f4ff',
  /** The notch, and the active tab's icon and label. */
  active: '#533ddf',
  /** The other tabs' icons and labels. */
  inactive: '#b0a5ef',
  /** The badge dot. */
  badge: '#ff3b30',
  /** The soft shadow the bar casts upward over the screen. */
  shadow: 'rgba(30, 20, 120, 0.14)',
};

export type TopNotchColors = typeof defaultColors;

export interface TopNotchProps {
  colors?: Partial<TopNotchColors>;
  /** Label font, e.g. a heavy geometric sans. Default: system font, weight 800. */
  fontFamily?: string;
  /** Icon box size in points. Default 38. */
  iconSize?: number;
  /** Light haptic tick on press. Default true. */
  haptics?: boolean;
}

export function TopNotch({
  colors: custom,
  fontFamily,
  iconSize = 38,
  haptics = true,
}: TopNotchProps) {
  const colors = { ...defaultColors, ...custom };
  return (
    <TabBarRoot
      placement="docked"
      style={[
        styles.dock,
        { backgroundColor: colors.background, boxShadow: `0 -6px 24px ${colors.shadow}` },
      ]}
    >
      <TabList style={[styles.card, { backgroundColor: colors.background }]}>
        <Row colors={colors} fontFamily={fontFamily} iconSize={iconSize} haptics={haptics} />
      </TabList>
    </TabBarRoot>
  );
}

const NOTCH_WIDTH = 47;

/** The notch and the tabs, under `TabList`, sharing one indicator: the tabs' colour follows it. */
function Row({
  colors,
  fontFamily,
  iconSize,
  haptics,
}: {
  colors: TopNotchColors;
  fontFamily?: string;
  iconSize: number;
  haptics: boolean;
}) {
  const { tabs, activeIndex } = useTabBar();
  const indicator = useTabIndicator();
  const previous = useMovingBetween(activeIndex);
  return (
    <>
      <Notch color={colors.active} indicator={indicator} />
      {tabs.map((tab) => (
        <Tab
          key={tab.key}
          tab={tab}
          colors={colors}
          fontFamily={fontFamily}
          iconSize={iconSize}
          haptics={haptics}
          indicator={indicator}
          moving={tab.index === activeIndex || tab.index === previous}
          activeIndex={activeIndex}
        />
      ))}
    </>
  );
}

function Notch({ color, indicator }: { color: string; indicator: IndicatorFrame }) {
  const { activeIndex } = useTabBar();
  const { x, width, ready } = indicator;
  // Hidden while no tab is active (a hidden route is focused), as TabIndicator is.
  const style = useAnimatedStyle(() => ({
    opacity: ready.value && activeIndex >= 0 ? 1 : 0,
    transform: [{ translateX: x.value + (width.value - NOTCH_WIDTH) / 2 }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.notch, PHYSICAL_LEFT, { backgroundColor: color }, style]}
    />
  );
}

function Tab({
  tab,
  colors,
  fontFamily,
  iconSize,
  haptics,
  indicator,
  moving,
  activeIndex,
}: {
  tab: TabItem;
  colors: TopNotchColors;
  fontFamily?: string;
  iconSize: number;
  haptics: boolean;
  indicator: IndicatorFrame;
  moving: boolean;
  activeIndex: number;
}) {
  const focus = useFocusProgress(tab);
  const { coverage: progress, onLayout } = useCoverage(indicator, moving, activeIndex, focus);
  // Strings, not `colors`: a worklet that captured the object made on each render would
  // restart its animated style on every render.
  const fromColor = colors.inactive;
  const toColor = colors.active;
  const label = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [fromColor, toColor]),
  }));
  // The active icon fades in over the inactive one, which stays opaque until the last stretch,
  // so the glyph never dims half-way.
  const inactiveIcon = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.8, 1], [1, 0], 'clamp'),
  }));
  const activeIcon = useAnimatedStyle(() => ({ opacity: progress.value }));
  return (
    <TabButton
      tab={tab}
      style={styles.tab}
      onLayout={onLayout}
      onPressIn={haptics ? () => Haptics.selectionAsync() : undefined}
    >
      <View style={{ width: iconSize, height: iconSize }}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.center, inactiveIcon]}>
          {tab.renderIcon?.({ focused: false, color: colors.inactive, size: iconSize })}
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, styles.center, activeIcon]}>
          {tab.renderIcon?.({ focused: true, color: colors.active, size: iconSize })}
        </Animated.View>
        {tab.badge != null ? (
          <Animated.View
            entering={badgeIn}
            exiting={badgeOut}
            pointerEvents="none"
            style={[
              styles.badge,
              { backgroundColor: colors.badge, borderColor: colors.background },
            ]}
          />
        ) : null}
      </View>
      <Animated.Text
        numberOfLines={1}
        maxFontSizeMultiplier={1.3}
        style={[styles.label, fontFamily ? { fontFamily } : styles.systemWeight, label]}
      >
        {tab.label}
      </Animated.Text>
    </TabButton>
  );
}

/** The indicator's animated frame, as `useTabIndicator` returns it. */
interface IndicatorFrame {
  x: SharedValue<number>;
  width: SharedValue<number>;
  ready: SharedValue<boolean>;
}

/**
 * The active tab and the one it was before: the two tabs a change of tab moves between. Only
 * these take colour from the indicator, so tabs it passes over on a long move stay unlit.
 */
function useMovingBetween(activeIndex: number) {
  // State, not refs written during render: React can throw a render away, and a ref written
  // in it would keep a "previous" tab that never showed.
  const [tabs, setTabs] = useState({ active: activeIndex, previous: activeIndex });
  if (tabs.active !== activeIndex) {
    setTabs({ active: activeIndex, previous: tabs.active });
    return tabs.active;
  }
  return tabs.previous;
}

/**
 * How much the indicator is on this tab, 0 to 1: 1 when it is centred on the tab, falling to 0
 * as its centre moves a tab's width away. The tab's colour follows it, so the colour arrives
 * with the indicator instead of ahead of it (a timed fade finished while the spring was still
 * on its way). Until the tab and indicator are measured, and while no tab is active, it falls
 * back to the tab's focus progress.
 */
function useCoverage(
  indicator: IndicatorFrame,
  moving: boolean,
  activeIndex: number,
  fallback: SharedValue<number>,
) {
  const frame = useSharedValue({ x: 0, width: 0 });
  const onLayout = (event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout;
    frame.value = { x, width };
  };
  const coverage = useDerivedValue(() => {
    const f = frame.value;
    if (!indicator.ready.value || f.width === 0 || activeIndex < 0) return fallback.value;
    if (!moving) return 0;
    const centre = indicator.x.value + indicator.width.value / 2;
    const distance = Math.abs(centre - (f.x + f.width / 2));
    return Math.min(1, Math.max(0, 1 - distance / f.width));
  });
  return { coverage, onLayout };
}

// The badge dot fades in and out on tabcnTiming, with no pop; instant with reduce motion on.
const BADGE_FADE_MS = tabcnTiming.duration ?? 200;
const BADGE_EASING = tabcnTiming.easing ?? Easing.linear;
const badgeIn = FadeIn.duration(BADGE_FADE_MS)
  .easing(BADGE_EASING)
  .reduceMotion(ReduceMotion.System);
const badgeOut = FadeOut.duration(BADGE_FADE_MS)
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
  // Docked like the app it comes from: full width and flush with the bottom edge, with the
  // background running under the home indicator. Side padding keeps the reference's tab spacing.
  dock: {
    paddingHorizontal: 32,
  },
  card: {
    height: 75,
    paddingHorizontal: 6,
  },
  notch: {
    position: 'absolute',
    top: 0,
    width: NOTCH_WIDTH,
    height: 5,
    borderRadius: 3,
  },
  tab: { flex: 1, alignItems: 'center', paddingTop: 11, gap: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 10.5, lineHeight: 14 },
  systemWeight: { fontWeight: '800' },
  // A ring in the bar's colour separates the dot from the icon's ink; the coloured dot keeps
  // its size inside it.
  badge: {
    position: 'absolute',
    top: 0.5,
    right: -1.5,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
  },
});
