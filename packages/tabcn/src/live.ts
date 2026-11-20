/**
 * Live tabs: a progress ring, a countdown or a now-playing line on a tab, fed by a screen or
 * a service, without re-rendering the navigator or the bar.
 * Spec: docs/designs/bottom-components.md (Live tabs).
 */
import { useCallback, useMemo, useState, useSyncExternalStore } from 'react';
import { makeMutable, type SharedValue } from 'react-native-reanimated';

import { useTabBarProvider, warnOnce } from './provider';

/** One tab's live values. */
export interface LiveTab {
  /**
   * 0 to 1: how far along something is (a download, a timer). A Reanimated shared value:
   * write `progress.value` from anywhere, as often as every frame, and draw it with
   * `useAnimatedProps` or `useAnimatedStyle`. Writing it re-renders nothing.
   */
  progress: SharedValue<number>;
  /** Short live text such as `'4:59'` or a track's name; undefined when there is none. */
  text: string | undefined;
  /**
   * Sets `text`. Only components that read this tab's text with `useLiveTab` re-render, and
   * only when it changes. The function is stable, so it can be handed to a service.
   */
  setText: (text: string | undefined) => void;
}

const noopSubscribe = () => () => {};
const none = () => undefined;

/**
 * The live values of the tab for route `name` (its `TabItem.routeName`), shared by every
 * caller under the same `TabBarProvider`. A screen or a service writes them; the bar
 * design reads them for each tab and draws them (a ring, a countdown). Neither side
 * re-renders the navigator: progress stays on the UI thread, and text re-renders only the
 * components that read that name.
 *
 * Route names are the navigator's: in Expo Router a tab's file name (`index`, `timer`), or
 * the folder for a nested stack (`(timer)`). Screen readers don't hear a value that only
 * changes on screen, so a design reads `text` into the tab's accessibility value; write the
 * text you want heard. Values live as long as the provider. Needs a `TabBarProvider`;
 * without one, writes go nowhere.
 *
 * ```tsx
 * // In the Downloads screen, or a component that listens to your download service:
 * const live = useLiveTab('downloads');
 * live.progress.value = received / total;
 *
 * // In the Timer screen, once a second:
 * useLiveTab('timer').setText(formatted);
 * ```
 */
export function useLiveTab(name: string): LiveTab {
  const store = useTabBarProvider()?.store;
  if (!store) warnOnce('useLiveTab() needs a <TabBarProvider> around the tabs navigator.');
  const [fallback] = useState(() => makeMutable(0));
  const entry = store?.liveEntry(name);
  const subscribe = useCallback(
    (listener: () => void) => (store ? store.subscribeLive(name, listener) : noopSubscribe()),
    [store, name],
  );
  const read = useCallback(() => store?.liveEntry(name).text, [store, name]);
  const text = useSyncExternalStore(subscribe, read, none);
  const setText = useCallback(
    (next: string | undefined) => store?.setLiveText(name, next),
    [store, name],
  );
  const progress = entry?.progress ?? fallback;
  return useMemo(() => ({ progress, text, setText }), [progress, text, setText]);
}
