# react-native-tabcn-menu

One menu, written with [PanelUI](https://panelui.dev)'s parts, drawn three ways:

| Renderer   | Where                                                                                                                                                                                                                                        |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **System** | iOS: Apple's own menu through `@expo/ui` (Liquid Glass on iOS 26).                                                                                                                                                                           |
| **Glass**  | Android 13+: a Liquid Glass menu that grows out of its trigger, stretches toward your finger, and lets you drag across rows and lift to choose. A fork of [rit3zh/expo-glass-custom-menu](https://github.com/rit3zh/expo-glass-custom-menu). |
| **Panel**  | Everywhere else: PanelUI's own menu, unchanged. That covers older Android, low-memory phones, Expo Go on Android, web, and any device where the glass fails.                                                                                 |

> **Status:** private, not on npm yet. The design is in [`docs/designs/menu.md`](../../docs/designs/menu.md).

## Install

The package needs:

- `panelui-native` ~1.4, set up as PanelUI's docs describe (Uniwind theme and `PanelUIProvider`);
- `@expo/ui` for the iOS menu. It is optional: without it, iOS uses PanelUI's menu.

```sh
bunx expo install @expo/ui
```

What you get where:

- **Expo Go:** iOS shows Apple's menu and Android shows PanelUI's.
- **Development or release build:** Android 13+ shows the glass menu. The native module autolinks; there is no config plugin.

## Use

It's PanelUI's API. A tree written for PanelUI works after changing the import.

```tsx
import { Menu } from 'react-native-tabcn-menu';

<Menu>
  <Menu.Trigger>
    <Button variant="outline">Options</Button>
  </Menu.Trigger>
  <Menu.Content>
    <Menu.Label>Edit</Menu.Label>
    <Menu.Item icon={<PencilIcon size={16} />} systemImage="pencil" onSelect={rename}>
      Rename
    </Menu.Item>
    <Menu.CheckboxItem checked={pinned} onCheckedChange={setPinned} systemImage="pin">
      Pinned
    </Menu.CheckboxItem>
    <Menu.Separator />
    <Menu.Item variant="destructive" systemImage="trash" onSelect={remove}>
      Delete
    </Menu.Item>
  </Menu.Content>
</Menu>;
```

This package adds three props:

- **`systemImage`** on rows: the SF Symbol Apple's menu shows. The system renderer can't draw a React `icon`.
- **`glass`** on `Menu.Content`: options for the glass menu, `{ trigger, morphOrigin, blur, tintColor, tintOpacity, jelly, speed }`.
- **`renderer`** on `Menu` and `ContextMenu`: `'auto'` (default), `'system'`, `'glass'` or `'panel'`.

`MenuConfigProvider renderer="panel"` turns the native menus off app-wide, for example from remote config. `useMenuRenderer()` tells you which renderer a menu here would use, and why.

`ContextMenu` works the same way. iOS uses Apple's context menu, including `ContextMenu.Preview`; everywhere else uses PanelUI's.

## What each renderer draws

|                                                        | System (iOS)                                  | Glass (Android 13+)        | Panel |
| ------------------------------------------------------ | --------------------------------------------- | -------------------------- | ----- |
| Item, description, destructive, disabled               | ✓                                             | ✓                          | ✓     |
| `icon`                                                 | `systemImage` only                            | ✓ (tinted to the row)      | ✓     |
| `closeOnSelect={false}`                                | iOS 16.4+                                     | ✓                          | ✓     |
| CheckboxItem, RadioGroup / RadioItem, Label, Separator | ✓                                             | ✓                          | ✓     |
| Sub / SubTrigger / SubContent                          | ✓ (opens the iOS way)                         | uses Panel                 | ✓     |
| `shortcut`, `trailing`, `Menu.Background`              | ignored                                       | ignored                    | ✓     |
| `onPress` on a row                                     | not called; use `onSelect`                    | not called; use `onSelect` | ✓     |
| `open` / `defaultOpen`                                 | ignored (SwiftUI can't open a menu from code) | ✓                          | ✓     |
| `onOpenChange`                                         | best effort                                   | ✓                          | ✓     |
| ContextMenu                                            | ✓                                             | uses Panel                 | ✓     |

In development, each ignored feature is reported once.

Some menus always use PanelUI's renderer:

- a menu whose row label isn't plain text;
- a menu containing a component that wraps a part (for example your own `DeleteRow` that returns a `Menu.Item`).

Use the parts directly to get the native menus.

## Before the first publish: device checklist

None of this has run on a device yet. Check, and note the result in `docs/designs/menu.md`:

- [ ] **iOS 26, 18 and 16.4:**
  - rows, subtitles from `description`, a `Section` from `Menu.Label`;
  - a checkbox that stays open, an inline radio `Picker`, a nested submenu, a destructive row;
  - `onOpenChange` fires once on open and once on close.
- [ ] **iOS:**
  - the trigger keeps its own look and size inside SwiftUI's label slot;
  - a disabled trigger;
  - `ContextMenu` with and without `Preview`, and a short press on its trigger.
- [ ] **Android 13+ (a Pixel, a Samsung, a low-end Mali or MediaTek phone):**
  - the glass opens from the trigger, drag-to-scrub with ticks, lift to choose;
  - a checkbox that stays open updates in place;
  - Back and a tap outside close it;
  - TalkBack reads every row.
- [ ] **Android:** frame time while open, and no cost while closed, on a mid-range API 33 phone with a scrolling list behind the menu.
- [ ] **Android 12 and a low-RAM device:** PanelUI's menu.
- [ ] **Expo Go on Android:** PanelUI's menu, no warnings about a missing view.
- [ ] **Light app theme on a phone set to dark (and the reverse):** glass and rows follow the app.

## Credits

See [NOTICE](NOTICE). The Android glass is rit3zh's work, forked under MIT. The API is PanelUI's (MIT). The iOS mapping follows Expo's `@expo/ui` `MenuView` (MIT).
