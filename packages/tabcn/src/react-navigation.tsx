import {
  BottomTabBarHeightCallbackContext,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import { type ReactElement, type ReactNode, use, useMemo } from 'react';

import { buildTabBarState, type TabOptionsLike } from './build-state';
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
