# Liquid Glass across the designs: one `material` prop

-   **Author:** VanitasCaesar1 (drafted with Claude)
-   **Status:** Approved and implemented (2026-11-27). The owner chose the defaults below in conversation (glass by default for floating designs and panels, opt-in for docked bars) and asked to build and re-record.
-   **Implementation notes (2026-11-27):**
    -   Checked on an iOS 26.5 simulator (iPhone 17 Pro, Expo Go): all 20 glass-by-default designs recorded through their own demo (open, slide, minimize, close), frame by frame; the 14 opt-in docked bars recorded with `material="glass"` forced on. Center CTA was not seen with glass (its demo doesn't go through the shared theme wrapper used to force it).
    -   The first pass used clear glass everywhere. Over light screens the glass under light content went near-white (Thumb Arc's button icon, Segment Search's labels, Reply Stack's reply row), which led to the default-tint rule above; the second pass was re-recorded and reads on light and dark screens.
    -   Judgment calls, kept: Gradient Stickers' glow is not drawn on glass (it fades into the cream fill), the cream tint keeps its colour; Sticker Pills, which had only a dark fade behind its row, gets a dark glass capsule there; Thumb Arc's name labels stay solid (they fade to 0) and its circles grow by layout inside a round clip; Filter Chips' growing card is one glass view laid out each frame (`GlassMorph`) that takes over from the capsule's glass when it opens; Reply Stack's capsules follow the blur's clip by layout and the reply row's glass comes and goes with `glassEffectStyle`.
    -   Not solved here: the foundation fades a bar to 0 while it hides, is covered, or shows an override, and fades companions while a panel is open. Glass under those fades has come back on every check so far (Selection Toolbar and Context Tray enter through the override fade), but it is a foundation concern, as it was for the twelve designs that had glass before.
    -   Tests: each bar with the prop renders and presses through with `material="glass"` and `"solid"`; under Jest, Expo's native-module mock reports glass as available, so the panels' own smoke tests run the glass path by default.
-   **Date:** 2026-11-27

## Overview

Twelve designs draw Liquid Glass on iOS 26, each with its own prop or none. This change gives every design that has a surface the same prop, `material?: 'auto' | 'glass' | 'solid'`, as Composer Dock and Account Dock already have, so an app can ask any design for glass, or keep it solid.

## Decisions

-   **Floating designs and panels: glass by default.** `material` defaults to `'auto'`: glass where the system has it (iOS 26), the design's current surface everywhere else (older iOS, Android, web). Their recordings are redone, since the iOS look changes.
    -   Bars: Soft Pill, Gradient Stickers, Scrub Pill, Pill Plus, Segment Search, Search Dock, Button Row, Thumb Arc, Sticker Pills, Glow Glass, Reply Stack.
    -   Panels: Mini Player, Context Tray, Quick Create, Bar Sheet, Filter Chips, Companion Chip, Selection Toolbar, Sub Tabs, Slider Sheet.
-   **Docked bars copied from an app: glass is opt-in.** `material` defaults to `'solid'`, so the flat surface each one copies stays the default, and the recordings stay as they are: Top Notch, Solid Dark, Outline Dark, Dark Capsule, Badge Dock, Accent Dark, Mono Type, Tile Plus, Offset Plus, Tinted Icons, Live Tabs, Sticker Tiles, Playful Tiles, Center CTA, Chip Rail.
-   **No glass:** Material Pill and Side Rail (Material 3 has no glass), Color Flood (the colour is the bar), Ink Underline (the paper is the design), Light Icons (no surface: icons straight on the screen).
-   **The twelve with glass today keep their own props.** Renaming a shipped prop breaks apps that pass it; aligning them is a separate change.

## The prop

```ts
/**
 * The bar's surface: `'glass'` (Liquid Glass, iOS 26), `'solid'` (the design's own surface), or
 * `'auto'` (glass where the system has it, solid elsewhere). Default `'auto'` | `'solid'`.
 */
material?: 'auto' | 'glass' | 'solid';
```

-   `glass = material === 'glass' || (material === 'auto' && isLiquidGlassAvailable())`. `'glass'` where the system has no glass falls back to the solid surface (a `GlassView` there is a plain view).
-   A `glassTint` colour where the design has a `colors` prop.
-   The glass's `colorScheme` matches the design's scheme (light glass under dark text, dark glass under light text).
-   **The default tint depends on what sits on the glass** (found on the simulator, 2026-11-27). Liquid Glass follows the content behind it: over a light screen even `colorScheme="dark"` glass renders near-white, and light icons and labels on it vanish (Thumb Arc's button, Segment Search's labels, Reply Stack's reply row).
    -   A light surface under dark content: clear glass (`glassTint` unset). It stays light over dark screens too (Soft Pill over a dark photo).
    -   A dark or coloured surface under light content, or a surface whose colour is the design's identity: `glassTint` defaults to the surface's own colour at about 60% opacity, so the content keeps its contrast over any screen and the design keeps its colour. An app sets `glassTint` to change it, or `'transparent'` for clear glass.

## How glass is drawn (rules every design follows)

-   **Only the surface changes.** The surface behind the tabs (pill, dock, card, sheet, buttons' backgrounds) becomes a `GlassView`; icons, labels, indicators, badges and colours stay as designed. With `'solid'`, or with no glass on the system, the design renders exactly as before.
-   **Nothing above a glass view fades to opacity 0.** Glass doesn't render under opacity 0 (Expo's docs). Where a design fades its surface, the glass view stays at full opacity and the design fades what is drawn on it, or uses `glassEffectStyle={{ style: 'none' | 'regular', animate: true }}` to bring the glass in and out.
-   **Glass is never stretched with a transform.** A `GlassView` under `scaleX`/`scaleY` draws its edge and highlights stretched (Account Dock, 2026-11-27, on the simulator). A glass surface that changes size is laid out to that size (`width`, `height`), and the cost of layout per frame is accepted for glass only; the solid path keeps its transforms.
-   **A drawn shadow or rim goes with glass**, which brings its own depth and edge.
-   **Surfaces that move together go in one `GlassContainer`**, so they join and split as they pass (spacing under the gap between them at rest).

## Verification

-   `bun run check`, plus one test per design that renders it with `material="glass"` and `material="solid"`.
-   iOS 26 simulator: every design in this doc with glass on (defaults and opt-in), at rest and through its own interaction (open, close, minimize, drag), checked frame by frame for seams, stretched glass and glass that fails to come back after the bar hides or a panel closes.
-   New recordings (README GIF, site video, stills, bar loop, link preview) for every design whose default changed.

## Alternatives considered

-   **Glass by default everywhere.** Rejected by the owner: the docked bars copy specific apps' flat bars.
-   **A foundation-level `material`** (on `TabBarRoot` or the provider). Designs draw their own surfaces, so the foundation can't make them glass; a per-design prop keeps the foundation unchanged.
