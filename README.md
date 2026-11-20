<img src="assets/icon.svg" width="64" height="64" alt="">

# tabcn

Animated tab bars for React Native and Expo, in the style of shadcn/ui: install a small foundation package, then copy the design you want into your app and make it yours.

> **Status: pre-release.** The repo is set up; the foundation API is being designed in [`docs/designs/`](docs/designs/). Nothing is published to npm yet.

## How it works

- **`tabcn` (npm package)** holds the parts every tab bar needs and that are easy to get wrong: connecting to the navigator, tab state, safe-area spacing, the animated active-tab highlight, press feedback, badges, haptics, reduced-motion support and accessibility. Bug fixes here reach everyone through `npm update`.
- **Designs ([`registry/`](registry/))** are short source files built on that foundation. You copy one into your project and own it. Change icons, labels and the number of tabs through props, or edit the file to change the look and motion.
- **Navigation** stays with your navigator. A tabcn design is passed as the `tabBar` of Expo Router's `<Tabs>` or React Navigation's bottom tabs, so screens, deep links, the Android back button and screen-reader roles keep working.

## The 20 designs

| #   | Design            | Layout               |
| --- | ----------------- | -------------------- |
| 1   | Glass Expand      | Floating pill        |
| 2   | Top Notch         | Docked bar           |
| 3   | Chip Rail         | Chip rail            |
| 4   | Sticker Tiles     | Docked bar           |
| 5   | Segment + Search  | Pill + action button |
| 6   | Pill + Plus       | Pill + action button |
| 7   | Solid Dark        | Docked bar           |
| 8   | Outline Dark      | Docked bar           |
| 9   | Orbs              | Floating buttons     |
| 10  | Center CTA        | Center action        |
| 11  | Soft Pill         | Floating pill        |
| 12  | Dark Capsule      | Docked bar           |
| 13  | Gradient Stickers | Floating pill        |
| 14  | Light Icons       | Docked bar           |
| 15  | Playful Tiles     | Docked bar           |
| 16  | Sliding Capsule   | Floating pill        |
| 17  | Labeled + Plus    | Pill + action button |
| 18  | Frosted Media     | Floating pill        |
| 19  | Glow Glass        | Pill + action button |
| 20  | Mono Type         | Docked bar           |

Names are working names. The source of truth is [`apps/example/src/catalog.ts`](apps/example/src/catalog.ts).

## Repository layout

```
apps/example/      Expo SDK 58 app (Expo Router) that shows every design
packages/tabcn/    the foundation npm package
registry/          the copyable designs, one folder each
docs/designs/      design docs, written before the code they describe
references/        local-only reference images (git-ignored; see its README)
```

## Development

Requires [Bun](https://bun.sh) 1.4+ and Node 22+. iOS needs Xcode; Android needs Android Studio.

```bash
bun install        # install everything (workspaces)
bun run example    # start Metro for the example app
bun run ios        # or open it in the iOS simulator
bun run check      # lint + typecheck + build, the same as CI
```

The example app imports `tabcn` from `packages/tabcn/src` directly (through the `source` export condition), so edits to the package show up on reload with no build step.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the workflow and release process.

## License

[MIT](LICENSE)
