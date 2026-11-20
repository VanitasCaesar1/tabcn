/**
 * tabcn: the shared foundation every tab bar design builds on.
 * Spec: docs/designs/foundation.md. Navigator adapters live in
 * 'tabcn/expo-router' and 'tabcn/react-navigation'.
 */

export {
  TabIndicator,
  type TabIndicatorOptions,
  type TabIndicatorProps,
  type TabIndicatorValues,
  useTabIndicator,
} from './indicator';
export { tabcnSpring, tabcnTiming } from './motion';
export { PressableScale, type PressableScaleProps } from './PressableScale';
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
