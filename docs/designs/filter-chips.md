# Filter Chips

-   **Status:** Approved (2026-11-23) and implemented. The owner chose "build it" from a short read of the reference clip, without the Goldfish review, as for Account Dock.
-   **Design:** #45, `filter-chips`, a panel design in `registry/`. It uses `coversBar` and `backdrop`, added to `TabPanel` for it (`docs/designs/panel-cover.md`), so it needs `react-native-tabcn` 0.4.0.
-   **Implementation notes (2026-11-23):**
    -   First version: the sheet grew from the tapped chip alone, rose from behind the bar, and faded its content in at the end. The owner judged it below the reference: a blank dark block grew and the content appeared late. Rebuilt as below: the whole capsule grows into a card that rises from the strip's line and stops above the bar, the content rides the card's top edge, and the chip's label becomes the card's title.
    -   Second rebuild, after the owner still found it short of the reference: the clip's bar slides away and the screen behind blurs. Both needed the foundation (`docs/designs/panel-cover.md`). Open, the bar now slides away, the card settles into the bar's place, and the screen behind blurs (iOS, web) and dims (everywhere).
    -   Third pass, after the owner pointed at the motion, the strip at rest and the card's finish: the motion now runs in the reference's two stretches (widen, then rise), the label no longer travels, and the strip and card were resized and finished as below.
    -   Chip positions come from layout events, not `measureLayout`: inside a horizontal scroll view laid out right to left, React Native reported every chip 120 pt off (the scroll range). The capsule's scroll view is laid out left to right, with `row-reverse` when the app is right to left.
    -   Checked in Expo Go on an iPhone 17 Pro simulator (iOS 26.5): each group, Apply with one and several choices, the all-filters card, back, a scrolled strip, right to left (`TABCN_RTL=1`) and the largest accessibility text size. Not done: a physical device.

## Overview

A dark strip of filter chips peeks out from behind the tab bar: a round "all filters" button, a capsule of chips that scrolls sideways (Sort, Delivery, Category…), and a round clear-all button that appears once something is applied. Tapping a chip grows the capsule into a card with the group's options, Clear and Apply. Apply folds the card back into the capsule, and the chip now names the choice in the accent colour ("Top rated", or "Ships today +1" for several). The round button opens every group in one card.

The reference is a 22 s concept clip (Arnab Debnath, "Filter chips, but the sheet comes from the chip itself"). We take the interaction, not its copy or styling.

## Decisions

-   **It is one `TabPanel`.** It peeks as the strip and opens as the card. So the strip reserves its height in `useTabBarInset` like Mini Player, and Android back, web Escape and the screen-reader escape gesture fold it with no handling of its own.
-   **Open, it takes the bar's place.** With `coversBar`, the floating bar slides away and the card moves down into its place, as in the clip. With `backdrop`, the screen behind blurs (iOS and the web, `expo-blur`) and dims (`colors.backdrop`; Android dims only, as Mini Player does). A tap on it folds the card and drops the draft, like back. `blur={false}` keeps only the dim.
-   **The capsule becomes the card, in two stretches, as in the reference.** First the capsule widens to the bar's width, swallowing the round buttons, while the chips fade. Then the card grows up out of that full-width pill: its bottom edge stays on the strip's line while the panel slides it into the bar's place. Folding back runs in reverse: the options fade, the card drops to the full-width pill as the bar returns, the chips come back inside it, and it narrows to the capsule on the spring's slow end. Both stretches are slices of one spring (`WIDEN_UNTIL`, `RISE_FROM`), so the card stays in step with the panel.
-   **The title and options fade in where they sit.** They ride the card's top edge and are cut off at the strip's line, so the card seems to push them up out of the strip. An earlier version flew the chip's label up into the title; the reference doesn't, and it read as busy.
-   **Finish.** A 48 pt strip with a soft shadow over the content. A hairline edge on the card. 40 pt options, outlined in the accent colour when chosen; the outline is the same width either way, so choosing never re-wraps the card. Apply is tinted only once the draft differs.
-   **Picks are a draft.** The card edits a copy of `value`. Apply calls `onChange` once and folds back. Back, Escape or the escape gesture fold back and drop the draft. Apply is tinted only once the draft differs, and stays pressable, so it is also the way out on iOS when nothing changed. Clear empties the draft for the groups in view; it doesn't apply or close.
-   **Clear all applies at once.** The round ✕ calls `onChange({})`. Undo, if wanted, is the app's (it owns the value).
-   **One choice or several per group.** `multiple` groups read as checkboxes, others as radio buttons; tapping a chosen option clears it in both.
-   **The chip names its choice.** None: the group's label. One: that option. Several: the first and "+N". On the fold, a chip scrolled partly out of view (or pushed out when the clear-all button appears) scrolls into view first.
-   **Transforms and opacity only.** The card is two bands (unit squares scaled with `scaleX`/`scaleY`) and four corner circles that move and scale. The cut-off at the strip's line is a clip moved one way and its content moved back the other. All of it runs on `tabcnSpring` in the same commit as the panel's slide. Nothing is laid out per frame.
-   **Height.** Every group's card is laid out once. The tallest sets the panel's height, and each card sits at its bottom, so switching groups never re-measures the panel. The all-filters card scrolls past half the window, with a fade at its bottom edge.

## Accessibility

-   Chips are buttons: "Sort, Top rated", with `expanded`. The round button reads "All filters, 2 applied".
-   While open the foundation hides the bar from screen readers. The card's title is a header; options are radio buttons in a radio group, or checkboxes; Clear and Apply are buttons.
-   Focus returns to the chip that opened the card when it folds back.
-   Text caps at 1.3x in the strip, where the width is fixed by the bar, and 1.6x in the card.

## Out of scope

-   Range filters (a price slider), search inside a group, counts per option. Apps can put those in their own sheet.
-   Drag to dismiss: the card is short and Apply closes it.
-   Hiding per screen: the app declares it on the screen that filters and hides it on blur (`useTabPanel(id).hide`), as panels already document.

## Verification

-   Unit tests: a chip opens its group; Apply calls `onChange` with the draft and folds back; back drops the draft; multiple groups toggle checkboxes; clear-all; the chip summary.
-   Simulator: as in the implementation notes. Media recorded as for every design.
