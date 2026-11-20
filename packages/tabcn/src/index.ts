/**
 * tabcn: the shared foundation every tab bar design builds on.
 * Specs: docs/designs/foundation.md, panels.md, motion-and-rail.md. Navigator adapters live
 * in 'tabcn/expo-router' and 'tabcn/react-navigation'; panel dragging in 'tabcn/gestures'.
 */

export { BadgeCount } from './BadgeCount';
export {
  TabIndicator,
  type TabIndicatorOptions,
  type TabIndicatorProps,
  type TabIndicatorValues,
  useTabIndicator,
} from './indicator';
export { useMinimizeOnScroll, useRestoreTabBar, useTabBarMinimized } from './minimize';
export { tabcnSpring, tabcnTiming } from './motion';
export { PressableScale, type PressableScaleProps } from './PressableScale';
export {
  TabPanel,
  type TabPanelControls,
  type TabPanelProps,
  usePanelAnchor,
  useTabPanel,
} from './panels';
export { type PanelAnchor, type PanelState, TabBarProvider } from './provider';
export {
  type Insets,
  type TabBarState,
  TabBarStateProvider,
  type TabIconProps,
  type TabItem,
  useTabBar,
} from './state';
export { TabBarRoot, type TabBarRootProps } from './TabBarRoot';
export { TabButton, type TabButtonProps } from './TabButton';
export { type TabFrame, TabList, type TabListProps } from './TabList';
export { useFocusProgress } from './useFocusProgress';
