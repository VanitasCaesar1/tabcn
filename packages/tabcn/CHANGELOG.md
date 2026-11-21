# react-native-tabcn

## 0.1.2

### Patch Changes

- def67ea: VoiceOver reaches panels under an empty floating bar (Section Sheet's sheet and its sections were left out of the iOS accessibility tree because the bar's root had no height). The bar no longer logs Reanimated warnings about reading a shared value during render (under the React Compiler) or about a dependency list.

## 0.1.1

### Patch Changes

- 3a13d43: The npm page links to the website (every design, with its install command) and to the issue tracker.

## 0.1.0

### Minor Changes

- 25f8144: Bottom components. Sheets: `TabPanel` `snapPoints` (and the `SnapPoint` type), `snap` and `snapTo` on `useTabPanel`, and `PanelScrollView` in `react-native-tabcn/gestures` (`PanelDragArea`'s `panel` is now optional inside a panel); while a screen reader is on, sheets open only to their highest snap point. Companions: `TabBarCompanion` places a control against the bar and moves with it. Toasts: `useTabBarInset()` gives the bottom offset above everything tabcn draws, from anywhere under the `TabBarProvider`. Sub-tabs: `TabButton` `onLongPress`, offered to screen readers as a named `longpress` action. `TabButton` now merges a passed `accessibilityState` with its own `selected` instead of replacing it. Opening a panel now covers a peeking panel on the same anchor instead of hiding it: the peeking one (a mini player under a sheet) keeps its state and its reserved height and comes back when the open one rests. `react-native-safe-area-context` is now an optional peer, read by the adapters (both navigators already require it).

  Sheet navigation: an empty (zero-height) floating bar no longer tucks panels 16 pt behind it, so a sheet can stand in for the bar (the Section Sheet design) with a visible strip that matches the reported height. Scrubbing: `TabScrub` in `react-native-tabcn/gestures` is a `TabList` you can press and slide along to move through the tabs; `TabIndicator` follows the finger inside it. Live tabs: `useLiveTab(routeName)` (and the `LiveTab` type) shares a progress value and a line of text per tab, so a screen or a service can drive a ring or a countdown on a tab without re-rendering the navigator or the bar.
- ff870a7: Minimize on scroll (`useMinimizeOnScroll`, `useTabBarMinimized`, `useRestoreTabBar`, `TabBarRoot minimizeBehavior`), a rolling `BadgeCount`, and a side rail: `TabBarRoot placement="rail"` plus `TabBarState.position` read from the navigator's `tabBarPosition`.
- ff870a7: Panels: `TabBarProvider`, `TabPanel`, `useTabPanel`, `usePanelAnchor`, `useTabBarOverride` (from `react-native-tabcn/expo-router` and `react-native-tabcn/react-navigation`), and the optional `react-native-tabcn/gestures` entry with `PanelDragArea` (needs `react-native-gesture-handler`). Apps without a `TabBarProvider` see no change.
