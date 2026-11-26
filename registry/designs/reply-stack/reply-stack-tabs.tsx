/**
 * Reply Stack's tabs: the lens behind the pressed or active tab, and each tab's icon with its
 * badge. The bar that lays them out is in `reply-stack.tsx`.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';
import { I18nManager, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  ReduceMotion,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {
  BadgeCount,
  TabButton,
  type TabItem,
  tabcnSpring,
  useFocusProgress,
} from 'react-native-tabcn';
import type { ReplyStackColors } from './reply-stack';
import { Lens, type Tint } from './reply-stack-glass';

/**
 * The lens behind the pressed or active tab. It glides on tabcnSpring to each new tab and
 * stretches as it sets off, like a drop of glass, settling round as it lands: up to 14% wider
 * and 5% flatter in 110 ms, then springing back while the glide finishes. It fades as the bar
 * minimizes (the circle is its own glass), and it appears in place, without a glide, after no
 * tab was active.
 */
export function SlidingLens({
  index,
  left,
  width,
  height,
  top,
  minimized,
  colors,
  tint,
}: {
  index: number;
  left: number;
  width: number;
  height: number;
  /** From the pill's top edge. */
  top: number;
  minimized: SharedValue<number>;
  colors: ReplyStackColors;
  tint: Tint;
}) {
  const x = useSharedValue(left);
  const stretch = useSharedValue(0);
  const shown = useSharedValue(index >= 0 ? 1 : 0);
  const last = useRef({ index, left });
  useEffect(() => {
    const from = last.current;
    last.current = { index, left };
    if (index < 0) {
      shown.value = 0;
      return;
    }
    if (from.index < 0 || shown.value === 0) {
      x.value = left;
      shown.value = 1;
      return;
    }
    if (from.left === left) return;
    x.value = withSpring(left, tabcnSpring);
    // Only a move to another tab stretches it; a resize (rotation) just glides.
    if (from.index !== index) {
      stretch.value = withSequence(withTiming(1, STRETCH_OUT), withSpring(0, STRETCH_BACK));
    }
  }, [index, left, x, stretch, shown]);
  const style = useAnimatedStyle(() => ({
    opacity: shown.value * (1 - minimized.value),
    transform: [
      { translateX: x.value },
      { scaleX: 1 + 0.14 * stretch.value },
      { scaleY: 1 - 0.05 * stretch.value },
    ],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.lens,
        PHYSICAL_LEFT,
        { top, width, height },
        tint === 'light' ? styles.lensLift : null,
        style,
      ]}
    >
      <Lens colors={colors} width={width} height={height} />
    </Animated.View>
  );
}

/**
 * A tab: its outline icon, swapped for the solid form as the tab gains focus. X swaps them in a
 * frame or two, so the crossfade is the short middle stretch of the focus change. The tab dips as
 * the finger lands (TabButton's press scale). As the bar minimizes, every icon but the kept one
 * gathers into it and fades.
 */
export function Tab({
  tab,
  colors,
  haptics,
  kept,
  gather,
  minimized,
  focusable,
  onPressIn,
  onPressOut,
}: {
  tab: TabItem;
  colors: ReplyStackColors;
  haptics: boolean;
  /** The tab the minimized circle keeps. */
  kept: boolean;
  /** Points from this tab's centre to the kept tab's, physical. */
  gather: number;
  minimized: SharedValue<number>;
  /** Reachable by the keyboard (the web): not while the minimized circle covers it. */
  focusable: boolean;
  onPressIn: () => void;
  onPressOut: () => void;
}) {
  const progress = useFocusProgress(tab);
  const outline = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [SWAP_FROM, SWAP_TO], [1, 0], 'clamp'),
  }));
  const solid = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [SWAP_FROM, SWAP_TO], [0, 1], 'clamp'),
  }));
  const gathering = useAnimatedStyle(() => ({
    opacity: kept ? 1 : 1 - Math.min(1, minimized.value * 1.6),
    transform: [{ translateX: kept ? 0 : minimized.value * gather }],
  }));
  return (
    <TabButton
      tab={tab}
      scale={0.88}
      style={styles.tab}
      focusable={focusable}
      onPressIn={() => {
        // No tick for the tab that's already active: nothing changes.
        if (haptics && !tab.focused) Haptics.selectionAsync();
        onPressIn();
      }}
      onPressOut={onPressOut}
    >
      <Animated.View style={gathering}>
        {tab.renderIcon ? (
          <View>
            <Animated.View style={outline}>
              {tab.renderIcon({ focused: false, color: colors.foreground, size: ICON })}
            </Animated.View>
            <Animated.View style={[StyleSheet.absoluteFill, solid]}>
              {tab.renderIcon({ focused: true, color: colors.active, size: ICON })}
            </Animated.View>
            <Badge badge={tab.badge} colors={colors} />
          </View>
        ) : (
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
            style={[styles.fallback, { color: colors.foreground }]}
          >
            {tab.label}
          </Text>
        )}
      </Animated.View>
    </TabButton>
  );
}

/**
 * A badge at the icon's top right, drawn only when the tab sets one: an empty badge ('') is a
 * dot, a number a count. Hidden from screen readers: `TabButton` reads it with the label.
 */
function Badge({ badge, colors }: { badge: TabItem['badge']; colors: ReplyStackColors }) {
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
        <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={[textStyle, styles.badgeCap]}>
          {text}
        </Text>
      )}
    </View>
  );
}

/** Tab icons: the glyphs fill about 23 pt of it. */
const ICON = 31;
/** Focus progress over which a tab's outline icon swaps for its solid one. */
const SWAP_FROM = 0.35;
const SWAP_TO = 0.6;

/**
 * The tabs and the lens are placed by physical offsets from the pill's left edge, but in a
 * right-to-left layout React Native reads `left` as the start edge, the right, unless the app
 * turned that swap off. Pin them to the physical left either way.
 */
export const PHYSICAL_LEFT =
  I18nManager.isRTL && (I18nManager.getConstants?.().doLeftAndRightSwapInRTL ?? true)
    ? { right: 0 }
    : { left: 0 };

const STRETCH_OUT = {
  duration: 110,
  easing: Easing.out(Easing.quad),
  reduceMotion: ReduceMotion.System,
};
const STRETCH_BACK = { duration: 380, dampingRatio: 0.75, reduceMotion: ReduceMotion.System };

const styles = StyleSheet.create({
  lens: { position: 'absolute', borderRadius: 999 },
  lensLift: { boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fallback: { fontSize: 12, fontWeight: '600' },
  badgeCap: { maxWidth: 56 },
  dot: { position: 'absolute', top: 1, right: 0, width: 9, height: 9, borderRadius: 5 },
  count: {
    position: 'absolute',
    top: -3,
    left: ICON - 10,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 10.5, lineHeight: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
