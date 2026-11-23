# Ambient Bar

-   **Status:** Approved (2026-11-23) and implemented. The owner asked for it from a reference clip ("An embedded tabbar", by ian), without the Goldfish review, as for the last two designs.
-   **Design:** #46, `ambient-bar`, a tab bar in `registry/`. No foundation changes.
-   **Implementation notes (2026-11-23):**
    -   The first version gave each tab a glow colour. Stepping through the clip showed that was wrong: the bar has no colour of its own; it blurs the content scrolling behind it in place (a logo passing under the first tab glows there; green figures on the right glow green; over a black list the bar is black). Rebuilt on that.
    -   Tried and dropped: stacked blur bands (visible stripes at each band's edge), Apple's dark materials (they grey the colours), a larger radius (a 40 pt mark spreads too thin to glow), and `color-dodge`/`plus-lighter` layers to brighten the blur (iOS doesn't blend them with the native blur view; they draw as flat fills).
    -   Checked in Expo Go on an iPhone 17 Pro simulator (iOS 26.5): a dark list with saturated marks scrolling under the bar, and tab switches, frame by frame. Not done: right to left, the largest text size, Android, a physical device.

## Overview

A bar with no colour of its own. The screen runs under it, and the bar is a blur of whatever is scrolling behind, building up from a little above the bar to the bottom edge, so content melts into it. Icons only. The active tab sits on a lens: a blur of its own, lifted with a faint white, so it reads grey over black and lit red over a red logo.

## Decisions

-   **Floating, edge to edge.** `TabBarRoot placement="floating"` with no offset, as wide as the screen, so the screen runs under the bar. The bar still reports its height for screens to pad by.
-   **One blur, faded in by a mask.** A single expo-blur (`default` tint, intensity 45) inside a `MaskedView` whose mask is a vertical gradient: clear at the top of the area, fully in by the row's top edge. That gives a build-up with no edge. `@react-native-masked-view/masked-view` is a dependency of the design (it ships in Expo Go and is already pulled in by Expo Router).
-   **A moderate radius.** At intensity 45 a mark's colour stays together and glows; at 85 it spreads into a faint wash.
-   **The lens is a blur too.** A second blur, slightly stronger, clipped to the pill, with a faint white over it, slides with `TabIndicator` on `tabcnSpring`. It picks up the colour under the active tab.
-   **A light dark fade** under the icons, strongest at the bottom edge, keeps them readable over bright content.
-   **Android** gets the dark fade alone, stronger, as Mini Player does: expo-blur there is costly and uneven. The web gets the blur from CSS backdrop-filter.

## Out of scope

-   Light screens: the effect is light on dark.
-   Labels.
-   Brightening the blurred colours beyond what the blur gives. That would need a blend with the native blur, which iOS doesn't do.

## Verification

-   The registry's bar tests cover it (renders one tab per route, presses through).
-   Simulator: as in the implementation notes.
