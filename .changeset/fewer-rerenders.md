---
'react-native-tabcn': patch
---

Fewer re-renders, with no change to the API or how anything looks. The adapters keep the bar state and each tab object while nothing in them changed, so a navigator re-render (new insets object, new descriptors) no longer re-renders the whole design. A screen that re-renders while declaring a panel or an override now re-renders only that panel's content or the override, not the bar root and every other panel.
