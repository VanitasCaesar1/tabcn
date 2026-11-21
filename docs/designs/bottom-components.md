# Bottom components: sheets, companions, a toast inset, sub-tabs, sheet navigation, scrubbing and live tabs

-   **Author:** VanitasCaesar1 (drafted with Claude)
-   **Status:** Proposed (2026-11-21), revised after three review rounds (Review notes). Most of it was built on `feat/round-3` before approval (Build status). Nothing here merges until phase 0's results are written into this doc and the owner approves it.
-   **Date:** 2026-11-21
-   **Related:** [`foundation.md`](foundation.md), [`panels.md`](panels.md), [`motion-and-rail.md`](motion-and-rail.md), [`website.md`](website.md) (props tables, moved there)

---

## Overview

tabcn's foundation can already draw a bar, slide panels out from behind it, swap the bar's tabs for a screen's own controls (the override slot), minimize on scroll and draw a side rail. This doc adds seven things apps put at the bottom of the screen. The first four share the provider store, the panel layer and one "modal" check; the last three build on them (sheet navigation on sheets) or on the same files (scrubbing on `TabList`, live tabs on the provider), so all seven are specified and shipped together:

| Part                 | What                                                                                     | New public API                                                                   |
| -------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **Sheets**           | Sheets that grow out of the bar (Bump's Profile, a comments sheet): snap points          | `TabPanel` `snapPoints`; `snap` and `snapTo` on `useTabPanel`; `PanelScrollView` |
| **Companions**       | A search pill, a locate button or a "32 views" chip placed against the bar               | `TabBarCompanion`                                                                |
| **Toast inset**      | Any toast library lands above the bar                                                    | `useTabBarInset()`                                                               |
| **Sub-tabs**         | A panel opens above one tab on long press                                                | `TabButton` `onLongPress`                                                        |
| **Sheet navigation** | No bar: one persistent sheet whose header holds the sections (Apple Maps' model)         | None (an empty floating bar gets zero overlap)                                   |
| **Scrub the bar**    | Press and slide along the bar to move through the tabs                                   | `TabScrub` (in `tabcn/gestures`)                                                 |
| **Live tabs**        | A progress ring, a countdown or a now-playing line on a tab, with no navigator re-render | `useLiveTab`, `LiveTab`                                                          |

Each part ships with one copy-in design that uses it, like panels did: `bar-sheet`, `companion-chip`, `sub-tabs`, `section-sheet`, `scrub-pill`, `live-tabs` (the toast inset ships as a README note).

Morphing floating bars are **not** in this doc (Deferred). Sheet navigation, scrubbing and live tabs were deferred by the third review round with a list of questions each; their sections below answer them.

### Build status

The code ran ahead of this doc. On `feat/round-3` (uncommitted):

| Part             | Built                                                                                                                                                                                               | Still to do before merge                                                                                                                                                                       |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sheets           | `provider.tsx`, `panels.tsx`, `PanelLayer.tsx`, `panel-context.ts`, `PanelScrollView` in `gestures.tsx`, `sheets.test.tsx`, `bar-sheet` (registry, catalog, example demo with Soft Pill, site page) | Phase 0 (the hand-off in `gestures.tsx`, now option (b), is provisional until it runs on devices); recordings                                                                                  |
| Companions       | `companions.tsx`, the layer in `TabBarRoot.tsx`, `companions.test.tsx`, right-to-left placement; `companion-chip` (registry, catalog, example demo with Split Search: minimize, keyboard, toast)    | Recordings                                                                                                                                                                                     |
| Toast inset      | `inset.ts`, focus changes pushed from `adapter-bridge.ts`, the keyboard rule, the override warning, tests; README note; a plain toast in the Companion Chip demo                                    | Nothing                                                                                                                                                                                        |
| Sub-tabs         | `onLongPress`, the labelled accessibility action and the merged `accessibilityState` in `TabButton.tsx`; `sub-tabs` with `width` (registry, catalog, example demo on a Soft Pill copy)              | Recordings                                                                                                                                                                                     |
| Morphing         | Removed from the branch: `background`, the morph in `TabBarRoot.tsx`, `morph.test.tsx`, `morph-pill`. A copy is kept outside git in `.egm/morph-backup/` until it moves to a side branch            | Out of scope (Deferred). Three plain designs (`color-flood`, `tinted-icons`, `offset-plus`) that used `background` as a fill now draw the fill as their first child over the root's own colour |
| Sheet navigation | Zero overlap under an empty floating bar in `TabBarRoot.tsx`; `section-sheet` (registry, catalog with the new `sheet` layout, example demo with real sections); `sheet-navigation.test.tsx`         | Recordings                                                                                                                                                                                     |
| Scrub the bar    | `TabScrub` in `gestures.tsx`, the internal `scrub` target in `TabList.tsx` and `indicator.tsx`; `scrub-pill` (registry, catalog, example demo); `scrub.test.tsx`                                    | Device check of the hand-off from a tab's press to the scrub (Verification Plan); recordings                                                                                                   |
| Live tabs        | `live.ts`, the live slice in `provider.tsx`; `live-tabs` (registry, catalog, example demo with a ticking timer and download); `live-tabs.test.tsx`                                                  | Recordings                                                                                                                                                                                     |

"Recordings" means the README GIF, the site's recording and its link-preview image that AGENTS.md asks for with each new design; until then the README rows and site pages show placeholders. The morph demo isn't built: the morph is out of this round (Morphing row).

The branch also holds ten plain bar designs (`search-dock`, `button-row`, `color-flood`, `accent-dark`, `tile-plus`, `offset-plus`, `tinted-icons`, `badge-dock`, `cart-pill`, `glass-badges`) that use no new API. They are in the registry, catalog, example app, site and README like the others, but they are not part of this doc and go in their own pull request (Rollout).

## The Problem

Real apps put more than tabs at the bottom, and every one of these is hand-built today, usually fighting the bar:

-   **Sheets** (Bump's Profile, a comments sheet, a filters sheet) are built with a sheet library that draws above everything. The sheet covers the bar instead of growing out of it, has its own springs (with overshoot), and knows nothing about the bar's height or the tabcn panel rules (one open panel, Android back, screen-reader focus).
-   **Floating controls next to the bar** (a locate button, a search pill, a view-count chip) are placed by each screen with magic numbers. They don't move when the bar minimizes, don't hide with it for the keyboard, and sit on top of a peeking mini player.
-   **Toasts** land on top of the bar, or above a hard-coded height that's wrong when a panel peeks or the bar minimizes. `useBottomTabBarHeight()` only works inside screens, and toast hosts live outside them.
-   **Sub-tabs on long press** (switching accounts, jumping to a library section): `TabButton` takes no long-press handler of its own, and screen readers can't reach one.
-   **Sheet navigation** (Apple Maps: no bar, one sheet whose header holds the sections) means leaving the navigator today, and with it deep links and back.
-   **Scrubbing** (iOS 26's bar, where you slide a finger along it to pick a tab) isn't possible: every tab is its own pressable.
-   **Live state on a tab** (a download ring, a countdown, now playing) has to go through screen options (`tabBarBadge`, `setOptions`), which re-render the navigator and the whole bar on every change.

## Goals

-   **Every part works with both navigators**: Expo Router's tabs fork and `@react-navigation/bottom-tabs`.
-   **Nothing changes for apps that don't use it.** No new required dependency, no layout change, the same reported height. Old design copies keep compiling and running.
-   **The public API stays small.** Each part extends what exists (`TabPanel`, `TabButton`, `tabcn/gestures`) before adding anything.
-   **Owner's motion rules, strictly:**
    -   no bounce or overshoot, no scale pops, lifts, wobbles or rotations;
    -   allowed: crossfades, colour changes, and sliding or resizing on `tabcnSpring` (critically damped, `overshootClamping`) or `tabcnTiming`;
    -   with "reduce motion" on, every change is instant (both tokens carry `ReduceMotion.System`).
-   **Accessible by default**: every sheet height is reachable without dragging, sub-tab anchors report `expanded`, the long-press action has a spoken name, and no content a screen reader can focus is off-screen.
-   **Smooth under load**: drags, snaps, scroll hand-off and companion movement run on the UI thread (Reanimated shared values); none of them re-render the navigator per frame.
-   **One copy-in design per part**, each with a demo in the example app, a site page with a recording, a README GIF, a link-preview image and a smoke test (AGENTS.md).

## Non-Goals

-   **A general-purpose sheet library.** Sheets here grow out of the tab bar. Sheets unrelated to the bar (pickers, confirmations) keep using a sheet library or the navigator's modals.
-   **Keyboard input inside sheets** (a chat composer). `TabBarRoot` hides the whole bar, panels included, when a screen sets `tabBarHideOnKeyboard`, and sheets have no bottom-pinned footer. The v1 sheet design has no text input.
-   **Bottom-pinned controls in a sheet** (a "Send" or "Apply" row on the visible bottom edge). Content is laid out once at the highest snap point, so its bottom is off-screen at lower ones.
-   **Virtualised or inverted lists in a sheet** (`FlatList`, FlashList, an inverted chat list). `PanelScrollView` wraps `ScrollView` only in v1.
-   **Sheets anchored to a tab or a button.** Sheets are bar-anchored; a panel with a named anchor keeps today's content-height behaviour.
-   **A scrim**, or tapping outside a panel to close it. Still not built, as in panels.md.
-   **Versioning policy** (registry pins, a `Requires tabcn` header, deprecations). It applies to the whole project and goes in a separate change to `foundation.md` (Deferred).
-   **Web.** Same as the rest of tabcn.

## Open Questions

Each is answered by a phase 0 spike (Rollout) with a pass/fail test, and the result is written here before anything merges.

-   **Touches outside `TabBarRoot`'s bounds on Android** (gates Sheets, Companions and Sub-tabs). Sheets, companions above the bar and drawers above a tab all draw above the root's layout box. iOS hit-tests children outside their parent when it doesn't clip; Android with the New Architecture should too, but panels.md lists it as unchecked on a device.
    -   **Pass:** on a real Android device (EAS development build), ten taps each on a `Pressable` in an open sheet, a companion above the bar and a sub-tab drawer item all register, and none falls through to the screen behind.
    -   **On fail:** the three parts don't merge; a fallback (for example a root that grows to cover what it draws) gets its own design section here first.
-   **Scroll hand-off** (gates Sheets). Holding a scroll view at its top while a pan moves the sheet is the part of every sheet library with the longest record of jitter and lost momentum. The first approach built (a) ran a pan alongside the native scroll and held the content with `scrollTo` every frame; review found it jitters while the sheet moves and leaves scroll momentum behind. The branch now has (b): the pan decides each touch by hand (`manualActivation`) after 8 pt of vertical movement, activating when the sheet takes the drag and failing otherwise, and the native scroll waits for it to fail (`Gesture.Exclusive`), so the two never run together. (c), toggling `scrollEnabled` on the UI thread, is the fallback if (b) fails on Android, where a native scroll view's wait-for relations are the part least proven. (b) is still provisional: it has not run on a device yet.
    -   **Pass**, on the iOS simulator and the Android device, recorded and checked frame by frame: the content moves 0 pt while the sheet is dragged; no scroll momentum carries on after a hand-off from content to sheet; an upward drag at the highest stop scrolls the content and doesn't move the sheet; a downward drag at the content's top moves the sheet.
    -   **Decision:** the simplest approach that passes on both platforms. The result names it here, and `gestures.tsx` matches it.

## Critical User Journeys (CUJs)

### CUJ 1: A profile sheet grows out of the bar (Sheets)

-   **Given**: A floating bar, a `TabBarProvider`, and the `bar-sheet` design declared beside `<Tabs>` with `snapPoints={['60%', '100%']}`.
-   **When**: The user taps the profile button, drags the sheet up, scrolls the content, scrolls back to the top and keeps dragging down; later opens it again and taps another tab.
-   **Then**: The sheet rises from the screen's bottom edge, passing behind the bar, to 60% (its lowest snap point); the bar stays visible over its lower edge. Dragging the header moves it to full; at full the content scrolls; at the content's top a downward drag moves the sheet, and past the lowest snap point it slides away. Tapping another tab returns the sheet to rest. Every move glides on `tabcnSpring` with no overshoot; with "reduce motion" each is instant. At 60% the screen behind stays usable; at full the sheet is modal. Android back returns the sheet to rest.
-   **With VoiceOver or TalkBack on**: the sheet opens straight to its highest stop and is modal, so nothing a screen reader can reach is off-screen. The grabber is an adjustable control; decrementing it returns the sheet to rest.

### CUJ 2: A locate button rides with the bar (Companions)

-   **Given**: The map tab renders `<TabBarCompanion position="above-end" visible={isFocused}>` with a locate button, over a floating bar that minimizes on scroll; a mini player peeks. The search tab declares its own `above-end` companion the same way.
-   **When**: The user scrolls, opens the keyboard on a search screen, switches between the two tabs, and opens a sheet.
-   **Then**: The button sits 8 pt above the mini player's strip, at the bar's trailing edge; it follows the bar as it minimizes and slides away with it for the keyboard. Switching tabs crossfades the map's button out and the search tab's companion in, and back again on return. While the sheet is open, at any height, companions fade out. In a right-to-left layout, "end" is the bar's left side.

### CUJ 3: A toast lands above everything at the bottom (Toast inset)

-   **Given**: The app's toast host reads `useTabBarInset()` for its bottom offset.
-   **When**: A toast shows while the mini player peeks, then while the keyboard is up, then on a screen pushed over the tabs.
-   **Then**: The first toast sits above the strip (bar + gap + peek + companions above); the second and third use an inset of 0, because the bar isn't what's at the bottom (the toast library handles the keyboard itself).

### CUJ 4: Long-press a tab for its sub-tabs (Sub-tabs)

-   **Given**: The `sub-tabs` design attached to the Library tab.
-   **When**: The user long-presses Library (or, with VoiceOver, picks the tab's "Show sub-tabs" action), lifts, and taps Albums.
-   **Then**: A drawer slides out from behind that tab, centred on it; the tab reads as "expanded"; tapping Albums navigates and closes it. Switching tabs also closes it.

### CUJ 5: Maps-style sections (Sheet navigation)

-   **Given**: An Expo Router app whose tabs layout passes `<SectionSheet sections={…} />` as the `tabBar` (with `backBehavior="history"`), with three routes, `index` (Explore), `guides` and `saved`, each drawing its own full-screen map.
-   **When**: The user drags the sheet to half, taps Guides, opens `myapp://saved` from a link, then presses Android back twice.
-   **Then**: Tapping Guides navigates the tab navigator; the sheet keeps its height and its body crossfades to Guides. The deep link focuses Saved. The first back lowers the sheet to its strip; the second goes back to Guides. Screens' `useBottomTabBarHeight()` equals the strip's height from the screen's bottom edge, which is exactly what shows. At half, the map behind still pans and VoiceOver reads "Guides, tab, 2 of 3".

### CUJ 6: Scrub the bar (Scrub the bar)

-   **Given**: The `scrub-pill` design.
-   **When**: The user presses the first tab and slides right across two tabs, then lifts; later taps a tab; later swipes up from the home indicator over the bar; later long-presses a tab that opens a sub-tab drawer and slides.
-   **Then**: The lens follows the finger (critically damped, never past it), one selection haptic per tab crossed, and the tab under the finger is chosen on lift. A tap is a tap. The home-indicator swipe goes to the system. After the long press, sliding doesn't scrub.

### CUJ 7: A live countdown on a tab (Live tabs)

-   **Given**: The `live-tabs` design; the Timer screen writes the remaining time with `useLiveTab('timer')` once a second, and a component following a download writes its progress every frame.
-   **When**: Both run while the user is on another tab.
-   **Then**: The Timer tab shows the countdown in place of its label and VoiceOver reads it as the tab's value; the Downloads tab's ring fills smoothly. Neither the navigator nor the bar re-renders per update; a text change re-renders only its own tab.

### CUJ 8: An app that uses none of this

-   **Given**: An existing app on an existing design.
-   **When**: It updates `tabcn`.
-   **Then**: Nothing changes: no new required dependency, same layout, same reported height.

---

## Technical Plan

The four parts share three existing pieces: the **provider store** (screens and the bar are siblings in the navigator's tree, so state one writes and the other reads lives there), the **panel layer** inside `TabBarRoot`, and the **reported height**. A part goes into the core only when it needs one of those; anything a design can write itself stays in the design (the foundation's rule of three).

```text
 <TabBarProvider>  store: panels{…, snapPoints, snap}, anchors{name → frame}, override,
                          companions{position → declarations}   (own subscription)
                          inset                                  (own subscription)
   screens ── TabPanel / useTabPanel ── TabBarCompanion ── useTabBarOverride
   toast host ── useTabBarInset()
   <Tabs tabBar={tabBar(<Design/>)}>
     <TabBarRoot>
       [panel layer]      panels and sheets, behind the bar
       [bar box]          tabs → override (crossfade, as today)
       [companion layer]  above / beside the bar box
     </TabBarRoot>       reports bar + gap + peek; writes the inset
```

### One check for "modal"

Before this doc, `anyPanelOpen(snapshot)` (some panel is `open`) drove the root's `accessibilityViewIsModal`, hid the tabs and the override from screen readers, and hid the other panels. A sheet can now be open at a lower stop without being modal, so the store has two internal selectors:

-   `modalPanel(snapshot)`: a panel is open at its highest stop (a panel without snap points has one open height, so this equals the old `anyPanelOpen` for existing panels). Drives modality and hiding, in every place `anyPanelOpen` used to.
-   `anyPanelOpen(snapshot)`: a panel is open at any stop. Used only by companions, which fade out while any panel is open.

Neither is exported.

### Sheets

#### Goals

-   A bar-anchored panel can open to a tall sheet with several resting heights, and be dragged between them and away.
-   The bar stays visible over the sheet's lower edge, as it is over every panel.
-   Content inside the sheet scrolls at full height and hands vertical drags to the sheet everywhere else.
-   Every height is reachable without dragging.

#### API

Extend `TabPanel` instead of adding a sheet primitive:

```ts
/** Points above the bar's top edge, or a share of the room between it and the top safe area. */
export type SnapPoint = number | `${number}%`;

export interface TabPanelProps {
  // …existing: id, anchor, peekHeight, initialState, children
  /**
   * Heights the panel can rest at while open, lowest first. With snap points the panel is a
   * sheet: it takes the bar's full width, its content is laid out once at the highest snap
   * point, and `open()` goes to the lowest. It is modal only at the highest. Content below
   * the visible height is off-screen, so don't pin controls to the content's bottom.
   * '100%' reaches the top safe area. Heights assume the tab navigator fills the screen: a
   * stack header shown above the tabs would cover the top of a tall sheet, so hide that
   * header on screens with sheets. While a screen reader is on, a sheet opens only to
   * its highest snap point. Bar-anchored panels only: on a named anchor they're ignored,
   * with a development warning.
   */
  snapPoints?: readonly SnapPoint[];
}

export interface TabPanelControls {
  // …existing: state, peek, open, hide, toggle
  /** Index into `snapPoints` while open; -1 otherwise (and always -1 without snap points). */
  snap: number;
  /** Opens the panel at `snapPoints[index]` (clamped). */
  snapTo: (index: number) => void;
}
```

In `tabcn/gestures`:

```ts
/**
 * A scroll view for a sheet's content. It scrolls only while the sheet is at its highest
 * snap point; below that, or at the top of its content, a vertical drag moves the sheet.
 * Pads its content's bottom by the part of the sheet hidden behind the bar.
 * Takes Animated.ScrollView's props. Not for inverted or virtualised lists in v1.
 */
export function PanelScrollView(props: AnimatedScrollViewProps): ReactElement;
```

`PanelDragArea`'s `panel` prop becomes optional: inside a panel's content it defaults to that panel.

```tsx
<TabPanel id="profile" snapPoints={['60%', '100%']}>
  <PanelDragArea>
    <Grabber />
    <ProfileHeader />
  </PanelDragArea>
  <PanelScrollView>{sections}</PanelScrollView>
</TabPanel>;
```

`PanelScrollView` fulfils the approved promise in panels.md ("vertical drags inside a panel's scroll view only start when the scroll view is at its top"), which its implementation notes list as not built.

#### How it works

-   **States stay `hidden | peek | open`.** "Open" covers every snap point; the store records `snap` (the index) next to `state`. Old code that reads `state` sees what it always did. `open()` goes to the lowest snap point and `snapTo` reaches the others. `toggle()` returns an open sheet, at any stop, to rest; otherwise it opens at the lowest stop.
-   **Heights are measured from the bar's top edge**, like `peekHeight`, so reported-height rules don't change. A percentage resolves against the room from the bar's top edge to the top safe-area inset, computed from the screen's safe-area frame, the insets and the root's layout. Both adapters read the frame from the navigator's `SafeAreaProvider` (`SafeAreaFrameContext`; both navigators require `react-native-safe-area-context`, now an optional peer of `tabcn` for the adapters) and hand it to `TabBarRoot` internally; a design rendered without an adapter falls back to the window's size. **Known limit:** inside an app, that provider is the root one (both navigators reuse an existing `SafeAreaProvider` rather than adding their own), so the frame is the window's, and the room assumes the tab navigator fills the screen. When a stack header shows above the tabs, `'100%'` reaches under it. Until sheets size from the navigator's own container (React Navigation's `useFrameSize`, also in Expo Router's fork, plus the parent header's height; the React Navigation adapter would need `@react-navigation/elements` as an optional peer, an install-flow change), screens with sheets hide the stack header; the example app does so for its sheet demos. Snap points re-resolve when the frame changes (rotation). The root's size is the settled one: while the bar minimizes, its per-frame layouts are held like the reported height, so a sheet's heights don't move (and nothing re-renders) on every frame.
-   **Geometry.** A sheet takes the root's full width (inside the side safe-area insets), not the pill's. Under a floating bar its window runs from the highest snap point down to the screen's bottom edge, and "hidden" means fully below that edge, so opening it rises from the bottom edge and passes behind the pill, as system sheets do. Under a docked bar the window ends at the bar's top edge (`overlap` 0, like every docked panel), so it never draws over the bar's own background (panels.md's rule). In both cases the content is laid out once at the highest snap point and only `translateY` changes.
-   **Bar-anchored only.** `snapPoints` on a panel with a named anchor are ignored (it stays a content-height panel at its anchor's x and width), and a development warning names the panel.
-   **Rules from panels.md still hold, with one change**: one open panel at a time, open panels overlay screens and only the peek is reserved in the reported height. Peeking a panel still hides any other peeking panel on its anchor, but opening one now covers a peeking panel on its anchor instead of hiding it: the covered panel keeps its `peek` state and its reserved height, slides behind the bar, is hidden from screen readers and takes no touches, and comes back when the open panel rests. So a sheet opened over a mini player leaves screens' padding where it was, and the player returns when the sheet closes. This applies to plain panels too; panels.md's "a second bar-anchored panel that peeks or opens replaces the first" now holds only for peeking.
-   **Modal only at the top.** A sheet is modal (`accessibilityViewIsModal`, focus moves into it, tabs hidden from screen readers) only at its highest stop, through `modalPanel`. At a lower stop the screen behind stays usable, as Maps' half-height sheet does. There is no scrim: the bar and, above a sheet shorter than 100%, the screen stay touchable at every stop.
-   **Screen readers.** At a lower stop the content's bottom is pushed off-screen by a transform but would stay in the accessibility tree. So while a screen reader is on (`AccessibilityInfo`, with its change listener), the panel layer opens a sheet only to its highest stop: `open()` and `snapTo` go there and `snap` reports that index. The sheet is then modal and every element a screen reader reaches is on-screen. A design's grabber therefore lowers a sheet straight to rest from its highest stop while a screen reader is on (`snapTo` a lower stop would stay at the highest). A peeking sheet has the same problem below its peek: the core can't know which part of the content is the peek, so `peekHeight`'s documentation tells designs to hide the rest from screen readers until the panel opens, and `section-sheet` does. Switch Control and keyboard users, for whom off-screen elements aren't reachable, keep every stop.
-   **Switching tabs.** A sheet doesn't belong to a tab, so the core leaves it alone (panels.md: a screen's panel stays when tabs switch). A design whose sheet belongs to what's on screen returns it to rest when `useTabBar().activeIndex` changes (panel content renders in the bar's tree, so the hook works there); `bar-sheet` does, as `sub-tabs` already does for its drawer.
-   **Dragging.** `PanelDragArea` settles to the nearest stop in `[rest, ...snapPoints]`, where rest is the peek or hidden; a flick moves one stop in its direction (the existing flick threshold). Dragging below the lowest snap point with no peek dismisses the sheet. Settling uses `tabcnSpring`; the drag clamps between hidden and the highest stop.
-   **Scroll hand-off.** `PanelScrollView` coordinates the scroll view with the sheet's pan on the UI thread: while the sheet is below its highest stop, or the content is at its top and the drag is downward, the drag moves the sheet and the content stays put; otherwise the content scrolls and the sheet stays. Each touch is decided once. The pan and the native scroll never run together (option (b), Open Questions), so the content can't jitter under a moving sheet and has no momentum left when it settles. Phase 0 confirms the mechanism on devices.
-   **Panel context.** The panel layer wraps each panel's content in a small internal context (its id and how much of it sits behind the bar). `PanelDragArea` and `PanelScrollView` read it, which is why `panel` can be left out.
-   **Keyboard.** Unchanged: a screen's `tabBarHideOnKeyboard` hides the bar and its sheets.
-   **Accessibility.** A sheet design gives its grabber `accessibilityRole="adjustable"` with `increment`/`decrement` actions that call `snapTo` (or rest, below the lowest stop, or below the highest while a screen reader is on), and an `accessibilityValue` naming the height. Android back and the escape gesture return the sheet to rest (unchanged).
-   **Motion.** Snap changes and drags on `tabcnSpring`; resolving a new size (rotation) on `tabcnTiming`. Reduce motion: instant.

#### Alternatives

-   **A new `TabSheet` primitive.** Rejected: it would duplicate the panel layer's state, anchors, height reporting, back handling and focus rules. A sheet is a panel with more resting heights.
-   **Build on `@gorhom/bottom-sheet`.** Rejected for the reasons in panels.md (draws above everything, no anchors or height reporting, heavy dependency); its snap-point model is borrowed here.
-   **Lay the content out at the current snap height** (re-layout on every settle, as UIKit sheets do). Rejected: dragging up would reveal unlaid-out space until the settle, and every snap change would re-layout on the JS thread.
-   **Hide only the off-screen part of the content from screen readers.** Rejected: it needs per-element visibility tracking as the sheet moves. Opening at the highest stop gives the same guarantee with one rule.
-   **The core resting every sheet on a tab change.** Rejected: a sheet meant to stay across tabs (a persistent player sheet, Maps-style navigation) would need an opt-out; the design already knows which kind it is.
-   **A scrollable hook or factory** (`usePanelScrollable()`, `createPanelScrollable(FlatList)`) instead of one component. Deferred: more public API, and no v1 design needs a virtualised list.
-   **Leave scroll hand-off to designs.** Rejected: it's the hardest part of a sheet to get right.

#### Files

-   `packages/tabcn/src/provider.tsx`: `snapPoints` and `snap` on `PanelRecord`; `setPanelState(id, state, snap?)`; `SnapPoint`; `modalPanel`.
-   `packages/tabcn/src/panels.tsx`: `snapPoints`; `snap` and `snapTo`; `open()` to the lowest stop; the named-anchor warning.
-   `packages/tabcn/src/PanelLayer.tsx`: sheet geometry, snap resolution, the stops list, the panel context, `modal` from `modalPanel`; the screen-reader rule.
-   `packages/tabcn/src/panel-context.ts`: the internal panel context.
-   `packages/tabcn/src/TabBarRoot.tsx`: the room above the bar for the panel layer, from the settled root size and the screen frame; `modalPanel` for modality.
-   `packages/tabcn/src/screen-frame.ts`, `expo-router.tsx`, `react-navigation.tsx`: the screen frame from the navigator's safe-area provider (internal).
-   `packages/tabcn/src/gestures.tsx`: multi-stop settling; optional `panel`; `PanelScrollView` (mechanism per phase 0).
-   `packages/tabcn/src/index.ts`: export `SnapPoint`.
-   `packages/tabcn/src/__tests__/sheets.test.tsx`: snap resolution (points and percentages); `snapTo`/`snap`; `open()` to the lowest; `toggle()` from a higher stop rests; settle to the nearest stop and flick; dismiss below the lowest; modal only at the highest; reported height unchanged by snaps; full width and hidden below the screen under a floating bar; window ends at the bar's top edge under a docked bar; with a screen reader on, `open()` goes to the highest; `snapPoints` on a named anchor warn and are ignored; a sheet opened over a peeking panel covers it and gives back the peek and the reported height when it rests; a minimizing bar doesn't move a sheet's heights until the change settles.
-   `registry/designs/bar-sheet/bar-sheet.tsx`: the Bump-style sheet with an adjustable grabber, a header and a `PanelScrollView`, no text input; returns to rest on a tab change. Its smoke test covers the tab change and, with a screen reader on, decrementing from full height to rest.

### Companions

#### Goals

-   A small control is placed against the bar (above it, at either end, or beside it) without magic numbers.
-   It moves with the bar: minimizing (when the design shrinks the bar's layout), sliding away for the keyboard, and riding above a peeking panel.
-   It can belong to one screen and disappear on the others.

#### API

```ts
export interface TabBarCompanionProps {
  /**
   * Where it sits against the bar box. 'start'/'end' are beside the bar, vertically centred,
   * and only for floating bars (a docked bar is full width, so nothing fits beside it).
   * 'start' and 'end' follow the layout direction.
   */
  position: 'above' | 'above-start' | 'above-end' | 'start' | 'end';
  /** Points between the companion and the bar (or the peeking panel above it). Default 8. */
  gap?: number;
  /** Crossfades in and out on tabcnTiming. Default true. Pass `useIsFocused()` for one screen. */
  visible?: boolean;
  children?: ReactNode;
}
/** Declares a control drawn next to the tab bar. Renders nothing where it's written. */
export function TabBarCompanion(props: TabBarCompanionProps): null;
```

```tsx
// In the map screen
const focused = useIsFocused();
<TabBarCompanion position="above-end" visible={focused}>
  <LocateButton onPress={recenter} />
</TabBarCompanion>;
```

#### How it works

-   **Declaring** works like `TabPanel`: the declaration goes into the provider store under its position and is removed on unmount. Tab screens stay mounted after their first visit, so several screens can declare the same position; each is drawn with its own `visible` crossfade. A development warning names the position only when two declarations there are visible at once.
-   **Placing.** `TabBarRoot` draws a companion layer inside the bar box, so companions follow the box on the UI thread when the design animates its size (minimize) and move with the root's transform when it slides away for the keyboard. No JS runs per frame. Positions use `start`/`end` styles, so they mirror in a right-to-left layout.
-   **Docked bars.** `start` and `end` aren't drawn under a docked bar (a development warning names the position).
-   **Limits**, documented on the component: a design that minimizes by transform only doesn't move its companions; a bar box styled `overflow: 'hidden'` would clip them, so `TabBarRoot` warns once when a companion is declared under one.
-   **Peeking panels.** Above-positions ride up with the bar-anchored panel's visible height above the bar's top edge (its visible height minus the `overlap` behind the bar), read from that panel's animated value, so a companion rides a peeking mini player on the same spring and sits `gap` above its strip.
-   **Open panels.** While any panel is open, at any stop, companions fade out and are hidden from screen readers (`anyPanelOpen`). That includes a sheet at 60%: riding a half-height sheet is a future step.
-   **Rendering.** The companion layer subscribes to the companions slice on its own, so a screen that re-renders its companion re-renders only the layer.
-   **Reported height.** Companions don't change it: like Maps' buttons, they float over content. They do count toward `useTabBarInset()`.
-   **Accessibility order:** screen, panels, companions, tabs.
-   **Motion.** Position follows layout; `visible` crossfades on `tabcnTiming`; reduce motion is instant.

#### Alternatives

-   **Companions as panels with a placement option.** Rejected: panels live behind the bar with hidden/peek/open states and drag; companions sit beside it and are shown or not.
-   **Place companions from `barFrame` with JS.** Rejected: the frame updates on the JS thread, so a companion would lag a minimizing bar.
-   **Focus-scoped companions through the adapters.** Rejected for now: `visible={useIsFocused()}` costs the screen one line and keeps the core navigator-free.
-   **One companion per position, latest declaration wins.** Rejected: the last-mounted screen wins even while hidden.

#### Files

-   `packages/tabcn/src/companions.tsx`: `TabBarCompanion`, the store slice, the companion layer.
-   `packages/tabcn/src/provider.tsx`: the companions slice with its own subscription; the bar panel's visible height (written by the panel layer).
-   `packages/tabcn/src/PanelLayer.tsx`: write that value.
-   `packages/tabcn/src/TabBarRoot.tsx`: the companion layer inside the bar box; the overflow and docked warnings.
-   `packages/tabcn/src/index.ts`: export `TabBarCompanion`, `TabBarCompanionProps`.
-   `packages/tabcn/src/__tests__/companions.test.tsx` (create): placement per position, mirrored in right-to-left; `start`/`end` not drawn under a docked bar; `visible` crossfade; two screens at one position crossfade and only a visible collision warns; peek riding subtracts `overlap`; hidden while a panel is open at any stop; a companion re-render doesn't re-render `TabBarRoot`; reported height unchanged; no provider means nothing renders.
-   `registry/designs/companion-chip/companion-chip.tsx`: a small glass companion in three forms (round button, search pill, count chip).

### Toast inset

#### Goals

-   Any toast library, mounted anywhere under the provider, can place toasts above everything tabcn draws at the bottom, with one number.
-   Zero when the bar isn't what's at the bottom.

#### API

```ts
/**
 * Points from the screen's bottom edge to the top of what tabcn draws there: the bar and
 * its gap, peeking panels, and companions above the bar. An open sheet isn't counted: it
 * overlays content, and toasts may draw over it. 0 while the keyboard is up (the toast
 * library handles the keyboard), while the bar is a rail, and while the tab navigator isn't
 * focused (a screen or a modal is shown over it). Works anywhere under the TabBarProvider,
 * unlike useBottomTabBarHeight(). 0 without a provider.
 */
export function useTabBarInset(): number;
```

```tsx
// Root layout: the provider can sit above the root stack, so the toast host can read it.
<TabBarProvider>
  <Stack />
  <Toasts />
</TabBarProvider>;

function Toasts() {
  const inset = useTabBarInset();
  return <Toaster bottomOffset={inset + 8} />; // your toast library's host and its offset prop
}
```

#### How it works

-   `TabBarRoot` already computes the reported height (bar + gap + peek). It adds the tallest visible above-position companion plus its gap, and writes the result to the store when it changes. The inset is its own store slice with its own subscription, read with `useSyncExternalStore`, so only toast hosts re-render, and only when the number changes.
-   **Keyboard.** The inset is 0 whenever the keyboard is visible, whether or not the screen sets `tabBarHideOnKeyboard`: either the bar hides, or the keyboard covers it. Toast libraries add the keyboard's height themselves, so a non-zero inset would place toasts twice too high. `TabBarRoot` listens for the keyboard under a provider for this.
-   **Navigator focus.** Both adapters tell the store whether the tab navigator is focused (for Android back); they also push changes (`focus`/`blur` on the navigator's navigation object), so the inset drops to 0 under a pushed screen and comes back after. A form sheet or transparent modal also blurs the navigator, so the inset is 0 there even where the bar still shows behind it; that's documented.
-   **Provider placement.** The provider may sit higher than the tabs layout (around the root stack) when a toast host needs it. **One tab navigator per provider**: the provider warns in development when a second attaches. Screens outside the tab navigator (modals, pushed root-stack screens) shouldn't declare panels, companions or overrides, since they'd reach the bar underneath (Risks). `useTabBarOverride` warns in development when it sets an override while the tab navigator isn't focused, checked after focus changes settle so returning from a modal doesn't warn.
-   A number, not a shared value: toast libraries take a number and animate their own position.

#### Alternatives

-   **A tabcn toast component.** Rejected: toasts are a solved problem; tabcn only needs to say where the bar is.
-   **Expose `useBottomTabBarHeight()`'s value through context.** Rejected: it's only defined inside screens, excludes companions, and doesn't drop to 0 under a pushed screen.
-   **Keep the provider inside the tabs layout.** Rejected: toast hosts usually sit at the app's root, above the root stack.

#### Files

-   `packages/tabcn/src/inset.ts`: `useTabBarInset`.
-   `packages/tabcn/src/provider.tsx`: the inset slice; the navigator-focus flag; the second-navigator warning; the placement rule in the doc comment.
-   `packages/tabcn/src/TabBarRoot.tsx`: compute and write the inset; track the keyboard under a provider.
-   `packages/tabcn/src/adapter-bridge.ts`, `expo-router.tsx`, `react-navigation.tsx`: push focus changes; register for the one-navigator warning; the override warning.
-   `packages/tabcn/src/index.ts`: export it.
-   `packages/tabcn/src/__tests__/companions.test.tsx` (extend): inset = reported height + visible above companions; an open sheet doesn't change it; 0 with the keyboard up with and without `tabBarHideOnKeyboard`, for a rail and for an unfocused navigator; 0 without a provider; writing it doesn't re-render `TabBarRoot`; a second navigator warns; an override set while the navigator is unfocused warns, and returning from a modal doesn't.
-   `README.md`: a "Toasts" note with the snippet and the placement rule.

### Sub-tabs

#### Goals

-   A panel can come out from behind one tab.
-   A design can open it on long press without losing the navigator's `tabLongPress` event.
-   Screen readers can reach it by a named action, and the tab reports `expanded`.

#### API

```ts
export interface TabButtonProps {
  // …existing
  /**
   * Runs after the tab's `tabLongPress` event. Also offered to screen readers as the tab's
   * 'longpress' action; pass `accessibilityActions={[{ name: 'longpress', label }]}` to name it.
   */
  onLongPress?: () => void;
}
```

No new anchor kind: the design marks a view inside the tab with a named anchor, which already measures against the root, re-measures when the bar moves, follows the one-visible-panel-per-anchor rule and reports `expanded`.

```tsx
function LibraryTab({ tab }: { tab: TabItem }) {
  const menu = useTabPanel('library-menu');
  const anchor = usePanelAnchor('library');
  return (
    <TabButton
      tab={tab}
      onLongPress={menu.open}
      accessibilityActions={[{ name: 'longpress', label: 'Show sub-tabs' }]}
      accessibilityState={anchor.accessibilityState}
    >
      <View ref={anchor.ref} onLayout={anchor.onLayout} style={styles.fill}>
        …
      </View>
    </TabButton>
  );
}
// Elsewhere in the design: <TabPanel id="library-menu" anchor={{ name: 'library' }}>…</TabPanel>
```

#### How it works

-   **Anchoring** is the existing named-anchor path: the panel takes the anchored view's x and width and comes out from behind the bar's top edge above that tab. Nothing extra is measured for tabs that don't use it, and hiding tabs at runtime can't shift the anchor, because it isn't an index.
-   **Width.** A panel window clips to its anchor's width, and a tab on a five-tab phone bar is about 70 pt wide. The core doesn't add a width option: the anchored view can be any view inside the tab, including an invisible, absolutely positioned one wider than the tab. `sub-tabs` takes a `width` prop of its own and anchors such a view, centred on the tab and kept inside the bar's edges.
-   **`expanded`.** `TabButton` merges a passed `accessibilityState` with its own `selected`, so `usePanelAnchor`'s `expanded` reaches the tab's accessibility element. (Before, a passed `accessibilityState` replaced `selected`.)
-   **Long press.** `TabButton` calls `tab.longPress()` (emits `tabLongPress`, unchanged) and then `onLongPress`. With `onLongPress` set it offers the `longpress` accessibility action. On iOS that becomes a custom action, which VoiceOver reads by its label; `TabButton` keeps the label of a `longpress` action the design passes, and defaults it to "Long press" otherwise (English; designs pass a localised one). `sub-tabs` takes the label as a prop, default "Show sub-tabs".
-   **Choosing an item** is a tap after lifting. Sliding from the long press onto an item without lifting isn't supported: the touch belongs to the tab's `Pressable`, so items in the drawer never see it.

#### Alternatives

-   **`anchor={{ tab: index }}`** (panels.md's sketch). Rejected: an anchor kind, a second `measureLayout` per `TabButton` under every provider, tab frames in the store, and an index that shifts when tabs are hidden. A named anchor inside the tab does the same with no new API.
-   **A `width` option on tab-anchored panels.** Rejected: more core API for something the design can do by choosing what it anchors.
-   **A `longPressLabel` prop.** Rejected: `accessibilityActions` already carries a label.
-   **Slide-to-select after a long press**, with a finger-tracking gesture that hit-tests the drawer. Deferred to the scrubbing doc, whose pan would own it.
-   **Open from the navigator's `tabLongPress` listener** in the layout (`screenListeners`). Possible, but the app has to map route keys to panels; `onLongPress` keeps it inside the design.

#### Files

-   `packages/tabcn/src/TabButton.tsx`: `onLongPress`; the accessibility action and its label; merge `accessibilityState` with `selected`.
-   `packages/tabcn/src/__tests__/panels.test.tsx` (extend): a panel anchored to a view inside a tab takes its frame; `expanded` and `selected` both on the tab; `onLongPress` runs after `tabLongPress`; the action calls it and keeps a passed label, defaulting otherwise.
-   `registry/designs/sub-tabs/sub-tabs.tsx`: `SubTabs({ name, items, width?, actionLabel? })` and `useSubTabs(name)` returning the anchor props, the action and `onLongPress`; closes on a tab change.

### Sheet navigation (the Apple Maps model)

#### Goals

-   No tab bar: one persistent sheet over full-screen content, whose header holds the sections.
-   Dragging changes its height between a collapsed strip, half and full; choosing a section swaps its body and keeps its height.
-   It stays a real tab navigator: choosing a section navigates; deep links and back work.
-   Screens pad for the collapsed strip, and the strip shows exactly that height.

#### API

No new export. One core change in `TabBarRoot`: a floating bar whose box has zero height applies no `overlap`, so panels meet its top edge. A zero-height bar hides nothing behind it; with the 16 pt overlap a sheet's visible strip was 16 pt shorter than the reported height. Bars with a height are unchanged. The rest is the `section-sheet` design:

```tsx
<TabBarProvider>
  <Tabs
    backBehavior="history"
    tabBar={tabBar(
      <SectionSheet sections={{ index: <Explore />, guides: <Guides />, saved: <Saved /> }} />,
    )}
  />
</TabBarProvider>;
```

#### How it works

-   **The design is a tab bar** passed to `tabBar()`: an empty floating `TabBarRoot` (`offset` 0, zero height) and a sheet it declares itself, `<TabPanel peekHeight={collapsed} snapPoints={['50%', '100%']} initialState="peek">`. Every press goes through `tab.press()`; deep links move `activeIndex` and the sheet follows.
-   **Content stays in screens.** Each screen draws its own full-screen content and pads with `useBottomTabBarHeight()` (bottom safe area + collapsed height). Nothing is drawn behind the navigator, so the earlier question of whether a map behind react-native-screens' scenes gets touches doesn't arise and needs no spike.
-   **Header.** Inside the sheet, a `PanelDragArea` with an adjustable grabber and a `TabList` of `TabButton`s drawn as a segmented control. Panel content renders in the bar's tree, so these work there, and each section reads as a tab ("Guides, tab, 2 of 3") at every height.
-   **Bodies** come from `sections` by route name and render in the bar's tree, so they see the contexts around the navigator, not their screen's: a body and its screen share state through a context or store placed around `<Tabs>` (documented on the design). Visited bodies stay mounted, faded to zero opacity with `pointerEvents="none"` and hidden from screen readers (not `display: 'none'`), so each keeps its scroll position; switching crossfades on `tabcnTiming`. While the sheet rests at its strip, the shown body sits below the screen's edge, so it is hidden from screen readers too until the sheet is raised; the header (grabber and sections) stays readable.
-   **Back.** Android back first returns a raised sheet to its strip (the panel rule), then belongs to the navigator; "back through the sections visited" needs `backBehavior="history"`, which the design's usage shows.
-   **The one bottom surface.** Another bar panel that peeks (a mini player) hides the sheet's strip, as one peeking panel per anchor requires, so the design puts it straight back at its strip and warns in development: mini players belong inside a section's body. A bar panel that opens over the strip only covers it, and the strip comes back when that panel rests.
-   **Half height.** Companions fade (a panel is open), the toast inset stays at the strip's height (only the peek is counted), the sheet isn't modal and the screen behind stays usable. At full it is modal.
-   **Search** (Maps' main reason for raising the sheet) needs text input, which sheets don't support yet (Non-Goals); `useSectionSheet().snapTo(i)` lets an app raise the sheet from a search screen meanwhile.
-   **Without a provider** the sections draw as a plain floating segmented bar. **Phones only**: on a tablet the app passes a rail.
-   **Motion.** Sheet on `tabcnSpring`, body crossfade on `tabcnTiming`, highlight slide on the indicator spring; reduce motion: instant.

#### Alternatives

-   **`TabBarRoot placement="sheet"`.** Rejected: it would rebuild snap points, drag, height reporting, back and modality inside `TabBarRoot`.
-   **A `TabBarRoot` prop to set the overlap.** Rejected: a zero-height bar is the only case, and it can be detected.
-   **Content drawn once behind the navigator.** Rejected: scenes stack above it, and whether touches reach it is unproven on both platforms.
-   **Screen-owned bodies** (a focus-scoped hook, like `useTabBarOverride`). Not now: an adapter hook, and the body would still render in the bar's tree. Future Improvements.

#### Files

-   `packages/tabcn/src/TabBarRoot.tsx`: zero overlap under an empty floating bar.
-   `registry/designs/section-sheet/section-sheet.tsx`: `SectionSheet({ sections, collapsedHeight?, snapPoints?, radius?, colors?, haptics? })` and `useSectionSheet()`.
-   `packages/tabcn/src/__tests__/sheet-navigation.test.tsx`: the strip reports and shows the same height; inset and reported height stay at the strip while raised; modal only at full; sections are tabs that press through; bodies stay mounted, faded and untouchable; bodies hidden from screen readers at the strip; the grabber's actions, and with a screen reader on, strip to full and back; a sheet opened over the strip covers it and gives it back; pushed away by another bar panel, it comes back with a warning; the fallback bar without a provider.

### Scrub the bar

#### Goals

-   Press and slide a thumb along the bar to move through the tabs; the indicator follows the finger; lifting chooses the tab under it.
-   A tap is still a tap; no fight with the home-indicator swipe or a tab's long press.
-   Opt-in, in `tabcn/gestures`; no new context in `TabButton`, no gesture handler in the core.

#### API

```ts
export interface TabScrubProps {
  /** Runs on the JS thread each time the finger slides onto another tab. Play a haptic here. */
  onTabCross?: (tab: TabItem) => void;
  /** Runs on the JS thread when a scrub starts, with the tab under the finger. (Added 2026-11-21.) */
  onScrubStart?: (tab: TabItem) => void;
  /**
   * Runs on the JS thread when a scrub ends: the tab the finger lifted on, or null when it lifted
   * far from the bar or the system took the touch. Runs before that tab is pressed. (Added 2026-11-21.)
   */
  onScrubEnd?: (tab: TabItem | null) => void;
  /** Turns scrubbing off; the list still works as a plain TabList. Default true. */
  enabled?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}
/** A TabList you can scrub. Use it in place of TabList, with the same children. */
export function TabScrub(props: TabScrubProps): ReactElement;
```

#### How it works

-   **It is a `TabList`.** `TabScrub` provides the same internal list context as `TabList` (the list ref and the tab frames `TabButton` already measures), plus one internal field: the frame the indicator should follow while scrubbing. `useTabIndicator` follows that frame when it is set and the active tab's otherwise. That is the only core change; `TabList` and `TabButton` are unchanged, and the core still never imports gesture handler.
-   **Gesture.** A pan on the list's own view, activated by hand (`manualActivation`): it activates after a 10 pt sideways drag and fails after 12 pt of vertical movement first (the home-indicator swipe, a scroll). A tap never activates it, so the `TabButton` handles taps; when the pan activates, gesture handler cancels the button's press. A refused slide fails without ever becoming active, so it never cancels the press.
-   **Long press first.** A long press is reported on the JS thread, the pan decides on the UI thread. The pan records when the touch went down, and a sideways drag that comes after Pressable's 500 ms long-press delay fails the pan instead of activating it: a finger that held still that long belongs to the tab's long press (a sub-tab drawer), which still fires however late the JS thread reports it, and a slow drift after the delay no longer kills both. Pressable's long-press timer starts when the JS thread sees the touch, never before the UI thread does, so a scrub that starts inside 500 ms cancels the press before its long press can fire; on a very busy JS thread, a cancel and a due long-press timer can still both be queued, in a narrow window. `TabScrub` can't see a `TabButton`'s props, so its documentation says to keep `delayLongPress` at its default inside it. Slide-to-select in the sub-tab drawer stays unsupported (the tab owns the touch).
-   **Following.** The target keeps the size of the tab under the finger, centred on the finger, held between the first and last tabs; the indicator retargets on its spring (critically damped, overshoot clamped), so it trails the finger and never passes it. With reduce motion on, the target is the tab under the finger, so the indicator moves tab by tab, and the spring lands instantly.
-   **Crossing** calls `onTabCross(tab)` once per new tab, not at the start.
-   **Start and end** (added 2026-11-21, for Composer Dock's name pill). `onScrubStart(tab)` runs when the pan activates, with the tab under the finger; `onScrubEnd(tab | null)` runs once per scrub, before the commit's press: with the tab lifted on (the active tab too, though nothing is pressed then), or `null` when lifted more than 44 pt from the tabs or cancelled. A design learns that a scrub is happening, and which tab is under the finger, without a new context or a shared value; the indicator's position still comes from `useTabIndicator`. Rejected: a public `scrubbing` shared value or hook (a second way to read the same state, and the label text is set on the JS thread anyway); an `onScrubChange(tab | null)` that merges start, cross and end (it hides when a scrub starts, which a design needs for its first haptic).
-   **Commit.** On lift over another tab, `tab.press()` runs (`tabPress`, `preventDefault`, navigation) and the indicator holds that tab until it becomes active, or lets go after 500 ms if the press was prevented. Lifting on the active tab does nothing (no re-press, which would pop its stack); lifting more than 44 pt above or below the tabs, or a cancelled touch, returns the indicator to the active tab.
-   **Right to left.** Frames and touch positions are both physical (left to right), so the tab under the finger is found the same way in either direction.
-   **Accessibility** unchanged: the list keeps the `tablist` role; screen readers select tabs by focus and double tap.

#### Alternatives

-   **Wrap any `TabList` from outside** (the earlier sketch). Rejected: the wrapper can't reach the list's frames without a new context in `TabList` and `TabButton`.
-   **An optional public `target` on `useTabIndicator`.** Rejected for now: inside `TabScrub` the indicator follows on its own, so designs need no extra wiring.
-   **An `activation: 'hold'` option** for bars in a horizontal scroll view. Not now: no design needs it, and it collides with long presses.
-   **Haptics inside `TabScrub`.** Rejected: haptics are a design dependency.

#### Files

-   `packages/tabcn/src/TabList.tsx`: export the internal list context with the optional `scrub` field.
-   `packages/tabcn/src/indicator.tsx`: follow `scrub` while it is set.
-   `packages/tabcn/src/gestures.tsx`: `TabScrub`, `TabScrubProps`.
-   `registry/designs/scrub-pill/scrub-pill.tsx`: a light floating pill with a tinted lens, `onTabCross` haptics and a `scrub` opt-out; depends on `react-native-gesture-handler` and `expo-haptics`.
-   `registry/designs/composer-dock/`: a chat composer over four icon tabs; `onScrubStart`, `onTabCross` and `onScrubEnd` drive its name pill and an `onScrubTab` prop for the screen's preview; hold menus and the attachment menu are drawn inside the dock over the whole screen (tap outside closes them; a modal would cancel the finger still down from the long press). A hold menu grows out of the held tab while a blur over it clears (eased, no overshoot), and one pan on the tab row, starting after the long-press delay, lets the same finger slide onto a row and lift to choose it; the composer rides the keyboard (`useAnimatedKeyboard`) through a spacer inside the docked root, so the root's frame, and the height screens pad by, follow it. On iOS 26 the composer, the menus' cards and the model chip are Liquid Glass (`expo-glass-effect`, which ships in Expo Go); `material="solid"` or an older system gets flat fills. The example app's model sheet is TrueSheet (`@lodev09/react-native-true-sheet`, the native iOS 26 inset sheet) in a development build, and a drawn inset card with the same contents in Expo Go, where TrueSheet isn't linked; it is demo content, not part of the design.
-   `packages/tabcn/src/__tests__/scrub.test.tsx`: taps still press; the target follows the finger, centred and clamped; one cross per tab; lifting presses and holds until active; a prevented press lets go; lifting on the active tab or far away changes nothing; a cancelled touch returns; a touch held past the long-press delay doesn't scrub; right to left; start and end are reported in order, before the press, with `null` for a lift far away or a cancel; the design's smoke test.

### Live tabs

#### Goals

-   A screen, or code following a service, feeds live state to a tab: progress, a countdown, an unread line, now playing.
-   Updating it re-renders neither the navigator nor the bar.

#### API

```ts
export interface LiveTab {
  /** 0 to 1, a Reanimated shared value: write it as often as every frame; it re-renders nothing. */
  progress: SharedValue<number>;
  /** Short live text such as '4:59'; undefined when there is none. */
  text: string | undefined;
  /** Sets the text; only readers of this name re-render. Stable. */
  setText: (text: string | undefined) => void;
}
/** The live values of the tab for route `name`, shared under the TabBarProvider. */
export function useLiveTab(name: string): LiveTab;
```

#### How it works

-   **In the core, under the provider.** The provider store keeps a map from route name to a progress shared value (`makeMutable`, created on first use) and a text with its own listeners. Each name has its own subscription, so a text change re-renders only the components that read that name; progress never re-renders anything. Values live as long as the provider, and are per provider (one tab navigator each), so tests and multiple apps don't leak into each other.
-   **Why the core and not the design file** (the earlier plan). Apps would import an API from a copied design file, a new install-flow precedent the third review flagged; and every live design would need its own copy of the channel. One small hook in the core avoids both.
-   **Writers** call `useLiveTab(name)` and write `progress.value` or `setText`. Both are stable, so a component can hand them to a service.
-   **Names** are route names (`TabItem.routeName`); the hook's comment explains Expo Router's (`index`, `(timer)`).
-   **Accessibility.** A design reads the text into the tab's `accessibilityValue`, so the tab keeps its name and position ("Timer, tab, 2 of 4, 4:59"). Progress alone isn't spoken; the docs say to write text for what should be heard.
-   **Without a provider** the hook warns once and is inert.

#### Alternatives

-   **Screen options** (`tabBarBadge`, `setOptions`). Rejected: each change re-renders the navigator and the bar. Badges stay for slow counts.
-   **Live data in `TabItem`.** Rejected: `TabBarState` changes re-render the design.
-   **A module-level map in the design file.** Rejected: the install-flow precedent above, global state shared by every provider and test.
-   **Separate read and write hooks.** Rejected: more API; a writer that also reads its own text re-renders only when it changes.

#### Files

-   `packages/tabcn/src/live.ts`: `useLiveTab`, `LiveTab`.
-   `packages/tabcn/src/provider.tsx`: the live slice.
-   `packages/tabcn/src/index.ts`: export them.
-   `registry/designs/live-tabs/live-tabs.tsx`: a docked bar whose tabs draw a progress ring around the icon and swap the label for live text with a dot; depends on `react-native-svg` and `expo-haptics`.
-   `packages/tabcn/src/__tests__/live-tabs.test.tsx`: callers share one value per name; progress writes re-render nothing; text re-renders only its readers; values are per provider; inert without a provider; the design shows the text, reads it as the tab's value and commits nothing on progress writes.

---

## Public API summary

| Export                                      | Entry            | Part          | Kind            |
| ------------------------------------------- | ---------------- | ------------- | --------------- |
| `TabPanel` `snapPoints`, `SnapPoint`        | `tabcn`          | Sheets        | prop, type      |
| `useTabPanel` `snap`, `snapTo`              | `tabcn`          | Sheets        | fields          |
| `PanelScrollView`; `PanelDragArea` `panel?` | `tabcn/gestures` | Sheets        | component, prop |
| `TabBarCompanion`, `TabBarCompanionProps`   | `tabcn`          | Companions    | component, type |
| `useTabBarInset`                            | `tabcn`          | Toast inset   | hook            |
| `TabButton` `onLongPress`                   | `tabcn`          | Sub-tabs      | prop            |
| `TabScrub`, `TabScrubProps`                 | `tabcn/gestures` | Scrub the bar | component, type |
| `useLiveTab`, `LiveTab`                     | `tabcn`          | Live tabs     | hook, type      |

Every addition is optional and additive. Behaviour changes for existing code: `TabButton` merges a passed `accessibilityState` with `selected` instead of replacing it; a floating bar whose box has zero height no longer tucks panels 16 pt behind it; opening a panel covers a peeking panel on the same anchor instead of hiding it (Sheets). `TabBarRoot`'s `background` is removed from the branch with the morph (Deferred). `react-native-safe-area-context` becomes an optional peer of `tabcn`, read only by the adapters; both navigators already require it, so installs don't change.

## Non-Functional Requirements

-   **Performance:** drags, snaps, scroll hand-off and companion movement run on the UI thread. JS work happens only on settle (reported height, inset) and on keyboard and focus changes. No part re-renders the navigator per frame. A companion's re-render touches only the companion layer; the inset's write touches only its readers.
-   **Cost when unused:** `TabBarRoot` without companions or sheets renders as today (it adds one keyboard listener under a provider); `TabButton` measures nothing new. `tabcn/gestures` stays the only entry that imports gesture handler.

## Risks

-   **Declarations from outside the tab navigator.** With the provider above the root stack, a modal screen that renders a `TabPanel` or `TabBarCompanion` draws it on the bar underneath. The core can't tell where a declaration comes from without a navigator, so only overrides warn (they're set through the adapters). The provider's doc comment and the README's "Toasts" note state the rule.
-   **The scroll hand-off** may need a different mechanism than the one built (phase 0).
-   **Android touches outside the root** may fail on a device (phase 0); three parts depend on it.

## Rollout

0.  **Spikes, no release.** The two Open Questions, with their pass/fail tests, on a real Android device (EAS development build; this Mac runs no Android emulator) and the iOS simulator. The results are written into Open Questions before anything below merges.
1.  **One pull request and one minor release of `tabcn`** for Sheets, Companions, Toast inset, Sub-tabs, Sheet navigation, Scrub the bar and Live tabs, with `bar-sheet`, `companion-chip`, `sub-tabs`, `section-sheet`, `scrub-pill` and `live-tabs`, their changeset, README GIFs, site recordings and link-preview images (AGENTS.md). The four parts share `provider.tsx`, `TabBarRoot.tsx` and `PanelLayer.tsx`, so splitting them would mean landing the same files in pieces. The morph code (`background`, the morph in `TabBarRoot.tsx`, `morph.test.tsx`, `morph-pill`) is taken out of this pull request and kept on a side branch for its own doc.
2.  **Separately, any time:** the five plain bar designs on the branch (no new API) as their own pull request.

## Deferred

Each needs its own design doc. The questions listed are what that doc must answer; they come from the reviews of this one.

-   **Morphing floating bars** (an override resizes the pill to its own width, height and radius; `TabBarRoot` `background`). Only `morph-pill` uses it, against the foundation's rule of three, and it puts the most code into the most central file. Its doc must answer: holding `barFrame`, the root size and anchor measuring during a morph so no JS runs per frame; overrides that fill the bar (`context-tray`) collapsing under a morphing bar (a minimum of the tabs' size, or a crossfade fallback); companions inside a morphing box; `background` as floating-only with a warning elsewhere instead of a docked fallback; and a frame-time release gate (UI and JS frames, a release build on a physical device).
-   **Versioning policy** (registry pins, a `Requires tabcn` header, `CONTRIBUTING.md` deprecation rules): a separate change to `foundation.md`. On 0.x, `^0.5` means `>=0.5.0 <0.6.0`, so that change must pin `>=0.<minor> <1.0.0` (or re-pin every item each release), and check the minimum rather than "the range includes the workspace version".

## Future Improvements

-   **Keyboard-aware sheets** and a **footer slot** pinned to the visible bottom edge, together, for chat and filter sheets.
-   **Virtualised lists in sheets** (a scrollable hook or factory) with the first design that needs one.
-   **Companions that ride a half-height sheet**, as Maps' buttons do.
-   **A scrim** that closes an open panel on tap (panels.md).
-   **Screen-owned section bodies** and navigation inside a section's sheet (Sheet navigation).
-   **Scrubbing with a 'hold' activation** for bars inside a horizontal scroll view.

---

## Detailed Implementation Plan

Per-part file lists are above. Shared changes:

1.  **`packages/tabcn/src/index.ts`, `gestures.tsx`**: the exports in the summary table. `background` is removed from `TabBarRoot` (done).
2.  **`.changeset/bottom-components.md` (create)**: one minor bump.
3.  **`registry/registry.json`**: `bar-sheet` (`tabcn`, `react-native-gesture-handler`, `expo-haptics`), `companion-chip` (`tabcn`, `expo-blur`), `sub-tabs` (`tabcn`, `expo-haptics`), `section-sheet` (`tabcn`, `react-native-gesture-handler`, `expo-haptics`), `scrub-pill` (`tabcn`, `react-native-gesture-handler`, `expo-haptics`), `live-tabs` (`tabcn`, `react-native-svg`, `expo-haptics`). Dependencies are listed as today; pins wait for the versioning change.
4.  **`scripts/check-registry.ts`**: `tabcn/gestures` allowed only with `react-native-gesture-handler` listed (existing rule, now also for `PanelScrollView`).
5.  **`apps/example/src/catalog.ts`, `demos.tsx`, `panel-demos.tsx`, `demo-screen.tsx`**: demos for the three designs. `companion-chip` is catalogued as kind `'panel'` (drawn with a bar; its demo names the bar it pairs with); a `'companion'` kind waits for three companion designs. The sheet demo pairs with Soft Pill and runs under both navigators (`apps/example/src/app/react-navigation.tsx` gets it).
6.  **`apps/site/src/lib/designs.ts`**: usage snippets that show the provider, `TabBarCompanion` and `useTabBarInset` where relevant.
7.  **`apps/site/public/videos/<id>.{mp4,jpg}`, `apps/site/public/og/<id>.jpg`, `assets/readme/<id>.gif` (create)**: per AGENTS.md, for each new design.
8.  **`README.md`**: the new designs with GIFs; "Sheets", "Companions" and "Toasts" notes.
9.  **`docs/designs/README.md`**: an index row for this doc; `panels.md`: mark sheets and tab-anchored panels as specified here (tab anchors replaced by a named anchor inside the tab).
10. **Code comments** that cite this doc by part letter (`panels.tsx`, `PanelLayer.tsx`, `gestures.tsx`, `inset.ts`, `companions.tsx`, `sheets.test.tsx`) cite the part's name instead.

### Verification Plan

-   **Build, typecheck, lint, tests:** `bun run check` (Biome, every workspace's typecheck, the registry check, Jest including the new test files, the package build); `cd apps/example && bunx expo-doctor`.
-   **Package output:** a scratch app that installs `tabcn` without `react-native-gesture-handler` and imports only `tabcn` still bundles (CUJ 5).
-   **Scrubbing on devices:** on the iOS simulator and the Android device, a slide that starts on a tab cancels that tab's press (gesture handler cancels the JS responder when the pan activates), and a long press followed by a slide doesn't scrub.
-   **Motion (iOS simulator, Expo Go), one simulator, shut down after:** CUJs 1 to 7 under Expo Router and the sheet under React Navigation, recorded; each recording checked frame by frame for overshoot (none allowed); "Reduce Motion" on makes every change instant.
-   **Accessibility, iOS:** Accessibility Inspector on the simulator (development build) for roles, labels, the grabber's adjustable actions, the tab's named long-press action, `expanded` with `selected`, and modality at the highest stop. VoiceOver doesn't run in the simulator, so the VoiceOver walk-through of CUJs 1 and 4 (opening to the highest stop, the long-press action's spoken name) runs on a physical iPhone with a development build; if none is available, the pull request lists those checks as not done rather than passed.
-   **Android (phase 0, then before merge):** on the real device with an EAS development build: touches outside the root's bounds, back from an open sheet, the scroll hand-off, and TalkBack for CUJs 1 and 4.

---

## Review notes

### Earlier rounds

Two reviews of the first draft (2026-11-21) shaped the parts kept here: a sheet is a `TabPanel` with snap points rather than a new primitive; `open()` goes to the lowest stop; one modal check replaces `anyPanelOpen`; sheets are full width and rise from the screen's edge under a floating bar and end at the bar's top edge under a docked one; sub-tabs use a named anchor instead of a tab-index anchor; every companion declaration draws with its own `visible` crossfade and only visible collisions warn; the inset is its own store slice with one tab navigator per provider; keyboard input and bottom-pinned sheet controls are non-goals; a `designApi()` version check and a `'companion'` catalog kind were cut; the props tables moved to `website.md`.

### Third round (2026-11-21): two reviews

**Accepted:**

-   **The doc was out of step with the code** (both reviews): Status now says it was built early; a Build status table lists what exists; the built scroll hand-off is marked provisional; nothing merges before phase 0.
-   **Spikes need pass/fail tests**: each Open Question states its test and the decision it unlocks; the hand-off spike compares three mechanisms. The map-behind-the-navigator spike moved with sheet navigation.
-   **Too big for one approval; morphing, scrubbing, sheet navigation and live tabs moved out**: morphing (rule of three: one design; its JS-per-frame layouts, filling overrides collapsing and companions in a morphing box are recorded for its doc), scrubbing (its own doc, reusing `TabList`'s `frames`), sheet navigation (its overlap mismatch, search, a sheet that can vanish, body-to-screen link, back history and hidden bodies are recorded for its doc), live tabs (speculative motivation; install-flow precedent noted).
-   **Versioning moved out**, with the `^0.x` range problem recorded for that change.
-   **Rollout matches the branch**: one pull request for the four parts that share files, plain designs split out, morph code held back.
-   **Switching tabs with a sheet open**: the rule is the design's; `bar-sheet` rests on a tab change; CUJ 1 and a smoke test cover it.
-   **Off-screen sheet content and screen readers**: with a screen reader on, sheets open only to their highest stop.
-   **Slide-to-select removed from the sub-tabs CUJ**: the tab's `Pressable` owns the touch.
-   **The long-press action needs a spoken name on iOS**: `TabButton` keeps a passed label and defaults one.
-   **Narrow sub-tab drawers**: fixed in the design (`width` on `sub-tabs`, anchoring a wider invisible view), not the core.
-   **Inset with the keyboard up**: 0 whenever the keyboard is visible.
-   **Partly covering modals**: the inset is 0 under them; documented.
-   **Overrides set from outside the tab navigator**: a development warning; the wider footgun is under Risks.
-   **`snapPoints` on a named anchor**: ignored, with a warning; sheets are bar-anchored.
-   **`toggle()` on a sheet at a higher stop**: specified (it rests).
-   **Right-to-left companions**: `start`/`end` follow the layout direction, with a test.
-   **Accessibility checks that can't run as planned**: Accessibility Inspector on the simulator, VoiceOver on a physical iPhone, TalkBack on the Android device; build types named.
-   **Readability**: parts named instead of lettered, references to unpublished review numbers removed, implementation detail (clip views, stage widths, pinning rules) left to code comments.

**Rejected:**

-   **Split the branch into one pull request per phase.** The four remaining parts change the same three core files; landing them separately means reviewing the same files three times for no isolation gain. The promise was dropped instead, as both reviews allowed.
-   **Hold all the code back until phase 0 runs.** The code stays on the branch, but nothing merges until phase 0 passes; throwing it away and rebuilding gains nothing the merge gate doesn't.
-   **A development warning for panels and companions declared while the tab navigator is unfocused.** Tab screens mount in the background (a deep link that opens a modal first, preloading), so the warning would fire on correct code, and the core has no navigator to ask where a declaration comes from. Overrides warn, since they're set through the adapters; the rest is a documented risk.
-   **A scrim that closes the sheet on tap.** Still not built, as in panels.md: a tab tap rests the sheet through the design, and Android back and the escape gesture close it. Listed under Future Improvements.
-   **A `width` option on tab-anchored panels, and a `longPressLabel` prop.** Both are core API for things the design can already do (anchor a wider view; pass the action's label).
-   **Hiding only the off-screen part of a sheet from screen readers.** More moving parts than opening at the highest stop, for the same guarantee.
-   **Keep morphing with fixes** (the second option in the first review). Deferred instead: the fixes add more code to `TabBarRoot` for one design.

### Fourth step (2026-11-21): sheet navigation, scrubbing and live tabs

Brought back from Deferred with their questions answered: content stays in screens (no map behind the navigator); an empty floating bar gets zero overlap; the sheet returns when pushed away; bodies stay mounted and faded; `backBehavior="history"` in the usage; search waits for keyboard-aware sheets. `TabScrub` replaces `TabList` and shares its context, with one internal indicator target and a long-press time rule. The live channel moved from the design file into the core, under the provider, to avoid the install-flow precedent. Not yet reviewed.

### Fifth step (2026-11-21): code review of the branch

**Accepted and fixed:**

-   **The scroll hand-off jittered and left momentum behind** (option (a)): replaced with option (b), the pan decided by hand and the native scroll waiting for it to fail. Still provisional until phase 0 runs on devices; no phase 0 result is recorded yet.
-   **With a screen reader on, the grabber could never lower a sheet** (every lower `snapTo` was raised back to the highest): `bar-sheet` and `section-sheet` lower straight to rest from the highest stop while a screen reader is on, with a test each.
-   **A peeking sheet's off-screen content stayed in the accessibility tree**: `section-sheet` hides its bodies from screen readers at the strip; `peekHeight`'s documentation tells designs to do the same.
-   **Sheets re-resolved on every frame of a minimize, and sized from the window**: the root's size is held like the reported height while a minimize is in flight; the screen size comes from the navigator's safe-area frame.
-   **Opening a sheet hid a peeking mini player for good and dropped the reported height**: an open panel now covers a peeking panel on its anchor (Sheets), with a test.
-   **The morph was still in the core**: removed from the branch as Rollout says, with the three plain designs that used `background` moved off it.
-   **A refused scrub cancelled the tab's press**: `TabScrub` activates by hand, so a slide after the long-press delay fails without touching the press.
