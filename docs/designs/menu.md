# Menu: one PanelUI-style menu, three renderers

- **Status:** Approved 2026-11-28. The owner asked to build it straight away after an EGM brainstorm with six Goldfish reviews. The brief and reviews live in the git-ignored `.egm/` folder (`concepts_brief.md`, `unified-menu-research.md`); the decisions are copied here.
- **Package:** `react-native-tabcn-menu`, in `packages/menu`. It is private until its first manual publish; the name can still change before then.
- **Related:** [`panelui.md`](panelui.md) (decision 4: `react-native-tabcn` never depends on PanelUI. This package is separate, and `react-native-tabcn` never imports it).

## Why

App developers using [PanelUI](https://panelui.dev) want one menu that looks native everywhere:

- Apple's own menu on iOS, which is Liquid Glass on iOS 26.
- rit3zh's Liquid Glass menu on Android ([rit3zh/expo-glass-custom-menu](https://github.com/rit3zh/expo-glass-custom-menu), MIT), with its morph, stretch, drag-to-scrub and haptics.
- PanelUI's menu everywhere else.

PanelUI is a third-party library; the owner is not a maintainer, so this is our own package built on top of it. The owner trusts PanelUI's upkeep more than rit3zh's, so PanelUI's API is the contract, and rit3zh's renderer is forked and kept working by our own CI.

## Decision

### 1. The API is PanelUI's

`Menu`, `Menu.Trigger`, `Menu.Content`, `Menu.Item`, `Menu.CheckboxItem`, `Menu.RadioGroup`, `Menu.RadioItem`, `Menu.Label`, `Menu.Separator`, `Menu.Sub`, `Menu.SubTrigger`, `Menu.SubContent` and `Menu.Background` take PanelUI's props. `ContextMenu` mirrors PanelUI's `ContextMenu`, including `ContextMenu.Preview`.

The package adds three props:

| Prop          | On                                                     | Meaning                                                                                                        |
| ------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `renderer`    | `Menu`, `ContextMenu`                                  | `'auto'` (default), `'system'`, `'glass'` or `'panel'`. Forces a renderer when it is available.                |
| `systemImage` | `Menu.Item`, `CheckboxItem`, `RadioItem`, `SubTrigger` | An SF Symbol for the system renderer, which can't draw React icons.                                            |
| `glass`       | `Menu.Content`                                         | Options for the glass renderer: `{ trigger?, tintColor?, tintOpacity?, blur?, jelly?, speed?, morphOrigin? }`. |

`MenuConfigProvider` sets the app-wide default `renderer`, so glass can be switched off with an over-the-air update. `useMenuRenderer()` reports the renderer the nearest menu would choose and why.

### 2. Three renderers, chosen per menu instance

| Renderer   | Where                                                                                                                                      | How                                                                                                                               |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| **System** | iOS, when `@expo/ui` is installed with `Host`, `RNHostView`, `Menu` and `Button`                                                           | `@expo/ui` SwiftUI `Menu` / `ContextMenu`. Built the same way as `@expo/ui`'s own `MenuView` and PanelUI's `Fab` native path.     |
| **Glass**  | Android, when the native module `TabcnGlassMenu` is installed and its `supportsGlass` constant is true and its `apiVersion` matches the JS | A fork of rit3zh's native renderer drawing its own native text rows from our model. React icons are drawn through its icon slots. |
| **Panel**  | Everything else (Android below 13, a low-RAM phone, Expo Go on Android, web, a missing `@expo/ui`) and after any glass failure             | PanelUI's own `Menu` / `ContextMenu`, untouched.                                                                                  |

How the renderer is picked, in order:

1. The `renderer` prop.
2. The `MenuConfigProvider` default.
3. Availability.
4. What the menu contains. Glass can't draw submenus, so a menu with `Menu.Sub` uses Panel on Android.

A glass menu that fails at run time (`onGlassUnavailable`) remounts as Panel for the rest of the session.

`ContextMenu` uses System on iOS and Panel elsewhere. There is no glass `ContextMenu` in this version.

### 3. One walker, one model, a JS action table

The walker reads the children of `Menu.Content` once per render. It flattens fragments and arrays and recognises only this package's parts, by a `menuPart` tag on each component. It returns:

- **A model:** a list of nodes (`item`, `checkbox`, `radio-group` with `radio` children, `label`, `separator`, `sub`). Each node has an id built from its path in the tree.
- **An action table, owned in JS:**
  - item → `onSelect`;
  - checkbox → `onCheckedChange(!checked)`, then `onSelect`;
  - radio → the group's `onValueChange(value)`, then `onSelect`.

  Each entry also carries whether choosing it closes the menu. The defaults copy PanelUI's: Item closes, CheckboxItem stays open, RadioItem closes. A test fails if PanelUI changes them.
- **Ignored features:** the props and parts this renderer won't draw (`shortcut`, `trailing`, `Menu.Background`, non-text labels, `onPress`). In development they are reported once per menu.

Renderers only read the model. Neither System nor Glass calls into PanelUI's components, so neither depends on PanelUI's private context. `onPress` is not called by System or Glass, because neither has a press event to pass; use `onSelect`, which is PanelUI's own semantic handler.

A developer's own component wrapping `Menu.Item` is not recognised, and neither is a row whose label isn't plain text. Rather than lose those rows, the menu is drawn by Panel, which renders the tree as it is. In development a warning names the component.

### 4. Who owns the open state

| Renderer | Owner              | `open` / `defaultOpen`                                                        | `onOpenChange`                                                                                 |
| -------- | ------------------ | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Panel    | PanelUI (JS)       | works                                                                         | works                                                                                          |
| Glass    | the native session | forwarded to the native `open()` / `close()`                                  | from the native `onMenuOpenChange`; duplicates are dropped                                     |
| System   | SwiftUI            | **ignored**, with a development warning (SwiftUI can't open a menu from code) | best-effort: the first row's `onAppear` and every row's `onDisappear`, as PanelUI's `Fab` does |

### 4b. Light or dark

Both native renderers take light or dark from PanelUI's menu surface token, `--color-overlay`, by its luminance, because that is the colour the native menu stands in for. If the token can't be read, they use PanelUI's `useThemeMode().mode`. That hook alone reports `light` for any theme the app registers itself (Seek's `seek` theme is dark), and would put light glass in a dark app.

### 5. What each renderer draws

| Part / prop                         | System (iOS)                                        | Glass (Android 13+)                             | Panel |
| ----------------------------------- | --------------------------------------------------- | ----------------------------------------------- | ----- |
| `Item` text                         | `Button`                                            | native row                                      | ✓     |
| `icon`                              | `systemImage` only; a React `icon` is ignored       | React icon in an icon slot, coloured to the row | ✓     |
| `description`                       | subtitle (second `Text`)                            | native subtitle                                 | ✓     |
| `shortcut`, `trailing`              | ignored                                             | ignored                                         | ✓     |
| `variant="destructive"`             | `role="destructive"`                                | red row                                         | ✓     |
| `disabled`                          | `disabled` modifier                                 | not selectable                                  | ✓     |
| `closeOnSelect={false}`             | `menuActionDismissBehavior('disabled')` (iOS 16.4+) | `keepOpen`                                      | ✓     |
| `CheckboxItem`                      | `Toggle`                                            | checked row                                     | ✓     |
| `RadioGroup` / `RadioItem`          | inline `Picker`                                     | checked rows                                    | ✓     |
| `Label`                             | `Section` title over the rows that follow           | heading row                                     | ✓     |
| `Separator`                         | `Divider`                                           | separator row                                   | ✓     |
| `Sub` / `SubTrigger` / `SubContent` | nested `Menu`                                       | not supported: the menu uses Panel              | ✓     |
| `Menu.Background`                   | ignored                                             | ignored (the glass is the background)           | ✓     |
| `ContextMenu` + `Preview`           | `@expo/ui` `ContextMenu`                            | — (Panel)                                       | ✓     |

### 6. The glass fork

The fork is pinned to rit3zh's commit `0021efd`, copied into `packages/menu/android`. Changes from upstream:

1. **Renamed:** Kotlin package `expo.modules.tabcnmenu`, module `TabcnGlassMenu`, icon host id `tabcn-menu-icons`, so it can sit beside rit3zh's own module.
2. **Constants:**
   - `supportsGlass`: API 33+, not `ActivityManager.isLowRamDevice()`, and all three AGSL shaders compile. Checked once and cached.
   - `apiVersion`: the JS falls back to Panel when it doesn't match.
3. **Failure handling:** glass drawing runs inside try/catch. On a throw, glass is turned off for the process, every anchor gets `onGlassUnavailable`, and the overlay draws its flat fallback until JS remounts the menu as Panel.
4. **No backdrop recording when idle:** the overlay records the window behind it only while a menu is open or a trigger is drawn as glass. Upstream re-records on every frame in which anything beneath it changes.
5. **Trigger:** the trigger is the developer's own button, so the glass trigger is off by default (`glass.trigger`).
6. **Font:** the bundled Inter font is removed. Rows use the font family passed in, or the system font.

### 7. Credits

`packages/menu/NOTICE` and the package README credit:

- rit3zh (expo-glass-custom-menu). Its MIT notice is kept as published, including the Expo module template's copyright line.
- PanelUI (MIT), whose API this mirrors and whose `Fab` native-menu approach the system renderer follows.
- Expo's `@expo/ui` `MenuView`, whose SwiftUI mapping the system renderer follows.

## Verification

- **`bun run check`** builds and tests `packages/menu`. Unit tests cover:
  - the walker: every part, ids, actions, keep-open defaults, ignored features, unknown children;
  - renderer selection;
  - the glass item mapping.

  A drift test reads PanelUI's installed `menu/index.tsx` and fails if the keep-open defaults change.
- **Every pull request that touches `packages/menu`** runs `.github/workflows/menu-android.yml`, which prebuilds the example app for Android and compiles the module's Kotlin.
- **Weekly** (`.github/workflows/menu-weekly.yml`, Mondays 06:00 GMT):
  - typecheck and test against the newest `panelui-native` 1.x and `@expo/ui` for SDK 58;
  - build Seek (`apps/seek`, the first app using the menu: the ⋯ menu on its film page) and run `apps/seek/maestro/menu.yaml` against its `seek://menu-check` page, on Android emulators (API 33 to 36) and an iOS simulator. The flow asserts the renderer the page reports before it opens, chooses and closes the menu.
  - Opens an issue labelled `menu-weekly` when a job fails, or comments on the open one. A canary job typechecks and tests against the newest majors of `panelui-native` and `@expo/ui`, beyond our ranges; it never opens issues.
- **On a device, before the first publish:** the checklist in `packages/menu/README.md`.

## Deferred

| Item                                                                    | Trigger                                                                                 |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Glass drawing PanelUI's real rows (phase 2, behind a device spike)      | After the first release, if `shortcut`, `trailing` or custom rows on Android are wanted |
| Glass `ContextMenu` with a lifted preview                               | After phase 2                                                                           |
| React icons in the iOS system menu (cached PNG through `Image uiImage`) | When a device check shows the colours survive                                           |
| Screenshot comparison in the weekly job                                 | Once a calibration run sets a tolerance for the emulator's software GPU                 |
| A development-build recording path for the README and site              | Before the package is listed on the site                                                |
| First npm publish and trusted publisher                                 | When the device checklist passes                                                        |
