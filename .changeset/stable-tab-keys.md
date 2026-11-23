---
'react-native-tabcn': patch
---

`TabItem.key` is now the route's name, so it stays the same for the tab's lifetime. Expo Router gives a tab's route a new key the first time the tab is visited, so a design keyed on it remounted that tab and its focus animation jumped straight to the end on the first visit.
