/**
 * Minimize on scroll: a screen's scroll shrinks the bar to its compact form.
 * Spec: docs/designs/motion-and-rail.md.
 */
import { useCallback, useEffect, useRef } from 'react';
import {
  type SharedValue,
  useAnimatedScrollHandler,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { tabcnTiming } from './motion';
import { useTabBarProvider } from './provider';

/**
 * A scroll handler for `Animated.ScrollView` / `Animated.FlatList` (`onScroll={handler}`)
 * that minimizes the bar after the content scrolls down by `threshold` points (default 24),
 * and restores it after an upward scroll of the same distance or on reaching the top.
 * Scrolling past the end (bounce) is ignored, and so is the scroll a content-size change
 * causes (such as padding that follows the bar's height). The bar also comes back when the
 * focused tab or screen changes. It does nothing without a `TabBarProvider`, or while no
 * `TabBarRoot` has `minimizeBehavior="onScrollDown"`.
 */
export function useMinimizeOnScroll(options: { threshold?: number } = {}) {
  const { threshold = 24 } = options;
  const minimize = useTabBarProvider()?.minimize;
  const localProgress = useSharedValue(0);
  const localTarget = useSharedValue(0);
  const localEnabled = useSharedValue(false);
  const progress = minimize?.progress ?? localProgress;
  const target = minimize?.target ?? localTarget;
  const enabled = minimize?.enabled ?? localEnabled;
  // Offset where the current scroll direction started.
  const turn = useSharedValue(0);
  // Content height at the previous event; -1 before the first.
  const contentHeight = useSharedValue(-1);

  return useAnimatedScrollHandler({
    onScroll: (event) => {
      'worklet';
      const y = event.contentOffset.y;
      const set = (to: number) => {
        if (target.value === to) return;
        target.value = to;
        progress.value = withTiming(to, tabcnTiming);
      };
      const size = event.contentSize.height;
      const resized = contentHeight.value !== -1 && contentHeight.value !== size;
      contentHeight.value = size;
      if (!enabled.value) {
        turn.value = y;
        return;
      }
      if (y <= 0) {
        turn.value = 0;
        set(0);
        return;
      }
      if (resized) {
        // A content-size change moves the offset by itself (the scroll view clamps it);
        // that is not the user scrolling, so start counting again from here.
        turn.value = y;
        return;
      }
      const end = size - event.layoutMeasurement.height;
      if (y > end) return;
      if (target.value === 0) {
        if (y < turn.value) turn.value = y;
        else if (y - turn.value >= threshold) {
          set(1);
          turn.value = y;
        }
      } else if (y > turn.value) turn.value = y;
      else if (turn.value - y >= threshold) {
        set(0);
        turn.value = y;
      }
    },
  });
}

/**
 * How minimized the bar is: 0 (full) to 1 (minimized), animated with `tabcnTiming`. Designs
 * decide what compact means (labels fade, the pill narrows). Always 0 without a
 * `TabBarProvider`.
 */
export function useTabBarMinimized(): SharedValue<number> {
  const minimize = useTabBarProvider()?.minimize;
  const fallback = useSharedValue(0);
  return minimize?.progress ?? fallback;
}

/**
 * Returns a function that brings a minimized bar back to full, as iOS 26 does when the
 * minimized bar is tapped. It doesn't switch tabs; scrolling down again minimizes the bar
 * again. With "reduce motion" on the change is instant. Does nothing without a
 * `TabBarProvider` or while the bar is already full.
 *
 * ```tsx
 * const restore = useRestoreTabBar();
 * <Pressable onPress={restore} accessibilityLabel="Show tab bar" />
 * ```
 */
export function useRestoreTabBar(): () => void {
  const minimize = useTabBarProvider()?.minimize;
  return useCallback(() => {
    if (minimize) restore(minimize);
  }, [minimize]);
}

/** Sends the bar back to full: the same path for a tap and for a focus change. */
function restore(minimize: { target: SharedValue<number>; progress: SharedValue<number> }) {
  if (minimize.target.value === 0 && minimize.progress.value === 0) return;
  minimize.target.value = 0;
  minimize.progress.value = withTiming(0, tabcnTiming);
}

/**
 * Restores a minimized bar when `key` (the focused tab or route) changes: the screen now
 * focused may have no scroll handler, or sit at its top where no scroll event comes to
 * restore it. Internal: used by `TabBarRoot` and both adapters.
 */
export function useRestoreOnFocusChange(key: string | undefined) {
  const minimize = useTabBarProvider()?.minimize;
  const last = useRef(key);
  useEffect(() => {
    if (last.current === key) return;
    last.current = key;
    if (minimize) restore(minimize);
  }, [key, minimize]);
}
