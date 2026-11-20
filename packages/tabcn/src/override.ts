import { type ReactNode, useEffect, useId, useLayoutEffect } from 'react';

import { useTabBarProvider, warnOnce } from './provider';

/**
 * How long focus changes get to settle before an override set while the tab navigator is
 * covered warns. Returning from a modal focuses the tab screen and the navigator in separate
 * events, so a check in between would warn on correct code.
 */
const FOCUS_SETTLE_MS = 300;

/**
 * Sets the provider's override slot to `element` while `focused` is true and `element` is
 * not null; clears it on blur, on `null` and on unmount. Shared by both adapters'
 * `useTabBarOverride`, which supply `focused` from their navigator. Internal.
 */
export function useOverrideSlot(element: ReactNode | null, focused: boolean) {
  const store = useTabBarProvider()?.store;
  const owner = useId();
  if (!store) warnOnce('useTabBarOverride() needs a <TabBarProvider> around the tabs navigator.');
  const active = focused && element != null;

  // Hand the latest element over on every commit while active.
  useLayoutEffect(() => {
    if (!store) return;
    if (active) store.setOverride(owner, element);
    else store.clearOverride(owner);
  });
  useLayoutEffect(() => {
    if (!store) return;
    return () => store.clearOverride(owner);
  }, [store, owner]);

  // A focused screen while the tab navigator itself is covered is a screen outside it (a
  // modal or a screen of the root stack): its override would reach the bar underneath.
  useEffect(() => {
    if (!__DEV__ || !store || !active) return;
    const timer = setTimeout(() => {
      if (store.getSnapshot().navigatorFocused) return;
      warnOnce(
        'useTabBarOverride() was called from a screen outside the tab navigator (a modal or a ' +
          'screen pushed over the tabs), so it changes the tab bar underneath. Call it from a ' +
          "tab's own screens.",
      );
    }, FOCUS_SETTLE_MS);
    return () => clearTimeout(timer);
  }, [store, active]);
}
