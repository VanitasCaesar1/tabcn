# PanelUI Colors: tabcn designs in a PanelUI theme

**Status:** Approved 2026-11-22 (the owner asked to build it straight away; no EGM review).

## Why

[PanelUI](https://panelui.dev) is a component library for Expo, built on Uniwind (Tailwind v4) semantic tokens. tabcn covers the part it doesn't: tab bars and what slides out from behind them. People building with PanelUI should be able to drop a tabcn bar in and have it switch with the rest of the app across Panel, Moon and Grass, in light and dark.

Before this change every design drew its own fixed colours (`defaultColors`), with a `colors` prop for overrides. None of them followed a theme.

tabcn is independent of PanelUI: no affiliation, no PanelUI branding, and no change on PanelUI's side is needed.

## Decision

1. **One registry item, `panelui-colors`**, at `registry/themes/panelui-colors.ts`, installed to `components/tabcn/panelui-colors.ts`.
   - It is `categories: ["theme"]`: it colours designs rather than being one. The catalog, the demos, the props tables and the design tests skip it.
   - Its only dependency is `uniwind`. It assumes PanelUI's theme is already set up in the app; it doesn't set the theme up itself.
2. **The API is one hook**, `usePanelUIColors(design)`. It returns that design's `colors` from the running theme:

   ```tsx
   <SoftPill colors={usePanelUIColors('soft-pill')} />
   ```

   - It reads every token in one `useCSSVariable([...])` call. That is Uniwind's API, the one PanelUI's docs recommend for colours that can't be a class.
   - It re-renders on a theme switch, and returns the same object between switches.
3. **Each design gets a map from colour slot to PanelUI token** (`panelUIColorMaps`):
   - A slot may also take an opacity (`['card', 0.78]`), multiplied with the token's own alpha.
   - A slot without a mapping keeps the design's colour, and so does a slot whose token the theme doesn't define. An `undefined` is never passed, since it would override the default.
   - Frosted Media, Segment Search and Center CTA have no map: they draw white over photos or a fixed gradient. Orbs and Gradient Stickers map only their badges.
4. **`react-native-tabcn` doesn't change.** PanelUI, Uniwind and Tailwind never become dependencies of the package, and designs installed without the bridge behave exactly as before.

## Guarding against drift

The checks run in `bun run check`:

- **Slot names:** `scripts/check-registry.ts` fails if a map names a slot that the design's `defaultColors` doesn't have.
- **Token names:**
  - The same script fails if a token in `PanelUIToken` is missing from the `theme.css` of the installed `panelui-native`. That catches a PanelUI rename on the next dependency update, since there's no agreement with PanelUI to rely on.
  - Supported range: `panelui-native` 1.4 (tokens as of 2026-11-22).
- **Behaviour:** `packages/tabcn/src/__tests__/panelui-colors.test.tsx` covers the mapping, opacity, missing tokens, and stable identity across re-renders.

## The example app

- **Setup:** the example app runs PanelUI's theme (`src/global.css`, Uniwind in `metro.config.js`, and the generated `src/uniwind-types.d.ts`). It uses no PanelUI components.
- **Switcher:** each design screen has one, "tabcn · Panel · Moon · Grass" (`src/panel-theme.tsx`). Light or dark follows the system.
  - "tabcn" shows each design in its own colours.
  - The PanelUI options recolour the bar through the bridge. The screen takes the theme's background, and the reference pattern is dropped.
- **Wrapper:** demos wrap each mapped design with `themed(id, Component)`, so their render code still reads like the snippet a user copies.
- **Composer Dock:** it brings its own chat screen, so its demo stays in its own colours for now.

## Deferred

| Item                                                                   | Trigger                               |
| ---------------------------------------------------------------------- | ------------------------------------- |
| Live theme switcher on the website previews                            | Website step 1 (live previews)        |
| "Using with PanelUI" page on the site and a "With PanelUI" install tab | Website step 2 (docs)                 |
| tabcn + PanelUI starter template                                       | Website step 5                        |
| Composer Dock demo screen in PanelUI colours                           | When its chat screen is themed        |
| A scheduled check against the newest `panelui-native`                  | When a PanelUI release breaks a token |
