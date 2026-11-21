/**
 * tabcn: the shared foundation every tab bar design builds on.
 * Specs: docs/designs/foundation.md, panels.md, motion-and-rail.md, bottom-components.md.
 * Navigator adapters live in 'react-native-tabcn/expo-router' and 'react-native-tabcn/react-navigation'; panel and
 * sheet dragging, and scrubbing the bar, in 'react-native-tabcn/gestures'.
 */

export { BadgeCount } from './BadgeCount';
export { TabBarCompanion, type TabBarCompanionProps } from './companions';
export {
  TabIndicator,
  type TabIndicatorOptions,
  type TabIndicatorProps,
  type TabIndicatorValues,
  useTabIndicator,
} from './indicator';
export { useTabBarInset } from './inset';
export { type LiveTab, useLiveTab } from './live';
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
export { type PanelAnchor, type PanelState, type SnapPoint, TabBarProvider } from './provider';
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
