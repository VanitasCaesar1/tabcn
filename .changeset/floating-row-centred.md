---
'react-native-tabcn': patch
---

A floating bar whose root style is a row (a pill beside a round button, with a `gap`) is centred again under `TabBarProvider`. The box around the design kept the row while the provider's wrapper grew to fill it, so the row stretched to the screen's width and sat against the leading edge (the left, or the right in right-to-left layouts).
