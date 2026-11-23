---
'react-native-tabcn': patch
---

`TabItem.key` is now the route's name, so it stays the same for the tab's lifetime. Expo Router gives a tab's route a new key the first time the tab is visited, so a design keyed on it remounted that tab and its focus animation jumped straight to the end on the first visit.

A tab's icon (`renderIcon`) now renders as a component of its own, keyed by tab. A design that draws the active tab's icon in one place (such as a single button) called each tab's icon inside the same component, so icons that use hooks, as every icon compiled by React Compiler does, broke when the tab changed ("Rendered more hooks", or "Expected a constant size argument for each invocation of useMemoCache").
