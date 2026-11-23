import type { ReactNode } from 'react';
import { I18nManager, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  type SharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  type WithSpringConfig,
  withSpring,
} from 'react-native-reanimated';

import { tabcnSpring } from './motion';
import { useTabBar } from './state';
import { useTabListContext } from './TabList';

/**
 * Tab frames are physical (measured from the left edge), but in a right-to-left layout React
 * Native reads `left` as the start edge, the right, unless the app turned that swap off. Pin the
 * indicator to the physical left either way, so `translateX` by a frame's `x` lands on the tab.
 */
export function physicalLeft(): { left: 0 } | { right: 0 } {
  const swaps = I18nManager.getConstants?.().doLeftAndRightSwapInRTL ?? true;
  return I18nManager.isRTL && swaps ? { right: 0 } : { left: 0 };
}

export interface TabIndicatorOptions {
  /** Shrinks the indicator inside the tab's frame: one value for every side, or `{ x, y }`. Default 0. */
  inset?: number | { x: number; y: number };
  spring?: WithSpringConfig;
}

export interface TabIndicatorValues {
  x: SharedValue<number>;
  y: SharedValue<number>;
  width: SharedValue<number>;
  height: SharedValue<number>;
  /** False until the active tab has been measured once. */
  ready: SharedValue<boolean>;
  /** Absolute position, size and opacity that follow the active tab. */
  style: ReturnType<typeof useAnimatedStyle>;
}

/**
 * Animated values that follow the active tab's frame inside the enclosing
 * `TabList`. Jumps into place on the first layout, springs after that. Inside a `TabScrub`
 * (tabcn/gestures) they follow the finger while it slides along the bar, then settle on the
 * tab it lifted on.
 */
export function useTabIndicator(options: TabIndicatorOptions = {}): TabIndicatorValues {
  const { inset = 0, spring = tabcnSpring } = options;
  const insetX = typeof inset === 'number' ? inset : inset.x;
  const insetY = typeof inset === 'number' ? inset : inset.y;
  const { activeIndex } = useTabBar();
  const { frames, scrub } = useTabListContext('useTabIndicator');
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const width = useSharedValue(0);
  const height = useSharedValue(0);
  const ready = useSharedValue(false);

  useAnimatedReaction(
    // While scrubbing, the frame under the finger; otherwise the active tab's.
    () => scrub?.value ?? frames.value[activeIndex],
    (frame) => {
      if (!frame) {
        // No active tab (a hidden route is focused): forget the old place, so the next tab's
        // indicator appears there instead of springing over from the stale one.
        if (activeIndex < 0) ready.value = false;
        return;
      }
      const next = {
        x: frame.x + insetX,
        y: frame.y + insetY,
        width: Math.max(0, frame.width - insetX * 2),
        height: Math.max(0, frame.height - insetY * 2),
      };
      if (!ready.value) {
        x.value = next.x;
        y.value = next.y;
        width.value = next.width;
        height.value = next.height;
        ready.value = true;
        return;
      }
      x.value = withSpring(next.x, spring);
      y.value = withSpring(next.y, spring);
      width.value = withSpring(next.width, spring);
      height.value = withSpring(next.height, spring);
    },
  );

  const edge = physicalLeft();
  const style = useAnimatedStyle(() => ({
    position: 'absolute',
    ...edge,
    top: 0,
    width: width.value,
    height: height.value,
    opacity: ready.value && activeIndex >= 0 ? 1 : 0,
    transform: [{ translateX: x.value }, { translateY: y.value }],
  }));

  return { x, y, width, height, ready, style };
}

export interface TabIndicatorProps extends TabIndicatorOptions {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

/** A view that sits behind the active tab and slides to the next one. Render inside `TabList`. */
export function TabIndicator({ style, children, ...options }: TabIndicatorProps) {
  const indicator = useTabIndicator(options);
  return (
    <Animated.View pointerEvents="none" style={[indicator.style, style]}>
      {children}
    </Animated.View>
  );
}
