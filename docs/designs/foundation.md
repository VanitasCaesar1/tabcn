# tabcn foundation

-   **Author:** Chakravarthi Chintapatla
-   **Status:** Approved, implemented (owner approved Overview, Technical Plan, Alternatives; Goldfish review skipped at owner request)
-   **Implementation notes (2026-11-20):** the workspace export condition is `tabcn-source`, not `source`, because React Navigation also uses `source`, which pulled its raw TypeScript into our typecheck.
-   **Date:** 2026-11-20

---

## Overview

tabcn is an open-source library of 20 animated tab bars for React Native and Expo. It ships in two parts:

1.  **The `tabcn` npm package (the foundation).** It holds the code every tab bar needs and that is easy to get wrong:
    -   reading tab state from the navigator and switching tabs
    -   spacing for the safe area (the home indicator and gesture bar)
    -   the animated highlight that moves to the active tab
    -   press feedback, badges and haptics
    -   respecting the "reduce motion" setting
    -   screen-reader roles
2.  **Designs.** Each design is one short source file in the repo's `registry/` folder, built only on the foundation. A user copies the design they want into their own app and owns that copy. This is the model shadcn/ui uses for web components.

A design plugs into the navigator the user already has. It is passed as the `tabBar` render function of Expo Router's `<Tabs>` or of React Navigation's bottom tabs. The navigator keeps doing screens, routing, deep links and the Android back button.

This document specifies the foundation: its public API, how it connects to the two navigators, the motion building blocks the designs share, how designs are installed, and the promise the foundation makes to copies made with older versions.

## The Problem

Custom tab bars are one of the most copied UI patterns in mobile apps, and one of the most often broken. A developer who wants a floating pill with a sliding highlight usually ends up writing the same things by hand:

-   **Navigation logic:**
    -   emit the `tabPress` event
    -   respect `preventDefault`
    -   don't navigate to the tab that is already active
    -   handle long-press
-   **Layout:**
    -   measure each tab so the highlight can slide to it
    -   pad for the safe area
    -   tell screens how tall a floating bar is, so content doesn't end up underneath it
-   **Accessibility:**
    -   give each tab the right role and "selected" state for screen readers
    -   respect "reduce motion"

Each of these is easy to miss. The bugs are subtle, such as a highlight that jumps on rotation, a list whose last row is hidden under the bar, or VoiceOver reading "button" instead of "tab, 2 of 4, selected".

Existing options don't solve this:

-   **The navigator's default tab bar** handles these details but allows little visual change.
-   **Native tabs** (Expo Router's `NativeTabs`) look native but can't draw custom designs.
-   **Tab bar component packages on npm** ship a fixed look behind props. Changing anything the props don't cover means forking the package.
-   **Copying a tab bar from a tutorial or gist** gives full control but usually skips the details listed above.

tabcn's answer: put the hard, easy-to-get-wrong parts in one small tested package, and give users the visual part as code they own and can change freely.

A second problem is specific to this model. Copied code freezes at the version it was copied from, while the foundation keeps changing underneath it. If the foundation's API changes, old copies break. The foundation needs to be small and to promise stability to old copies.

## Goals

1.  **Fast to adopt.** A developer with an existing Expo Router or React Navigation app can install a design and see it working in under 5 minutes: one install step and one `tabBar` prop. Verified by following the README in a fresh `create-expo-app` project.
2.  **Works with both navigators.** The same design source works with `expo-router/js-tabs` (Expo Router 58+) and `@react-navigation/bottom-tabs` 7. The foundation depends on neither package. Verified by running the foundation's tests against both.
3. **The foundation is enough to build all 20 designs.** Every design in `registry/` imports only the public `tabcn` API, React Native, and the dependencies it declares, never foundation internals. If a design needs something the public API lacks, the API is extended or the design keeps that code in its own file.
4.  **Motion stays smooth when the app is busy.** The highlight, press feedback and label animations run on the UI thread (Reanimated worklets). Verified by a manual test: block the JS thread for 500 ms during a tab switch, and the highlight animation must still finish without stalling.
5.  **Accessible by default.**
    -   Each tab exposes the tab role, its label, its selected state, and its position (for example "2 of 4") to VoiceOver and TalkBack.
    -   Action buttons (plus, search, create) are announced as buttons, not tabs.
    -   With "reduce motion" on, highlights move instantly or fade instead of sliding or springing.
6.  **Screens are not covered.** Screens can read the bar's height, including the safe area, so floating bars don't hide the last row of a list.
7.  **Old copies keep working.** A design copied from version 1.x of `tabcn` keeps working with every later 1.x release. Breaking changes happen only in a new major version, and are announced in the previous minor release with a deprecation warning in development builds.
8.  **Small footprint.**
    -   The foundation's only required peer dependencies are React, React Native and Reanimated.
    -   The navigator packages are optional peers: an app installs the one it uses.
    -   Blur, glass, haptics and SVG are dependencies of the designs that use them, not of the foundation.

## Non-Goals

-   **Being a navigator.** tabcn does not keep its own tab state, define routes, or replace `<Tabs>`. It only draws the bar.
-   **Native tab bars.** Designs don't use the platform's native tab bar, so iOS liquid glass system behaviour and minimise-on-scroll from native tabs are not provided in v1.
-   **A bundled general-purpose icon set.** The core ships no icons. Each design's optional `icons.tsx` holds the icons traced from that design's reference image (decision by the project owner, 2026-11-20, accepting that these copy the original apps' artwork). App names and logos are not used.
-   **A shared theme system.** There is no theme provider or design tokens shared across designs. Each design takes the few colours it needs as props and owns the rest of its styles.
-   **Other tab layouts.** Top tabs, side rails, iPad sidebars and drawers are out of scope for v1.
-   **Updating copies automatically.** No tool to merge upstream changes into a user's edited copy in v1. Users can re-run the install command to overwrite.
-   **The old React Native architecture.** Reanimated 4 and React Native 0.88 require the New Architecture; tabcn does too.
-   **Web.** react-native-web is not a supported platform in v1. The core avoids native-only APIs so web can be added later, but nothing is tested there. The website shows designs as recorded videos, not live web demos.
-   **The website itself.** The tabcn website (ui-lab-style docs, demo videos, Expo Go QR codes, and hosting of the registry JSON) gets its own design doc. This doc only fixes what the website must serve: one registry JSON file per design at `/r/<id>.json`.

## Open Questions

-   **shadcn dependency install:** confirm `shadcn add` installs a design's npm dependencies (through `npx expo install`) in a project with `node_modules` present.
-   **Expo Go coverage:** confirm every native module the designs use (`expo-blur`, `expo-glass-effect`, `expo-haptics`, `react-native-svg` if needed) is included in Expo Go for SDK 58, so the website's QR codes can open the example app without a custom build.
-   **Tabs with an `href`:** Expo Router turns a non-null `href` into a custom `tabBarButton` that renders a `Link`. tabcn designs don't render `tabBarButton`, so a tab that points at an external `href` would lose that behaviour. Decide whether to support it or document it as a limitation.

## Critical User Journeys (CUJs)

### CUJ 1: Add a design to an Expo Router app

-   **Given**: An Expo SDK 58 app using Expo Router's `<Tabs>` with four tab screens. Reanimated and safe-area-context are installed (both come with the default template).
-   **When**: The developer runs the install command for `sliding-capsule` and sets `tabBar={tabBar(<SlidingCapsule />)}` on `<Tabs>`, with `tabBar` imported from `tabcn/expo-router`.
-   **Then**:
    -   The `tabcn` package is installed and the design's source file is in their project.
    -   The app shows the floating pill with each tab's icon and title, read from the screens' options.
    -   Tapping a tab switches screens, and the capsule slides to the new tab.
    -   Deep links still open the right tab.

### CUJ 2: Add a design to a plain React Native app

-   **Given**: A React Native app using `@react-navigation/bottom-tabs` 7.
-   **When**: The developer installs the same design and sets `tabBar={tabBar(<SlidingCapsule />)}` on the bottom tab navigator, with `tabBar` imported from `tabcn/react-navigation`.
-   **Then**: It behaves the same as in CUJ 1. The design file is identical, and Expo Router isn't installed.

### CUJ 3: Change icons, labels and tab count without editing the design

-   **Given**: A design installed as in CUJ 1.
-   **When**:
    -   The developer adds a fifth screen.
    -   They set each screen's `tabBarIcon` and `title` in the screen options.
    -   They set `tabBarBadge: 3` on one screen.
-   **Then**:
    -   The bar shows five tabs and the highlight lines up with each.
    -   The icons come from the screen options, including image or avatar icons.
    -   The badge appears with its entrance animation.
    -   No edit to the design file was needed.

### CUJ 4: A plus button that opens a modal instead of switching tabs

-   **Given**: A pill-with-action design such as `pill-plus`.
-   **When**: The user taps the plus button.
-   **Then**:
    -   A callback the developer provided runs (for example, opening a "create post" modal).
    -   The active tab does not change.
    -   Screen readers announce the plus button as a button.

### CUJ 5: A floating bar doesn't hide content

-   **Given**: A floating-pill design over a screen with a long scrolling list.
-   **When**: The user scrolls to the bottom of the list.
-   **Then**: The last row is fully visible above the bar, because the screen added bottom padding equal to the bar's height plus the safe area.

### CUJ 6: Reduce motion and screen readers

-   **Given**: "Reduce motion" and VoiceOver (or TalkBack) are on.
-   **When**: The user moves through the tabs and activates one.
-   **Then**:
    -   Each tab is read as "<label>, tab, <n> of <total>" with its selected state.
    -   Activating a tab switches screens.
    -   The highlight moves without sliding or springing.

### CUJ 7: Update the foundation without breaking a copy

-   **Given**: A user copied `soft-pill` while on `tabcn` 1.0 and edited its colours and spacing.
-   **When**: They upgrade to `tabcn` 1.4.
-   **Then**:
    -   Their edited copy compiles and runs unchanged.
    -   If it uses an API deprecated in 1.4, they get a one-time development warning naming the replacement, not a crash.

## Technical Plan (Architecture)

### Facts this plan is built on

These were checked against the installed source of `expo-router` 58.0.32, not taken from memory.

-   **Different props from each navigator.**
    -   Expo Router 58's tabs (`expo-router/js-tabs`, also exported as `Tabs` from `expo-router`) call `tabBar` with `{ state, descriptors, emitter, navigateToTab, insets }`.
    -   React Navigation 7 calls it with `{ state, descriptors, navigation, insets }`.
    -   A tab press is also handled differently. The fork uses `emitter.emit({ type: 'tabPress', target, canPreventDefault: true })` then `navigateToTab(key)`. React Navigation uses `navigation.emit(...)` then `navigation.navigate(...)`.
-   **Hidden tabs are marked differently.** Expo Router turns `href: null` into `options.hidden: true`. React Navigation 7 apps hide a tab with `tabBarItemStyle: { display: 'none' }`.
-   **How the bar sits next to screens.** Both navigators render the bar _after_ the screens in a vertical column.
    -   A bar that stays in the normal layout flow takes space, and screens shrink to fit above it.
    -   A bar positioned `absolute` floats over the screens, which then fill the full height.
-   **Bar height reaches screens through a context the navigator owns.** Each navigator provides a `BottomTabBarHeightCallbackContext`. The bar calls the function in it with its measured height, and screens read that value with `useBottomTabBarHeight()`. Each navigator package exports its own copy of this context.
-   **Safe-area insets arrive as a prop.** Both navigators pass `insets`, so the foundation doesn't need `react-native-safe-area-context` itself.
-   **The shadcn CLI works in an Expo project.**
    -   Tested with `shadcn@4.23.0` and a hand-written `components.json`: `shadcn add <item.json>` wrote the design file to its target path without Tailwind or a web framework.
    -   For npm dependencies it detected Expo and ran `npx expo install`. A full dependency install hasn't been confirmed yet (the test project had no `node_modules`).
    -   **Retested 2026-11-21 in a fresh SDK 58 app (`create-expo-app`, default template) with `react-native-tabcn@0.1.1` from npm.** Three problems, all fixed by the registry change below:
        -   Without a `components.json`, `shadcn add` for a `registry:component` item starts shadcn's web setup (component library, Tailwind preset) and stalls at "Preflight checks".
        -   With one, shadcn's transforms run on `registry:component` files and corrupt plain strings: repeated words are dropped, so `rgba(255, 255, 255, 0.12)` became `rgba(255, 255, 0.12)` and `viewBox="0 0 24 24"` became `"0 24"`, which crashes react-native-svg on the first render. The file's header comment was removed too.
        -   shadcn runs `npx expo install -- <packages>`; the `--` hands the names straight to npm, so they land at npm's latest (`react-native-svg@^15.16.1` where SDK 58 wants `15.16.0`). `npx expo install --fix` afterwards corrects them.
    -   **Fix:** each item is `registry:item` and each file `registry:file` (with the same `target`). shadcn copies those files byte for byte, needs no `components.json`, and still puts them under `src/` when the app has one. Ten designs installed this way matched their sources exactly, type-checked, bundled, and ran in Expo Go; `expo-doctor` passed after `--fix`.

### Shape of the solution

The foundation has three layers:

1.  **Adapters.** One per navigator, each in its own import path. An adapter converts that navigator's props into one shared description of the tab bar.
2.  **A small core.** It is navigator-neutral and built from that shared description.
3.  **Designs.** They are built only on the core.

```text
 user's app                         tabcn package                         copied design
 ───────────                        ─────────────                         ─────────────
 <Tabs tabBar={                     tabcn/expo-router        ┐
   tabBar(<SlidingCapsule/>)  ───▶  tabcn/react-navigation   ┘─▶ TabBarState ─▶ useTabBar() ◀── SlidingCapsule
 }>                                  (adapter: normalise props,      (React        TabBarRoot      uses only
                                      wire height callback)          context)      TabList          tabcn + RN +
                                                                                   TabButton        its own deps
 screens: useBottomTabBarHeight() ◀────── height reported by TabBarRoot             TabIndicator
                                                                                   PressableScale
                                                                                   useFocusProgress
```

### 1. Adapters: `tabcn/expo-router` and `tabcn/react-navigation`

Each adapter is a separate entry point (a package subpath export), so the core never imports a navigator.

-   `tabcn/expo-router` imports from `expo-router/js-tabs`.
-   `tabcn/react-navigation` imports from `@react-navigation/bottom-tabs`.
-   Both navigators are _optional_ peer dependencies: an app installs only the one it uses.

Each adapter exports one function, `tabBar(element)`, and the user's layout is the only place that names a navigator:

```tsx
// Expo Router: app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router/js-tabs'; // `Tabs` from 'expo-router' is deprecated in SDK 58
import { tabBar } from 'tabcn/expo-router';
import { SlidingCapsule } from '@/components/tabcn/sliding-capsule';

<Tabs tabBar={tabBar(<SlidingCapsule onActionPress={openComposer} />)}> … </Tabs>;

// React Navigation: identical, but import { tabBar } from 'tabcn/react-navigation'
```

`tabBar(element)` returns the `(props) => ReactNode` function the navigator expects. That function renders a small adapter component, which:

1.  **Builds a `TabBarState`** (below) from the navigator props:
    -   It drops hidden routes (`options.hidden` for the fork, `tabBarItemStyle.display === 'none'` for React Navigation).
    -   It resolves each label in the same order the default bar uses: `tabBarLabel` if it's a string, else `title`, else the route name.
    -   It wraps the press logic so `tab.press()` emits `tabPress` and navigates only when the tab isn't already focused and the event wasn't prevented.
2.  **Reads the navigator's `BottomTabBarHeightCallbackContext`** and passes that function into the state as `reportHeight`.
3.  **Puts the state in tabcn's React context** and renders `element` inside it.

Designs never see navigator props. They call `useTabBar()`.

### 2. The shared tab bar description: `TabBarState`

```ts
interface TabBarState {
  tabs: readonly TabItem[]; // visible tabs, in order
  activeIndex: number; // index into `tabs`; -1 if the focused route is hidden
  insets: { top: number; right: number; bottom: number; left: number };
  hideOnKeyboard: boolean; // from the focused screen's `tabBarHideOnKeyboard`
  reportHeight: (height: number) => void; // called by TabBarRoot; designs don't call it
}

interface TabItem {
  key: string;
  routeName: string;
  index: number; // position among visible tabs
  focused: boolean;
  label: string;
  accessibilityLabel?: string; // `tabBarAccessibilityLabel`
  testID?: string; // `tabBarButtonTestID`
  badge?: string | number; // `tabBarBadge`
  renderIcon?: (p: { focused: boolean; color: string; size: number }) => React.ReactNode; // `tabBarIcon`
  press: () => void;
  longPress: () => void;
}
```

This is the only data contract between adapters and designs, and it's the one most likely to need additions. Adding optional fields isn't a breaking change; renaming or removing fields is (see goal 7).

`TabBarStateProvider` is exported so designs can be rendered with made-up state, without a navigator. That's used for tests and for the example app's gallery previews.

### 3. Core building blocks

These are all the exports a design gets: three components, two hooks and one plain building block. Each exists because several of the 20 designs need it.

| Export                                          | What it does                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Used by                                   |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `useTabBar()`                                   | Returns the current `TabBarState`.                                                                                                                                                                                                                                                                                                                                                                                                                                  | All                                       |
| `<TabBarRoot placement="docked" \| "floating">` | Outer container. Docked: stays in layout flow and pads the bottom by `insets.bottom`. Floating: positioned absolutely, `bottom = insets.bottom + offset` (`offset` prop, default 12), centred, with `pointerEvents="box-none"` so taps on the empty space beside the pill reach the screen. Measures itself and calls `reportHeight` with the space it covers (bar height + bottom gap). Hides with a slide when `hideOnKeyboard` is true and the keyboard is open. | All                                       |
| `<TabList>`                                     | The row that holds tabs. It has the `tablist` role and tracks where each tab button sits, so indicators can move to the active one. It works inside a horizontal `ScrollView` (chip rail).                                                                                                                                                                                                                                                                          | All                                       |
| `<TabButton tab={tab}>`                         | Tab button. Accessibility role `tab`, `selected` state, and on iOS the label `"<label>, tab, <n> of <total>"` (as the default bar does; Android announces position itself). Calls `tab.press` / `tab.longPress`. Records its position relative to the enclosing `TabList` with `measureLayout`, so it can be wrapped in other views. Accepts children or `({ focused, pressed }) => ReactNode`.                                                                     | All                                       |
| `<TabIndicator>` / `useTabIndicator()`          | An absolutely positioned animated view, or for custom shapes the raw animated values (`x`, `y`, `width`, `height`), that moves to the active tab's frame with a spring. On the first layout it jumps into place instead of animating in from 0.                                                                                                                                                                                                                     | 1, 2, 3, 5, 11, 12, 13, 16, 17, 18, 19    |
| `useFocusProgress(tab)`                         | Animated value that goes 0 → 1 as a tab becomes active. Drives label reveal, colour crossfade, icon swap and size changes.                                                                                                                                                                                                                                                                                                                                          | 1, 2, 4, 7, 8, 14, 15, 20 and most others |
| `PressableScale`                                | Pressable that shrinks slightly while pressed (`scale` prop, default 0.94; 1 turns it off) and accepts `role` (default `button`). `TabButton` is built on it; designs use it directly for action buttons (plus, search, centre CTA).                                                                                                                                                                                                                                | 5, 6, 9, 10, 17, 19                       |

**Motion rules for every animation in the core:**

-   It runs on the UI thread through Reanimated shared values and `useAnimatedStyle`, so a busy JS thread doesn't stall it.
-   It uses Reanimated's `ReduceMotion.System`, so with "reduce motion" on, springs finish instantly.
-   Spring settings are a single exported constant (`tabcnSpring`). Designs can pass their own.

**Deliberately not in the core:**

-   **Badges.** `tab.badge` is just data; designs animate it with Reanimated's built-in `entering`/`exiting` animations.
-   **Haptics.** Designs call `expo-haptics` in `onPressIn`.
-   **Blur and glass.** These come from `expo-blur` / `expo-glass-effect` inside the designs that use them.
-   **Icons and colours.**

**Rule for adding to the core:** something moves into the core only once three or more designs need it. Until then it stays inside the design files, even if that means repeating code.

### 4. Designs and the registry

-   **One file per design:** `registry/designs/<id>/<id>.tsx`.
-   **Allowed imports:** `tabcn`, `react`, `react-native`, `react-native-reanimated`, and the npm packages listed in the design's registry entry. No imports between designs and no shared helper files, so shadcn never has to rewrite import paths. (Amended 2026-11-21, [composer-dock-split.md](composer-dock-split.md): a design split into several files of its own registry item may import a sibling as `./<name>` when that file keeps its name when installed.)
-   **Props:** each design exports one component. Its props cover only what screen options can't express, such as action-button handlers (`onActionPress`), colours, and a `placement` override where the design allows it.
-   **Registry index:** `registry/registry.json` is the shadcn registry index, with one `registry:item` per design whose files are `registry:file` (see the 2026-11-21 retest above: `registry:component` files are rewritten by shadcn). Each item lists its file (`target: components/tabcn/<id>.tsx`), its npm `dependencies` (always `tabcn@^<current minor>`, plus `expo-blur` and similar where used), and its title and description from the catalog.
-   **Build and hosting:**
    -   `shadcn build` writes one JSON file per design from `registry/registry.json`.
    -   The tabcn website serves those files at `/r/<id>.json`, so users install with `npx shadcn add https://<site>/r/<id>.json`. The website's own design doc covers how.
    -   No `components.json` is needed (`registry:item` installs without one). The README and each design page say to run `npx expo install --fix` after `shadcn add`.
-   **Expo Go only:** designs may use only native modules that ship in Expo Go. Then the example app runs in Expo Go, which the website's QR codes rely on, and users can try a design without a custom build. A design that needs anything else is out of scope for v1.
-   **Catalog:** `apps/example/src/catalog.ts` stays the list of designs and their status. `registry.json` holds the install metadata. A check script fails CI if the two don't list the same ids.

### 5. Example app

The example app uses the same files users copy, so every design is tested exactly as shipped.

-   **Path alias:** `@registry/*` points at `registry/designs/*`. Metro already watches the whole monorepo.
-   **Live demo per design:** `src/app/designs/[id]/` becomes a nested Expo Router `<Tabs>` layout with six sample screens. It renders `tabBar(<Design />)` for the chosen design and hides the screens that design doesn't use with `href: null`. One screen has a long list, to check journey 5 (content not hidden).
-   **Gallery previews:** the gallery renders every design in a `TabBarStateProvider` with made-up state, so all 20 can be compared side by side against the references.
-   **React Navigation check:** a second, smaller route (`src/app/react-navigation.tsx`) mounts `@react-navigation/bottom-tabs` directly with one design, to check journey 2 in the same app.

### 6. Testing

-   **Unit and integration (Jest + React Native Testing Library 14, `jest-expo` preset):** Reanimated is replaced by a small mock (`packages/tabcn/jest/`), because Reanimated 4.7's own Jest setup mixes its native and JS code paths and crashes. Animations finish instantly in tests; motion is checked by hand.
    -   **Adapters:** render a real navigator for each: Expo Router through `expo-router/testing-library`'s `renderRouter`, and `@react-navigation/bottom-tabs` inside a `NavigationContainer`. Then check:
        -   pressing a tab switches screens
        -   `preventDefault` in a `tabPress` listener stops the switch
        -   pressing the focused tab doesn't navigate again
        -   long press emits `tabLongPress`
        -   hidden routes are dropped
        -   labels resolve in the right order
        -   `useBottomTabBarHeight()` in a screen returns the height `TabBarRoot` reported
    -   **Core:** test accessibility (role, selected state, iOS position label, action buttons announced as buttons) and that `TabIndicator` jumps into place on the first layout.
    -   **Designs:** a smoke test per design that renders it with `TabBarStateProvider` and checks each tab has the `tab` role.
-   **Manual, per design, before it's marked `ready`:**
    -   iOS and Android, light and dark mode
    -   "reduce motion" on
    -   VoiceOver and TalkBack
    -   the 500 ms JS-block test for goal 4
    -   rotation
    -   an RTL layout (right-to-left languages)

### 7. Versioning

-   **Before 1.0 (`0.x`):** a minor release may break the API, and that's said plainly in the README and the changelog. Registry items pin `tabcn@^0.<minor>`, so a design copied today keeps getting patch fixes but never a breaking minor.
-   **From 1.0:**
    -   Normal semver: breaking changes only in a major release.
    -   Each one is announced first in a minor release, as a deprecation warning shown once in development builds.
    -   Registry items move to `tabcn@^1`.
-   **When 1.0 is allowed:** only after all 20 designs are built on the public API, since that's the test that the API is complete.

## Alternatives Considered

### Alternative A: An npm package with 20 ready-made designs controlled by props

-   **Pros**: One install, no copied files, and every fix reaches every user.
-   **Cons**:
    -   Every user downloads all 20 designs and their dependencies (blur, glass), even to use one.
    -   Any change the props don't cover means forking the package.
    -   Each new prop is permanent API, so the prop list keeps growing.
-   **Reason for Rejection**: The point of tabcn is that users own the look. Props can't express "make the capsule a bit taller and change the spring" without an option for everything.

### Alternative B: Copy-only, with no foundation package

-   **Pros**: Nothing to version. Users own all the code, and old copies can never break.
-   **Cons**: Every design repeats the hard parts: `tabPress`/`preventDefault` handling, hidden routes, height reporting, accessibility roles, and measuring tab positions for the indicator. A bug in that logic exists 20 times, and fixes never reach users who already copied.
-   **Reason for Rejection**: Those repeated parts are exactly the parts people get wrong (see The Problem). Putting them in one tested package is the main reason tabcn exists.

### Alternative C: Expo Router's headless tabs (`expo-router/ui`) as the foundation

-   **Pros**: Expo's own unstyled tab building blocks (`Tabs`, `TabList`, `TabTrigger`, `TabSlot`). Already maintained, no adapter needed.
-   **Cons**:
    -   Works only with Expo Router, so plain React Native apps are excluded.
    -   It replaces the navigator rather than plugging into `tabBar`, so users would have to rewrite their tab layout.
    -   Screens wouldn't get `useBottomTabBarHeight()`.
-   **Reason for Rejection**: It contradicts goal 2 (both navigators, same design file) and goal 1 (drop into an existing layout).

### Alternative D: One entry point that detects the navigator from the props' shape

-   **Pros**: Users write `tabBar={(props) => <SlidingCapsule {...props} />}` with no adapter import. Telling the two apart is easy: the fork passes `navigateToTab`, React Navigation passes `navigation`.
-   **Cons**:
    -   Without importing a navigator package, the core can't reach that navigator's `BottomTabBarHeightCallbackContext`.
    -   The fallback is a tabcn-specific provider the user wraps around the navigator, plus a tabcn-specific height hook. Then `useBottomTabBarHeight()` returns the wrong value, which breaks other libraries and the advice in both navigators' docs.
-   **Reason for Rejection**: Saving one import line isn't worth a setup step and a hook that gives the wrong height. Separate adapters let each one import its own navigator's context.

### Alternative E: Our own install command (`npx tabcn add <id>`)

-   **Pros**: No `components.json`, no web-only fields, and full control over messages and where files go.
-   **Cons**: Another package to build and maintain (downloads, import paths, dependency installs, overwrite prompts), all of which the shadcn CLI already does. Fewer people know the command.
-   **Reason for Rejection**: The shadcn CLI was tested in an Expo project and writes files correctly. A thin `tabcn` wrapper that creates `components.json` can be added later if setup turns out to be the main complaint (see Future Improvements).

### Alternative F: Live web demos (react-native-web) on the website

-   **Pros**: Visitors can try each design in the browser, the way ui-lab does for its web components.
-   **Cons**:
    -   Web becomes a supported platform we test and maintain.
    -   The four glass designs (1, 5, 18, 19) can't look right, because `expo-glass-effect` is iOS-only and blur on web is approximate.
    -   A Next.js site would also need react-native-web wired into its build.
-   **Reason for Rejection**: Decided on 2026-11-20. The website shows recorded simulator videos and a QR code that opens the example app in Expo Go, which shows the real thing on a real phone.

### Future Improvements

-   **A `tabcn add` wrapper.** A small command that calls `shadcn add` and then `npx expo install --fix`, if the second step proves to be friction. (Writing `components.json` is no longer needed.)
-   **Hide on scroll.** A shared value in the core that hides the bar on scroll (native tabs have this behaviour), once three designs want it.
-   **Web support.** Once the core is stable, if users ask for it.

---

_Drafted with EGM_
