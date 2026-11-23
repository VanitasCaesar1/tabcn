# Ink Underline

-   **Status:** Approved (2026-11-24) from the owner's brief and implemented. Not yet checked on a device: the recordings and that check come with the pull request.
-   **Design:** #47, `ink-underline`, a tab bar in `registry/`. An original idea, not taken from an app. No foundation changes.

## Overview

An editorial bar: serif text tabs on a paper-coloured bar docked to the bottom edge, a hairline above it, no icons. The active label is full ink and the others grey. Under the active label a hand-drawn ink stroke draws itself from the leading edge when the tab becomes active, while the previous tab's stroke wipes away in the same direction.

## Decisions

-   **Docked, text only.** `TabBarRoot placement="docked"`, 54 pt above the bottom safe area, labels in the system serif at 16 pt (Georgia on iOS and the web, `serif` on Android), so no font is added. A `fontFamily` prop takes a loaded font instead. Labels shrink to 80% before they would truncate.
-   **The stroke is a dash on the UI thread.** Each tab's stroke is a react-native-svg path built once from its label's measured width (`onLayout`, set in state only when the width changes) and seeded by the tab's index, so each stroke wavers a little differently. It is drawn with the dash pattern `[L, L]`, where `L` is the length of the line through the curve's points, which the curve never exceeds. One shared value per tab (1 not drawn, 0 drawn, -1 wiped) drives `strokeDashoffset` through `useAnimatedProps`; nothing re-renders while it moves. Offsets stay positive (a wiped stroke is a whole period on), as Android's dash effect doesn't take negative ones.
-   **A brush, not a rule.** The stroke rises slightly, wavers, and lifts at its end as a pen does. A thinner second pass crosses it through the middle at 85% opacity, so its weight varies like a brush's. The second pass draws and wipes in step with the main stroke's tip.
-   **Motion: soft.** A reading app's tone (FEEL's `soft`): the stroke draws in 340 ms, easing out (`0.33, 1, 0.68, 1`); the old one wipes away in 240 ms (70%), accelerating (`0.4, 0, 1, 1`). The new tab's stroke never eases in. An interrupted change turns back from where the stroke is: a stroke still drawing in draws back out, one wiping away draws back in. Labels crossfade on `tabcnTiming`. With reduce motion on, strokes appear and disappear at once (`ReduceMotion.System`).
-   **Badges in type.** An empty badge is a 5 pt ink dot after the label; a count is a superscript in the same serif (tabcn's `BadgeCount`, tabular numbers, digits roll); other text is a superscript as written. The badge hangs after the label, so the label stays centred. Screen readers hear it with the label, from `TabButton`.
-   **Colours.** `background`, `hairline`, `ink`, `muted` and `badge` (default: `ink`). The defaults are ink on paper; `inkUnderlineDark` is paper on ink. Both keep the grey labels above 4.5:1 against the bar. The merged colours are memoised per value, so the worklets that read them aren't rebuilt on each render. PanelUI Colors maps them to `background`, `border`, `foreground` and `muted-foreground`.
-   **Right to left.** The tabs mirror with the layout; the stroke's points are mirrored when `I18nManager.isRTL`, so it draws from the right.
-   **Haptics.** A selection tick on press, as the other docked designs have.

## Demo

The `health` scene in its light palette (a warm off-white, close to the bar's paper), with tabs Today, Plan, Sessions and You: the scene's own sections. Plan carries a count and You a dot. The bar follows the Customize panel's light or dark scene (`inkUnderlineDark` when dark). The recording steps forward through the tabs and back to the first.

## Out of scope

-   Icons.
-   A stroke that slides between tabs: each tab has its own stroke, drawn and wiped in place.

## Verification

-   The registry's bar tests cover it (one tab per route, presses through, one tab selected after a change), plus tests for the stroke's size, its absence before the label is measured, and the badges.
-   On a device, still to do: the stroke's look at 1x and 3x, Android's dash rendering, and right to left.
