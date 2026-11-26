# Account Dock

-   **Author:** VanitasCaesar1 (drafted with Claude)
-   **Status:** Approved (2026-11-22) and implemented. The owner approved every section and asked to build without the Goldfish review.
-   **Implementation notes (2026-11-22):**
    -   The icons file is `account-dock-icons.tsx`, not `icons.tsx`, so the design can import it as `./account-dock-icons` (the same-item import rule in [`composer-dock-split.md`](composer-dock-split.md)). It also holds the demo's three tab icons.
    -   The bar spans the window less 16 pt a side, up to 440 pt, and the tabs share the pill. Sized by its tabs and chip alone, the bar was about 300 pt, too narrow for the workspace pill to show a name and its detail line. The box still never changes size during the fold.
    -   While the accounts show, the workspace pill shrinks to its mark, and the account pill takes the room, as in the clip. With both pills holding text, neither name fit.
    -   Workspaces and accounts take `initials` and `color` as well as an image, so an app without logos (and the demo, which ships no photos of people) gets initials on a colour.
    -   An `id` prop (default `'account-dock'`) names the panel, so a screen can open the dock with `useTabPanel(id)`.
    -   The pills in layout B are drawn and pressed only after the first layout pass measures both layouts. Until then the bar draws its pill and chip itself, so the first frame is never empty. The unit tests run without layout, so they drive the dock through the sheet's controls, as a screen-reader user would.
    -   Smoothness pass (2026-11-22). A Time Profiler trace of eight folds in Expo Go showed Reanimated committing to React Native's tree on every frame, because the fold animated layout props (`width`, `start`, `top`, `height`). The fold now animates only transforms and opacity: a pill that changes width is two round caps moved apart and a middle strip stretched with `scaleX`, the shadows cross-fade between where the pills rest instead of being redrawn at every size, text is laid out once where its pill rests and travels with it, and the active tab's icon is one icon travelling into the round button (drawn above the tabs, with the tab's own icon hidden while it travels). Main-thread time over the same eight folds went from 3.61 s to 2.88 s: Reanimated's commits 1350 to 1000 ms, layout 74 to 21 ms, shadow layers 25 to 0 ms. Most of what is left is React Native re-checking clipped subviews of every scroll view after each commit (636 ms, from `RCTScrollViewComponentView mountingTransactionDidMount`), which no design can avoid while Reanimated commits each frame; Reanimated's `IOS_SYNCHRONOUSLY_UPDATE_UI_PROPS` and `ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS` static flags (off by default in 4.7) apply transform and opacity updates without a commit. Every prop the fold animates (transform, opacity, borderColor, backgroundColor) is on Reanimated's synchronous list (`SynchronousPropNames.h`). The flags are app-level build settings that a copied design cannot set and Expo Go ignores, so the panels guide ("A bar built on a panel") tells apps how to turn them on. Not measured: a build with those flags (it needs a full native rebuild, held back by disk space and memory on the build machine). No frame took longer than 20 ms in either version on the simulator, so these are CPU savings, not visible jank fixed there.
    -   Pills shrink by 4% while pressed (90 ms in, `tabcnTiming` out), and the avatar's status dot cross-fades its colour on a change. The fold starts on the press itself, not after the panel's state change re-renders.
    -   The demo is in `apps/example/src/account-dock-demo.tsx`, so the choices are kept in state and the dock answers taps.
    -   Checked in Expo Go on an iPhone 17 Pro simulator (iOS 26.5): open, switch list, the status menu, choose Idle, and fold back; the same right to left (`TABCN_RTL=1`), where the chip's avatar sits at its left end and the menu grows from its bottom-left corner; and at the largest accessibility text size, where the dock's text caps at 1.3x to 1.4x and nothing overlaps. The recorded fold moves over about 12 frames (400 ms) at 30 fps, with no frame skipped. Not done: the release-build performance monitor run and a physical device.
-   **Implementation notes (2026-11-27), motion pass:** ideas taken from rit3zh's public [expandable-bottom-tabs](https://github.com/rit3zh/expandable-bottom-tabs) (built from the same concept clip) and rebuilt in this design's own terms. The motion adds no dependency; the glass pills add `expo-glass-effect`. Their Skia goo, Gaussian blur and SwiftUI text all need a development build, so none of it was copied.
    -   **Slide to pick a status.** A finger can press a menu row and slide to another, or press the account pill and slide straight up into the menu (it opens under the finger). One highlight, concentric with the menu's corners, follows the finger on `tabcnSpring`, with a selection haptic each time it reaches a new row, and letting go on a row picks it. Letting go outside the rows picks nothing and leaves the menu open, as a tap on the pill would. Built on React Native's `PanResponder`, not gesture handler, so the registry entry gains no dependency. A drag takes the touch from the row's press only after 8 pt of movement, so taps, screen readers and keyboards still reach the rows as radio buttons. The menu's box is never transformed (only the card inside it grows), so measuring it gives where the rows rest; it is measured when the menu opens and on every move of a drag, because the sheet's height animates when its list switches.
    -   **The menu grows out of the account pill's corner**, rising 12 pt and scaling from 0.5 on `tabcnSpring`, and its rows fade in over the second half. It closes in 140 ms (70% of `tabcnTiming`), rows first.
    -   **The status dot changes shape as well as colour**: a full dot (online), a moon (idle), a bar (do not disturb), a ring (invisible), the shapes people know from team chat apps, so status reads without colour. One rounded rectangle in the ring's colour is cut over the dot and springs between the shapes on `tabcnSpring`, with a small pulse (1.2x, 110 ms up, `tabcnSpring` back). Its SVG props animate for about a quarter of a second only when the status changes, never during the fold.
    -   **The tabs fold into the round button**: as they fade out over the first third of the fold, they also shrink to 0.92 about the round button's centre, so they read as going into it rather than vanishing in place. A transform on the rest layer, so the tabs' measured layout and the indicator under the active tab don't change.
    -   Checked in Expo Go on an iPhone 17 Pro simulator (iOS 26.5): a slide inside the menu from Online to Do not disturb picks it, and the dot becomes the bar; one gesture from the account pill up to Idle opens the menu, picks Idle and turns the dot into the moon; the round button folds back. The first run caught a worklet capturing the menu tracker (which holds a view) and Reanimated warning that it couldn't copy it; the highlight's style now takes only its two shared values. The demo recording plays the pill-to-Idle slide. Not checked this time: right to left, the largest text size and a physical device.
    -   **Liquid Glass** (`material`, default `'auto'`: glass where the system has it, iOS 26; `'solid'` elsewhere and on request). The pills are glass views inside one `GlassContainer` (spacing 6 pt, under the 8 pt gap between resting pills), so the account pill's glass pinches off the chip as the dock opens and joins it again as it folds; at rest it lies inside the chip's glass, so it needs no fade. Glass is built differently from the solid pills: a glass view stretched with `scaleX` drew its edge and highlights stretched (spikes where the caps met the strip, a seam at the tab pill's end, checked on the simulator), so each glass pill is one view whose `left` and `width` follow the fold. That brings back layout and a commit on each frame of the fold, in glass mode only; the solid pills keep the transform-only fold. Nothing above a glass view fades to opacity 0 (Expo's docs: glass doesn't render under it), and the drawn shadows go, since glass has its own depth. The glass's light or dark scheme follows `colors.foreground` (dark text, light glass), and `colors.glassTint` tints it. The sheet and the status menu stay solid: the menu fades its card to 0, and a glass sheet is a separate change. Checked on the simulator: the bar at rest, the fold, the slide to Idle and the fold back.
-   **Date:** 2026-11-22; motion pass 2026-11-27

---

## Overview

Account Dock is a new copy-in design for tabcn (design #44). It is a floating tab bar with a small account chip beside it. Tapping the chip folds the tabs away and turns the bar into an account bar: a round button for the current tab, a workspace pill and an account pill. A sheet grows up out of the bar to switch workspace or account, and a small menu sets the user's status (online, idle, do not disturb, invisible). Tapping the round button folds everything back into tabs, and the chip now shows the new status.

It is aimed at apps where people belong to several workspaces or hold several accounts and have a presence status: team chat, community, creator and multi-account social apps. It builds only on what tabcn already exports (`TabBarRoot`, `TabPanel`, `usePanelAnchor`, motion tokens) and is our own take on a pattern seen in a public concept clip, not a copy of it.

## The Problem

In apps with several workspaces or accounts, three things people do many times a day are buried:

-   **Switching workspace or account** usually lives on a profile tab or behind a sidebar. It costs two or three taps and leaves the screen the person was on.
-   **Setting a status** (idle, do not disturb) is usually one level deeper again, inside the profile.
-   **Seeing who you are acting as** is not visible from most screens, so people post in the wrong workspace or from the wrong account.

A developer using tabcn today can build this, but has to assemble it from parts that weren't made for it:

-   `TabBarCompanion` puts a chip next to the bar, but the chip can't take over the bar.
-   `useTabBarOverride` replaces the bar's content only while a given **screen** is focused. Here the bar itself toggles, from any screen.
-   Bar Sheet grows a sheet from the bar, but it is a general sheet with snap points and a drag header, not a switcher list.
-   The foundation allows one open panel at a time. The clip's look (a switcher sheet with a status menu over it) needs both on screen together.

The proposed solution is one design, `account-dock`, that keeps the fold inside the design's own drawing. A single `TabPanel` anchored to the bar holds both the switcher list and the status menu.

**The pattern's own weak points**, which this design must answer rather than copy:

-   **Discoverability.** At rest the chip reads as an avatar, not as "opens a switcher". People may never tap it.
-   **Lost context.** While the account bar is showing, the tabs are gone. Only the current tab's icon remains, so a person can't jump straight to another tab.
-   **Morph cost.** tabcn deferred a morphing bar in `bottom-components.md` because it ran layout in JavaScript on every frame. A fold that resizes pills by changing their width has the same problem.

## Goals

-   **One tap to reach account, workspace and status from any tab**, and one more tap to change any of them, without leaving the current screen.
-   **The current identity is always visible at rest.** The chip shows the workspace logo, the avatar and a status dot on every tab.
-   **The fold never resizes anything the foundation measures.**
    -   `TabBarRoot`'s box, the bar frame and panel anchors keep their size during the fold, so no `onLayout` fires and no JavaScript runs per frame.
    -   Shapes inside the box are absolutely positioned. They animate on the UI thread with transforms, opacity and, for the pill backgrounds, width. `TabIndicator` already animates width this way.
    -   Both layouts are measured once at rest. Motion uses `tabcnSpring`, and with "reduce motion" on the fold is instant.
-   **No foundation changes.** The design uses only `react-native-tabcn` exports that ship in 0.3.0. If the technical plan finds a gap, it stops and opens a separate doc (AGENTS.md: new public API starts as a doc).
-   **The app owns the data.** Workspaces, accounts, the current status and what happens on a change come in as props and callbacks. The design stores only whether it is folded open and which list the sheet shows.
-   **Accessible by default.**
    -   The chip is a button whose label names the workspace, account and status, with `expanded` state.
    -   While folded open, the hidden tabs are hidden from screen readers.
    -   Android back and the screen-reader escape gesture fold it closed.
    -   Status choices read as a radio group.
-   **Works with both navigators** (Expo Router's tabs fork and `@react-navigation/bottom-tabs`), floating placement on phones.
-   **Ships like every design:**
    -   a registry entry;
    -   a demo in the example app;
    -   a site page with a recording;
    -   a README GIF;
    -   a link-preview image;
    -   a home-page bar loop;
    -   a smoke test in `designs.test.tsx`.

## Non-Goals

-   **Presence or data plumbing.** No fetching, syncing or storing of workspaces, accounts or status. The demo uses fixed sample data.
-   **Editing roles or members.** The clip's role rows and "Add new" link are display plus a callback; no forms.
-   **A core morph.** `TabBarRoot` gets no `background` or resize-to-content behaviour; the deferred morph stays deferred.
-   **Docked bars and the tablet rail.** The account bar is floating only. On a rail (Side Rail on tablets) the panel layer isn't drawn, so the design shows tabs and the chip and opening does nothing; documented in its header, like Quick Create.
-   **More than one open panel in the foundation.** The status menu lives inside the one sheet rather than changing the foundation's one-open-panel rule.
-   **Coach marks or a first-run hint** for discoverability. The chip's look and label carry it; a hint is the app's call.
-   **Matching the clip.** No names, logos, colours or exact layout from it.

## Open Questions

None open. The four questions from the first draft (what the round button is, whether opening also opens the sheet, fitting small phones, the shape of the API) are settled under "Decisions" in the Technical Plan.

## Critical User Journeys (CUJs)

### CUJ 1: Switch workspace

-   **Given**: The app renders `AccountDock` in its tab bar inside a `TabBarProvider`, with two or more workspaces, and the user is on any tab.
-   **When**: The user taps the chip, then taps another workspace in the sheet.
-   **Then**: The tabs fold into the round button, the workspace and account pills appear, and the sheet rises from behind the bar with the workspace list; focus moves into the sheet. Choosing a workspace calls `onWorkspaceChange(id)`, and the workspace pill shows the new one. The bar stays open until the user folds it back. The screen underneath never navigates.

### CUJ 2: Set status

-   **Given**: The bar is folded open.
-   **When**: The user taps the account pill, then taps "Idle".
-   **Then**: The sheet switches to the account list, and the status menu appears beside the account pill, inside the same sheet. Choosing "Idle" calls `onStatusChange('idle')` and closes the menu. The account pill shows "Idle" with its badge. After the fold back, the chip's dot is the idle colour and moon shape.
-   **Or**: The user presses the account pill and slides up into the menu, letting go on "Idle": the same result in one gesture.

### CUJ 3: Switch account

-   **Given**: The bar is folded open with the account list showing, and the app passed two or more accounts.
-   **When**: The user taps another account.
-   **Then**: `onAccountChange(id)` is called, and the account pill and chip show that account. Whether the app reloads data is the app's concern.

### CUJ 4: Back out without changing anything

-   **Given**: The bar is folded open, with or without the status menu.
-   **When**: The user taps the round button, presses Android back, or does the screen-reader escape gesture.
-   **Then**: The status menu closes first if open. Then the sheet sinks behind the bar, and the pills fold back into the tabs and the chip. Focus returns to the chip. Nothing is called.

### CUJ 5: The tab changes while open

-   **Given**: The bar is folded open.
-   **When**: The current tab changes from outside the bar (a deep link, or a notification tap navigating).
-   **Then**: The bar folds back to tabs with the new tab selected, so the round button never shows a tab that is no longer current.

### CUJ 6: Reduce motion and screen readers

-   **Given**: "Reduce motion" or VoiceOver/TalkBack is on.
-   **When**: The user runs CUJs 1 to 4.
-   **Then**:
    -   With reduce motion, every fold, sheet change and menu change is instant.
    -   With a screen reader, the chip reads as, for example, "Account, Design Team, Sam, Online, collapsed, button". The hidden tabs aren't reachable while open, and status options read as radio buttons with the current one selected.

## Technical Plan (Architecture)

Account Dock is one file in `registry/designs/account-dock/` plus an icons file. It renders a `TabBarRoot` with two layouts drawn in the same box and one `TabPanel` anchored to the bar. The panel's state is the only state that says whether the dock is open; the design keeps two small pieces of local state on top (which list the sheet shows, and whether the status menu is open).

```text
 <Tabs tabBar={tabBar(<AccountDock … />)}>   inside <TabBarProvider>

 AccountDock
 ├─ useTabPanel('account-dock')  → state: hidden | open      (the one source of "open")
 ├─ local: list = 'workspaces' | 'accounts',  menu = open | closed
 ├─ progress = shared value, 0 (tabs) → 1 (account), withSpring(tabcnSpring) on state
 │
 ├─ <TabBarRoot placement="floating">        box size fixed by layout A at rest
 │    ├─ layout A (in flow, sets the box):   [ tab pill: tabs from useTabBar ] [ chip ]
 │    └─ layout B (absolute, fills box):     [ ◉ round ] [ workspace pill ] [ account ]
 │       shapes in A and B are absolute layers driven by progress (UI thread only)
 │
 └─ <TabPanel id="account-dock" anchor="bar">   sheet as wide as the box
      ├─ header: list title + "switch list" button
      ├─ list: workspaces  (logo, name, detail, ✓ current, optional "Add workspace")
      │     or accounts    (avatar, name, ✓ current, "Status: Online" row)
      └─ status menu (absolute, bottom-right, over the list): 4 radio rows
```

### Decisions (the first draft's open questions)

-   **The round button is the current tab.** It shows the selected tab's icon from `useTabBar()`, reads "Back to tabs, <tab name>", and tapping it folds back.
    -   It answers part of "lost context": the person still sees where they are, and the exit is where the tab was.
    -   A fixed action such as notifications was rejected. It would need its own prop and route, and it adds a fourth destination to a bar that is meant to be a switcher.
-   **Opening the dock always opens the sheet.** Tapping the chip calls `open()` on the panel, with the workspace list showing.
    -   Because the panel's state is the dock's state, the foundation's existing behaviour gives the dock Android back, web Escape, the screen-reader escape gesture and focus moving into the sheet. No new handling is needed for these.
    -   "Account bar without a sheet" was rejected. It needs a second open state the foundation doesn't know about, so back and escape wouldn't fold it, and the dock would have to rebuild what `PanelLayer` already does.
-   **Small phones.**
    -   Layout B takes the box's width.
    -   The round button is fixed at the bar's height.
    -   The account pill shows only the avatar until the account list is showing, and then grows to avatar plus name plus status (the clip does the same).
    -   The workspace pill takes the remaining width with its name on one line, truncated. It drops its detail line when the box is narrower than 340 pt, a value read from the layout at rest.
-   **One component.** `AccountDock` renders both the bar and its panel, so the app passes data once and can't wire the two halves to different panel ids. Quick Create is split because it pairs with nine different bars; this panel pairs only with this bar.

### Screen readers: the sheet carries every control

While any panel is open, `TabBarRoot` hides its whole content from screen readers (`importantForAccessibility="no-hide-descendants"` on the content wrapper, `TabBarRoot.tsx` line 457), and the bar becomes modal. So the round button and the two pills in layout B can't be reached with VoiceOver or TalkBack while the dock is open. The design doesn't fight this:

-   The sheet has a header with the current list's title ("Workspaces" or "Accounts") and a button for the other list.
-   The account list has a "Status: Online" row that opens the status menu.
-   Closing uses the escape gesture or back (from the foundation), so screen-reader users never need the bar's pills.

Sighted users can use either: the pills are shortcuts to the same two lists.

### The fold

Both layouts render all the time. Layout A is in normal flow and decides the box's size: the tab pill (the tabs, drawn like Soft Pill's) and the chip, side by side with a gap. Layout B is absolutely positioned over the whole box, so it never changes the box's size.

Each layout's shapes are measured once with `onLayout` on static, invisible placeholder views. Placeholders are re-measured only when the box itself lays out again, for example on rotation or a font-size change. The visible shapes are absolute layers that read those frames and the shared `progress`:

| Shape                   | At 0 (tabs)  | At 1 (account)                                                               |
| ----------------------- | ------------ | ---------------------------------------------------------------------------- |
| Tab pill background     | pill frame   | round-button frame (width shrinks, left fixed)                               |
| Tab icons and labels    | visible      | fade out, except the selected icon, which moves to the round button's centre |
| Chip background         | chip frame   | workspace-pill frame (left moves, width grows)                               |
| Chip's workspace logo   | in the chip  | moves to the workspace pill's logo slot                                      |
| Chip's avatar           | in the chip  | moves to the account slot at the right end                                   |
| Workspace name, detail  | hidden       | fade in after `progress > 0.5`                                               |
| Account pill background | avatar-sized | grows to name and status width when `list === 'accounts'` (its own spring)   |

Widths animate through Reanimated `useAnimatedStyle` on absolute views, which `TabIndicator` already does. None of these views has an `onLayout`, and none is an ancestor of anything the foundation measures. So the foundation re-measures nothing during the fold, and no JavaScript runs per frame. Reduce motion is honoured because `tabcnSpring` and `tabcnTiming` carry `ReduceMotion.System`.

Touch targets swap at `progress` 0.5: layout A's pressables have `pointerEvents="none"` above it, and layout B's below it.

### The sheet

-   **The panel.** It is `TabPanel id="account-dock" anchor="bar"` with no snap points, so it keeps its content's height and the foundation animates height changes on `tabcnTiming` when the list switches. Lists cross-fade on `tabcnTiming`.
-   **Long lists.** The sheet caps at 60% of the screen height and scrolls inside past that, because a person may have many workspaces.
-   **The status menu.**
    -   It is an absolute view inside the sheet's content, aligned to its bottom-right above the account pill, so it sits over the list as in the clip. It grows from its bottom-right corner (bottom-left in RTL) on `tabcnSpring` and closes on a 140 ms timing; see the 2026-11-27 notes.
    -   A finger can slide across its rows, or up into it from the account pill, and pick the row it lets go on (2026-11-27 notes).
    -   Its rows are `accessibilityRole="radio"` inside an `accessibilityRole="radiogroup"`, with the current one `checked`.
    -   While it is open it adds its own Android `BackHandler` listener and web Escape listener, which close only the menu. They are added after the panel's, so React Native calls them first. `onAccessibilityEscape` on the menu view does the same for screen readers.
-   **Choosing anything** calls the matching callback with a selection haptic (`expo-haptics`). Choosing a workspace or account doesn't fold the dock, so a person can set status in the same visit. Choosing a status closes the menu.

### Tab changes and closing

-   **When the tab changes.** An effect on `useTabBar().activeIndex` calls `hide()` when the index changes while the panel is open (CUJ 5), as Bar Sheet does.
-   **When the panel goes to `hidden`** by any route (round button, back, escape, tab change), the design:
    -   resets `list` to `'workspaces'`;
    -   closes the menu;
    -   moves screen-reader focus to the chip with `AccessibilityInfo.setAccessibilityFocus`, once the spring settles.

### Public props

```ts
type AccountStatus = 'online' | 'idle' | 'dnd' | 'invisible';

interface AccountDockProps {
  workspaces: { id: string; name: string; detail?: string; logo: ImageSourcePropType }[];
  workspaceId: string;
  onWorkspaceChange(id: string): void;
  accounts: { id: string; name: string; avatar?: ImageSourcePropType; initials?: string }[];
  accountId: string;
  onAccountChange(id: string): void;
  status: AccountStatus;
  onStatusChange(status: AccountStatus): void;
  onAddWorkspace?(): void; // shows an "Add workspace" row only when passed
  labels?: Partial<AccountDockLabels>; // every visible and spoken string, for translation
  colors?: Partial<AccountDockColors>; // light defaults; PanelUI mapping in panelui-colors.ts
  material?: 'auto' | 'glass' | 'solid'; // the pills' surface (2026-11-27); default 'auto'
}
```

The tabs themselves come from the navigator through `useTabBar()`, like every other design. Images use React Native's `Image`, so the design adds no image dependency. The design's dependencies are `react-native-tabcn`, `react-native-reanimated` (already required), `expo-haptics` and `react-native-svg` (for icons), the same set Quick Create uses, and since 2026-11-27 `expo-glass-effect` for the glass pills.

### What doesn't change

`packages/tabcn` gets no changes. No other design changes. The design works with both navigators because it uses only `useTabBar()`, `TabBarRoot`, `TabPanel` and `useTabPanel`, which both adapters already feed.

## Alternatives Considered

### Alternative A: Bring back the deferred core morph

`TabBarRoot` would get a `background`, and the bar would resize to an override's width, height and radius (the code kept in `.egm/morph-backup/`).

-   **Pros**:
    -   The bar's own surface would change shape, which is closer to a true morph.
    -   A later morphing design could reuse it.
-   **Cons**:
    -   It brings back everything `bottom-components.md` deferred: layout in JavaScript on every frame, overrides that fill the bar collapsing, and companions inside a resizing box.
    -   It puts the most code in the most central file.
    -   Two designs (an unshipped Morph Pill and this one) still don't meet the rule of three.
-   **Reason for Rejection**: Account Dock doesn't need the box to change size. Layout A sets the box, and layout B fits inside it. The morph's open problems would block a design that can ship without them.

### Alternative B: A bar-owned override (`useTabBarOverride` not tied to screen focus)

A new foundation hook would let the bar design itself swap in layout B through the override slot, which gets the crossfade and tab hiding for free.

-   **Pros**: It reuses the override slot's crossfade and its hiding of the tabs.
-   **Cons**:
    -   It is new public API, which needs its own doc and a release.
    -   The override slot crossfades whole contents, so the chip couldn't turn into the workspace pill. The fold would become a fade.
    -   The slot is keyed to the focused screen. A second, bar-owned writer raises questions of precedence with a screen's override.
-   **Reason for Rejection**: It costs a foundation change and loses the look that makes the design worth shipping.

### Alternative C: `TabBarCompanion` chip plus Bar Sheet, no fold

The chip would sit beside an unchanged tab bar, and tapping it would open a Bar Sheet with the switcher.

-   **Pros**: No new code beyond the sheet's content; it works with any bar today.
-   **Cons**:
    -   The tabs never step aside, so there is nowhere in the bar to show the current workspace and account while the sheet is open.
    -   It is a recipe, not a design: little to show on the site that Companion Chip and Bar Sheet don't already show.
-   **Reason for Rejection**: It doesn't deliver the pattern. It goes in the design's page under "Using it with your own bar", as a few lines of code for apps that want a switcher without changing their bar.

### Alternative D: The status menu as a second panel anchored to the account pill

The account pill would get `usePanelAnchor('account')`, and the menu would be its own `TabPanel`.

-   **Pros**: The menu would get focus, back and escape handling from the foundation, and it would line up exactly with the pill.
-   **Cons**: The foundation allows one open panel across all anchors. Opening the menu would return the sheet to rest, so the clip's look (menu over the list) can't happen. Changing that rule would change modal and focus behaviour for every panel design.
-   **Reason for Rejection**: Drawing the menu inside the one sheet costs a `BackHandler`, an Escape listener and an `onAccessibilityEscape` in the design, and touches nothing shared.

### Alternative E: A native context menu for status (UIMenu or Android popup via `@expo/ui` or `zeego`)

-   **Pros**: It is the system's own menu, so it feels native, and the platform handles accessibility.
-   **Cons**:
    -   It adds a dependency.
    -   It looks different on iOS, Android and web.
    -   It can't show status colours inline on every platform.
    -   The site's live web preview would show a different menu from the recording.
-   **Reason for Rejection**: It breaks the "same design everywhere" promise the live previews rely on. Kept as a future improvement.

### Alternative F: Transform-only shapes (`scaleX` on pill backgrounds)

-   **Pros**: Pure transforms are the cheapest animation there is, and need no layout at all on the UI thread.
-   **Cons**: Scaling a capsule horizontally stretches its rounded ends into ellipses. That is visible at every frame between the two states, worst near the round button's 1:1 size.
-   **Reason for Rejection**: It is visibly wrong. A UI-thread width animation on an absolute leaf view costs one small layout pass per frame and already ships in `TabIndicator`.

### Alternative G: Split into a bar and a panel component, like Labeled + Plus and Quick Create

-   **Pros**: It follows an existing pattern, and the bar could pair with other panels.
-   **Cons**: The two halves share data (workspaces, accounts, status) and the panel id, so an app would pass everything twice and could wire them to different ids. No other panel fits this bar's fold.
-   **Reason for Rejection**: Quick Create is split because it pairs with nine bars. This panel pairs with one.

---

## Non-Functional Requirements

-   **Performance**:
    -   No JavaScript runs per frame during the fold: no `onLayout` fires on `TabBarRoot`, the bar or any anchor.
    -   It is checked with the React Native performance monitor in a release build on the simulator: the JS frame rate stays at 60 through ten folds back to back.
    -   A physical-device check is out of reach in this setup and is listed as not done.
-   **Rollout**:
    -   Registry-only. No `react-native-tabcn` release and no changeset, because the package doesn't change.
    -   Apps opt in by running `npx shadcn add`.
    -   Rollback is deleting the copied file.

---

### Additional Resources

-   Source clip: https://x.com/craft_120/status/2124017153309659363 (inspiration only; nothing copied).
-   `docs/designs/panels.md`: `TabPanel`, anchors, the one-open-panel rule and accessibility.
-   `docs/designs/bottom-components.md`, "Deferred": why the core morph was removed and what its own doc must answer.
-   `packages/tabcn/src/TabBarRoot.tsx` line 457: the bar's content is hidden from screen readers while a panel is open.
-   `packages/tabcn/src/PanelLayer.tsx` lines 380–400: back and web Escape handling for an open panel.
-   `registry/designs/quick-create/quick-create.tsx`: the closest existing panel design, and the pattern for the header comment.

### Future Improvements

-   **A native status menu** (Alternative E) once `@expo/ui` menus render the same on web.
-   **The core morph**, if a third design needs the bar's own surface to change size. Account Dock would then be one of its three users, and its doc would answer the questions in `bottom-components.md`.

---

## Detailed Implementation Plan

The work happens on branch `account-dock` from `main`, as one pull request. CI's `check` must pass before it merges.

### Target Files to Create/Modify

#### 1. `docs/designs/account-dock.md` (Create)

-   **Type / Scope**: Design doc.
-   **Proposed Changes**: This document, once approved. Status "Approved", with an implementation-notes list added as the build finds things, as `panels.md` does.

#### 2. `docs/designs/README.md` (Modify)

-   **Type / Scope**: Design doc index.
-   **Proposed Changes**: Add a row: "[`account-dock.md`](account-dock.md): a floating bar that folds into an account bar with a workspace and account sheet and a status menu". Add the status and date.

#### 3. `registry/designs/account-dock/account-dock.tsx` (Create)

-   **Type / Scope**: Copy-in design (TypeScript, React Native, Reanimated).
-   **Proposed Changes**:
    -   **The header comment** follows Quick Create's. It says:
        -   what the design is;
        -   that it needs a `TabBarProvider`;
        -   a usage snippet;
        -   its motion: `tabcnSpring` for the fold and `tabcnTiming` for fades, with reduce motion honoured;
        -   that on a rail it shows tabs and the chip only;
        -   the "Built on tabcn" line.
    -   **Exports**: `AccountDock` (props as in the Technical Plan), plus the types `AccountDockProps`, `AccountStatus`, `AccountDockColors` and `AccountDockLabels`.
    -   **Internals**:
        -   `PANEL_ID = 'account-dock'`.
        -   `useAccountDockFold()` returns the `progress` shared value, from panel state and `tabcnSpring`.
        -   `useFrames()` measures the placeholders once and re-measures when the box lays out.
        -   `TabPill` is layout A's pill, built on `TabList`/`TabButton`.
        -   `Chip` is layout A's chip, a `PressableScale` with `accessibilityState.expanded`.
        -   `AccountBar` is layout B: the round button, the workspace pill and the account pill.
        -   `SwitcherSheet` is the `TabPanel` content: a header, one list in a `ScrollView` capped at 60% of the window height, and the "Add workspace" row.
        -   `StatusMenu` is the radio group, with its own `BackHandler`, web Escape and `onAccessibilityEscape`.
    -   **Effects**:
        -   hide on an `activeIndex` change;
        -   on `hidden`, reset `list` and the menu and move focus to the chip.
    -   **Without a provider** (the generic bar tests, or an app that forgot it): it renders tabs and the chip. Pressing the chip does nothing beyond the foundation's own development warning, as Section Sheet does.
    -   **Defaults**:
        -   `defaultColors` is a light surface close to Soft Pill's. The status colours are green `#34c759`, yellow `#ffcc00`, red `#ff3b30` and grey `#8e8e93`.
        -   `defaultLabels` are English. They cover the chip's spoken template, "Back to tabs, {tab}", "Workspaces", "Accounts", "Status", the four status names and "Add workspace".

#### 4. `registry/designs/account-dock/icons.tsx` (Create)

-   **Type / Scope**: SVG icons (react-native-svg).
-   **Proposed Changes**:
    -   The status glyphs: a person for online, a pause for idle, a bar for do not disturb, and a slashed eye for invisible.
    -   A check for the current row and a plus for "Add workspace".
    -   Sample tab icons for the demo, which are exported for the snippet: people, chat and bell, drawn the way `quick-create/icons.tsx` draws its icons.

#### 5. `registry/registry.json` (Modify)

-   **Type / Scope**: Registry index.
-   **Proposed Changes**: Add an item `account-dock`:
    -   title "Account Dock";
    -   description "A floating tab bar with an account chip; tapping it folds the tabs into an account bar and raises a sheet to switch workspace or account and set a status. Needs a TabBarProvider.";
    -   dependencies `react-native-tabcn`, `expo-haptics` and `react-native-svg`;
    -   two files, targeting `components/tabcn/account-dock.tsx` and `components/tabcn/account-dock-icons.tsx`.

    `bun run registry` (`scripts/check-registry.ts`) validates it, and the site build generates `apps/site/public/r/account-dock.json`, which is not committed.

#### 6. `registry/themes/panelui-colors.ts` (Modify)

-   **Type / Scope**: PanelUI theme mapping.
-   **Proposed Changes**: Add an `'account-dock'` entry that maps `AccountDockColors` to PanelUI tokens: surface to card, foreground to card-foreground, the accent to primary and hairlines to border. The status colours stay fixed, because they carry meaning.

#### 7. `apps/example/src/catalog.ts` (Modify)

-   **Type / Scope**: Example app catalogue.
-   **Proposed Changes**: Add an entry after the last bar:
    -   `id: 'account-dock'`, `title: 'Account Dock'`;
    -   `kind: 'bar'`, `layout: 'pill-with-action'` (a pill and a separate control beside it, like Labeled + Plus);
    -   a one-line summary;
    -   `status: 'ready'`.

    It is a bar, not a panel, because it draws the whole tab bar, so the README and site counts become 38 tab bars and 6 panels.

#### 8. `apps/example/src/demos.tsx` (Modify)

-   **Type / Scope**: Example app demos.
-   **Proposed Changes**:
    -   Import `AccountDock` and wrap it with `themed('account-dock', …)`.
    -   Add an `'account-dock'` demo entry:
        -   three tabs (Members, Chats, Activity) using the design's icons;
        -   sample data of three workspaces and three accounts, one with initials only;
        -   local `useState` for the workspace, account and status, so the demo responds;
        -   the background, `barHeight` and blobs in the same shape as its neighbours.
    -   Avatars and logos are generated (initials on coloured circles and simple SVG marks), not photos, so the repo ships no images of people.

#### 9. `packages/tabcn/src/__tests__/designs.test.tsx` (Modify)

-   **Type / Scope**: Unit tests (Jest, React Native Testing Library).
-   **Proposed Changes**:
    -   Add `'account-dock'` sample props to `REQUIRED_PROPS`, so the generic bar tests render it:
        -   one tab per route, presses reach the navigator;
        -   works under a provider;
        -   re-renders on a tab change.
    -   Add a `describe('account-dock')` block under a `TabBarProvider`:
        1.  Pressing the chip opens the panel. The chip reports `expanded: true`, and the sheet shows the workspace list.
        2.  Choosing a workspace calls `onWorkspaceChange` with its id, and the dock stays open.
        3.  Pressing the account pill switches to the account list. Pressing its "Status" row shows four radios with the current one checked, and choosing "Idle" calls `onStatusChange('idle')` and closes the menu.
        4.  An open menu plus a hardware back press (via the mocked `BackHandler`) closes the menu only. A second back press hides the panel.
        5.  Changing `activeIndex` while open hides the panel.
        6.  Pressing the round button hides the panel, and `list` resets to workspaces on the next open.

#### 10. `README.md` (Modify)

-   **Type / Scope**: Repository README.
-   **Proposed Changes**:
    -   Change "43 designs" to "44" in three places, and "37 tab bars" to "38".
    -   Add an Account Dock cell to the Tab bars table, numbered 38 after the last bar. It links to `https://vanitascaesar1.github.io/tabcn/designs/account-dock/` and shows `assets/readme/account-dock.gif`, with the subtitle "Floating pill + account".

#### 11. `apps/site/src/lib/designs.ts` (Modify)

-   **Type / Scope**: Site design data and usage snippets.
-   **Proposed Changes**: Add `ACCOUNT_DOCK_SNIPPET`, and return it for `'account-dock'` next to the existing `SECTION_SHEET_SNIPPET` case. The snippet shows:
    -   `<TabBarProvider>` around `<Tabs tabBar={tabBar(<AccountDock … />)}>`;
    -   the data props;
    -   the three callbacks updating app state.

#### 12. `apps/site/src/lib/docs.ts` (Modify)

-   **Type / Scope**: Site design-to-docs links.
-   **Proposed Changes**: Map `'account-dock'` to `'/docs/panels/'`, because it is built on `TabPanel`.

#### 13. `apps/site/src/lib/guides.tsx` (Modify)

-   **Type / Scope**: Site docs content (the Panels guide).
-   **Proposed Changes**: In the Panels guide, add one paragraph:
    -   "<Design id="account-dock">Account Dock</Design> is a whole bar built on one panel: its chip folds the tabs away and opens a `TabPanel` anchored to the bar, and the panel's state is the dock's open state, so back and escape fold it."
    -   Then the chip-plus-Bar-Sheet recipe from Alternative C, for apps that want a switcher without changing their bar.

#### 14. Media (Create)

-   **Type / Scope**: Recordings, from the pipeline used in #26:
    -   record in Expo Go on an agent-owned iPhone 17 Pro simulator with agent-device;
    -   encode;
    -   run `apps/site/scripts/bar-loops.py --only account-dock`;
    -   run `python3 apps/site/scripts/og-images.py`.
-   **Proposed Changes**:
    -   `apps/site/public/videos/account-dock.mp4` and `.jpg`: about 8 s; open, switch workspace, set Idle, fold back.
    -   `apps/site/public/stills/account-dock-1.jpg` to `-3.jpg`: rest, open with workspaces, status menu.
    -   `apps/site/public/bars/account-dock.mp4`, `.jpg` and `-thumb.jpg`: the home page's bar loop.
    -   `apps/site/public/og/account-dock.jpg`: the link-preview image.
    -   `assets/readme/account-dock.gif`: the README.

### Verification Plan

-   **Build, lint, types and tests**: `bun run check` (lint, typecheck, registry check, Jest, library build).
-   **Example app**: `cd apps/example && bunx expo-doctor`.
-   **Focused tests**: `bun run --cwd packages/tabcn test designs` passes. The new `account-dock` block fails if the panel id, back order or tab-change hide is broken.
-   **iOS simulator** (one agent-owned iPhone 17 Pro, prepared with `agent-sim`, driven with agent-device, shut down afterwards):
    -   CUJs 1–5 by hand, with screenshots of rest, open, the account list with the menu, and folded back with the idle dot.
    -   The same with `TABCN_RTL=1`: the fold mirrors, the round button is on the right, and the menu aligns to the left.
    -   The same with the largest accessibility text size: names truncate, and nothing overlaps.
    -   VoiceOver (accessibility inspector):
        -   the chip's label and expanded state;
        -   the sheet's header switch;
        -   the "Status" row, with radios that report checked;
        -   escape folds the dock;
        -   focus returns to the chip.
    -   Reduce motion on: every change is instant.
-   **Narrow width**: the demo at 375 pt (iPhone SE 3rd generation), and the box forced to 330 pt in a test render. The detail line drops below 340 pt, and the names truncate.
-   **Web**: the site's live preview at `/tabcn/designs/account-dock/`. The fold, the sheet and the menu work, and Escape closes the menu first, then the sheet.
-   **Performance**: a release build in the simulator with the performance monitor on shows the JS frame rate at 60 through ten folds. That nothing re-measures follows from the design rule: layout A sets the box, and no animated view has an `onLayout`. Code review checks the rule; the library gets no test hooks for it.
-   **After merge** (each asked of the owner first, because each is outward-facing): the site redeploys on push to main, and the Expo Go demo is republished to EAS with `bunx eas-cli update --branch main --environment production --platform all --non-interactive`.

---

_Drafted with EGM_
