import {
  BottomTabBarHeightCallbackContext,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { type ReactElement, type ReactNode, use, useCallback, useState } from 'react';

import { SafeAreaFrameContext } from 'react-native-safe-area-context';

import { useAdapterBridge } from './adapter-bridge';
import { type TabOptionsLike, useTabBarStateValue } from './build-state';
import { useOverrideSlot } from './override';
import { ScreenFrameContext } from './screen-frame';
import { TabBarStateProvider } from './state';

const noop = () => {};

function ReactNavigationTabBar({ nav, children }: { nav: BottomTabBarProps; children: ReactNode }) {
  const onHeightChange = use(BottomTabBarHeightCallbackContext);
  const { state, descriptors, navigation, insets } = nav;

  // Kept the same object across navigator renders that change nothing it reads.
  const value = useTabBarStateValue({
    routes: state.routes,
    focusedIndex: state.index,
    getOptions: (route) => (descriptors[route.key]?.options ?? {}) as TabOptionsLike,
    insets,
    reportHeight: onHeightChange ?? noop,
    emitPress: (route) => {
      // As React Navigation's own bar does: a press on the focused tab says whether it
      // scrolls to top and pops to top (`tabBarRepeatedPressBehavior`).
      const focused = state.routes[state.index]?.key === route.key;
      const repeat = (
        descriptors[route.key]?.options as {
          tabBarRepeatedPressBehavior?: { scrollToTop?: boolean; popToTop?: boolean };
        }
      )?.tabBarRepeatedPressBehavior;
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
        data: {
          behavior: {
            scrollToTop: focused && repeat?.scrollToTop !== false,
            popToTop: focused && repeat?.popToTop !== false,
          },
        },
      } as never) as unknown as { defaultPrevented: boolean };
      return event.defaultPrevented;
    },
    emitLongPress: (route) => {
      navigation.emit({ type: 'tabLongPress', target: route.key });
    },
    navigate: (route) => {
      const full = state.routes.find((r) => r.key === route.key);
      navigation.navigate({ name: route.name, params: full?.params, merge: true } as never);
    },
  });

  const isFocused = useCallback(() => navigation.isFocused(), [navigation]);
  // The helpers carry the parent screen's `addListener`, which emits its focus and blur.
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
