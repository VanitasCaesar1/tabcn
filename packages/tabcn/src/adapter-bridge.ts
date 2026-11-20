/**
 * What both adapters tell the `TabBarProvider` about the navigator. Internal.
 */
import { useEffect } from 'react';

import { useRestoreOnFocusChange } from './minimize';
import { useTabBarProvider } from './provider';

/** A navigation state with its nested states, as both navigators hand it to the tab bar. */
export interface NestedStateLike {
  index?: number;
  routes: readonly { key?: string; name: string; state?: NestedStateLike }[];
}

/** The key of the deepest focused route: the tab's own route, or a screen pushed inside it. */
export function deepFocusedKey(state: NestedStateLike): string | undefined {
  let key: string | undefined;
  let current: NestedStateLike | undefined = state;
  while (current) {
    // A partial (not yet initialised) state without an index shows its last route.
    const route: NestedStateLike['routes'][number] | undefined =
      current.routes[current.index ?? current.routes.length - 1];
    if (!route) break;
    key = route.key ?? `${key ?? ''}/${route.name}`;
    current = route.state;
  }
  return key;
}

/**
 * Restores a minimized bar when the focused tab or screen changes, and lets the panel layer
 * ask whether the tab navigator is focused (a screen pushed over it takes Android back).
 */
export function useAdapterBridge(state: NestedStateLike, isFocused: () => boolean) {
  const store = useTabBarProvider()?.store;
  useRestoreOnFocusChange(deepFocusedKey(state));
  useEffect(() => {
    if (!store) return;
    store.setFocusSource(isFocused);
    return () => store.setFocusSource(null);
  }, [store, isFocused]);
}
