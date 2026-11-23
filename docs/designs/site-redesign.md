# tabcn site redesign: real screens, a real phone, a page you can play with

-   **Author:** VanitasCaesar1 + Claude
-   **Status:** Proposed (drafted with the owner 2026-11-23; awaiting review)
-   **Date:** 2026-11-23
-   **Builds on:** [`website.md`](website.md) (the current site), [`panelui.md`](panelui.md) (theme switch)

---

## Overview

The tabcn site (`apps/site`, https://vanitascaesar1.github.io/tabcn/) shows 46 designs, but the owner finds
every example ugly. The bars themselves are fine; what surrounds them is not: filler screens, random
colours, a small flat phone, and nothing to change. This redesign uses React Bits (https://reactbits.dev)
as the reference for presentation: every design shown inside a screen that looks like a real app, in a
better-drawn iPhone, on a page where the visitor can change the design and copy it.

The work is in three parts, shipped in this order:

1.  **A new phone frame and one gallery look.** Our own iPhone drawn in CSS and SVG, and dark gallery cards
    with a single palette. Needs no new recordings.
2.  **Real app screens.** Seven screens that look like real apps (chat, music, shop, maps, finance,
    social, files), each design shown in the one that suits it. Every recording, README GIF, link preview and bar
    loop is re-made from them.
3.  **A Customize panel** under each design's live preview, plus Preview/Code tabs and "Copy for AI".

The site matters beyond looks: it is where people decide to use tabcn and what they share, and a later
paid tier (separate doc) depends on it.

## The Problem

Compared side by side with React Bits on 2026-11-23:

-   **The screens behind the bars are filler.** Most cards and recordings show flat, saturated slabs (one
    mint green on most cards) with coloured squares and circles. Nothing looks like an app, so a visitor
    cannot picture the bar in theirs. React Bits shows each component in a scene with real photos and
    text, muted so the component is the only accent.
-   **There is no palette.** Each card has its own colours, so the gallery reads as a toy box.
-   **The design page hides the bar.** A 260 pt phone sits in a large empty stage, its screen is often
    blank (Composer Dock: "Afternoon, Robin" on white), and the bar is a strip at the bottom. The phone
    itself is a flat black rounded rectangle with a pill for the island.
-   **The visitor can only watch.** React Bits puts a Customize panel under every preview (Circular
    Carousel has 29 controls), with Preview/Code tabs and "Copy for AI". tabcn's page has a theme switch
    and the install command.

The owner asked to use React Bits' iPhone. It is their own WebGL code inside their Center Stage tool,
licensed MIT + Commons Clause, which forbids copying the tools or a substantially similar copy into another
distributed project; tabcn's repo is public. It also cannot host our live preview, which is an iframe that
WebGL cannot draw. So we draw our own frame (see Technical Plan). Their licence does allow using Center
Stage exports (images, videos) on our site.

## Goals

-   **Every design is shown in an app-like screen.** No design's card, recording, README GIF, link
    preview, bar loop or live preview shows a flat colour slab or placeholder shapes. Each design is
    assigned to one of eight scenes.
-   **One palette across the gallery.** Cards share one dark background and neutral scene colours; the
    only strong colour on a card comes from the design itself.
-   **A phone frame that reads as an iPhone at a glance:** rounded titanium edge with light falloff,
    Dynamic Island, side buttons, screen glass, a soft shadow; a silver finish on the light site theme
    and graphite on the dark one. Drawn by us, no Apple images or logos. The live preview inside it stays tappable.
-   **The bar is the subject on the design page.** The phone is at least 1.4x today's 260 pt width on
    desktop, or the page offers a close-up on the bar.
-   **The visitor can change a design and copy the result.** A Customize panel with tab count, light or
    dark screen, PanelUI theme and right to left on every design, plus accent colour and labels on or off
    on the designs that have them. Each change shows in the live preview without reloading it, except
    right to left, which reloads the preview (see Technical Plan). Text size is not offered: the web
    preview ignores the system text size, so the recordings stay the reference for it; Preview/Code tabs; "Copy for AI" copies install and usage text for a coding agent.
-   **Nothing regresses:** the install command, QR code to Expo Go, recordings as fallback when the live
    preview fails, the theme switch, `bun run check` and the site's build.

## Non-Goals

-   **Making money.** A paid tier, licences, a private registry, payments and sponsor slots get their own
    doc after this one.
-   **Changes to `react-native-tabcn`.** No new public API for this work. If a Customize control needs
    something a design doesn't expose, the control is left out.
-   **Copying React Bits.** No code, assets or text from React Bits; it is a reference for presentation
    only.
-   **A 3D or WebGL phone.** The frame is CSS and SVG.
-   **Design-specific controls for all 46 designs in the first version.** Shared controls first; a design's
    own controls are added later, per design.
-   **Library support for the web or Android.** The live preview stays a way to try a design.
-   **Free browser tools (like React Bits' Center Stage).** Possible later.

## Open Questions

-   **Right to left on the web preview.** Can react-native-web lay the designs out right to left from a
    query read at startup (the native app gets it from `extra.forcesRTL` at build time)? To check with a
    small spike before Part 3; if not, the control is dropped.
-   **Re-recording pace.** 46 designs, one simulator, on a Mac often near its swap limit. Batches are one
    scene each; how many batches a day depends on the machine's load at the time.

Resolved while drafting: the scene list (seven, with `files` for rails and tablet layouts; see the scene
table), photos (Unsplash License, from picsum.photos, sources in `SOURCES.md`; amended 2026-11-23 from "CC0 or our own", since the Unsplash License allows use in an app and the photos are credited), and Center Stage stills (not used; our own frame
everywhere, so the look is consistent and nothing depends on another site).

## Critical User Journeys (CUJs)

### CUJ 1: A developer browses the gallery

-   **Given**: A visitor opens https://vanitascaesar1.github.io/tabcn/ on a laptop, dark or light theme.
-   **When**: They scroll the designs and hover a card.
-   **Then**: Every card shows its bar over an app-like screen in the shared palette; hovering plays the
    bar's loop; no card shows a flat colour slab.

### CUJ 2: A developer tries a design and installs it

-   **Given**: A visitor opens a design's page.
-   **When**: They tap tabs in the phone, change the accent colour, switch to light mode and right to left,
    then open the Code tab and copy.
-   **Then**: The live preview inside the new iPhone frame reflects each change; the Code tab shows code that
    matches the current settings; the install command still works as today.

### CUJ 3: A developer hands it to their coding agent

-   **Given**: A visitor using Claude Code or Cursor is on a design's page.
-   **When**: They press "Copy for AI" and paste into their agent.
-   **Then**: The pasted text contains the install command, the usage code for Expo Router and React
    Navigation, and the settings they chose.

### CUJ 4: Someone sees tabcn shared on X or in the README

-   **Given**: A link to a design page is posted, or the README is opened on GitHub.
-   **When**: The link preview or GIF renders.
-   **Then**: It shows the design in its app-like screen inside the new frame, not a colour slab.

## Technical Plan (Architecture)

### Where the pictures come from today

Every picture of a design on the site and in the README comes from the example app (`apps/example`):

```text
apps/example  (demo entry per design in demos.tsx: background + pattern + DemoFeed placeholders,
     |          or its own `screen` for a few designs, e.g. Ambient Bar, Composer Dock)
     |
     +--> iOS simulator recordings --> encode --> apps/site/public/videos/<id>.mp4 (+ poster)
     |                                     |--> apps/site/scripts/bar-loops.py --> public/bars/  (gallery loops)
     |                                     |--> apps/site/scripts/og-images.py --> public/og/    (link previews)
     |                                     '--> assets/readme/<id>.gif                          (README)
     |
     '--> web build (apps/site/scripts/build-preview.ts) --> /tabcn/preview/?embed=1&design=<id>
                                                             shown in an <iframe> by live-phone.tsx
```

So the filler has one source: `DemoScreen` draws the reference's flat background, a `Pattern`, and
`DemoFeed` (gradient blocks and text bars with no words). Fix it there and every output follows once it
is re-made.

### Part 1: phone frame and gallery look (site only, no new recordings)

-   **Frame.** `PhoneFrame` in `apps/site/src/components/phone.tsx` is redrawn as layered elements sized in
    container units (as today), so it scales to any width:
    -   body: an outer rounded rectangle with a metallic gradient (light falloff along the edges) and a thin
        darker inner rim;
    -   screen: black bezel, then the screen at the recording's aspect (1206 x 2622, which is what the
        simulator records), corner radius matched to the body;
    -   Dynamic Island: a black capsule at the iPhone's proportions;
    -   side buttons: short raised bars on the left (action, volume up, volume down) and right (side
        button, camera control);
    -   glass: a faint diagonal highlight over the screen with `pointer-events: none`, so taps reach the
        preview;
    -   shadow: one soft contact shadow under the phone.
        The body colour is a set of CSS variables: silver under the light site theme, graphite under the dark
        one. No finish picker and no tilt, since no page would use them yet (more finishes are a variable set
        each, if a page ever offers a choice). No images, so it stays sharp at any size and costs nothing to
        load.
-   **Size on the design page.** The stage shows the phone at 380 px on desktop (today 260), centred, with
    less empty stage around it. On narrow screens it keeps its current width.
-   **Gallery cards.** `specimen-card.tsx`, `loop-tile.tsx` and `bar-tile.tsx` share one dark card
    background and border from new CSS variables in `apps/site/src/app/globals.css`; the per-design colour
    stays only inside the loop (the screen behind the bar). Hovering plays the loop, as `use-loop-player.ts`
    already does. Until a design is re-recorded (Part 2), its card shows its old loop in the new card.

### Part 2: app scenes (example app, then re-recording)

-   **Scenes.** A new folder `apps/example/src/scenes/` with eight screens that look like apps: `chat`,
    `music`, `shop`, `maps`, `finance`, `social`, `files`, and `health` (see the scene table below).
    `health` was added after launch: each screen's title is the tab's name, so a design whose tabs come
    from a tracker or wellbeing app (Steps, Water, Plan; CHANI's Grow and Audio) read wrong on any of
    the first seven. A design's scene should match what its tab names say. Each takes the tab
    index, the bar's height and a palette. Each scene is one app layout with real words, numbers and
    photos; a tab switch changes its header (the tab's name) and the order of its content, as the Ambient
    Bar demo does today, so every switch shows a change without a separate view per tab. All eight share
    one palette module (`scenes/palette.ts`): a neutral light and
    a neutral dark set, plus a muted accent per scene, so the design is the strongest colour on screen.
    Under a PanelUI theme a scene takes the theme's colours, as `DemoScreen` does today.
-   **Assigning designs.** Each entry in `demos.tsx` gets `scene: '<name>'` (and `scheme: 'light' |
    'dark'`) in place of `background`, `pattern` and the `DemoFeed`. `DemoScreen` draws the scene. Designs
    that already ship their own screen (`screen`) keep it if it is already app-like (Ambient Bar's
    holdings list becomes the `finance` scene) or move to a scene (Composer Dock to `chat`). `Pattern` and
    `DemoFeed` are deleted once no design uses them.
-   **Photos** live in `apps/example/assets/scenes/` as WebP at the size shown (no larger than 2x), with
    `SOURCES.md` listing each file's source and licence. Photos under the Unsplash License (picsum.photos), each credited. Budget: under 3 MB for
    all scenes, since Expo Go downloads them with the demo.
-   **Re-recording.** The recording steps that ran from scratch scripts during the audits become one
    committed script, `apps/site/scripts/record.sh <out dir> <id>...` (with `encode.py` and
    `record-routes.json` beside it), that drives the one prepared simulator through
    a design's tab switches and writes the raw recording; `encode`, `bar-loops.py`, `og-images.py` and the
    README GIF step run after it. Designs are re-made in batches, one scene per batch, each batch its own
    pull request, so the site improves batch by batch and the machine limits hold (one simulator, one heavy
    job).

### Part 3: Customize panel, Code tab, Copy for AI

-   **Settings.** One type shared by the site and the example app:

    ```text
    PreviewSettings = {
      tabs?: number          // 2 .. the demo's tab count
      scheme?: 'light' | 'dark'   // the scene's palette
      theme?: family         // existing PanelUI switch
      accent?: string        // only if the demo declares it
      labels?: boolean       // only if the demo declares it
      rtl?: boolean
    }
    ```

-   **Which controls a design gets.** Each demo entry may declare `controls`: which optional settings it
    supports and how they map to the design's own props (for example Sliding Capsule: `accent` sets its
    active colour). The build already writes per-design data for the site (`build-props.ts`); it also writes
    each design's control list, so the site shows only controls that work.
-   **Live changes.** The page sends `{ type: 'tabcn:settings', settings }` to the iframe, the same way the
    theme switch sends `tabcn:theme` today (same-origin `postMessage`). `embed.ts` keeps the latest settings
    in a small store; `DemoScreen` and the demo's `render` read it. Tab count slices the demo's tab list
    and re-mounts the tab navigator. **Right to left** cannot be flipped live: the example app sets its layout
    direction when it is built (`extra.forcesRTL` from `TABCN_RTL=1` in `app.config.ts`), not at runtime.
    The plan is an `&rtl=1` query read at startup and a reload of the iframe; whether react-native-web
    lays the designs out right to left from that is unverified (see Open Questions). If it can't, the
    control is dropped.
-   **Code tab.** Shows the design's source, read at build time from the same files the registry JSON
    (`/r/<id>.json`) is built from (today "View source" only links to GitHub), and a usage snippet built
    from the current settings: the `tabBar` line with the chosen props, and the tab list trimmed to the
    chosen count.
-   **Copy for AI.** Copies plain text: what the design is (its summary), the install command, the usage
    snippet with current settings, and a link to the design's page. Built from the same data as the Code tab.

### What does not change

The registry (`/r/<id>.json`), the install command, the Expo Go QR code, recordings as the fallback when the
live preview fails, and `react-native-tabcn`.

## Alternatives Considered

### Alternative A: Copy React Bits' iPhone (their WebGL phone)

-   **Pros**: The owner likes it; detailed 3D look, nine finishes, camera moves.
-   **Cons**: React Bits is MIT + Commons Clause, which forbids redistributing its tools or a
    substantially similar copy, and tabcn's repo is public. It draws its screen from an image or video
    texture, so it cannot show our live preview (an iframe). It would add a WebGL renderer to every design
    page.
-   **Reason for Rejection**: Not allowed by the licence, and it cannot host the live preview.

### Alternative B: Make every phone picture with React Bits' Center Stage exports

-   **Pros**: Allowed by their licence for use on our site. Their look, no frame to build.
-   **Cons**: Done by hand in their web tool for 46 designs, and again for every change; the site would
    depend on another site staying up and keeping its terms. The live preview still needs a frame of its
    own, so the site would show two different phones.
-   **Reason for Rejection**: Manual, not repeatable in our scripts, and inconsistent with the live preview.
    Kept as an option for one-off marketing shots.

### Alternative C: An image of an iPhone as the frame (a PNG bezel over the screen)

-   **Pros**: Photographic look with little code. Apple publishes device bezels for showing apps.
-   **Cons**: Fixed resolution, so it blurs or weighs more at large sizes; one image per finish and per
    angle; its terms limit how it may be used and changed, which would need checking for a public repo.
-   **Reason for Rejection**: The CSS frame is sharp at any size, has no assets to load, and takes finishes
    as CSS variables. Revisit if the CSS frame does not read as an iPhone after review.

### Alternative D: Keep the reference backgrounds, only tone them down

-   **Pros**: No new scenes and no re-recording; a day of work.
-   **Cons**: Still no app around the bar, so visitors still cannot picture it in their app, which is the
    main complaint.
-   **Reason for Rejection**: Does not fix the problem.

### Alternative E: Generated images for the scenes

-   **Pros**: Fast to make many photos in one style.
-   **Cons**: Licence and provenance are unclear for a public repo; generated images often look generated,
    which works against "looks like a real app".
-   **Reason for Rejection**: Licence risk and quality; credited Unsplash License photos instead.

### Alternative F: Live previews in the gallery cards

-   **Pros**: Every card interactive, as on React Bits.
-   **Cons**: 46 iframes, each running the example app's web build, on one page: slow load and high memory,
    especially on phones.
-   **Reason for Rejection**: Loops on cards, live preview on the design page only.

### Alternative G: Controls generated from every prop in each design's props table

-   **Pros**: `generated/design-props.json` already lists each design's props with types, so colour,
    boolean and number controls could appear for all 46 designs with no per-design work (closer to React
    Bits' 29-control panels).
-   **Cons**: Many props are functions, React nodes or values that only make sense together; a generated
    control can break the preview or show settings that look wrong. Each still needs mapping into the
    demo's `render`.
-   **Reason for Rejection**: Too risky for the first version. Listed under Future Improvements: generate
    controls for props a design marks as safe.

---

### Future Improvements

-   **Generated controls** for props a design marks as safe to change (see Alternative G).
-   **Design-specific controls** (motion presets, glass strength) per design.
-   **A free browser tool** (for example, put your own screenshot behind a tabcn bar and export a video),
    like React Bits' tools, to bring visitors.

## Detailed Implementation Plan

Three parts, each one or more pull requests, merged in order. Part 2 is split into one pull request per
scene batch.

### Scene assignment (first pass)

As built, `apps/example/src/design-tags.ts` is the source of truth. Changed while building, after
checking each design's tabs and reference: pill-plus, orbs and light-icons to `maps`; search-dock,
color-flood and tinted-icons to `social`; companion-chip to `shop`; frosted-media to `music` (dark);
top-notch and sub-tabs to `music`; account-dock to `chat`. Panel demos are driven by UI inside the
scene (a comment button opens Bar Sheet, the strip opens Mini Player), listed as steps in
`apps/example/src/demo-actions.ts`, which `record.sh` plays.

Seven scenes: side rails and tablet layouts fit none of the app types, so a `files` scene is included. The
scheme follows the bar: a dark bar sits on the dark palette, a light or glass bar on the light one. Each
batch checks the assignment against the design's reference before recording; a change is a one-line edit
in `demos.tsx`.

| Scene                             | Light palette                                                                                                                           | Dark palette                                     |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `social` (feed, photos, creators) | sticker-tiles, soft-pill, gradient-stickers, playful-tiles, labeled-plus, search-dock, tile-plus, tinted-icons, quick-create, bar-sheet | solid-dark, dark-capsule, offset-plus            |
| `music` (listen, video)           | top-notch, live-tabs, sub-tabs                                                                                                          | frosted-media, mini-player                       |
| `shop`                            | split-search, button-row, cart-pill, companion-chip                                                                                     | filter-chips                                     |
| `maps`                            | segment-search, pill-plus, orbs, section-sheet                                                                                          | center-cta, light-icons, accent-dark             |
| `finance`                         | sliding-capsule, color-flood, scrub-pill                                                                                                | chip-rail, glow-glass, ambient-bar, slider-sheet |
| `chat`                            | glass-badges, composer-dock, account-dock                                                                                               | badge-dock                                       |
| `files`                           | material-pill, side-rail                                                                                                                | outline-dark                                     |
| `health` (rings, plan, sessions)  | glass-expand, mono-type, context-tray                                                                                                   |                                                  |

### Target Files to Create/Modify

#### Part 1: frame and gallery look

##### 1. `apps/site/src/components/phone.tsx` (Modify)

-   **Type / Scope**: Site component.
-   **Proposed Changes**: Redraw `PhoneFrame` as described in the Technical Plan (metal body, inner rim,
    bezel, screen at 1206:2622, Dynamic Island, five side buttons, glass highlight with
    `pointer-events: none`, contact shadow), all in container units. No new props: the finish follows
    the site theme through CSS variables. `ScreenPlaceholder` takes the new screen radius. Why: the frame is the first thing the owner
    flagged after the screens.

##### 2. `apps/site/src/app/globals.css` (Modify)

-   **Type / Scope**: Site styles.
-   **Proposed Changes**: Add the frame's colours as CSS variables (`--phone-edge`, `--phone-rim`,
    `--phone-button`; silver values under the light theme, graphite under the dark), and the shared card tokens (`--card`, `--card-border`, `--card-stage`) for light and dark
    site themes. Why: one place for the palette, so cards stop picking their own colours.

##### 3. `apps/site/src/components/live-phone.tsx` (Modify)

-   **Type / Scope**: Site component.
-   **Proposed Changes**: Render the new frame at 380 px on desktop (`md:` and up), current width below.
    Part 3 adds the settings messages here (see 22).

##### 4. `apps/site/src/app/designs/[id]/page.tsx` (Modify)

-   **Type / Scope**: Site page.
-   **Proposed Changes**: Tighter stage around the larger phone (less empty dotted area). Part 3 adds the
    Preview/Code tabs, the Customize panel and Copy for AI (see 19 and 20).

##### 5. `apps/site/src/components/specimen-card.tsx`, `loop-tile.tsx`, `bar-tile.tsx` (Modify)

-   **Type / Scope**: Site components (gallery and home page cards).
-   **Proposed Changes**: Use the shared card tokens for the card and the area around the loop; keep
    `--demo` (the scene's background) only inside the loop's own box. No layout change. Why: removes the
    rainbow around each card while old loops are still in use.

#### Part 2: app scenes and re-recording

##### 6. `apps/example/src/scenes/palette.ts` (Create)

-   **Type / Scope**: Plain data module (no React Native imports, so the site's build can read it).
-   **Proposed Changes**: `SCENES` record: for each scene name, `light` and `dark` palettes
    (`background`, `surface`, `text`, `subtle`, `accent`). Exports `type SceneName` and
    `sceneBackground(name, scheme)`.

##### 7. `apps/example/src/scenes/{social,music,shop,maps,finance,chat,files}.tsx` and `scenes/index.ts` (Create)

-   **Type / Scope**: Example app screens.
-   **Proposed Changes**: One component per scene, `({ index, barHeight, scheme, themed })`, a
    `ScrollView` with bottom padding of `barHeight + 24`, one layout per scene whose header shows the tab's
    name and whose content order rotates with the tab index (as `ambient-bar-demo.tsx` does), real words
    and invented names, photos from 8. Hidden from screen
    readers as the current demo screens are. `index.ts` maps `SceneName` to component. `finance` starts
    from the current Ambient Bar holdings list (`ambient-bar-demo.tsx`); `chat` from Composer Dock's
    screen.

##### 8. `apps/example/assets/scenes/*.webp` and `apps/example/assets/scenes/SOURCES.md` (Create)

-   **Type / Scope**: Images and their sources.
-   **Proposed Changes**: Unsplash License photos from picsum.photos, at the size shown (max 2x), WebP, under 3 MB in total.
    `SOURCES.md` lists file, source URL, author and licence for each.

##### 9. `apps/example/src/demos.tsx` and `apps/example/src/panel-demos.tsx` (Modify)

-   **Type / Scope**: Demo data.
-   **Proposed Changes**: Each entry gets `scene: SceneName` and `scheme: 'light' | 'dark'` per the
    table above; `background` and `pattern` are removed batch by batch. `isDarkScreen` and
    `screenBackground` read the scene's palette. `ambient-bar` drops its `extra: AmbientBarScreen` for
    the `finance` scene; `composer-dock` keeps `screen: ComposerDockScreen` (it draws the composer
    itself) but that screen's content comes from the `chat` scene.

##### 10. `apps/example/src/demo-screen.tsx` (Modify)

-   **Type / Scope**: Example app screen.
-   **Proposed Changes**: When the demo has a `scene`, render it instead of the background, `Pattern`
    and `DemoFeed`. Title chip and Next button stay (hidden in embed mode, as today). Under a PanelUI
    theme, pass the themed colours to the scene.

##### 11. `apps/example/src/composer-dock-demo.tsx` (Modify), `apps/example/src/ambient-bar-demo.tsx` (Delete)

-   **Type / Scope**: Example app screens.
-   **Proposed Changes**: Composer Dock's screen shows a chat conversation from the `chat` scene above its
    composer instead of the empty "Afternoon, Robin" greeting. Ambient Bar's holdings list moves into
    `scenes/finance.tsx`.

##### 12. `apps/example/src/demo-feed.tsx`, `apps/example/src/pattern.tsx` (Delete, in the last batch)

-   **Type / Scope**: Example app.
-   **Proposed Changes**: Removed once no demo uses them. Why: they are the filler.

##### 13. `apps/site/src/lib/designs.ts` (Modify)

-   **Type / Scope**: Site build data.
-   **Proposed Changes**: `demoBackground(id)` today reads `background:` from `demos.tsx`'s text and
    throws when it is missing. It reads `scene:` and `scheme:` instead and returns
    `sceneBackground(scene, scheme)` from `palette.ts` (6), falling back to `background:` for designs
    not yet moved. Why: without it the site build fails on the first moved design.

##### 14. `apps/site/scripts/record.sh` (Create), `AGENTS.md` (Modify)

-   **Type / Scope**: Media script; agent notes.
-   **Proposed Changes**: `record.sh <id>...` records each design on the one prepared simulator (UDID and
    owner as arguments; it never boots or picks a simulator itself), taps through its tabs on a fixed
    timing, and encodes to `apps/site/public/videos/<id>.mp4` plus poster. Then it runs `bar-loops.py
    --only <ids>`, `og-images.py` and the README GIF step for those ids. AGENTS.md's media rule names the
    script. Why: the audits' recording steps lived in scratch scripts; 46 re-recordings need one
    repeatable command.

##### 15. Media (Regenerate, per batch)

-   `apps/site/public/videos/<id>.mp4` and posters, `apps/site/public/bars/<id>.*`,
    `apps/site/public/og/<id>.jpg`, `assets/readme/<id>.gif` for the designs in the batch. `README.md`
    only if a GIF's size changes. `apps/site/public/og.jpg` is restored after `og-images.py`, as today.

#### Part 3: Customize panel, Code tab, Copy for AI

##### 16. `apps/example/src/preview-settings.ts` (Create) and `apps/example/src/demo-controls.ts` (Create)

-   **Type / Scope**: Plain data and types (no React Native imports).
-   **Proposed Changes**: `PreviewSettings` type (Technical Plan). `DEMO_CONTROLS`: per design id, which
    optional controls it supports (`accent`, `labels`) and the prop each sets (e.g. `sliding-capsule:
    { accent: 'activeColor' }`). The site imports both with `import type` / plain data reads, so no app
    code enters the site bundle. A Biome `noRestrictedImports` rule in `biome.json`, scoped to these two
    files and `scenes/palette.ts`, rejects imports of `react-native`, `expo-*` and app modules, so they stay
    plain data the site can read.

##### 16a. `biome.json` (Modify)

-   **Type / Scope**: Lint configuration.
-   **Proposed Changes**: The override described in 16. Why: the site depends on these three files; the
    rule keeps that dependency to data only.

##### 17. `apps/example/src/embed.ts` (Modify), `apps/example/src/demos.tsx` (Modify)

-   **Type / Scope**: Example app embed mode.
-   **Proposed Changes**: Listen for `{ type: 'tabcn:settings', settings }` from the same origin; keep the
    latest in a small store with a `usePreviewSettings()` hook. Read `rtl=1` from the query at startup.
    Demo `render` functions take the settings and pass the mapped props; the tab list is sliced to
    `tabs`. Reply `tabcn:ready` as today.

##### 18. `apps/example/src/app/_layout.tsx` (Modify, only if the RTL spike passes)

-   **Type / Scope**: Example app root.
-   **Proposed Changes**: In embed mode with `rtl=1`, lay the app out right to left on the web. The spike
    decides how (react-native-web direction support); if it can't, this file is not changed and the RTL
    control is not shown.

##### 19. `apps/site/src/components/customize-panel.tsx` (Create)

-   **Type / Scope**: Site component.
-   **Proposed Changes**: Controls for tab count (stepper), light/dark (segmented), theme (moves the
    existing `PillRadio` here), right to left (switch, if available), accent (colour swatches + hex
    field) and labels (switch) when the design declares them. Emits `PreviewSettings`. Keyboard
    accessible, labelled controls.

##### 20. `apps/site/src/components/preview-tabs.tsx` (Create), `apps/site/src/components/copy-for-ai.tsx` (Create)

-   **Type / Scope**: Site components.
-   **Proposed Changes**: Preview/Code tabs over the stage: Code shows the usage snippet for the current
    settings and the design's source file (read at build time, see 21) with the existing `code-block.tsx`.
    Copy for AI copies the text described in the Technical Plan with the existing `copy-button.tsx`.

##### 21. `apps/site/src/lib/designs.ts` (Modify), `apps/site/src/lib/usage.ts` (Create)

-   **Type / Scope**: Site build data.
-   **Proposed Changes**: Each design gets its source text (from `registry/designs/<id>/`, as
    `build-registry.ts` reads it) and its controls from `demo-controls.ts`. `usage.ts` exports
    `usageFor(design, settings)` (extends today's `usageSnippet` with chosen props and tab count) and
    `aiPromptFor(design, settings)`.

##### 22. `apps/site/src/components/live-phone.tsx` (Modify)

-   **Type / Scope**: Site component.
-   **Proposed Changes**: Hold the current `PreviewSettings`; send `tabcn:settings` on change; reload the
    iframe with `&rtl=1` when right to left changes. The theme switch moves into the panel and uses the
    same message.

#### Docs

##### 23. `docs/designs/site-redesign.md` (Create), `docs/designs/website.md` (Modify)

-   **Type / Scope**: Design docs.
-   **Proposed Changes**: This doc, saved on approval. `website.md` decision 2 links to it for the frame,
    scenes and Customize panel.

### Verification Plan

-   **Compilation/Build**: `bun run check` (lint, typecheck including the site, registry check, tests);
    `bun run --cwd apps/site build`; `cd apps/example && bunx expo-doctor`.
-   **Unit Tests**: `usageFor` and `aiPromptFor` (settings in, expected snippet out); `sceneBackground`
    for every scene and scheme; `demoBackground` for a moved and an unmoved design.
-   **Static Analysis & Linting**: Biome via `bun run check`.
-   **Visual, site**: Headless screenshots of the gallery and of five design pages (one per layout group)
    at 1440 px and 390 px, dark and light, before and after each part, compared side by side.
-   **Visual, app**: Each batch: every design in it run on the one prepared iOS simulator in Expo Go, tab
    switches stepped through frame by frame (as the owner requires), then recorded. Under PanelUI Panel
    and Moon themes once per scene.
-   **Live preview**: For three designs, change each control and check the preview updates without a
    reload (RTL reloads), the Code tab matches, and the theme switch still works.
-   **Budget**: Example app scene images under 3 MB; design page transfer no more than 10% above today's.

---

_Drafted with EGM_
