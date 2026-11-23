import { useFocusEffect, useNavigation } from 'expo-router';
import { BottomTabBarHeightCallbackContext, type BottomTabBarProps } from 'expo-router/js-tabs';
import { type ReactElement, type ReactNode, use, useCallback, useState } from 'react';

import { SafeAreaFrameContext } from 'react-native-safe-area-context';

import { useAdapterBridge } from './adapter-bridge';
import { type TabOptionsLike, useTabBarStateValue } from './build-state';
import { useOverrideSlot } from './override';
import { ScreenFrameContext } from './screen-frame';
import { TabBarStateProvider } from './state';

const noop = () => {};

function ExpoRouterTabBar({ nav, children }: { nav: BottomTabBarProps; children: ReactNode }) {
  const onHeightChange = use(BottomTabBarHeightCallbackContext);
  const { state, descriptors, emitter, navigateToTab, insets } = nav;

  // Kept the same object across navigator renders that change nothing it reads.
  const value = useTabBarStateValue({
    routes: state.routes,
    focusedIndex: state.index,
    getOptions: (route) => (descriptors[route.key]?.options ?? {}) as TabOptionsLike,
    insets,
    reportHeight: onHeightChange ?? noop,
    emitPress: (route) =>
      emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true })
        .defaultPrevented,
    emitLongPress: (route) => {
      emitter.emit({ type: 'tabLongPress', target: route.key });
    },
    navigate: (route) => navigateToTab(route.key),
  });

  const navigation = useNavigation();
  const isFocused = useCallback(
    () => (typeof navigation.isFocused === 'function' ? navigation.isFocused() : true),
    [navigation],
  );
  useAdapterBridge(state, isFocused, navigation);

  // Sheets size themselves from the screen's frame, which the navigator's safe-area
  // provider measures.
  const frame = use(SafeAreaFrameContext);

  return (
    <ScreenFrameContext value={frame}>
      <TabBarStateProvider value={value}>{children}</TabBarStateProvider>
    </ScreenFrameContext>
  );
}

/**
 * Turns a tabcn design into the `tabBar` prop of Expo Router's `<Tabs>`.
 *
 * ```tsx
 * <Tabs tabBar={tabBar(<SlidingCapsule />)} />
 * ```
 */
export function tabBar(element: ReactElement): (props: BottomTabBarProps) => ReactNode {
  return (props) => <ExpoRouterTabBar nav={props}>{element}</ExpoRouterTabBar>;
}

/**
 * Replaces the tab bar's tabs with `element` while the calling screen is focused, in the
 * bar's own place and container, crossfading in and out. Pass `null` to show the tabs.
 * The tabs stay mounted, hidden from screen readers, and navigation is unchanged.
 * Needs a `TabBarProvider` around the navigator.
 *
 * ```tsx
 * useTabBarOverride(<ContextTray label="Exploring" onClose={() => router.back()} />);
 * ```
 */
export function useTabBarOverride(element: ReactNode | null): void {
  const [focused, setFocused] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  useOverrideSlot(element, focused);
}
