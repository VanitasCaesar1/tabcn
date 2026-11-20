# tabcn

The foundation package for [tabcn](../../README.md): animated, copy-and-own tab bars for React Native and Expo.

> Status: pre-release (`0.x`; minor versions may break). Specs: [`foundation.md`](../../docs/designs/foundation.md), [`panels.md`](../../docs/designs/panels.md), [`motion-and-rail.md`](../../docs/designs/motion-and-rail.md).

## Connect a design to your navigator

```tsx
import { tabBar } from 'tabcn/expo-router'; // Expo Router 58+ (`expo-router/js-tabs`)
import { tabBar } from 'tabcn/react-navigation'; // @react-navigation/bottom-tabs 7

<Tabs tabBar={tabBar(<SlidingCapsule />)} />;
```

## Building blocks for designs

| Export                                                    | Purpose                                                                                                                                                                                                                                                                |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useTabBar()`                                             | Current state: visible `tabs`, `activeIndex`, `insets`, `position` (`bottom` or `left`). Each tab has `label`, `renderIcon`, `badge`, `focused`, `press()`, `longPress()`.                                                                                             |
| `<TabBarRoot placement="docked" \| "floating" \| "rail">` | Positions the bar, pads the safe area, reports its height to `useBottomTabBarHeight()`, hides on keyboard when `tabBarHideOnKeyboard` is set. `rail` is a left-edge bar for `tabBarPosition: 'left'`. `minimizeBehavior="onScrollDown"` opts in to minimize on scroll. |
| `<TabList>`                                               | The row of tabs (`tablist` role). Tracks tab positions for indicators.                                                                                                                                                                                                 |
| `<TabButton tab={tab}>`                                   | One tab: press handling, `tab` role, selected state, screen-reader position.                                                                                                                                                                                           |
| `<TabIndicator>` / `useTabIndicator()`                    | Moves to the active tab with a spring; jumps into place on first layout.                                                                                                                                                                                               |
| `useFocusProgress(tab)`                                   | Animated 0 → 1 as a tab becomes active.                                                                                                                                                                                                                                |
| `PressableScale`                                          | Press feedback for action buttons.                                                                                                                                                                                                                                     |
| `tabcnSpring`, `tabcnTiming`                              | Default motion. Respect the "reduce motion" setting.                                                                                                                                                                                                                   |
| `TabBarStateProvider`                                     | Render a design without a navigator (tests, previews).                                                                                                                                                                                                                 |
| `<BadgeCount value max>`                                  | A number badge whose digits roll when it changes; shows `max+` above `max`.                                                                                                                                                                                            |

## Screens that drive the bar

Wrap the tabs navigator in `TabBarProvider` (in Expo Router, around `<Tabs>` in the tabs layout). Without it these APIs do nothing and the bar renders as before.

| Export                                           | Purpose                                                                                                             |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `<TabPanel id anchor peekHeight initialState>`   | A panel drawn behind the bar that peeks or opens out of it. Its peek height is added to `useBottomTabBarHeight()`.  |
| `useTabPanel(id)`                                | `{ state, peek(), open(), hide(), toggle() }` from any component under the provider.                                |
| `usePanelAnchor(name)`                           | Spread onto a bar element (such as a + button) so a panel with `anchor={{ name }}` comes out from it.               |
| `useTabBarOverride(element)`                     | From `tabcn/expo-router` or `tabcn/react-navigation`: replaces the tabs with `element` while the screen is focused. |
| `useMinimizeOnScroll()` / `useTabBarMinimized()` | A scroll handler for `Animated.ScrollView`, and the 0 → 1 value designs read to draw their compact form.            |
| `useRestoreTabBar()`                             | A function that brings a minimized bar back to full, for "tap the minimized bar to expand" (no tab change).         |
| `PanelDragArea`                                  | From `tabcn/gestures` (needs `react-native-gesture-handler`): drag a panel between rest and open.                   |

Peer dependencies: `react`, `react-native`, `react-native-reanimated` 4, plus the navigator you use. `react-native-gesture-handler` is needed only for `tabcn/gestures`.
