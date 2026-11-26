# Motion pass and side rail

-   **Author:** VanitasCaesar1 (drafted with Claude)
-   **Status:** Proposed (2026-11-20). The owner asked to build it ("do 2 3 4"); review happens in the pull request.
-   **Date:** 2026-11-20
-   **Related:** [`foundation.md`](foundation.md), [`panels.md`](panels.md)
-   **Implementation notes (2026-11-20):**
    -   `TabBarState.position` is optional (undefined means `bottom`), so state built by hand for `TabBarStateProvider` keeps compiling. Both adapters always set it.
    -   The rail does not call a width callback: neither navigator has one. With `tabBarPosition: 'left'` the navigator lays screens out beside the rail's own layout box (its width), and gives screens a bar height of 0, so the rail reports 0.
    -   `minimizeBehavior="onScrollDown"` turns on the screens' scroll handlers; with `none` (or no provider) they do nothing. The reported height follows the bar's measured layout, so a design that shrinks its layout when minimized reports the compact height; one that only moves or fades parts keeps its full height. Layouts during a minimize change are held and only the settled height is reported, so screens' padding doesn't change on every frame mid-scroll. A scroll event whose content size changed (such as padding that follows the bar) resets the direction tracking instead of counting as a scroll, so the bar can't flip at the end of a list.
    -   The minimized state lives in the provider, so the bar is restored whenever the focused tab, or the focused screen inside it, changes (`TabBarRoot` watches the active tab; the adapters watch the deepest focused route).
    -   `BadgeCount` uses 180 ms `Easing.out(Easing.cubic)` (no overshoot), keys digit slots from the right, and rolls in a new leading digit (9 → 10) once its slot is measured. A removed leading digit (10 → 9) disappears without a roll. During a roll a slot is as wide as the wider of its two digits, and the `+` of `max+` sits outside the slots and never rolls. The badge is hidden from screen readers; `TabButton`'s default label includes the tab's `badge` instead.

## Overview

Three additions to the `tabcn` foundation, plus the designs that use them:

1.  **Minimize on scroll:** scrolling a screen down shrinks the tab bar to a compact form; scrolling up (or reaching the top) restores it. iOS 26's own tab bars do this, and tabcn designs lost it by not using native tabs.
2.  **Badge count roll:** a numeric badge that changes rolls its digits instead of jumping.
3.  **Side rail placement:** a tab bar drawn as a vertical rail on the left edge, for iPads and tablets, using the navigators' existing `tabBarPosition: 'left'`.

Per-design motion (how each design's highlight, icons and labels move) needs no new API: it is built from `useTabIndicator`, `useFocusProgress` and the motion tokens, and is specified per design from each source app's own motion.

## Goals

-   Every addition respects tabcn's motion rules: no overshoot or bounce, critically damped springs or ease-out timing, and instant changes when the OS "reduce motion" setting is on.
-   An app that uses none of these sees no change and installs nothing new.
-   Works with both navigators (Expo Router's tabs fork and `@react-navigation/bottom-tabs`).

## Non-Goals

-   Bounces, pops, wobbles or scale "juice" on tab changes.
-   Hiding the bar completely on scroll (minimize keeps it usable).
-   A top tab bar (`tabBarPosition: 'top'`) or a right-side rail.

## Technical Plan

### One provider for screen-to-bar state

The panels design introduced a provider placed around the tabs navigator, because screens and the tab bar are siblings in the navigator's tree. Minimize-on-scroll needs the same bridge (a screen's scroll drives the bar), so the provider is named for both jobs: **`TabBarProvider`** (called `TabPanelsProvider` in `panels.md`; nothing has shipped under that name, and `panels.md` is updated to match). Without the provider, both features are inert.

### Minimize on scroll

-   **`useMinimizeOnScroll(options?)`** returns a Reanimated scroll handler for `Animated.ScrollView` / `Animated.FlatList` (`onScroll={handler}`). It tracks scroll direction: after the content moves down by `threshold` (default 24 pt) the bar minimizes; any upward scroll of the same distance, or reaching the top, restores it. Scrolling past the end (bounce) is ignored.
-   **`useTabBarMinimized()`**, read by designs: a shared value from 0 (full) to 1 (minimized), animated with `tabcnTiming`. Designs decide what "compact" means (labels fade out, the pill narrows, the bar drops lower). A design that ignores it simply doesn't minimize.
-   **Opt-in per design:** `TabBarRoot` gets `minimizeBehavior?: 'none' | 'onScrollDown'` (default `none`). When `onScrollDown`, the reported height follows the compact height so screens can keep their padding.
-   **Touches while minimized (added 2026-11-27, with Reply Stack's minimize):** a minimized design usually draws less than its box (a circle where the pill was, a row moved down by a transform), and the floating box took the touches in the empty part, so the content minimizing had just uncovered couldn't be tapped or scrolled. While minimized (the target is 1), a floating box is now `box-none`: touches reach the screen wherever the design draws nothing. At full size the box keeps its touches, because a design may paint the box itself (Section Sheet's fallback bar does).
-   **`useRestoreTabBar()`** returns a `() => void` that brings a minimized bar back to full (target and progress to 0, on `tabcnTiming`), the same path the bar uses when the focused tab or screen changes. It is for "tap the minimized bar to expand", as iOS 26 does: a design puts a press target over its compact form that calls it, without switching tabs. Scrolling down again minimizes the bar again. It does nothing without a provider.
-   With "reduce motion" the change is instant.

### Badge count roll

-   **`<BadgeCount value={n} max={99} style textStyle />`**: renders a number; when `value` changes, each changed digit slides vertically out and the new one in (180 ms, ease-out, direction by increase or decrease). It clips its own height, so there's no layout jump. Values above `max` show `max+`. Reduce motion swaps instantly.
-   Designs with numeric badges render it in their badge.

### Side rail placement

-   **`TabBarRoot placement="rail"`**: a vertical bar on the left edge, full height, padded by the top, left and bottom safe areas. It reports its **width** to the navigator's layout (screens are laid out beside it by the navigator when `tabBarPosition: 'left'`).
-   The adapters read the navigator's position (`tabBarPosition` from the focused route's options) and expose it in `TabBarState` as **`position: 'bottom' | 'left'`** (other values are treated as `bottom`), so a design can draw a bottom bar on phones and a rail on tablets from one component.
-   `TabList` and `useTabIndicator` already work in two dimensions (frames have x, y, width and height), so a vertical list needs only `style={{ flexDirection: 'column' }}`.

## Alternatives Considered

-   **Separate provider for minimize:** two providers to place around the navigator for one job each. Rejected: one bridge is simpler for apps.
-   **Minimize driven by the navigator's scroll events:** neither navigator exposes scroll state to the tab bar.
-   **A rail as a separate component outside the navigator:** loses the navigator's own layout (screens beside the rail), deep links and back handling. `tabBarPosition` already does this.

## Detailed Implementation Plan

-   `packages/tabcn/src/provider.tsx` (create): `TabBarProvider` holding panel state (per `panels.md`) and the minimize shared values.
-   `packages/tabcn/src/minimize.ts` (create): `useMinimizeOnScroll`, `useTabBarMinimized`, `useRestoreTabBar`.
-   `packages/tabcn/src/BadgeCount.tsx` (create).
-   `packages/tabcn/src/TabBarRoot.tsx` (modify): `placement="rail"`, `minimizeBehavior`, compact-height reporting.
-   `packages/tabcn/src/state.tsx`, `build-state.ts`, `expo-router.tsx`, `react-navigation.tsx` (modify): `position` in `TabBarState`, read from `tabBarPosition`.
-   `packages/tabcn/src/index.ts` (modify): export the new API.
-   `packages/tabcn/src/__tests__/motion.test.tsx` (create): minimize thresholds and restore-at-top; `useRestoreTabBar` restores without a tab change; badge clamp to `max+`; rail placement reports width; `position` from both adapters; no provider means no change.
-   `.changeset/motion-and-rail.md` (create): minor bump.
-   `docs/designs/panels.md` (modify): provider renamed to `TabBarProvider`.

## Verification Plan

-   `bun run check`; `cd apps/example && bunx expo-doctor`.
-   Simulator: record a scrolling screen and check frame by frame that the bar minimizes and restores with no overshoot; same with "Reduce Motion" on (instant); a tablet simulator (iPad) for the rail.
