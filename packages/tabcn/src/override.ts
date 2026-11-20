import { type ReactNode, useId, useLayoutEffect } from 'react';

import { useTabBarProvider, warnOnce } from './provider';

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
}
