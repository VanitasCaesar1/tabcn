# Splitting Composer Dock

-   **Status:** Approved by the owner 2026-11-21 ("get it finished"), after a Goldfish review of a broader draft (below). Built in the same change.
-   **Date:** 2026-11-21
-   **Related:** [foundation.md](foundation.md) (the import rule this amends), [bottom-components.md](bottom-components.md) (Composer Dock's section)

## Problem

Composer Dock (0.2.0) was one 1,274-line file: a composer, a scrubbable icon tab row, hold menus with slide-to-choose, an attachment menu and keyboard handling. tabcn's designs are copied into an app and owned there; the other designs are 200 to 300 lines. A file this size is hard to read, change or keep.

## Decision

-   **One design, several files.** `registry/designs/composer-dock/` holds six files, each at most 400 lines, all in the one `composer-dock` registry item, so one `npx shadcn add` installs them side by side in `components/tabcn/`:
    -   `composer-dock.tsx`: the dock (`ComposerDock`, its props, the keyboard spacer, the hold gesture on the tab row, the menus' contents). It re-exports the public types, so code that imported them from `composer-dock` keeps working.
    -   `composer-dock-composer.tsx`: the input bar.
    -   `composer-dock-tabs.tsx`: an icon tab with its held glass capsule, and the name pill.
    -   `composer-dock-menu.tsx`: the menu card (drawn over the screen from inside the dock), its rows, the grow-and-blur motion and slide-to-choose.
    -   `composer-dock-theme.tsx`: colours, shared types and constants.
    -   `composer-dock-icons.tsx`: the glyphs, unchanged.
-   **Same-item imports.** A design file may import another file of the same registry item as `./<name>`, but only when `<name>.tsx` keeps its file name when installed (its `target` is `components/tabcn/<name>.tsx`). The import then resolves in the repo and in an app without shadcn rewriting it. Imports between different items stay out: each item is copied on its own. `scripts/check-registry.ts` enforces this; [foundation.md](foundation.md) states it.
-   **Nothing else changes.** Behaviour, props and look are the same as 0.2.0, so the recordings stay. The foundation (`react-native-tabcn`) is untouched, so no release is needed.

## Deferred

Each was proposed in the broader draft and is deferred until the stated trigger.

-   **A foundation bar menu** (hold to open, slide to choose, shared by Composer Dock and Sub-Tabs): when a third design needs hold-to-choose (the foundation's rule of three). Composer Dock's `composer-dock-menu.tsx` is the starting point. Two findings carry over: a React Native `Modal` cancels the finger still down from the long press, so the card must be drawn in the app's own tree; and a gesture detector around each `TabButton` breaks `TabScrub`'s frame measurement, so the hold pan belongs on the row (or inside `TabScrub`).
-   **Keyboard riding in `TabBarRoot`**: when a second design has a text field in its bar. Until then the spacer stays in Composer Dock.
-   **Moving Sub-Tabs onto a shared menu**: with the foundation bar menu; `<SubTabs>` is declared outside the bar and works with any `TabList` bar, so it needs a menu shared by name.
-   **An installable composer on its own**: when someone asks for it; it would be a second item listing `composer-dock-composer.tsx`, with a props contract and a demo.
-   **The model sheet and chat drawer**: they stay demo code. Installing them would amend approved non-goals ([panels.md](panels.md): no chat lists or sheet library; [foundation.md](foundation.md): no drawers) and the Expo Go rule (TrueSheet is not in Expo Go); that needs its own design.

## Review of the broader draft

A five-stage Goldfish review (2026-11-21) of a broader draft (blocks of parts through `registryDependencies`, a foundation bar menu, keyboard riding in `TabBarRoot`, Sub-Tabs on the menu, an installable model sheet and chat drawer) found it not ready: no way for a block to import its parts, a Sub-Tabs migration that could not keep its API, an incomplete menu contract for `TabScrub`, conflicts with the rule of three and approved non-goals, and a plan without phases that broke the site and example builds. Every stage recommended narrowing to this split, which is what this design does.

## Verification

-   `bun run check` (lint, types, the registry check with the new import rule, tests, build); the registry check rejects `./nope` and `../sub-tabs/sub-tabs`.
-   Each file is at most 400 lines.
-   The example app's Composer Dock demo behaves as before on the iOS simulator: scrub with the name pill, hold menus with slide-to-choose, tap outside, the + menu, the keyboard card, sending.
-   A fresh install: `shadcn add` of the built `composer-dock.json` copies all six files byte for byte into `components/tabcn/`, and they type-check together.
