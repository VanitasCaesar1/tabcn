---
'react-native-tabcn': patch
---

A screen's override (`useTabBarOverride`) no longer crossfades with the bar's tabs at the same rate, which left both half visible at the midpoint: the tabs clear in the first half and the override comes in over the last 70%.

`BadgeCount`'s digits stop growing with the system text size at 1.3x, as the designs' labels do; badges are a fixed height, so larger digits were clipped.

Fixes:
- Panels on the web: opening a modal panel no longer throws (react-native-web has no `sendAccessibilityEvent`), and sheets aren't held at their highest snap point (react-native-web always reports a screen reader).
- Right to left: a panel on a named anchor (such as a + button) opens over that anchor, not mirrored to the other side.
- The bar no longer stays hidden after the keyboard closed while it wasn't listening (another tab, a rail).
- A `ref` passed to `TabButton` (such as `usePanelAnchor`'s) no longer stops the tab being measured.
- Screen-reader focus moves into an open panel even when its opening is retargeted.
- The indicator appears in place, instead of springing from a stale spot, after a hidden route was focused.
- React Navigation adapter: `tabBarRepeatedPressBehavior` is passed on with `tabPress`, as React Navigation's own bar does.
- A badge given as a numeric string ("12") arrives as a number, so designs draw it as a count; a number that isn't a count (NaN, negative) is dropped.
