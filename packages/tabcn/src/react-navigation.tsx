import {
  BottomTabBarHeightCallbackContext,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { type ReactElement, type ReactNode, use, useCallback, useMemo, useState } from 'react';

import { useAdapterBridge } from './adapter-bridge';
import { buildTabBarState, type TabOptionsLike } from './build-state';
import { useOverrideSlot } from './override';
import { TabBarStateProvider } from './state';

const noop = () => {};

function ReactNavigationTabBar({ nav, children }: { nav: BottomTabBarProps; children: ReactNode }) {
  const onHeightChange = use(BottomTabBarHeightCallbackContext);
  const { state, descriptors, navigation, insets } = nav;

  const value = useMemo(
    () =>
      buildTabBarState({
        routes: state.routes,
        focusedIndex: state.index,
        getOptions: (route) => (descriptors[route.key]?.options ?? {}) as TabOptionsLike,
        insets,
        reportHeight: onHeightChange ?? noop,
        emitPress: (route) =>
          navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true })
            .defaultPrevented,
        emitLongPress: (route) => {
          navigation.emit({ type: 'tabLongPress', target: route.key });
        },
        navigate: (route) => {
          const full = state.routes.find((r) => r.key === route.key);
          navigation.navigate({ name: route.name, params: full?.params, merge: true } as never);
        },
      }),
    [state, descriptors, navigation, insets, onHeightChange],
  );

  const isFocused = useCallback(() => navigation.isFocused(), [navigation]);
  useAdapterBridge(state, isFocused);

  return <TabBarStateProvider value={value}>{children}</TabBarStateProvider>;
}

/**
 * Turns a tabcn design into the `tabBar` prop of React Navigation's bottom tab navigator.
 *
 * ```tsx
 * <Tab.Navigator tabBar={tabBar(<SlidingCapsule />)} />
 * ```
 */
export function tabBar(element: ReactElement): (props: BottomTabBarProps) => ReactNode {
  return (props) => <ReactNavigationTabBar nav={props}>{element}</ReactNavigationTabBar>;
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
