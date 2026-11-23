# Thumb Arc

-   **Status:** Proposed (2026-11-24), implemented, waiting for the owner's review on a device. An original idea, not taken from a reference. Built without the Goldfish review, as for the last designs.
-   **Design:** #47, `thumb-arc`, a tab bar in `registry/` (layout `floating-buttons`, style `minimal`, shown in the `maps` scene, light). No foundation changes.
-   **Not checked yet:** a simulator or a device (the recording comes after), Android, right to left, VoiceOver and TalkBack.

## Overview

A tab bar for one hand. At rest there is no bar: a round 60 pt button floats in a bottom corner, 12 pt above the home indicator, showing the current tab's icon. Hold it (260 ms), or press and slide, and the tabs fan out of its centre onto a quarter circle around it. Sliding toward a tab grows it, fills it with the accent and shows its name in a pill; a selection haptic marks each change. Lifting on a tab switches to it; lifting anywhere else folds the fan away. A tap opens the fan and leaves it open, with every name showing, so a tab can be tapped.

## Decisions

-   **One floating button, no bar.** `TabBarRoot placement="floating"`; the box is the button alone, pushed to its corner with `alignSelf` and a 20 pt margin, so the bar reports only the button's height (60 + 12 + the bottom inset) and taps beside it reach the screen. The fan and the scrim are drawn from inside the bar, laid out (not transformed) outside its box, as Composer Dock's menus are, so they can be touched.
-   **A physical corner.** The button stays bottom right (or `side="left"`) in right-to-left apps: reach follows the hand, not the language. The tabs fill the arc in reading order, from the left, or from the right in RTL.
-   **The arc.** A quarter circle from beside the button to straight above it, radius 128 pt, growing when more tabs need room (8 pt between 50 pt circles: 149 pt for five). Each name pill sits outside its grown circle on the line from the button through it, so pills don't cover neighbours.
-   **Choosing.** The tab under the finger is the one nearest along the arc by angle, within half a step plus 25°, from 34 pt to radius + 106 pt from the button's centre; closer or further points at nothing. It is worked out on the UI thread; the JS thread hears only when it changes (for the haptic) and when the finger lifts.
-   **Gestures.** Two pans race on the button: one activates after a 260 ms hold, the other after an 8 pt slide. A tap is neither, so it stays the button's own press (and its screen-reader activation). Lifting after a hold with no slide leaves the fan open, as a tap does; lifting elsewhere after a slide cancels. Needs `react-native-gesture-handler`.
-   **Badges.** The button's badge counts what waits in the other tabs: the sum of their counts, or a dot when they only have dots. Each tab in the fan shows its own. The button's label reads it ("Tabs, Explore selected, 2 new").
-   **Palettes.** Light by default (ink button, white circles, blue accent); `thumbArcDarkColors` for dark apps. PanelUI Colors maps every slot.
-   **Motion.** Tabs spring out of the button's centre (stiffness 380, damping 28: a little bounce), 26 ms apart, and fold back in reverse on an accelerating curve in 190 ms with 16 ms between them, about 70% of the way in. The tab under the finger grows to 1.18 on `tabcnSpring`; names fade in over 140 ms and out over 100 ms; the scrim fades with the fan; the button's icon crossfades. The button sinks to 0.94 while pressed. With "reduce motion" on, the fan fades in (220 ms) and out (154 ms) in place, and nothing springs or grows.
-   **Accessibility.** Closed, the button is a button named "Tabs, <tab> selected" that opens the fan; the fan's tabs are hidden. Open, each tab is a `tab` with its selected state and badge, named as `TabButton` names tabs; screen-reader focus moves to the current tab, and back to the button when the fan closes. The dimmed screen is a "Close tabs" button; the escape gesture, Android's back button and Escape on the web close the fan.

## Out of scope

-   Long-press actions on tabs (`tabLongPress`): a hold belongs to the fan.
-   More than about six tabs: the arc grows past the screen's reach.
-   A rail or wide layouts.

## Verification

-   `packages/tabcn/src/__tests__/thumb-arc.test.tsx`: closed and open accessibility, tap to open and choose, hold and slide to choose with the haptic per tab, lifting elsewhere cancels, holding without a slide leaves the fan open, the button's badge, right-to-left order, escape and back.
-   `designs.test.tsx` opens the fan before its shared checks (one tab per route, presses through).
-   On a device, still to do: the feel of the hold delay and the spring, label pills over the map, touches on the fan outside the bar's box on Android.
