---
"react-native-tabcn": minor
---

`TabScrub` takes `onScrubStart(tab)` and `onScrubEnd(tab | null)`, so a design can show something while a finger scrubs the bar (Composer Dock names the tab under the finger). `onScrubEnd` gets the tab lifted on, or `null` when the finger lifted away from the bar or the system took the touch, and runs before that tab is pressed.
