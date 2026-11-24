# Ink Underline

-   **Status:** Approved (2026-11-24) from the owner's brief and implemented. Not yet checked on a device: the recordings and that check come with the pull request.
-   **Design:** #47, `ink-underline`, a tab bar in `registry/`. An original idea, not taken from an app. No foundation changes.

## Overview

An editorial bar: serif text tabs on a paper-coloured bar docked to the bottom edge, a hairline above it, no icons. The active label is full ink and the others grey. Under the active label sits a brush stroke that presses in, swells and flicks up at its tail. The ink flows the way the active tab moves: the old stroke is pulled off toward the new tab while the new one draws in from the side the ink came from.

## Decisions

-   **Docked, text only.** `TabBarRoot placement="docked"`, 54 pt above the bottom safe area, labels in the system serif at 16 pt (Georgia on iOS and the web, `serif` on Android), so no font is added. A `fontFamily` prop takes a loaded font instead. Labels shrink to 80% before they would truncate.
-   **A brush, not a rule.** Each tab's stroke is one filled react-native-svg path, built once from its label's measured width (`onLayout`, set in state only when the width changes) and seeded by the tab's index. Its outline follows a brush: it presses in narrow, swells to 3.4 pt, thins to a tail that flicks up as the pen lifts, and its line rises a little and wavers differently on each tab. (Revised 2026-11-24: the first version, a 2.4 pt dashed line with a thinner second pass, read as a plain underline.)
-   **The ink follows the tap.** Tapping a tab to the right pulls the old stroke off to the right and draws the new one in from its left; tapping left runs both the other way (mirrored right to left, where the tabs are). A stroke still drawing in when its tab loses focus goes back the way it came.
-   **Revealed by a sliding window, on the UI thread.** The stroke sits in a clipping view as wide as itself. One shared value per tab (-1 or 1 hidden at that end, 0 shown) moves the window across by that share of its width and the stroke back by the same amount, so only the window's edge moves. That is two transforms per frame: no re-render, relayout or SVG prop update while it moves.
-   **Motion: soft.** A reading app's tone (FEEL's `soft`): the new stroke draws in 420 ms, easing out (`0.22, 1, 0.36, 1`); the old one is pulled away in 290 ms (70%), accelerating (`0.4, 0, 1, 1`). The new tab's stroke never eases in. An interrupted change turns back from where the stroke is. Labels crossfade on `tabcnTiming` and dim to 55% while pressed (70 ms in, 180 ms out), so a tap answers as the finger lands. With reduce motion on, strokes appear and disappear at once (`ReduceMotion.System`).
-   **Badges in type.** An empty badge is a 5 pt ink dot after the label; a count is a superscript in the same serif (tabcn's `BadgeCount`, tabular numbers, digits roll); other text is a superscript as written. The badge hangs after the label, so the label stays centred. Screen readers hear it with the label, from `TabButton`.
-   **Colours.** `background`, `hairline`, `ink`, `muted` and `badge` (default: `ink`). The defaults are ink on paper; `inkUnderlineDark` is paper on ink. Both keep the grey labels above 4.5:1 against the bar. The merged colours are memoised per value, so the worklets that read them aren't rebuilt on each render. PanelUI Colors maps them to `background`, `border`, `foreground` and `muted-foreground`.
-   **Right to left.** The tabs mirror with the layout; the stroke's outline is mirrored when `I18nManager.isRTL`, so its flick is on the left, and the ink's direction follows the tabs on screen.
-   **Haptics.** A selection tick on press, as the other docked designs have.

## Demo

The `health` scene in its light palette (a warm off-white, close to the bar's paper), with tabs Today, Plan, Sessions and You: the scene's own sections. Plan carries a count and You a dot. The bar follows the Customize panel's light or dark scene (`inkUnderlineDark` when dark). The recording steps forward through the tabs and back to the first.

## Out of scope

-   Icons.
-   One stroke that slides between tabs: each tab has its own stroke, drawn and pulled away in place.

## Verification

-   The registry's bar tests cover it (one tab per route, presses through, one tab selected after a change), plus tests for the stroke's size, its absence before the label is measured, and the badges.
-   On the iOS simulator (2026-11-24, brush revision): the stroke draws in from the side the ink comes from and the old one is pulled toward the new tab; recorded for the site and README.
-   Still to do on a device: Android's clipping of the stroke's window, 1x screens, and right to left.
