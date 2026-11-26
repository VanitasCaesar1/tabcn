---
'react-native-tabcn': patch
---

A minimized floating bar no longer blocks touches where it draws nothing. While `minimizeBehavior="onScrollDown"` has the bar minimized, the floating box lets taps and scrolls through to the screen (around Split Search's circle, and wherever a design moved or shrank its parts). At full size the box keeps its touches, so a design that paints the box itself still owns its background.
