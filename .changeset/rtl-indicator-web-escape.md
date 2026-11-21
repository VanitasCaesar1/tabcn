---
'react-native-tabcn': patch
---

- `TabIndicator` and `useTabIndicator` sit on the active tab in right-to-left layouts: tab frames are physical, so the indicator is pinned to the physical left instead of the start edge.
- On the web, Escape returns an open panel to rest, as Android back does.
- A floating bar's box is capped at the screen's width, so a design's `maxWidth: '100%'` can shrink a bar that is wider than a narrow phone.
- A docked or rail bar keeps the design's `paddingHorizontal`/`padding`: it is added to the safe-area insets instead of being dropped by them.
- A panel that something else hides or moves while a finger drags it (Android back, a tab switch, `hide()`) stays where that put it when the finger lifts, instead of the drag reopening it.
