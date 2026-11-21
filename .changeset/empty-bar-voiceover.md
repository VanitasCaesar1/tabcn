---
"react-native-tabcn": patch
---

VoiceOver reaches panels under an empty floating bar (Section Sheet's sheet and its sections were left out of the iOS accessibility tree because the bar's root had no height). The bar no longer logs Reanimated warnings about reading a shared value during render (under the React Compiler) or about a dependency list.
