---
'react-native-tabcn': patch
---

Liquid Glass in a bar, its companions or an override comes back after the bar hides. On iOS, what `TabBarRoot` fades out but keeps mounted (the bar under the keyboard or a covering panel, the tabs under an override, companions while a panel is open) now stops at opacity 0.011 instead of 0. Below UIKit's 0.01 cutoff, a glass view whose effect changed while hidden (`glassEffectStyle` from `'none'` to `'regular'`) never drew its glass again. The bar hidden for the keyboard and the bar box under a covering panel are now also hidden from screen readers.
