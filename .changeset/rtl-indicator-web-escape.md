---
'react-native-tabcn': patch
---

`TabIndicator` and `useTabIndicator` now sit on the active tab in right-to-left layouts: tab frames are physical, so the indicator is pinned to the physical left instead of the start edge. On the web, Escape returns an open panel to rest, as Android back does.
