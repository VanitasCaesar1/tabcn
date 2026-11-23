# Ambient Bar

-   **Status:** Approved (2026-11-23) and implemented. The owner asked for it from a reference clip ("An embedded tabbar", by ian), without the Goldfish review, as for the last two designs.
-   **Design:** #46, `ambient-bar`, a tab bar in `registry/`. No foundation changes.
-   **Implementation notes (2026-11-23):**
    -   The first version gave each tab a glow colour. Stepping through the clip showed that was wrong: the bar has no colour of its own; it blurs the content scrolling behind it in place (a logo passing under the first tab glows there; green figures on the right glow green; over a black list the bar is black). Rebuilt on that.
    -   Tried and dropped: stacked blur bands (visible stripes at each band's edge), Apple's dark materials (they grey the colours), a larger radius (a 40 pt mark spreads too thin to glow), and `color-dodge`/`plus-lighter` layers to brighten the blur (iOS doesn't blend them with the native blur view; they draw as flat fills).
    -   Fifth pass: the owner pointed at the reference's rounded top corners. The blur and the dark overlay now share one soft SVG mask (react-native-svg, already a dependency) whose top corners curve down 64 pt at the screen's sides, like the phone's own corners, softened with a Gaussian blur. The overlay keeps some darkness up to the slab's top edge, so the shape reads on a coloured screen. The demo's second and fourth tabs are deep blue and violet, as the reference's sections are, so the slab shows.
    -   Fourth pass: the owner found the blur too strong. Up close the clip's blur is light under a dark overlay, so the intensity went from 32 to 16 with a stronger black overlay, and the lens became darker glass.
    -   Third pass, after a side-by-side with the clip: the blur reached 76 pt above the bar and smeared the row above it (the owner flagged it); it now starts at the bar's edge. Larger icons (25 pt, 2.3 stroke, brighter idle) and a wider pill (74 x 42), as in the clip. The demo's % figures sit on solid green and red chips, as trading apps (and the clip) show them, which is what lights the bar's right side.
    -   Second pass, for colour strength: the lens became Liquid Glass, and the bar's blur dropped to intensity 32 with a lighter dark fade.
    -   Checked in Expo Go on an iPhone 17 Pro simulator (iOS 26.5): a dark list with saturated marks scrolling under the bar, and tab switches, frame by frame; right to left (`TABCN_RTL=1`), where the tabs mirror and the lens follows. Not done: Android, a physical device.

## Overview

A bar with no colour of its own. The screen runs under it, and the bar is a blur of whatever is scrolling behind. The blur starts at the bar's top edge and is fully in by the icons' top, so the row above stays sharp right up to the bar, as in the reference. Icons only. The active tab sits on a lens (Liquid Glass on iOS 26, a small blur elsewhere) that reads grey over black and lights up red over a red logo.

## Decisions

-   **Floating, edge to edge.** `TabBarRoot placement="floating"` with no offset, as wide as the screen, so the screen runs under the bar. The bar still reports its height for screens to pad by.
-   **One blur, faded in by a mask.** A single expo-blur (`default` tint, intensity 16) inside a `MaskedView` whose mask is a vertical gradient: clear 12 pt above the bar, fully in 14 pt below its top edge. That gives a build-up with no edge. `@react-native-masked-view/masked-view` is a dependency of the design (it ships in Expo Go and is already pulled in by Expo Router).
-   **A light blur under a dark overlay, as the reference does.** Up close the reference's bar barely blurs: text behind it stays legible as faint ghosts, and the bar is near black. So the blur is light (intensity 16; 10, 16 and 24 were compared against the clip) and most of the darkness is a black overlay (50% at the bottom edge). The colour glow comes from saturated content and the glass lens. The `systemUltraThinMaterial` and `prominent` materials add a grey cast.
-   **The lens is Liquid Glass** (`expo-glass-effect`, `clear`, dark, tinted 35% black) where iOS has it (26 and later). It refracts and saturates what passes under it, so the active tab lights up in a logo's colour, which is the reference's strongest effect. Elsewhere it is a blur of its own clipped to the pill, with a faint white over it. Either way it slides with `TabIndicator` on `tabcnSpring`.
-   **A slab with rounded top corners.** The blur and the dark overlay share one soft mask: a fade from just above the bar whose top corners curve down at the screen's sides. The overlay is half black at the bottom and about a fifth at the slab's top, so the slab reads as a shape on a coloured screen and the icons read over bright content.
-   **Android** gets the dark fade alone, stronger, as Mini Player does: expo-blur there is costly and uneven. The web gets the blur from CSS backdrop-filter.

## Out of scope

-   Light screens: the effect is light on dark.
-   Labels.
-   Brightening the bar's blur beyond what it gives. That would need a blend with the native blur, which iOS doesn't do; the glass lens carries the strong colour instead.

## Verification

-   The registry's bar tests cover it (renders one tab per route, presses through).
-   Simulator: as in the implementation notes.
