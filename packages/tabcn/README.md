# tabcn

The foundation package for [tabcn](../../README.md): animated, copy-and-own tab bars for React Native and Expo.

> Status: pre-release (`0.x`; minor versions may break). Spec: [`docs/designs/foundation.md`](../../docs/designs/foundation.md).

## Connect a design to your navigator

```tsx
import { tabBar } from 'tabcn/expo-router'; // Expo Router 58+ (`expo-router/js-tabs`)
import { tabBar } from 'tabcn/react-navigation'; // @react-navigation/bottom-tabs 7

<Tabs tabBar={tabBar(<SlidingCapsule />)} />;
```

## Building blocks for designs

| Export                                          | Purpose                                                                                                                                       |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `useTabBar()`                                   | Current state: visible `tabs`, `activeIndex`, `insets`. Each tab has `label`, `renderIcon`, `badge`, `focused`, `press()`, `longPress()`.     |
| `<TabBarRoot placement="docked" \| "floating">` | Positions the bar, pads the safe area, reports its height to `useBottomTabBarHeight()`, hides on keyboard when `tabBarHideOnKeyboard` is set. |
| `<TabList>`                                     | The row of tabs (`tablist` role). Tracks tab positions for indicators.                                                                        |
| `<TabButton tab={tab}>`                         | One tab: press handling, `tab` role, selected state, screen-reader position.                                                                  |
| `<TabIndicator>` / `useTabIndicator()`          | Moves to the active tab with a spring; jumps into place on first layout.                                                                      |
| `useFocusProgress(tab)`                         | Animated 0 → 1 as a tab becomes active.                                                                                                       |
| `PressableScale`                                | Press feedback for action buttons.                                                                                                            |
| `tabcnSpring`, `tabcnTiming`                    | Default motion. Respect the "reduce motion" setting.                                                                                          |
| `TabBarStateProvider`                           | Render a design without a navigator (tests, previews).                                                                                        |

Peer dependencies: `react`, `react-native`, `react-native-reanimated` 4, plus the navigator you use.
