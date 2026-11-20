/**
 * tabcn/gestures: dragging for panels. A separate entry point because it imports
 * react-native-gesture-handler, an optional peer: apps that don't drag never load it.
 * Spec: docs/designs/panels.md.
 */
import { type ReactNode, useMemo, useSyncExternalStore } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS, useSharedValue, withSpring } from 'react-native-reanimated';

import { tabcnSpring } from './motion';
import { useTabBarProvider } from './provider';

/** Release speed (points per second) above which a flick moves to the next state. */
const FLICK_VELOCITY = 800;
const noopSubscribe = () => () => {};

/**
 * Makes its children a drag handle for the panel `panel`. While dragging, the panel follows
 * the finger; on release it settles on the nearer of its resting state and open, or moves
 * in the flick's direction when released fast. Settling uses `tabcnSpring` (no overshoot).
 * Needs `react-native-gesture-handler` and a `GestureHandlerRootView` around the app.
 */
export function PanelDragArea({ panel, children }: { panel: string; children?: ReactNode }) {
  const store = useTabBarProvider()?.store;
  const handle = useSyncExternalStore(
    store?.subscribe ?? noopSubscribe,
    () => store?.getHandle(panel),
    () => undefined,
  );
  const start = useSharedValue(0);

  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .activeOffsetY([-8, 8])
      .failOffsetX([-16, 16])
      .withTestId(`tabcn-drag-${panel}`);
    if (!handle) return pan.enabled(false);
    const { visible, openVisible, restVisible, settle } = handle;
    return pan
      .onStart(() => {
        'worklet';
        start.value = visible.value;
      })
      .onUpdate((e) => {
        'worklet';
        const next = start.value - e.translationY;
        visible.value = Math.min(openVisible.value, Math.max(0, next));
      })
      .onEnd((e) => {
        'worklet';
        const toOpen =
          Math.abs(e.velocityY) > FLICK_VELOCITY
            ? e.velocityY < 0
            : Math.abs(openVisible.value - visible.value) <
              Math.abs(visible.value - restVisible.value);
        visible.value = withSpring(toOpen ? openVisible.value : restVisible.value, tabcnSpring);
        runOnJS(settle)(toOpen);
      });
  }, [handle, start, panel]);

  return (
    <GestureDetector gesture={gesture}>
      <View collapsable={false}>{children}</View>
    </GestureDetector>
  );
}
