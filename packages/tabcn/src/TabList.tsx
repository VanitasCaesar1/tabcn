import {
  type ComponentRef,
  createContext,
  type ReactNode,
  type RefObject,
  use,
  useRef,
} from 'react';
import { type StyleProp, View, type ViewStyle } from 'react-native';
import { type SharedValue, useSharedValue } from 'react-native-reanimated';

export interface TabFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TabListContextValue {
  listRef: RefObject<ComponentRef<typeof View> | null>;
  /** Frame of each tab button relative to the TabList, by tab index. */
  frames: SharedValue<Record<number, TabFrame>>;
  /**
   * Set only inside `TabScrub` (tabcn/gestures): the frame the indicator follows while a
   * finger scrubs the bar, or null to follow the active tab. Internal.
   */
  scrub?: SharedValue<TabFrame | null>;
}

/** Internal: shared with `TabScrub`, which draws its own list. */
export const TabListContext = createContext<TabListContextValue | null>(null);

export function useTabListContext(caller: string): TabListContextValue {
  const ctx = use(TabListContext);
  if (!ctx) throw new Error(`tabcn: ${caller} must be rendered inside <TabList>.`);
  return ctx;
}

export interface TabListProps {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

/**
 * The row of tabs. Tracks where each `TabButton` sits so `TabIndicator` can
 * move to the active one. Render the indicator first so it sits behind the tabs.
 */
export function TabList({ style, children }: TabListProps) {
  const listRef = useRef<ComponentRef<typeof View>>(null);
  const frames = useSharedValue<Record<number, TabFrame>>({});
  return (
    <TabListContext value={{ listRef, frames }}>
      <View ref={listRef} role="tablist" style={[{ flexDirection: 'row' }, style]}>
        {children}
      </View>
    </TabListContext>
  );
}
