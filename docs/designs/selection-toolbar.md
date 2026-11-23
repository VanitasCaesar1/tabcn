# Selection Toolbar

-   **Status:** Implemented 2026-11-24 from the owner's brief, without the Goldfish review, as for the last designs.
-   **Design:** `selection-toolbar`, a panel design in `registry/`. Built on the public `useTabBarOverride`; no foundation changes.
-   **Implementation notes (2026-11-24):** Typechecked and tested in Jest only. Not yet seen on a device: the media and the look on a simulator come next.

## Overview

A common pattern in photo, file and mail apps: when a screen enters select mode, the tab bar turns into an action bar for the selection, and turns back when selection ends. The toolbar shows the count on the leading side ("3 selected", its digits rolling as it changes), then three or four actions as icons with short labels (Share, Move, Delete; Delete in the destructive colour), then a round done button.

```tsx
useTabBarOverride(
  selecting ? (
    <SelectionToolbar
      count={selected.size}
      actions={[{ id: 'share', label: 'Share', icon: ShareIcon, onPress: share } /* … */]}
      onDone={() => setSelecting(false)}
    />
  ) : null,
);
```

## Decisions

-   **Content for the override slot, not a panel.** The screen that selects owns the state, and `useTabBarOverride(element | null)` already crossfades the tabs out and the element in while that screen is focused, and back on blur or `null`. Context Tray works the same way.
-   **Its own surface, in the bar's shape.** The bar's material often fades with its tabs (Soft Pill's pill is part of its tab list), so the toolbar draws a surface that fills the bar's area: a capsule by default, the shape of a floating pill; `radius={0}` and the bar's colour for a docked bar.
-   **Entry that follows the tap.** The foundation fades the tabs out over the first half of its 200 ms crossfade and the override in over the last 70%. The toolbar's items wait for that (60 ms), then rise 8 pt and fade in one after another, 20 ms apart, 180 ms each on an ease-out: 320 ms in all. The exit is the foundation's 200 ms fade of the whole toolbar, about 60% of the entry. With reduce motion on, the items fade in together over 200 ms with no rise (the foundation's own crossfade is instant then).
-   **Disabled while nothing is selected.** Actions dim to 32% and can't be pressed at a count of 0; screen readers hear them as disabled. An action can also be turned off on its own (`disabled`).
-   **Press and haptics.** Actions use `PressableScale` (sinks to 0.96, a tint behind the icon while pressed) and a light impact haptic when they run; the done button gives a selection tick.
-   **Ending selection.** The done button, Android back (consumed while the toolbar is up), Escape on the web and the screen-reader escape gesture all call `onDone`.
-   **Narrow bars.** Labels show when the bar's area is at least 150 pt plus 52 pt per action wide (306 pt for three); narrower, the icons stay and the labels hide. Below about 260 pt it is too cramped. On a rail it stacks.
-   **Light and dark.** Light defaults suit light floating pills; `selectionToolbarDarkColors` is the dark palette. PanelUI Colors maps it to `surface`, `border`, `foreground`, `destructive`, `secondary` and `surface-tertiary`.
-   **No per-frame JavaScript.** One shared clock drives the entry; each item reads its stretch of it in a worklet. Colours are merged once per change of their values, and no worklet reads them.

## Demo

Paired with Soft Pill on the `files` scene (light). With the demo's `select` scene action, the file list comes first on every tab: its Select button, or a long-press on a file, turns select mode on, taps check files in and out with a round check that pops in, and the count rolls. Share and Move end selection; Delete also takes the files out of the list. The demo keeps Soft Pill at five tabs (`minTabs: 5`) so the labels fit.

## Out of scope

-   Select all, and a count that is a menu.
-   Morphing the bar's shape into the toolbar's: the toolbar fills whatever shape the bar has.

## Verification

-   `designs.test.tsx`: the toolbar shows in the bar's place with its count, its actions are disabled at 0 and run once something is selected, and Done, the escape gesture and Android back call `onDone`.
