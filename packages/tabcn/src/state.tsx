import { createContext, type ReactNode, use } from 'react';

/** Safe-area insets passed in by the navigator. */
export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** Arguments a screen's `tabBarIcon` receives. */
export interface TabIconProps {
  focused: boolean;
  color: string;
  size: number;
}

/** One visible tab, built from a route and its screen options. */
export interface TabItem {
  key: string;
  routeName: string;
  /** Position among the visible tabs. */
  index: number;
  focused: boolean;
  /** `tabBarLabel` if it is a string, else `title`, else the route name. */
  label: string;
  /** `tabBarAccessibilityLabel` from the screen options. */
  accessibilityLabel?: string;
  /** `tabBarButtonTestID` from the screen options. */
  testID?: string;
  /** `tabBarBadge` from the screen options; a count written as a string ("12") arrives as a number. */
  badge?: string | number;
  /** `tabBarIcon` from the screen options. */
  renderIcon?: (props: TabIconProps) => ReactNode;
  /** Emits `tabPress`; navigates unless the tab is focused or the event was prevented. */
  press: () => void;
  /** Emits `tabLongPress`. */
  longPress: () => void;
}

/** Navigator-neutral description of the tab bar. Adapters build it; designs read it. */
export interface TabBarState {
  /** Visible tabs, in order. */
  tabs: readonly TabItem[];
  /** Index into `tabs` of the focused tab; -1 when the focused route is hidden. */
  activeIndex: number;
  insets: Insets;
  /** `tabBarHideOnKeyboard` of the focused screen. */
  hideOnKeyboard: boolean;
  /** Reports the space the bar covers to the navigator. Called by `TabBarRoot`. */
  reportHeight: (height: number) => void;
  /**
   * Where the navigator draws the bar: the focused screen's `tabBarPosition`, with every
   * value other than `left` treated as `bottom`. Lets one design draw a bottom bar on phones
   * and a rail on tablets. Both adapters set it; undefined means `bottom`.
   */
  position?: 'bottom' | 'left';
}

const TabBarStateContext = createContext<TabBarState | null>(null);

/**
 * Provides a `TabBarState` to a design. Adapters use it; use it directly to
 * render a design without a navigator (tests, previews).
 */
export function TabBarStateProvider({
  value,
  children,
}: {
  value: TabBarState;
  children?: ReactNode;
}) {
  return <TabBarStateContext value={value}>{children}</TabBarStateContext>;
}

/** The current tab bar state. Must be called inside a tabcn adapter or `TabBarStateProvider`. */
export function useTabBar(): TabBarState {
  const state = use(TabBarStateContext);
  if (!state) {
    throw new Error(
      'tabcn: useTabBar() must be used inside a tab bar rendered with tabBar() from ' +
        "'react-native-tabcn/expo-router' or 'react-native-tabcn/react-navigation', or inside <TabBarStateProvider>.",
    );
  }
  return state;
}
