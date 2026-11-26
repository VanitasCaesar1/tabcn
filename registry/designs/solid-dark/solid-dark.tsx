/**
 * Solid Dark: a black bar with icons only. On focus the active icon (the same glyph, white)
 * fades in over the dimmed one, which stays put underneath so the glyph never dims mid-change. Nothing
 * moves or scales: there is no indicator, and a press only gives a haptic tick.
 * Glass is opt-in: `material="glass"` (or `"auto"`) turns the black bar into dark Liquid Glass
 * on iOS 26 (expo-glass-effect); the default stays the solid bar.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { processColor, StyleSheet, Text, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  BadgeCount,
  TabBarRoot,
  TabButton,
  type TabItem,
  TabList,
  tabcnTiming,
  useFocusProgress,
  useTabBar,
} from 'react-native-tabcn';

const defaultColors = {
  /** The bar, which also fills the home-indicator area. */
  background: '#131313',
  /** The active tab's icon. */
  active: '#ffffff',
  /** The other tabs' icons. */
  inactive: 'rgba(255, 255, 255, 0.55)',
  /** The badge dot or count; it is ringed in `background`. */
  badge: '#ff453a',
  /** A count badge's number. */
  badgeText: '#ffffff',
  /**
   * Tint over the Liquid Glass (iOS 26), when `material` asks for glass. Unset, `background`
   * at 60%, so the light icons keep their contrast over light screens (the glass follows what
   * is behind it); `'transparent'` for clear glass.
   */
  glassTint: undefined as string | undefined,
};

export type SolidDarkColors = typeof defaultColors;

export interface SolidDarkProps {
  colors?: Partial<SolidDarkColors>;
  /**
   * The bar's surface: `'solid'` (the black bar it copies), `'glass'` (Liquid Glass, iOS 26),
   * or `'auto'` (glass where the system has it, solid elsewhere). Default `'solid'`.
   */
  material?: 'auto' | 'glass' | 'solid';
  /** Light haptic tick on press. Default true. */
  haptics?: boolean;
}

export function SolidDark({ colors: custom, material = 'solid', haptics = true }: SolidDarkProps) {
  const colors = { ...defaultColors, ...custom };
  const { tabs } = useTabBar();
  const glass = material === 'glass' || (material === 'auto' && isLiquidGlassAvailable());

  return (
    <TabBarRoot
      placement="docked"
      style={glass ? styles.dock : [styles.dock, { backgroundColor: colors.background }]}
    >
      {glass ? (
        // The glass fills the bar and the home-indicator area under it, as the colour did.
        <GlassView
          pointerEvents="none"
          glassEffectStyle="regular"
          colorScheme="dark"
          tintColor={colors.glassTint ?? withAlpha(colors.background, 0.6)}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <TabList style={glass ? styles.bar : [styles.bar, { backgroundColor: colors.background }]}>
        {tabs.map((tab) => (
          <Tab key={tab.key} tab={tab} colors={colors} haptics={haptics} />
        ))}
      </TabList>
    </TabBarRoot>
  );
}

function Tab({
  tab,
  colors,
  haptics,
}: {
  tab: TabItem;
  colors: SolidDarkColors;
  haptics: boolean;
}) {
  const progress = useFocusProgress(tab);
  // The inactive icon stays fully opaque under the active one while it fades in, so the glyph
  // never dips in brightness halfway (a symmetric 1 - p / p crossfade would). It drops out only
  // over the last stretch, once the active icon covers it: invisible for this design's icons,
  // which share one shape, and it keeps an outline that sticks out past a filled icon from
  // lingering. Reduce motion makes the whole change instant (tabcnTiming).
  const inactive = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.8, 1], [1, 0], 'clamp'),
  }));
  const active = useAnimatedStyle(() => ({ opacity: progress.value }));

  // The badge dot fades in and out (no scale pop). It stays mounted so it can fade out.
  const hasBadge = tab.badge != null;
  const badgeOpacity = useSharedValue(hasBadge ? 1 : 0);
  useEffect(() => {
    badgeOpacity.value = withTiming(hasBadge ? 1 : 0, tabcnTiming);
  }, [hasBadge, badgeOpacity]);
  const badge = useAnimatedStyle(() => ({ opacity: badgeOpacity.value }));
  const count = tab.badge == null ? '' : String(tab.badge).trim();

  return (
    <TabButton
      tab={tab}
      style={styles.tab}
      onPressIn={haptics ? () => Haptics.selectionAsync() : undefined}
    >
      <View style={styles.iconBox}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.center, inactive]}>
          {tab.renderIcon?.({ focused: false, color: colors.inactive, size: 26 })}
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, styles.center, active]}>
          {tab.renderIcon?.({ focused: true, color: colors.active, size: 26 })}
        </Animated.View>
        <Animated.View
          pointerEvents="none"
          style={[
            count === '' ? styles.badge : styles.count,
            { backgroundColor: colors.badge, borderColor: colors.background },
            badge,
          ]}
        >
          {/* A number or text shows as a count; an empty badge stays a dot. */}
          {count === '' ? null : typeof tab.badge === 'number' ? (
            <BadgeCount
              value={tab.badge}
              textStyle={[styles.countText, { color: colors.badgeText }]}
            />
          ) : (
            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={1.3}
              style={[styles.countText, { color: colors.badgeText }]}
            >
              {count}
            </Text>
          )}
        </Animated.View>
      </View>
    </TabButton>
  );
}

/** `color` at `alpha` opacity (React Native's parser, so any colour format works). */
function withAlpha(color: string, alpha: number): string {
  const v = processColor(color);
  if (typeof v !== 'number') return color;
  return `rgba(${(v >>> 16) & 255}, ${(v >>> 8) & 255}, ${v & 255}, ${alpha})`;
}

const styles = StyleSheet.create({
  // Docked like the app it comes from: full width and flush with the bottom edge, with the
  // background running under the home indicator. Side padding keeps the reference's tab spacing.
  dock: {
    paddingHorizontal: 16,
  },
  bar: {
    height: 45,
    alignItems: 'stretch',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBox: {
    width: 30,
    height: 30,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -3,
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
  },
  count: {
    position: 'absolute',
    top: -6,
    left: 15,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: { fontSize: 10, lineHeight: 12, fontWeight: '700' },
});
