import { BottomTabBarHeightCallbackContext, type BottomTabBarProps } from 'expo-router/js-tabs';
import { type ReactElement, type ReactNode, use, useMemo } from 'react';

import { buildTabBarState, type TabOptionsLike } from './build-state';
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
