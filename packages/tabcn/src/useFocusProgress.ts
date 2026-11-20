import { useEffect } from 'react';
import {
  type SharedValue,
  useSharedValue,
  type WithTimingConfig,
  withTiming,
} from 'react-native-reanimated';

import { tabcnTiming } from './motion';
import type { TabItem } from './state';

/** Animated 0 → 1 as `tab` becomes focused, 1 → 0 as it loses focus. */
export function useFocusProgress(
  tab: TabItem,
  timing: WithTimingConfig = tabcnTiming,
): SharedValue<number> {
  const progress = useSharedValue(tab.focused ? 1 : 0);
  useEffect(() => {
    progress.value = withTiming(tab.focused ? 1 : 0, timing);
  }, [tab.focused, progress, timing]);
  return progress;
}
