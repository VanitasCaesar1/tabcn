# tabcn panels

-   **Author:** VanitasCaesar1 (drafted with Claude)
-   **Status:** Approved (2026-11-20); foundation part implemented
-   **Implementation notes (2026-11-20):**
    -   The provider is `TabBarProvider` (renamed in [`motion-and-rail.md`](motion-and-rail.md), which shares it for minimize on scroll).
    -   Panel content renders inside the tab bar, so it reads the contexts around the navigator, not those around the screen that declared it (React context follows where an element renders, not where it was created). The provider lives above both, so panel controls work from anywhere.
    -   Each panel draws in its own window that clips at its bottom edge, so a hidden panel taller than the bar never shows below a floating bar. The bar itself is not clipped.
    -   `overlap` is internal: 16 pt for floating bars, 0 for docked bars (their top edge is straight, and their background is the root's own, which a panel must not draw over).
    -   Anchors are measured against the `TabBarRoot` view the provider publishes, because `usePanelAnchor` is called in the design component, above `TabBarRoot`.
    -   Under a provider, the design's children sit in a wrapper that is always a box: it copies the root's content-layout style and takes over the root's padding (safe area and the design's own), so the root's padding box, which a design's absolutely positioned backgrounds fill, stays the same size whether or not an override shows. The whole design content fades, including any material it draws itself, so an override draws its own surface. The fading-out override stays mounted (the same instance) until its fade ends.
    -   A panel lives while its `<TabPanel>` is mounted. Tab screens stay mounted after their first visit, so a panel declared in a screen stays after switching tabs; hiding it on blur is the screen's job (`useFocusEffect` + `useTabPanel(id).hide`). When several mounted `<TabPanel>`s share an id (the same screen pushed twice), the latest one's content shows and the panel is released when the last one unmounts; a development warning names the id.
    -   While a panel is open, `TabBarRoot`'s root view is `accessibilityViewIsModal` (it is a sibling of the navigator's screens), and the tabs, the override and the other panels are hidden from screen readers. Focus moves to the panel (`sendAccessibilityEvent(…, 'focus')` on its content) once the open spring has finished. Android back closes it only while the tab navigator is focused, so a screen pushed over the tabs pops first. Not built yet: hiding the screens from TalkBack (Android has no `accessibilityViewIsModal`), an announcement of the open state, and hiding the part of a peeking panel's content that is clipped out of its window.
    -   Anchors re-measure whenever `TabBarRoot` or the bar lays out, because an anchor's own `onLayout` does not fire when an ancestor moves (a re-centred floating pill, a rotation).
    -   `tabcnSpring` clamps overshoot: a retarget mid-flight (open, then peek) keeps the velocity already heading for the new target, which would carry a critically damped spring past it.
    -   `PanelDragArea` uses the `Gesture.Pan()` builder, which works with gesture handler 2 and 3. It settles between the panel's resting state and open. Coordinating with a scroll view inside the panel (drag only at its top) is not built yet.
    -   Not built yet: tapping outside an open panel to close it (needs a scrim outside the bar's bounds), and an Android device check of touches on panel content outside `TabBarRoot`'s bounds.
-   **Date:** 2026-11-20

---

## Overview

tabcn today ships tab bars: a small foundation package (`tabcn`) and 20 copy-in designs. This design adds **panels**: surfaces that live behind a tab bar and slide out of it. A panel is anchored to the whole bar or to a named element in the bar, such as its action button. It can sit hidden, peek out a little, or open fully, and the user can drag it between those states.

The foundation gets one new building block for this. On top of it we ship three panel designs, copied into apps the same way as the bars:

-   **Mini player:** a now-playing strip that peeks above the bar and opens into a player.
-   **Context tray:** while a screen is open, the bar's tabs give way to that screen's own controls (for example, a progress pill and a close button), then come back.
-   **Quick-create fan:** tapping the bar's + button slides out a panel of actions from behind it.

## The Problem

Apps put more than tabs at the bottom of the screen: a mini player, an upload in progress, a "create" menu, a screen's own controls. Today a developer using a tabcn bar has to build these separately, and they usually end up fighting the bar:

-   **They sit on top of the bar instead of coming out of it.** A mini player is laid out as a separate view, so it covers part of the bar or floats above it with a gap that doesn't match the bar's shape or material.
-   **Screens don't know the space is taken.** The bar reports its height so lists can pad the bottom, but anything added next to it doesn't, so the last row of a list hides behind it.
-   **Motion doesn't match.** The bar's highlight glides on tabcn's motion; a hand-built panel uses different timing and springs, so the two feel unrelated.
-   **Accessibility gets lost.** Focus doesn't move into an open panel, the Android back button doesn't close it, and screen readers don't announce it.

The proposed solution is a panel building block in `tabcn` that handles placement behind the bar, shape and material matching, the three states and dragging, height reporting, motion and accessibility, and three designs built on it.

## Goals

-   **A panel can be anchored to the whole bar or to a named element in it (such as the + button)**, and appears to come out from behind that anchor (not on top of it).
-   **Panels work with every tab bar placement**: floating pills (Glass Expand, Soft Pill, …), docked bars (Solid Dark, Duolingo-style, …) and pill-plus-button layouts (Labeled + Plus, Glow Glass, …).
-   **Three states (hidden, peek, open)**, switched from app code or by dragging, with tabcn's no-overshoot motion. With "reduce motion" on, changes are instant.
-   **Screens keep their content visible**: while a panel peeks or is open, the height that `useBottomTabBarHeight()` reports includes it.
-   **App code controls a panel from anywhere** (a screen, a player hook), even though the panel draws inside the tab bar's layer.
-   **Accessible by default**: an open panel takes focus, the Android back button and a screen-reader escape gesture close it, and its state is announced.
-   **Works with both navigators** tabcn supports: Expo Router's tabs fork and `@react-navigation/bottom-tabs`.
-   **Three copy-in designs** (mini player, context tray, quick-create fan), each with a demo in the example app, a site page with a recording, a README GIF and a smoke test, like the existing designs.
-   **Existing bars keep working unchanged.** An app that doesn't use panels installs nothing new and sees no change.

## Non-Goals

-   **Whole screens or screen templates** (maps, chat lists, profile cards). tabcn stays about the bottom of the screen.
-   **A general-purpose bottom sheet library.** Panels are tied to the tab bar. Full-height sheets that grow from the bar are a later step, and apps that need standalone sheets should keep using a sheet library.
-   **Bars that fully morph into another shape** (Bump's bar turning into a different control set with a shape change). The context tray replaces the bar's content but not its shape. Full morphing is a later step.
-   **Copies of specific apps' panels.** Unlike the 20 bars, the panel designs are our own takes on common patterns.
-   **Web support.** Same as the rest of tabcn.

## Open Questions

-   **Content wiring**: how app code gives a panel its content and opens it, when the panel renders inside the tab bar's layer: a provider placed around the navigator, a portal, or an imperative handle.
-   **Gesture dependency**: whether `react-native-gesture-handler` becomes a required peer of `tabcn`, an optional one (dragging only when it's installed), or lives only in the designs that drag.
-   **Shape and material sharing**: how a panel takes the bar's width, corner radius and material (glass, blur, solid) without every design re-declaring them.
-   **Context tray vs navigator**: how the tray hides the bar's tabs while a screen is open and restores them, without breaking the back button, deep links or screen-reader tab roles.

## Critical User Journeys (CUJs)

### CUJ 1: Mini player while browsing tabs

-   **Given**: An app uses a tabcn bar (any placement) with a `TabBarProvider` around its tabs navigator, and the mini player design is installed.
-   **When**: The user starts a track; app code calls `peek()` on the player panel. Later the user drags the strip up, switches tabs, then drags it down.
-   **Then**: The strip slides out from behind the bar's top edge, matching the bar's width; lists on every tab gain bottom padding equal to bar + strip, so their last row stays visible. Dragging up opens the full player over the screen; dragging down returns it to the peek. Switching tabs keeps the strip. With "reduce motion" on, each change is instant.

### CUJ 2: Screen controls replace the tabs

-   **Given**: A screen (for example, an "explore" view) wants its own bottom controls: a progress pill and a close button.
-   **When**: The screen is focused, then the user taps close (or presses the Android back button).
-   **Then**: While the screen is focused, the bar shows the screen's controls in place of its tabs, in the bar's own shape, crossfading in. Closing navigates back as the app decides; once the screen loses focus the tabs crossfade back. Tab roles, the back button and deep links behave as they did without the tray.

### CUJ 3: Create menu from the + button

-   **Given**: A pill-plus-button bar (for example Labeled + Plus) with the quick-create design attached to its action button.
-   **When**: The user taps +.
-   **Then**: A panel of actions slides up from behind the + button, aligned to it. Focus moves into the panel and a screen reader announces it. Tapping an action runs it and closes the panel; tapping outside, tapping + again, or pressing back closes it.

### CUJ 4: App without panels

-   **Given**: An existing app using a tabcn bar and no panels.
-   **When**: It updates `tabcn`.
-   **Then**: Nothing changes: no new required dependency, no layout change, the bar reports the same height.

## Technical Plan (Architecture)

The design has four parts: a **provider** that holds panel state, a **panel layer** inside `TabBarRoot` that draws panels behind the bar, **anchors** that tell a panel where to come out, and an **override slot** for the context tray. Dragging lives in a separate entry point so it costs nothing when unused.

```text
 App layout (Expo Router or React Navigation)
 ┌──────────────────────────────────────────────────────────────────┐
 │ <TabBarProvider>            holds: panels{id → content, opts, │
 │   <Tabs tabBar={tabBar(<Bar/>)}>     state}, anchors{name→frame},│
 │     screens …                        override element            │
 │       useTabPanel('player').peek()  ─── writes state ───┐        │
 │       <TabPanel id="player">…</TabPanel> ─ registers content ─┐  │
 │       useTabBarOverride(<Tray/>) ── sets override ───────┐ │  │  │
 │   </Tabs>                                               │ │  │  │
 │                                                         ▼ ▼  ▼  │
 │   tab bar (rendered by the navigator):                          │
 │   <TabBarRoot>  ── reads provider ──────────────────────────────┤
 │     [panel layer]  panels drawn first = behind the bar          │
 │     [bar]          design's children, or the override element   │
 │   reportHeight(bar + visible peek) → useBottomTabBarHeight()    │
 └──────────────────────────────────────────────────────────────────┘
```

### Provider and state

`TabBarProvider` is a React context placed around the tabs navigator (in Expo Router, around `<Tabs>` in the tabs `_layout.tsx`). Both the screens and the tab bar render inside it, whichever navigator is used, so it works with both without touching the adapters. Without a provider, the panel APIs are inert and `TabBarRoot` renders exactly as today (CUJ 4).

It stores, per panel id: the latest content element, options (anchor, peek height), and the target state (`hidden | peek | open`). It also stores anchor frames and the current override element.

### Declaring and controlling a panel (content wiring)

-   **`<TabPanel id anchor peekHeight>{content}</TabPanel>`** can be placed anywhere under the provider: in a screen, or once in the layout for a global panel like a player. It renders nothing where it is written; it hands its children to the provider, which draws them in the panel layer. This is a small built-in portal: no portal library, and the content keeps the context of where it was declared because React elements are passed, not re-created.
-   **`useTabPanel(id)`** returns `{ state, peek(), open(), hide(), toggle() }`. Any component under the provider can call it. `state` is React state (for rendering) mirrored in a shared value (for animations).
-   **Lifetime:** when the declaring `<TabPanel>` unmounts, its panel animates to hidden and is removed. Declaring it in the layout keeps it across tabs; declaring it in a screen ties it to that screen's mount (see the implementation notes: tab screens stay mounted).

Rejected for this: an imperative global (`TabPanels.open(...)`); see Alternatives.

### The panel layer inside `TabBarRoot`

`TabBarRoot` gains a layer that it renders **before** its children, inside the same positioned container. Later siblings draw on top, so the bar covers the panel's lower edge and the panel appears to come out from behind it. Nothing is clipped; overlap is achieved by drawing order.

-   **Position:** a panel's bottom edge is placed `overlap` points below the bar's top edge (default: the bar's corner radius, so the join is hidden behind the bar's rounded corners). States move it with `translateY`: hidden = fully behind the bar; peek = `peekHeight` showing; open = its full measured content height showing.
-   **Width and x:** from the anchor (below). Bar-anchored panels take the bar's measured width and x; floating pills and docked bars both work because the width is measured, not assumed.
-   **Material and shape** are drawn by the panel design, not by the core. The core passes the anchor's frame and the bar's frame; each panel design takes props for background, radius and material, with defaults matching the bar designs it pairs with. (Sharing a material automatically would couple every panel to every bar design.)
-   **Several panels:** one visible panel per anchor. A mini player can peek from the bar while the create menu opens from the + button, because they have different anchors; a second bar-anchored panel that peeks or opens replaces the first (which returns to hidden). Only one panel may be open across all anchors: opening one returns any other open panel to its resting state. The open panel draws above peeking ones.

### Anchors

-   **`anchor="bar"`** (default): the bar's own frame, measured by `TabBarRoot`'s inner container.
-   **`anchor={{ name }}`**: a named element in a bar design, such as the + button. A design marks it with `usePanelAnchor(name)`, which returns `onLayout`/`ref` props that measure the element relative to `TabBarRoot` and store the frame in the provider. Bar designs with an action button (Labeled + Plus, Pill + Plus, Glow Glass, Segment + Search, Center CTA) get one `usePanelAnchor('action')` line each.

### Height reporting

`TabBarRoot` already reports its height to the navigator. It will report `bar height + total visible peek height` whenever a panel is peeking or open. Open panels overlay content (like a sheet) and don't add their full height; only the peek is reserved, so content isn't hidden by a resting strip and doesn't jump when a panel opens.

### Motion

State changes animate `translateY` with `tabcnSpring` (critically damped, no overshoot). Peek height changes and content resizing use `tabcnTiming`. Reduce motion makes all of these instant (both tokens already carry `ReduceMotion.System`).

### Dragging (`tabcn/gestures`)

A new entry point, `tabcn/gestures`, exports `PanelDragArea`: a wrapper that makes its child a drag handle for a panel. It imports `react-native-gesture-handler`, which is declared as an **optional peer** of `tabcn`. The core entry never imports it, so apps that don't drag install nothing. While dragging, the panel follows the finger; on release it settles to the nearest state, or to the next state in the flick's direction when the release velocity is high. Vertical drags inside a panel's scroll view only start when the scroll view is at its top.

### Context tray (override slot)

`useTabBarOverride(element | null)` lets a screen replace the bar's content while that screen is focused: it sets the override on focus and clears it on blur. Focus tracking needs the navigator, and the core entry must not depend on either navigator, so the hook is exported from the two adapter entries: `tabcn/expo-router` (built on Expo Router's `useFocusEffect`) and `tabcn/react-navigation` (built on `@react-navigation/native`'s `useFocusEffect`). Both write to the same provider slot. `TabBarRoot` keeps the design's tab children mounted but hidden from layout and accessibility, and crossfades the override in, inside the same container, so the bar's shape, material and position stay. Navigation is untouched: the tabs' roles, the back button and deep links work as before, and the tray's close button calls whatever navigation the app passes it.

### Accessibility

-   An **open** panel: `accessibilityViewIsModal` (iOS), focus moved to its first element (`AccessibilityInfo.setAccessibilityFocus`), the screen-reader escape gesture and the Android back button (`BackHandler`, only while open) return it to its resting state.
-   The anchor element gets `accessibilityState.expanded` so the + button reads as "expanded/collapsed".
-   A **peeking** panel is ordinary content in reading order after the screen and before the tabs.
-   An override tray hides the hidden tabs from screen readers (`importantForAccessibility="no-hide-descendants"`, `accessibilityElementsHidden`).

### Three designs on top

| Design         | Anchor               | Uses                                                                                                            |
| -------------- | -------------------- | --------------------------------------------------------------------------------------------------------------- |
| `mini-player`  | bar                  | `TabPanel` with a peek strip (art, title, play/pause) and an open layout; `PanelDragArea` from `tabcn/gestures` |
| `context-tray` | n/a                  | `useTabBarOverride`; a progress pill + close button in the bar's shape                                          |
| `quick-create` | `{ name: 'action' }` | `TabPanel` opened by the action button; a list of actions; closes on choose                                     |

Each ships like the existing designs: a registry entry (so `npx shadcn add` installs it and its dependencies), a demo in the example app, a site page with a recording, a README GIF and a smoke test.

## Alternatives Considered

### Alternative A: Panels drawn by each screen, outside the bar

-   **Pros**: No new foundation API; a screen just positions a view above the bar.
-   **Cons**: A view in a screen can't be drawn behind the bar: a docked bar sits below the screen in the layout, and a floating bar is drawn over the screen, so the panel ends up under the bar's whole area or above it with a gap. It doesn't survive tab switches (a mini player would have to be duplicated in every screen), and the bar's reported height doesn't include it.
-   **Reason for Rejection**: It reproduces exactly the problems the design exists to fix (overlap, hidden list rows, no persistence).

### Alternative B: A portal library (e.g. `@gorhom/portal`) to move content into the bar

-   **Pros**: A known pattern; works for any destination.
-   **Cons**: Another dependency for every user of panels; portal hosts render at the root by default, which puts the panel above or below the bar depending on host placement instead of in the bar's own stacking order; the bar still needs to know panel heights for reporting, so the provider is needed anyway.
-   **Reason for Rejection**: The provider already has to exist for state and height; letting it carry the content too costs a few lines and removes a dependency.

### Alternative C: An imperative global API (`TabPanels.open(<Content />)`)

-   **Pros**: One call from anywhere, even outside React (a player service).
-   **Cons**: Content created in a call loses the React context of the caller (theme, navigation, data providers), is hard to update while open, and is hard to test. Typing per-panel options is awkward.
-   **Reason for Rejection**: Declarative `<TabPanel>` keeps context and updates naturally. Non-React code can still drive a panel by calling a function exposed from a component that uses `useTabPanel`.

### Alternative D: Build on a bottom-sheet library (e.g. `@gorhom/bottom-sheet`)

-   **Pros**: Mature dragging, snap points, keyboard handling.
-   **Cons**: Designed for full-screen sheets drawn above everything; no notion of coming out from behind a bar, anchoring to a tab or button, or reporting a peek height to the navigator. Adds a heavy dependency (and its own Reanimated and gesture setup) to every panel user.
-   **Reason for Rejection**: The parts we need (three states, behind-the-bar drawing, anchors, height reporting) are the parts it doesn't do; the part it does well (sheets) is out of scope here.

### Alternative E: `react-native-gesture-handler` as a required peer of `tabcn`

-   **Pros**: One entry point; dragging available everywhere without an extra import.
-   **Cons**: Every app installs and configures it, even apps that use only tab bars, breaking CUJ 4.
-   **Reason for Rejection**: Panels must cost nothing to apps that don't use them. A separate `tabcn/gestures` entry with an optional peer keeps that.

### Alternative F: Context tray by hiding the bar and drawing controls in the screen

-   **Pros**: Uses only the navigator's existing `tabBarStyle: { display: 'none' }` option.
-   **Cons**: The bar disappears and the screen draws its own controls elsewhere, so there is no continuity of shape or position, the change is a jump rather than a crossfade, and screens lose the bar's height reporting while it's hidden.
-   **Reason for Rejection**: The point of the tray is that the bar itself changes content in place.

### Alternative G: Panels share the bar's material automatically

-   **Pros**: A panel under a glass bar is glass with no props.
-   **Cons**: Every bar design would have to register how it draws its surface, and every panel would depend on that contract; a new bar design could break panels.
-   **Reason for Rejection**: Coupling for a small saving. Panel designs take background, radius and material props with defaults that match the bars they pair with.

---

## Non-Functional Requirements

-   **Performance:** panels animate on the UI thread (Reanimated shared values), like the sliding highlight. The provider re-renders the panel layer only when a panel's content, options or target state change, not on every animation frame. Apps without a provider pay one context read in `TabBarRoot`.
-   **Rollout:** a minor version of `tabcn` (new exports only). Existing bar designs need no change except the five bars with an action button, which gain one optional `usePanelAnchor('action')` line; old copies of those designs keep working without it (they just can't anchor a panel to their button).

### Future Improvements

-   **Tab anchors** (`anchor={{ tab: index }}`): for a sub-tab drawer that opens above one tab. Deferred: none of the first three designs needs it. The anchor type is a union, so it can be added without a breaking change; it would reuse the tab frames `TabList` already measures.
-   **Several peeking panels on one anchor**, stacked: deferred until a design needs two strips at once.
-   **Sheets that grow from the bar** (Bump's Chat and Profile) and **bars that fully morph** into a different shape: later steps that build on the panel layer and the override slot.

---

## Detailed Implementation Plan

### Target Files to Create/Modify

#### Foundation package (`packages/tabcn`)

1.  **`packages/tabcn/src/panels.tsx` (Create)**: the provider and public panel API.
    -   `TabBarProvider({ children })`: context holding `panels: Map<id, { content: ReactNode, anchor: PanelAnchor, peekHeight: number, state: PanelState }>`, `anchors: Map<name, Frame>`, `barFrame`, `override: ReactNode | null`, and an `openId` (the single open panel).
    -   `type PanelState = 'hidden' | 'peek' | 'open'`; `type PanelAnchor = 'bar' | { name: string }` (a union, so a `{ tab: index }` anchor can be added later without breaking anything).
    -   `TabPanel({ id, anchor = 'bar', peekHeight = 0, initialState = 'hidden', children })`: registers/updates its content on render, removes it on unmount (animating to hidden first). Renders `null` in place.
    -   `useTabPanel(id): { state, peek(), open(), hide(), toggle() }`: `open()` returns any other open panel to its last resting state (`peek` if it has a peek height, else `hidden`).
    -   `usePanelAnchor(name): { ref, onLayout, accessibilityState }`: measures the element relative to `TabBarRoot` (via `measureLayout` against a ref the root publishes in context) and stores its frame; `accessibilityState.expanded` is true while a panel anchored to `name` is open.
    -   Without a provider, `useTabPanel` returns inert functions and `TabPanel` renders nothing (warning once in development).

2.  **`packages/tabcn/src/PanelLayer.tsx` (Create)**: internal; renders every registered panel behind the bar.
    -   For each panel: an absolutely positioned view whose `left`/`width` come from its anchor's frame and whose bottom edge sits `overlap` (default 16 pt) below the bar's top edge; measures its content height; animates `translateY` between hidden (`contentHeight`), peek (`contentHeight - peekHeight`) and open (`0`) with `tabcnSpring`.
    -   One visible panel per anchor: when a panel on an anchor becomes visible, any other visible panel on that anchor goes to hidden. The open panel gets the highest `zIndex` within the layer (still below the bar).
    -   While open: `accessibilityViewIsModal`, `onAccessibilityEscape` → resting state, `AccessibilityInfo.setAccessibilityFocus` on mount, and a `BackHandler` listener (Android) that returns it to its resting state and consumes the event.
    -   Exposes, through context, a `progress` shared value and `settle(velocity)` for the drag entry point.

3.  **`packages/tabcn/src/TabBarRoot.tsx` (Modify)**
    -   Read the panels context (optional). If present: render `<PanelLayer />` before `children` inside the same container; publish a ref to the container and its measured frame (`barFrame`) to the context.
    -   Height reporting: `reportHeight(barHeight + sum of visible peek heights)` whenever panel states change (open panels count only their peek height).
    -   Override slot: if `override` is set, keep `children` mounted but `opacity: 0`, `pointerEvents="none"`, `importantForAccessibility="no-hide-descendants"`, `accessibilityElementsHidden`; render `override` absolutely over the same area; crossfade both with `tabcnTiming`.

4.  **`packages/tabcn/src/override.ts` (Create)**: internal `useOverrideSlot(element: ReactNode | null, focused: boolean)`: sets the provider's `override` while `focused` is true and the element is non-null; clears it on blur or unmount. Shared by both adapter hooks.

5.  **`packages/tabcn/src/expo-router.tsx` (Modify)**: export `useTabBarOverride(element)` built on Expo Router's `useFocusEffect` (focus → set, cleanup → clear) via `useOverrideSlot`.

6.  **`packages/tabcn/src/react-navigation.tsx` (Modify)**: export `useTabBarOverride(element)` built on `@react-navigation/native`'s `useFocusEffect`.

7.  **`packages/tabcn/src/gestures.tsx` (Create)**: new entry `tabcn/gestures`. `PanelDragArea({ panel: id, children })`: a `GestureDetector` with a vertical `Gesture.Pan()` (`activeOffsetY: [-8, 8]`, `failOffsetX: [-16, 16]`) that drives the panel's `progress` and calls `settle(velocityY)` on end: nearest state, or the next state in the flick direction when `|velocityY| > 800`.

8.  **`packages/tabcn/src/index.ts` (Modify)**: export `TabBarProvider`, `TabPanel`, `useTabPanel`, `usePanelAnchor` and the types `PanelState`, `PanelAnchor`, `TabPanelProps`, `TabPanelControls`.

9. **`packages/tabcn/package.json` (Modify)**
   -   `exports["./gestures"]` with the same three conditions as the other entries.
   -   `peerDependencies`: `react-native-gesture-handler: ">=2"` and `@react-navigation/native: ">=7"`, both `optional` in `peerDependenciesMeta`.
   -   `devDependencies`: `react-native-gesture-handler` (matching the example app's version) for tests.

10. **`packages/tabcn/jest/setup.js` (Modify)**: load `react-native-gesture-handler/jestSetup` so `tabcn/gestures` can be tested.

11. **`packages/tabcn/src/__tests__/panels.test.tsx` (Create)**: with a test bar and both adapters:
    -   no provider: `TabBarRoot` output and reported height are unchanged (CUJ 4);
    -   `TabPanel` content renders inside the bar's root, before the bar's children;
    -   `peek()` / `open()` / `hide()` update `state`; only one panel open at a time;
    -   reported height = bar + peek height while peeking or open; = bar when hidden;
    -   a `{ name: 'action' }` anchor places the panel at the anchor's x and width (using mocked layout events);
    -   one visible panel per anchor: a second bar panel that peeks hides the first;
    -   Android back closes an open panel and is consumed; does nothing when no panel is open;
    -   `useTabBarOverride` hides the tabs from accessibility and shows the override while focused, restores them on blur.

12. **`packages/tabcn/src/__tests__/fixtures.tsx` (Modify)**: helpers to fire layout events on the root, list and anchors.

13. **`.changeset/panels.md` (Create)**: minor bump for `tabcn`: "Panels: TabBarProvider, TabPanel, useTabPanel, usePanelAnchor, useTabBarOverride, and tabcn/gestures."

#### Designs (`registry/`)

14. **`registry/designs/mini-player/mini-player.tsx` (Create)**: `MiniPlayer({ id = 'player', track, playing, onPlayPause, onNext, renderOpen?, colors?, radius? })`: a `TabPanel` anchored to the bar with a 64 pt peek strip (artwork, title, artist, play/pause), wrapped in `PanelDragArea`; the open state shows `renderOpen` or a default large-artwork layout. Glyphs drawn inline with `react-native-svg`.

15. **`registry/designs/context-tray/context-tray.tsx` (Create)**: `ContextTray({ label, progress?, onClose, colors? })`: content for `useTabBarOverride`: a progress pill (label + bar) and a round close button, laid out to fill the bar's area.

16. **`registry/designs/quick-create/quick-create.tsx` (Create)**: `QuickCreate({ id = 'create', actions: { label, icon, onPress }[], colors? })`: a `TabPanel` anchored to `{ name: 'action' }`, a vertical list of actions; choosing one runs it and calls `hide()`. Includes a `useQuickCreate()` helper returning `toggle` for the bar's action button.

17. **`registry/registry.json` (Modify)**: three items (`mini-player`: `tabcn`, `react-native-gesture-handler`, `react-native-svg`, `expo-haptics`; `context-tray`: `tabcn`, `expo-haptics`; `quick-create`: `tabcn`, `expo-haptics`).

18. **`registry/designs/{labeled-plus,pill-plus,glow-glass,segment-search,center-cta}/*.tsx` (Modify)**: spread `usePanelAnchor('action')` onto the action button.

19. **`scripts/check-registry.ts` (Modify)**: allow panel items (catalog `kind: 'panel'`) in the registry/catalog/demos agreement check; `react-native-gesture-handler` and the `tabcn/gestures` import are allowed only when listed.

20. **`packages/tabcn/src/__tests__/designs.test.tsx` (Modify)**: wrap renders in `TabBarProvider`; for panel items, render the panel with a test bar and assert it registers and shows on `peek()`/`open()` instead of counting tabs.

#### Example app (`apps/example`)

21. **`apps/example/src/catalog.ts` (Modify)**: `kind: 'bar' | 'panel'` on every entry; three panel entries with a new layout label "Panel".

22. **`apps/example/src/demos.tsx` (Modify)**: panel demos name the bar they pair with (mini player → Soft Pill; context tray → Glass Expand; quick create → Labeled + Plus) and the controls the demo screen shows.

23. **`apps/example/src/app/_layout.tsx` (Modify)**: wrap the app in `GestureHandlerRootView` (required by gesture handler).

24. **`apps/example/src/app/designs/[id]/_layout.tsx` (Modify)**: wrap `<Tabs>` in `TabBarProvider`; for panel demos, render the paired bar and the panel.

25. **`apps/example/src/demo-screen.tsx` (Modify)**: for panel demos, buttons to peek/open/hide, and on one tab a `useTabBarOverride(<ContextTray …/>)` with a close button that returns to the first tab.

26. **`apps/example/src/app/react-navigation.tsx` (Modify)**: wrap the navigator in `TabBarProvider` and add the mini player, so panels are exercised under `@react-navigation/bottom-tabs` too.

#### Site, README and docs

27. **`apps/site/src/lib/designs.ts` (Modify)**: read `kind`; panels get their own sidebar group ("Panels") and pages; install command and usage snippet show the provider.

28. **`apps/site/public/videos/{mini-player,context-tray,quick-create}.{mp4,jpg}`, `apps/site/public/stills/…`, `assets/readme/{…}.gif` (Create)**: recordings from the simulator, per the README rule in `AGENTS.md`.

29. **`README.md` (Modify)**: a "Panels" section: what they are, the provider in `_layout.tsx`, the three designs with GIFs.

30. **`docs/designs/panels.md` (Create)** and **`docs/designs/README.md` (Modify)**: this doc and its index row.

### Verification Plan

-   **Build / typecheck / lint / tests:** `bun run check` (Biome, typecheck of all workspaces, registry check, Jest including `panels.test.tsx` and the extended smoke test, package build); `cd apps/example && bunx expo-doctor`.
-   **Package output:** `bun run build` emits `lib/module/gestures.js`; a scratch app that installs `tabcn` without `react-native-gesture-handler` and imports only `tabcn` bundles without errors (CUJ 4).
-   **On device (iOS simulator, Expo Go):** CUJ 1–3 walked through in the example app under Expo Router and under the React Navigation demo, with screenshots and a recording of each; "Reduce Motion" on in iOS Settings makes every panel change instant; VoiceOver focus moves into an open panel and the escape gesture closes it.
-   **Android:** back closes an open panel (unit-tested); a device check is pending because this Mac has no Android emulator, and is listed as a known gap until run.

---

_Drafted with EGM_
