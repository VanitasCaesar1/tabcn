import { createElement, type ReactNode, useLayoutEffect, useMemo, useRef } from 'react';
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

/** A built tab, with the `tabBarIcon` its `renderIcon` calls. */
interface CachedTab {
  icon: TabOptionsLike['tabBarIcon'];
  item: TabItem;
}

/**
 * What the last build returned, so the next one can hand back the same objects when nothing
 * they were built from changed. Only valid while the input's callbacks are stable: a cached
 * tab keeps the `press` it was built with.
 */
export interface TabBarStateCache {
  tabs: Map<string, CachedTab>;
  state: TabBarState | null;
}

const sameItems = (a: readonly TabItem[], b: readonly TabItem[]) =>
  a.length === b.length && a.every((item, i) => item === b[i]);

/**
 * Converts navigator data into a `TabBarState`. Shared by both adapters. With a `cache`, a
 * tab whose every field is unchanged keeps its object (and its `press` and `renderIcon`),
 * and an unchanged state keeps its object too. Fields are compared by value: navigators
 * hand over new options objects whenever a screen's element changes, even when no option did.
 */
export function buildTabBarState(input: BuildInput, cache?: TabBarStateCache): TabBarState {
  const focusedRoute = input.routes[input.focusedIndex];
  const focusedOptions = focusedRoute ? input.getOptions(focusedRoute) : {};
  const tabs: TabItem[] = [];
  const built = new Map<string, CachedTab>();
  let activeIndex = -1;

  for (const route of input.routes) {
    const options = input.getOptions(route);
    if (isHidden(options)) continue;
    const focused = route === focusedRoute;
    const index = tabs.length;
    if (focused) activeIndex = index;
    const icon = options.tabBarIcon;
    const label = resolveLabel(options, route);
    const badge = normalizeBadge(options.tabBarBadge);
    const cached = cache?.tabs.get(route.key)?.item;
    if (
      cached &&
      cache?.tabs.get(route.key)?.icon === icon &&
      cached.routeName === route.name &&
      cached.index === index &&
      cached.focused === focused &&
      cached.label === label &&
      cached.accessibilityLabel === options.tabBarAccessibilityLabel &&
      cached.testID === options.tabBarButtonTestID &&
      cached.badge === badge
    ) {
      tabs.push(cached);
      built.set(route.key, { icon, item: cached });
      continue;
    }
    const item: TabItem = {
      // The route's name, not its key: Expo Router gives a tab's route a new key the first time
      // the tab is visited, and a design keyed on that remounts the tab, so its focus animation
      // jumps to the end. Names are unique within a tab navigator and never change.
      key: route.name,
      routeName: route.name,
      index,
      focused,
      label,
      accessibilityLabel: options.tabBarAccessibilityLabel,
      testID: options.tabBarButtonTestID,
      badge,
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
    };
    tabs.push(item);
    built.set(route.key, { icon, item });
  }

  const hideOnKeyboard = focusedOptions.tabBarHideOnKeyboard ?? false;
  const position = focusedOptions.tabBarPosition === 'left' ? 'left' : 'bottom';
  const previous = cache?.state;
  if (cache) cache.tabs = built;
  if (
    previous &&
    sameItems(previous.tabs, tabs) &&
    previous.activeIndex === activeIndex &&
    previous.insets === input.insets &&
    previous.hideOnKeyboard === hideOnKeyboard &&
    previous.reportHeight === input.reportHeight &&
    previous.position === position
  ) {
    return previous;
  }
  const state: TabBarState = {
    tabs,
    activeIndex,
    insets: input.insets,
    hideOnKeyboard,
    reportHeight: input.reportHeight,
    position,
  };
  if (cache) cache.state = state;
  return state;
}

/**
 * The adapters' `TabBarState`, kept the same object across navigator renders that change
 * nothing the bar reads. Navigators re-render the bar with a new `insets` object, a new
 * `descriptors` object and new helpers each time; rebuilding on each of those gave every
 * design new tabs (and new `press` closures) and re-rendered all of it.
 *
 * The callbacks read the latest input when they run, so they are stable and cached tabs stay
 * correct. The cache only ever holds objects built from the inputs they are keyed on, so a
 * render React throws away leaves nothing wrong in it.
 */
export function useTabBarStateValue(input: BuildInput): TabBarState {
  const latest = useRef(input);
  useLayoutEffect(() => {
    latest.current = input;
  });
  const callbacks = useMemo(
    () => ({
      emitPress: (route: RouteLike) => latest.current.emitPress(route),
      emitLongPress: (route: RouteLike) => latest.current.emitLongPress(route),
      navigate: (route: RouteLike) => latest.current.navigate(route),
    }),
    [],
  );
  const { top, right, bottom, left } = input.insets;
  const insets = useMemo(() => ({ top, right, bottom, left }), [top, right, bottom, left]);
  const cache = useRef<TabBarStateCache>({ tabs: new Map(), state: null });
  return buildTabBarState({ ...input, ...callbacks, insets }, cache.current);
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
