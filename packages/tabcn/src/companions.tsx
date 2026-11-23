/**
 * Companions: small controls placed against the tab bar (a locate button, a search pill, a
 * count chip). A screen declares one with `<TabBarCompanion>`; `TabBarRoot` draws it inside
 * the bar box, so it follows the bar natively when the bar resizes or slides away.
 * Spec: docs/designs/bottom-components.md (Companions).
 */
import {
  memo,
  type ReactNode,
  useEffect,
  useId,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
} from 'react';
import { type DimensionValue, View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { tabcnTiming } from './motion';
import {
  type CompanionPosition,
  type CompanionRecord,
  type TabBarStore,
  useTabBarProvider,
  warnOnce,
} from './provider';

export interface TabBarCompanionProps {
  /**
   * Where it sits against the bar box. `'above'`, `'above-start'` and `'above-end'` sit over
   * the bar (centred, or lined up with its leading or trailing edge). `'start'` and `'end'`
   * sit beside the bar, vertically centred, and only under a floating bar: a docked bar is
   * full width, so nothing fits beside it. Start and end follow the layout direction.
   */
  position: CompanionPosition;
  /** Points between the companion and the bar (or the peeking panel above it). Default 8. */
  gap?: number;
  /**
   * Crossfades in and out on tabcnTiming. Default true. Pass `useIsFocused()` to show it on
   * one screen only.
   */
  visible?: boolean;
  children?: ReactNode;
}

/**
 * Declares a control drawn next to the tab bar. Renders nothing where it is written: the
 * bar draws it, so it moves with the bar (when the design shrinks it to minimize, or when it
 * slides away for the keyboard) and rides above a peeking bar panel such as a mini player.
 * Companions fade out while a panel is open. Several screens may declare the same position:
 * each declaration crossfades on its own `visible`. Needs a `TabBarProvider`.
 *
 * ```tsx
 * const focused = useIsFocused();
 * <TabBarCompanion position="above-end" visible={focused}>
 *   <LocateButton onPress={recenter} />
 * </TabBarCompanion>
 * ```
 *
 * Its content renders inside the tab bar, so it sees the contexts around the navigator, not
 * the ones around the screen that declared it. A design that minimizes by transform only
 * (moving parts without changing the bar box) doesn't move its companions.
 */
export function TabBarCompanion({
  position,
  gap = 8,
  visible = true,
  children,
}: TabBarCompanionProps): null {
  const store = useTabBarProvider()?.store;
  const owner = useId();
  if (!store) warnOnce('<TabBarCompanion> needs a <TabBarProvider> around the tabs navigator.');

  // Hand the latest content to the provider on every commit.
  useLayoutEffect(() => {
    store?.upsertCompanion({ owner, position, gap, visible, content: children });
  });
  useLayoutEffect(() => {
    if (!store) return;
    return () => store.releaseCompanion(owner);
  }, [store, owner]);
  return null;
}

/** Positions that sit over the bar: they ride a peeking panel and count toward the inset. */
export const isAbove = (position: CompanionPosition) => position.startsWith('above');

/**
 * Points a companion above the bar rises while a bar panel peeks: the part of the panel
 * showing above the bar's top edge (its visible height minus the part behind the bar).
 */
export function companionLift(panelVisible: number, overlap: number): number {
  'worklet';
  return Math.max(0, panelVisible - overlap);
}

/**
 * Where a companion's box sits, relative to the bar box. `side` keeps above-positions off the
 * screen's edges under a docked bar, which is as wide as the screen. Start and end use
 * `start`/`end` styles, so they follow the layout direction: in a right-to-left layout,
 * "end" is the bar's left side.
 */
export function companionFrame(position: CompanionPosition, gap: number, side: number): ViewStyle {
  const over: ViewStyle = { position: 'absolute', bottom: '100%' as DimensionValue };
  switch (position) {
    case 'above':
      return { ...over, left: side, right: side, alignItems: 'center', paddingBottom: gap };
    case 'above-start':
      return { ...over, start: side, alignItems: 'flex-start', paddingBottom: gap };
    case 'above-end':
      return { ...over, end: side, alignItems: 'flex-end', paddingBottom: gap };
    case 'start':
      return {
        position: 'absolute',
        end: '100%' as DimensionValue,
        top: 0,
        bottom: 0,
        justifyContent: 'center',
        paddingEnd: gap,
      };
    case 'end':
      return {
        position: 'absolute',
        start: '100%' as DimensionValue,
        top: 0,
        bottom: 0,
        justifyContent: 'center',
        paddingStart: gap,
      };
  }
}

interface CompanionLayerProps {
  store: TabBarStore;
  docked: boolean;
  /** The horizontal safe-area inset: above-positions keep it, plus their gap, under a docked bar. */
  side: number;
  /** A panel is open (at any height): companions fade out. */
  hidden: boolean;
  /** The bar panel whose peek the above-positions ride, if any. */
  liftPanel: string | null;
  /** Points of a panel hidden behind the bar. */
  overlap: number;
  /** The bar box clips its children, which would cut companions off. */
  clipped: boolean;
  /** Called with the tallest visible above-companion's height, its gap included. */
  onAboveHeight: (height: number) => void;
}

const noHandle = () => undefined;

/**
 * Draws the declared companions inside the bar box. Internal: rendered by `TabBarRoot`. It
 * subscribes to the companions on its own, so a screen that re-renders its companion
 * re-renders only this layer; memoised, so a re-render of the root alone skips it.
 */
export const CompanionLayer = memo(function CompanionLayer({
  store,
  docked,
  side,
  hidden,
  liftPanel,
  overlap,
  clipped,
  onAboveHeight,
}: CompanionLayerProps) {
  const companions = useSyncExternalStore(
    store.subscribeCompanions,
    store.getCompanions,
    store.getCompanions,
  );
  const handle = useSyncExternalStore(
    store.subscribe,
    liftPanel ? () => store.getHandle(liftPanel) : noHandle,
    noHandle,
  );
  const [heights, setHeights] = useState<Readonly<Record<string, number>>>({});

  const drawn = companions.filter((c) => !(docked && !isAbove(c.position)));
  if (__DEV__) {
    for (const c of companions) {
      if (docked && !isAbove(c.position)) {
        warnOnce(
          `<TabBarCompanion position="${c.position}"> isn't drawn under a docked bar: the bar ` +
            "is full width, so nothing fits beside it. Use 'above', 'above-start' or 'above-end'.",
        );
      }
    }
    const positions = drawn.filter((c) => c.visible).map((c) => c.position);
    for (const position of new Set(positions)) {
      if (positions.indexOf(position) !== positions.lastIndexOf(position)) {
        warnOnce(
          `two <TabBarCompanion position="${position}"> are visible at once and draw over ` +
            'each other. Pass visible={useIsFocused()} so only the focused screen shows its own.',
        );
      }
    }
    if (clipped && companions.length > 0) {
      warnOnce(
        "the tab bar's style has overflow: 'hidden', which clips its companions. Clip an " +
          'inner view instead.',
      );
    }
  }

  const above = hidden
    ? 0
    : Math.max(
        0,
        ...drawn.filter((c) => c.visible && isAbove(c.position)).map((c) => heights[c.owner] ?? 0),
      );
  useEffect(() => {
    onAboveHeight(above);
  }, [above, onAboveHeight]);

  const shown = useSharedValue(hidden ? 0 : 1);
  useEffect(() => {
    shown.value = withTiming(hidden ? 0 : 1, tabcnTiming);
  }, [hidden, shown]);
  const fade = useAnimatedStyle(() => ({ opacity: shown.value }));
  const fallback = useSharedValue(0);
  const panelVisible = handle?.visible ?? fallback;
  const lift = useAnimatedStyle(() => ({
    transform: [{ translateY: -companionLift(panelVisible.value, overlap) }],
  }));

  if (drawn.length === 0) return null;
  return (
    <Animated.View
      pointerEvents={hidden ? 'none' : 'box-none'}
      importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'}
      accessibilityElementsHidden={hidden}
      style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, fade]}
    >
      {drawn.map((c) => (
        <CompanionItem
          key={c.owner}
          record={c}
          side={docked ? side + c.gap : 0}
          lift={isAbove(c.position) ? lift : null}
          onHeight={(height) =>
            setHeights((all) => (all[c.owner] === height ? all : { ...all, [c.owner]: height }))
          }
        />
      ))}
    </Animated.View>
  );
});

function CompanionItem({
  record,
  side,
  lift,
  onHeight,
}: {
  record: CompanionRecord;
  side: number;
  lift: ReturnType<typeof useAnimatedStyle> | null;
  onHeight: (height: number) => void;
}) {
  const { visible, position, gap, content } = record;
  const opacity = useSharedValue(visible ? 1 : 0);
  useEffect(() => {
    opacity.value = withTiming(visible ? 1 : 0, tabcnTiming);
  }, [visible, opacity]);
  const fade = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      pointerEvents={visible ? 'box-none' : 'none'}
      importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}
      accessibilityElementsHidden={!visible}
      style={[companionFrame(position, gap, side), lift, fade]}
      onLayout={(e) => onHeight(e.nativeEvent.layout.height)}
    >
      <View collapsable={false}>{content}</View>
    </Animated.View>
  );
}
