import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';

import type { Insets, TabBarState, TabIconProps, TabItem } from './state';

/** The subset of bottom-tab screen options tabcn reads. Both navigators' options satisfy it. */
export interface TabOptionsLike {
  title?: string;
  tabBarLabel?: unknown;
  tabBarIcon?: (props: { focused: boolean; color: string; size: number }) => ReactNode;
  tabBarBadge?: string | number;
  tabBarAccessibilityLabel?: string;
  tabBarButtonTestID?: string;
  tabBarHideOnKeyboard?: boolean;
  tabBarItemStyle?: unknown;
  /** Set by Expo Router for `href: null`. */
  hidden?: boolean;
}

export interface RouteLike {
  key: string;
  name: string;
}

interface BuildInput {
  routes: readonly RouteLike[];
  focusedIndex: number;
  getOptions: (route: RouteLike) => TabOptionsLike;
  insets: Insets;
  reportHeight: (height: number) => void;
  /** Emits `tabPress` and returns whether a listener called `preventDefault()`. */
  emitPress: (route: RouteLike) => boolean;
  emitLongPress: (route: RouteLike) => void;
  navigate: (route: RouteLike) => void;
}

function isHidden(options: TabOptionsLike): boolean {
  if (options.hidden) return true;
  // React Navigation convention for hiding a tab.
  const style = StyleSheet.flatten(options.tabBarItemStyle as never) as
    | { display?: string }
    | undefined;
  return style?.display === 'none';
}

function resolveLabel(options: TabOptionsLike, route: RouteLike): string {
  if (typeof options.tabBarLabel === 'string') return options.tabBarLabel;
  if (typeof options.title === 'string') return options.title;
  return route.name;
}

/** Converts navigator data into a `TabBarState`. Shared by both adapters. */
export function buildTabBarState(input: BuildInput): TabBarState {
  const focusedRoute = input.routes[input.focusedIndex];
  const focusedOptions = focusedRoute ? input.getOptions(focusedRoute) : {};
  const tabs: TabItem[] = [];
  let activeIndex = -1;

  for (const route of input.routes) {
    const options = input.getOptions(route);
    if (isHidden(options)) continue;
    const focused = route === focusedRoute;
    const index = tabs.length;
    if (focused) activeIndex = index;
    const icon = options.tabBarIcon;
    tabs.push({
      key: route.key,
      routeName: route.name,
      index,
      focused,
      label: resolveLabel(options, route),
      accessibilityLabel: options.tabBarAccessibilityLabel,
      testID: options.tabBarButtonTestID,
      badge: options.tabBarBadge,
      renderIcon: icon ? (props: TabIconProps) => icon(props) : undefined,
      press: () => {
        const prevented = input.emitPress(route);
        if (!focused && !prevented) input.navigate(route);
      },
      longPress: () => input.emitLongPress(route),
    });
  }

  return {
    tabs,
    activeIndex,
    insets: input.insets,
    hideOnKeyboard: focusedOptions.tabBarHideOnKeyboard ?? false,
    reportHeight: input.reportHeight,
  };
}
