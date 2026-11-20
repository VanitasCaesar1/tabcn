import { useFocusEffect, useNavigation } from 'expo-router';
import { BottomTabBarHeightCallbackContext, type BottomTabBarProps } from 'expo-router/js-tabs';
import { type ReactElement, type ReactNode, use, useCallback, useMemo, useState } from 'react';

import { useAdapterBridge } from './adapter-bridge';
import { buildTabBarState, type TabOptionsLike } from './build-state';
import { useOverrideSlot } from './override';
import { TabBarStateProvider } from './state';

const noop = () => {};

function ExpoRouterTabBar({ nav, children }: { nav: BottomTabBarProps; children: ReactNode }) {
  const onHeightChange = use(BottomTabBarHeightCallbackContext);
  const { state, descriptors, emitter, navigateToTab, insets } = nav;

  const value = useMemo(
    () =>
      buildTabBarState({
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
      }),
    [state, descriptors, emitter, navigateToTab, insets, onHeightChange],
  );

  const navigation = useNavigation();
  const isFocused = useCallback(
    () => (typeof navigation.isFocused === 'function' ? navigation.isFocused() : true),
    [navigation],
  );
  useAdapterBridge(state, isFocused);

  return <TabBarStateProvider value={value}>{children}</TabBarStateProvider>;
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
