/**
 * useTabBarInset: where the bar's stack ends, for toast hosts and anything else drawn
 * outside the screens. Spec: docs/designs/bottom-components.md (Toast inset).
 */
import { useSyncExternalStore } from 'react';

import { DEFAULT_PANEL_OVERLAP, useTabBarProvider } from './provider';

const noopSubscribe = () => () => {};
const zero = () => 0;
const defaultOverlap = () => DEFAULT_PANEL_OVERLAP;

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

/**
 * Points of a panel hidden behind the bar's top edge: 16 under a floating bar, whose rounded
 * ends hide the join, and 0 under a docked bar, whose top edge is straight. A panel that peeks
 * (a mini player) adds it to the height it wants to show, so the visible part is the same
 * under either kind of bar. Spec: docs/designs/panels.md (Overlap behind the bar).
 *
 * Re-renders its caller only when the number changes. 16 without a provider.
 *
 * ```tsx
 * const overlap = usePanelOverlap();
 * return <TabPanel id="player" peekHeight={STRIP + overlap}>…</TabPanel>;
 * ```
 */
export function usePanelOverlap(): number {
  const store = useTabBarProvider()?.store;
  return useSyncExternalStore(
    store?.subscribeOverlap ?? noopSubscribe,
    store?.getOverlap ?? defaultOverlap,
    store?.getOverlap ?? defaultOverlap,
  );
}
