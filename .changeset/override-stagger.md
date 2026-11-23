---
'react-native-tabcn': patch
---

A screen's override (`useTabBarOverride`) no longer crossfades with the bar's tabs at the same rate, which left both half visible at the midpoint: the tabs clear in the first half and the override comes in over the last 70%.

`BadgeCount`'s digits stop growing with the system text size at 1.3x, as the designs' labels do; badges are a fixed height, so larger digits were clipped.
