# react-native-tabcn

## 0.4.0

### Minor Changes

- 4a58aab: Panels can take the bar's place: `TabPanel` gains `coversBar` (while open, a floating bar slides away and the panel moves into its place) and `backdrop` (drawn over the whole screen behind the open panel, fading with its slide; a tap returns the panel to rest). Both are off by default.

## 0.3.0

### Minor Changes

- b4b7498: `usePanelOverlap()` returns how much of a panel the bar's top edge hides: 16 pt under a floating bar, 0 under a docked one. A peeking panel adds it to the strip it wants to show, so the strip is the same height above either kind of bar.

### Patch Changes

- b4b7498: A floating bar whose root style is a row (a pill beside a round button, with a `gap`) is centred again under `TabBarProvider`. The box around the design kept the row while the provider's wrapper grew to fill it, so the row stretched to the screen's width and sat against the leading edge (the left, or the right in right-to-left layouts).
- b4b7498: - `TabIndicator` and `useTabIndicator` sit on the active tab in right-to-left layouts: tab frames are physical, so the indicator is pinned to the physical left instead of the start edge.
  - On the web, Escape returns an open panel to rest, as Android back does.
  - A floating bar's box is capped at the screen's width, so a design's `maxWidth: '100%'` can shrink a bar that is wider than a narrow phone.
  - A docked or rail bar keeps the design's `paddingHorizontal`/`padding`: it is added to the safe-area insets instead of being dropped by them.
  - A panel that something else hides or moves while a finger drags it (Android back, a tab switch, `hide()`) stays where that put it when the finger lifts, instead of the drag reopening it.

## 0.2.0

### Minor Changes

- bc1ce40: `TabScrub` takes `onScrubStart(tab)` and `onScrubEnd(tab | null)`, so a design can show something while a finger scrubs the bar (Composer Dock names the tab under the finger). `onScrubEnd` gets the tab lifted on, or `null` when the finger lifted away from the bar or the system took the touch, and runs before that tab is pressed.

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
