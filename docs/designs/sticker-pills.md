# Sticker Pills

-   **Status:** Implemented (2026-11-24) from a clip of Bonds' current tab bar that the owner shared. Checked and recorded on the iOS simulator.
-   **Design:** `sticker-pills`, a tab bar in `registry/`. No foundation changes.

## Overview

A playful floating row for dark apps. Each tab is a glossy sticker icon overlapping a small label pill in heavy condensed capitals. Idle pills are a faint grey. The active pill fills with its tab's own colour and the whole tab pops: it grows a little, tilts, and springs level, like a sticker slapped on. The row sits on a dark fade over the screen, so content scrolls under it.

## The reference, frame by frame

From the shared clip at 30 fps (Bonds: Today, Chat, Wall):

-   Every tab shows its sticker icon in full colour. Each label sits on a dark grey pill, and the sticker overlaps the pill's leading end.
-   The active pill is filled with the sticker's colour (green for Chat, cream for Today), has a light rim, and carries a dark label. The active tab is about 10% larger than the others, and its sticker grows a little more.
-   The switch happens on release. In about 2 frames the old pill drains to grey. Over the next 2 or 3 frames the new pill fades in, tilted a few degrees and slightly undersized, then overshoots its size and settles level by about frame 8 (≈ 250 ms). The other tabs don't move: the growth is a transform, not a relayout.

The stickers here are original drawings (sun, chat bubble, photos, smiley), not traced from Bonds' 3D renders.

## Decisions

-   **Floating over a fade.** `TabBarRoot placement="floating"`, 6 pt above the bottom safe area and as wide as the screen. `colors.scrim` is solid behind the row and down to the screen's bottom edge, and a `LinearGradient` fades it out over 40 pt above the row, so nothing shows through the idle pills. The tabs size to their content and sit centred, 8 pt apart. Pass the screen's background as `scrim`.
-   **Per-tab colour.** `tones` maps route names to `{ fill, rim, label }`. A tab without an entry takes the next of `stickerPillsTones` by position: sun, green, coral, sky, lilac (the order of the demo's stickers). Each default keeps its label above 4.5:1 on its fill. Idle labels are white at 56% on the scrim.
-   **Motion: lively.** Gaining focus, the tab springs from 0.9 to 1.1 of its size (`withSpring`, 420 ms, damping ratio 0.6: one small overshoot). It starts tilted 8° and rocks level on its own, looser spring (600 ms, damping ratio 0.4), swinging just past level once, so the tilt outlasts the growth and reads as a sticker slapped on. (On the simulator, a tilt tied to the size lasted only a frame or two.) Its colour fills in 160 ms, easing out. Losing focus, the colour drains in 110 ms (70%) and the tab eases back to its size in 160 ms, with no bounce. Pressing dips the tab to 94% as the finger lands (`TabButton`'s `scale`). Only transforms and colours animate, on the UI thread. With reduce motion on, everything changes at once.
-   **Type.** Avenir Next Condensed Heavy on iOS (built in), and the system condensed sans in bold elsewhere, so no font is added. 15 pt capitals, shrinking to 80% before they'd truncate, capped at 1.2× text size. A `fontFamily` prop takes a loaded font instead.
-   **Badges on the sticker.** A red dot or count with a white rim at the sticker's top corner, like a second sticker. Counts use tabcn's `BadgeCount`. Screen readers hear the badge with the label, from `TabButton`.
-   **Right to left.** The row mirrors, so the sticker sits on the pill's right, and the tilt mirrors with it.
-   **Haptics.** A selection tick on press, as the other designs have.
-   **Needs `react-native-tabcn@>=0.4.2`:** a tab's first visit would otherwise remount it and skip the pop.

## Demo

The `chat` scene in its dark palette, with Today, Chat (where it opens), Wall (a count of 3) and Me (a dot). The recording goes left to Today, then right to Wall and Me, and back to Chat.

## Out of scope

-   One shared highlight that slides between tabs: each tab pops in place, as in the reference.
-   More than four tabs at phone width.

## Verification

-   The registry's bar tests cover it (one tab per route, presses through, one tab selected after a change), plus a badge test.
-   On the iOS simulator (3x): the stickers, the solid scrim behind the row (a first version let chat text show through the idle pills), the pop and the rocking tilt; recorded for the site and README.
-   Still to do on a device: the pop at 120 Hz on hardware, Android's condensed font, four tabs on a 320 pt screen, and right to left.
