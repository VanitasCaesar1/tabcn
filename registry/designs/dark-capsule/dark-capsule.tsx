/**
 * Dark Capsule: a dark bar with icons only; an outlined capsule slides behind
 * the active tab.
 * Changed from the reference for clarity: the capsule is lighter (#232327, outline #4a4a50)
 * than the reference's faint #1c1c1f and #38383d, so the active tab reads at a glance.
 * Glass is opt-in: `material="glass"` (or `"auto"`) turns the bar into dark Liquid Glass on
 * iOS 26 (expo-glass-effect), under the same capsule; the default stays the solid bar.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { type LayoutChangeEvent, processColor, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  interpolate,
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
  background: '#0e0e10',
  /**
   * The capsule that slides behind the active tab. Lighter than the reference's #1c1c1f so
   * the active tab stands out from the bar.
   */
  capsule: '#232327',
  /** The capsule's 1 pt outline. Lighter than the reference's #38383d, for the same reason. */
  capsuleBorder: '#4a4a50',
  /** The active tab's icon. */
  active: '#ffffff',
  /** The other tabs' icons. */
  inactive: '#8a8a90',
  /** The badge dot; it is ringed in `background`. */
  badge: '#ff453a',
  /**
   * Tint over the Liquid Glass (iOS 26), when `material` asks for glass. Unset, `background`
   * at 60%, so the light icons keep their contrast over light screens (the glass follows what
   * is behind it); `'transparent'` for clear glass.
   */
  glassTint: undefined as string | undefined,
};

export type DarkCapsuleColors = typeof defaultColors;

export interface DarkCapsuleProps {
  colors?: Partial<DarkCapsuleColors>;
  /**
   * The bar's surface: `'solid'` (the near-black bar it copies), `'glass'` (Liquid Glass, iOS 26),
   * or `'auto'` (glass where the system has it, solid elsewhere). Default `'solid'`.
   */
  material?: 'auto' | 'glass' | 'solid';
  /** Light haptic tick on press. Default true. */
  haptics?: boolean;
}

export function DarkCapsule({
  colors: custom,
  material = 'solid',
  haptics = true,
}: DarkCapsuleProps) {
  const colors = { ...defaultColors, ...custom };
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
        <Row colors={colors} haptics={haptics} />
      </TabList>
    </TabBarRoot>
  );
}

/** The capsule and the tabs, under `TabList`, sharing one indicator: the icons' colour follows it. */
function Row({ colors, haptics }: { colors: DarkCapsuleColors; haptics: boolean }) {
  const { tabs, activeIndex } = useTabBar();
  // The capsule is its measured size (a tab less 11 pt a side, on a 402 pt phone with five
  // tabs), centred on the tab and narrower only where the tab is: sized from the tab, it became a
  // slab with two tabs or on an iPad, and narrower than the icon with seven.
  const indicator = useTabIndicator({ inset: { x: 0, y: 12.5 } });
  const previous = useMovingBetween(activeIndex);
  return (
    <>
      <Animated.View pointerEvents="none" style={[indicator.style, styles.capsuleSlot]}>
        <View
          style={[
            styles.capsule,
            { backgroundColor: colors.capsule, borderColor: colors.capsuleBorder },
          ]}
        />
      </Animated.View>
      {tabs.map((tab) => (
        <Tab
          key={tab.key}
          tab={tab}
          colors={colors}
          haptics={haptics}
          indicator={indicator}
          moving={tab.index === activeIndex || tab.index === previous}
          activeIndex={activeIndex}
        />
      ))}
    </>
  );
}

function Tab({
  tab,
  colors,
  haptics,
  indicator,
  moving,
  activeIndex,
}: {
  tab: TabItem;
  colors: DarkCapsuleColors;
  haptics: boolean;
  indicator: IndicatorFrame;
  moving: boolean;
  activeIndex: number;
}) {
  const focus = useFocusProgress(tab);
  const { coverage: progress, onLayout } = useCoverage(indicator, moving, activeIndex, focus);
  // Colour-only change: the inactive glyph stays fully opaque underneath while the active
  // glyph fades in on top, then drops out over the last stretch so the active glyph rests
  // alone (no grey outline or fringe left under a filled icon). Fading both layers against
  // each other would dip the glyph darker mid-change and dim an icon that ignores `color`.
  const inactive = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.8, 1], [1, 0], 'clamp'),
  }));
  const active = useAnimatedStyle(() => ({ opacity: progress.value }));
  return (
    <TabButton
      tab={tab}
      style={styles.tab}
      onLayout={onLayout}
      onPressIn={haptics ? () => Haptics.selectionAsync() : undefined}
    >
      <View style={styles.iconBox}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.center, inactive]}>
          {tab.renderIcon?.({ focused: false, color: colors.inactive, size: 26 })}
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, styles.center, active]}>
          {tab.renderIcon?.({ focused: true, color: colors.active, size: 26 })}
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

/** The capsule's width, as measured. */
const CAPSULE = 52;

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
  bar: { height: 62 },
  capsuleSlot: { alignItems: 'center' },
  capsule: { width: CAPSULE, maxWidth: '100%', height: '100%', borderRadius: 999, borderWidth: 1 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  iconBox: { width: 30, height: 30 },
  center: { alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: -2,
    right: -3,
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
  },
});
