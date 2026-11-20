/**
 * What both adapters tell the `TabBarProvider` about the navigator. Internal.
 */
import { useEffect, useId } from 'react';

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

type AddListener = (event: 'focus' | 'blur', callback: () => void) => (() => void) | undefined;

/**
 * Restores a minimized bar when the focused tab or screen changes, lets the panel layer
 * ask whether the tab navigator is focused (a screen pushed over it takes Android back), and
 * pushes focus changes to the provider, so `useTabBarInset()` drops to 0 under a pushed
 * screen. `events` is the navigation object of the screen that holds the tab navigator.
 */
export function useAdapterBridge(
  state: NestedStateLike,
  isFocused: () => boolean,
  events?: object,
) {
  const store = useTabBarProvider()?.store;
  const token = useId();
  useRestoreOnFocusChange(deepFocusedKey(state));
  useEffect(() => {
    if (!store) return;
    store.setFocusSource(isFocused);
    store.setNavigatorFocused(isFocused());
    // A root navigator has no screen around it, so nothing emits focus or blur.
    const listen = (events as { addListener?: unknown } | undefined)?.addListener;
    const add = typeof listen === 'function' ? (listen as AddListener).bind(events) : null;
    const subscriptions = add
      ? [
          add('focus', () => store.setNavigatorFocused(true)),
          add('blur', () => store.setNavigatorFocused(false)),
        ]
      : [];
    return () => {
      store.setFocusSource(null);
      for (const unsubscribe of subscriptions) unsubscribe?.();
      store.setNavigatorFocused(true);
    };
  }, [store, isFocused, events]);
  // One tab navigator per provider: the provider warns in development about a second.
  useEffect(() => store?.attachNavigator(token), [store, token]);
}
