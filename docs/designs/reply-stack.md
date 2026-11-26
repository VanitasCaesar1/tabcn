# Reply Stack

-   **Status:** Implemented (2026-11-25) from a screenshot and two screen recordings of X's new Android navigation bar that the owner shared. Measured against them and checked on the iOS simulator.
-   **Design:** `reply-stack`, a tab bar in `registry/`. No foundation changes.

## Overview

A frosted-glass bar for content apps. One wide glass capsule holds five icon-only tabs. A round glass lens glides behind the active tab, whose icon turns from an outline to a solid shape. On a post's page a second capsule of the same width sits above the first and holds the reply field: the viewer's photo, "Post your reply", and photo, GIF and expand buttons. The feed shows through both, blurred.

## The reference, measured

From the dark screenshot (1216 px wide) and the recordings (1080 px wide, light and dark pages), scaled to a 402 pt screen:

-   **Capsules.** Both are the screen's width less 18 pt a side. The tab capsule is 72 pt tall, the reply capsule 64 pt, 10 pt apart. The tab capsule's bottom edge is 20 pt above the screen's: lower than a usual floating bar, just clear of the home indicator.
-   **Tabs.** Five equal cells, 4 pt in from the capsule's ends. Glyphs are about 23 pt with a 2.4 pt stroke. Home, bell and chat turn solid when active.
-   **Lens.** It fills the active tab's cell, 4 pt inside the capsule's top and bottom (about 71 by 64 pt). Light: a grey glass bead, lighter at the top left, darker to the bottom right, with a white rim and a soft shadow. Dark: a translucent lighter disc with almost no rim.
-   **Glass.** Light: white frost (the page behind shows through at about 40%), a bright white edge and a soft grey shadow. Dark: a darkened blur with a faint edge that is brightest along the top right and the bottom left.
-   **Reply row.** The photo is 38 pt across, 10 pt in. "Post your reply" is about 17.5 pt in X's grey. The three action glyphs are about 21 pt, 56 pt apart, the last 37 pt from the capsule's end.
-   **Not in the clips:** a tab change, and a search (2026-11-25) found no other footage of the bar. The lens motion is inferred (below).
-   **Not part of this design:** the round black compose button that floats above the bar's end in the recordings. It is a separate control; Companion Chip draws one.

The glyphs are drawn by hand to those proportions, not traced. The explore glyph is a plain ring with a blade through it, not xAI's Grok mark.

## Decisions

-   **One design, one bar.** `ReplyStack` draws both capsules inside `TabBarRoot placement="floating"`, so the bar box grows upward when the row appears and screens that pad with `useBottomTabBarHeight()` follow. The tab capsule doesn't move.
-   **The row belongs to the screen, not the tab.** A post's page is rarely a tab, so the row is opt-in: pass `reply` (placeholder, photo, `onPress`, `actions`) and drive `showReply` from your own state. Without `reply` there is no row. The demo shows it on Home only.
-   **Frosted blur, not Liquid Glass.** X's bar is a blur with a tint and a lit edge, so this design uses `BlurView` on iOS and the web even where Liquid Glass is available. expo-blur's web blur is a fifth of the intensity in px, half as strong as iOS at the same value, so the web gets twice the intensity. Android can only blur what a `BlurTargetView` wraps, and a tab bar can't wrap the screens, so there it is a denser fill with the same edge.
-   **Files.** `reply-stack.tsx` (the bar, the row, the tabs), `reply-stack-glass.tsx` (the glass and the lens), `reply-stack-icons.tsx`, all in the one registry item so each stays under about 400 lines ([composer-dock-split.md](composer-dock-split.md)).
-   **The edge and the lens are drawn once in SVG** at the capsule's size: a hairline outline, then a 1.2 pt rim whose gradient runs from the top right to the bottom left. react-native-svg drops the alpha of an `rgba()` stop colour, so colours are split into `stopColor` and `stopOpacity`.
-   **Light or dark.** `tint` picks the glass; without it the bar follows the system's appearance, as X does. Every colour can be overridden through `colors`.
-   **Motion (lively).** The lens glides on `tabcnSpring`, and stretches as it sets off: up to 14% wider and 5% flatter in 110 ms, springing back while the glide finishes, so it lands round. X's clips never change tab, so this is inferred from how glass lenses move on today's phones, not copied. The solid icon crossfades in over the outline on `tabcnTiming`, the outline holding until late so the icon never looks dimmed half-way. A pressed tab dips to 88% as the finger lands (`TabButton`'s press scale); a pressed reply field dips the whole row to 98% in 100 ms and springs back. The row rises 12 pt and grows from 96% over 220 ms (ease out), and sinks away in 150 ms (ease in: nobody tapped it away), about 70% of the entrance. Reduce motion makes every change instant.
-   **Fading glass.** iOS can't blur inside a view whose opacity, or any parent's, is below 1: the screen shows through sharp. So nothing above the row's blur fades. The blur's strength rises with the row's presence, and the tint, edge, content and shadow fade on their own. The row stays mounted until its exit finishes, then unmounts so the bar's box shrinks back.
-   **Touch.** The field and each action button are separate pressables. The whole field presses (opens the composer); action buttons are 56 by 48 pt and dim while held. A selection tick on pressing an inactive tab and on the field.
-   **Accessibility.** The field is a button named by its placeholder; each action has its own label. Tabs are read as tabs with their badge, by `TabButton`. The placeholder stops growing at 1.3× and then shrinks to fit rather than cut off.
-   **Tab count.** Made for five; three to six work. The lens fills a tab's cell but is never taller than it is wide, so with six or more tabs it stays a circle.
-   **Badges.** A count or a dot at the glyph's top right, in X's blue, with tabular figures.

## Out of scope

-   The compose button (Companion Chip).
-   A text input in the row: it opens your composer, as X's does.
-   Minimizing on scroll (X's bar stays put in the clips).

## Verification

-   The registry's bar tests cover it (one tab per route, presses through, works under a provider), plus two tests of the row: it presses through and each action is a labelled button, and it is absent when hidden or when no `reply` is given.
-   On the iOS simulator (3x), compared side by side with the reference at the same scale: dark and light glass, the edge, the lens, sizes and spacing.
-   Frame by frame at 30 fps: the lens glide (about 130 ms across two tabs), the crossfade, the row's exit and entrance with the screen staying blurred under it, and with Reduce Motion on, every change in one frame.
-   The largest accessibility text size: the placeholder fits. VoiceOver labels from the accessibility tree.
-   Three and six tabs on the simulator: the lens is a wide capsule with three and a circle with six.
-   The web preview in WebKit (Playwright), left to right and right to left (`&rtl=1`): the row and tabs mirror, the lens follows, no page errors. Headless WebKit doesn't draw `backdrop-filter`, so the web blur itself is checked only from the CSS it produces (`blur(12px)`).
-   `feel` check and `unslop-ui` count: nothing to fix.
-   Still to do on a device: 120 Hz on hardware and Android's fill (no Android emulator or phone was available), and the web blur in a real browser.
