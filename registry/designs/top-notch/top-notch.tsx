/**
 * Top Notch: a white docked bar with icons and labels; a short pill slides along
 * the top edge to the active tab, and icon and label colours crossfade.
 * The default active and inactive colours are kept as the reference has them, even where the
 * inactive labels are low in contrast; pass `colors` to raise it.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import * as Haptics from 'expo-haptics';
import { I18nManager, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  interpolate,
  interpolateColor,
  ReduceMotion,
  useAnimatedStyle,
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
  const { tabs } = useTabBar();
  return (
    <TabBarRoot
      placement="docked"
      style={[
        styles.dock,
        { backgroundColor: colors.background, boxShadow: `0 -6px 24px ${colors.shadow}` },
      ]}
    >
      <TabList style={[styles.card, { backgroundColor: colors.background }]}>
        <Notch color={colors.active} />
        {tabs.map((tab) => (
          <Tab
            key={tab.key}
            tab={tab}
            colors={colors}
            fontFamily={fontFamily}
            iconSize={iconSize}
            haptics={haptics}
          />
        ))}
      </TabList>
    </TabBarRoot>
  );
}

const NOTCH_WIDTH = 47;

function Notch({ color }: { color: string }) {
  const { activeIndex } = useTabBar();
  const { x, width, ready } = useTabIndicator();
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
}: {
  tab: TabItem;
  colors: TopNotchColors;
  fontFamily?: string;
  iconSize: number;
  haptics: boolean;
}) {
  const progress = useFocusProgress(tab);
  const label = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [colors.inactive, colors.active]),
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
