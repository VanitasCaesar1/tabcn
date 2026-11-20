import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
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

export interface TabIndicatorOptions {
  /** Shrinks the indicator inside the tab's frame on every side. Default 0. */
  inset?: number;
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
 * `TabList`. Jumps into place on the first layout, springs after that.
 */
export function useTabIndicator(options: TabIndicatorOptions = {}): TabIndicatorValues {
  const { inset = 0, spring = tabcnSpring } = options;
  const { activeIndex } = useTabBar();
  const { frames } = useTabListContext('useTabIndicator');
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const width = useSharedValue(0);
  const height = useSharedValue(0);
  const ready = useSharedValue(false);

  useAnimatedReaction(
    () => frames.value[activeIndex],
    (frame) => {
      if (!frame) return;
      const next = {
        x: frame.x + inset,
        y: frame.y + inset,
        width: Math.max(0, frame.width - inset * 2),
        height: Math.max(0, frame.height - inset * 2),
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
    [activeIndex, inset, spring],
  );

  const style = useAnimatedStyle(() => ({
    position: 'absolute',
    left: 0,
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
