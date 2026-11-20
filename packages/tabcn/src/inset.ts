/**
 * useTabBarInset: where the bar's stack ends, for toast hosts and anything else drawn
 * outside the screens. Spec: docs/designs/bottom-components.md (Toast inset).
 */
import { useSyncExternalStore } from 'react';

import { useTabBarProvider } from './provider';

const noopSubscribe = () => () => {};
const zero = () => 0;

/**
 * Points from the screen's bottom edge to the top of what tabcn draws there: the bar and
 * its gap, peeking panels, and companions above the bar. An open sheet isn't counted: it
 * overlays content, and toasts may draw over it. 0 while the bar is hidden for the keyboard
 * (the toast library handles the keyboard), is a rail, or is covered by a screen pushed over
 * the tab navigator. Works anywhere under the `TabBarProvider`, unlike
 * `useBottomTabBarHeight()`, which only works inside screens. 0 without a provider.
 *
 * Re-renders its caller only when the number changes.
 *
 * ```tsx
 * function Toasts() {
 *   const inset = useTabBarInset();
 *   return <Toaster bottomOffset={inset + 8} />; // your toast library's host and offset prop
 * }
 * ```
 */
export function useTabBarInset(): number {
  const store = useTabBarProvider()?.store;
  return useSyncExternalStore(
    store?.subscribeInset ?? noopSubscribe,
    store?.getInset ?? zero,
    store?.getInset ?? zero,
  );
}
