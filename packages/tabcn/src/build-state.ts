import { createElement, type ReactNode } from 'react';
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
  tabBarPosition?: string;
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
      // The route's name, not its key: Expo Router gives a tab's route a new key the first time
      // the tab is visited, and a design keyed on that remounts the tab, so its focus animation
      // jumps to the end. Names are unique within a tab navigator and never change.
      key: route.name,
      routeName: route.name,
      index,
      focused,
      label: resolveLabel(options, route),
      accessibilityLabel: options.tabBarAccessibilityLabel,
      testID: options.tabBarButtonTestID,
      badge: normalizeBadge(options.tabBarBadge),
      // In a component of its own, keyed by tab: an icon that uses hooks (any icon compiled by
      // React Compiler does) then keeps its own state wherever a design draws it, even in one
      // slot that shows whichever tab is active.
      renderIcon: icon
        ? (props: TabIconProps) => createElement(TabIcon, { key: route.name, icon, props })
        : undefined,
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
    position: focusedOptions.tabBarPosition === 'left' ? 'left' : 'bottom',
  };
}

/**
 * A count written as a string ("12", as navigators often pass it) becomes a number, so designs
 * draw it as a count (capped at 99+, digits rolling) rather than as text; a number that isn't a
 * count (NaN, negative, infinite) is dropped instead of shown as "NaN" or "-3".
 */
function normalizeBadge(badge: string | number | undefined): string | number | undefined {
  if (typeof badge === 'number') return Number.isFinite(badge) && badge >= 0 ? badge : undefined;
  if (typeof badge === 'string' && /^\s*\d+\s*$/.test(badge)) return Number(badge);
  return badge;
}

/** Draws a tab's icon from its screen options, as its own component. */
function TabIcon({
  icon,
  props,
}: {
  icon: (props: TabIconProps) => ReactNode;
  props: TabIconProps;
}) {
  return icon(props);
}
