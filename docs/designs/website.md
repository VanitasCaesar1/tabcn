# tabcn website

- **Status:** approved by the owner on 2026-11-20 ("finish it and publish the site and repo at my github.io"). The decisions below were made in conversation before this doc was written.
- **URL:** https://vanitascaesar1.github.io/tabcn/
- **Source:** `apps/site`

## Goal

One place to see every tabcn design move, and to install one. A visitor should be able to pick a design, watch it on a real phone, open it on their own phone, and copy the install command.

## Decisions

1. **Look and structure follow [ui lab](https://lab.xevrion.dev/)** (github.com/xevrion/ui-lab, MIT, © 2026 Yash Bavadiya). We reuse its shell: dark-first theme with a light toggle, left sidebar listing every design by layout group with counts, top bar with search (⌘K), GitHub link and theme toggle, a hero, a "showcase" block, and per-design pages with a large dotted-grid stage, title, one-line description, category pill, "View source", an install box with package-manager tabs, Previous/Next cards and the footer. ui lab's MIT notice is kept in `apps/site/LICENSE-ui-lab`. The footer and README credit it no longer (the owner removed both on 2026-11-21); the licence file is what MIT requires and stays.
2. **Demos are recordings, not live code.** tabcn is React Native and the site does not run react-native-web (web support is out of scope for the library). Each design page plays a short screen recording from the iOS simulator inside a phone frame, with a poster image while it loads.
3. **Open on your phone.** Each design page shows a QR code that opens the example app in Expo Go at that design, from an EAS Update published under the owner's Expo account. Until that update exists, the QR block links to the repo's "Run the example" instructions instead.
4. **The site serves the shadcn registry.** `https://vanitascaesar1.github.io/tabcn/r/<id>.json` is generated at build time from `registry/registry.json` and the design files, so the install command is `npx shadcn@latest add https://vanitascaesar1.github.io/tabcn/r/<id>.json`.
5. **Static export on GitHub Pages.** Next.js with `output: 'export'` and `basePath: '/tabcn'`, deployed by `.github/workflows/site.yml` on every push to `main`.

## Pages

| Path             | Content                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`              | Hero: one fixed install command (Add Sliding Capsule, with package-manager tabs; `HERO_DESIGN` in `apps/site/src/lib/site.ts`), a release status line under it decided at build time (on npm with its version, or not yet with a link to the quick start), no Browse button; then an actual-size row of real tab bars stepping on tabcnSpring over two smaller rows and a layout dock that drives it (the board no longer drives a command); then all designs as rows (each tab state as a still) or a grid of posters, how it works, quick start |
| `/designs/<id>/` | Stage with the recording in a phone frame, title, description, layout pill, View source, install, Expo Go QR, usage snippet, Previous/Next                                                                                                                                                                                                                                                                                                                                                                                                        |
| `/r/<id>.json`   | shadcn registry item with file contents inlined                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

The home hero (the bar board and the fixed install command, both built 2026-11-21) changes the `/` row above. **Merged by the owner** in #15 (2026-11-21), as built:

- the sub copy ("{barCount} tab bars and {panelCount} panels for React Native and Expo. Each one is a single file you copy in with the shadcn CLI and change as you like.");
- the fixed hero command: always `npx shadcn@latest add https://vanitascaesar1.github.io/tabcn/r/sliding-capsule.json` (the package-manager tabs swap the runner), labelled "Add Sliding Capsule";
- the release status line under it, read from npm at build time by `apps/site/scripts/fetch-repo.ts`; `.github/workflows/release.yml` starts `site.yml` again once a release is on npm, so the line updates without waiting for another push;
- removing the hero's Browse designs button;
- the board's opening bar (`BOARD_START = 'glow-glass'` in `apps/site/src/lib/board.ts`).

Open risk 1 (still open): the board opens on Glow Glass while the command adds Sliding Capsule, so the bar in focus and the command name different bars. The label above the command names its bar to soften this; the owner may prefer to open the board on Sliding Capsule instead.

The bar loops in `apps/site/public/bars/` are made by `python3 apps/site/scripts/bar-loops.py <recordings dir>`.

## Props tables on each design's page

- **Status:** proposed 2026-11-21 (moved here from `bottom-components.md`, part F1); not covered by the approval above.
- **Goal:** every design page lists its props (name, type, default, description) from the source, so the table can't drift from the code.
- **Reader.** `scripts/design-props.ts` (in the root `scripts/` folder, so both the site and `scripts/check-registry.ts` import it without the site bundling `typescript`) parses one design file at a time with `ts.createSourceFile` (syntax only, no type checker), so it's fast and doesn't need React Native's types. It finds the interface named `<Component>Props` (the component name `designs.ts` already reads), or else the type of the component's first parameter, and for each member records its name and optionality, its type as written (`MiniPlayerColors`, `'glass' | 'tint'`), its default (from the destructured parameter's initializer or a `@default` JSDoc tag) and its JSDoc description.
- **Page.** `apps/site/src/lib/designs.ts` calls it during the static export and the design page shows a "Props" section after "Usage" (`props-table.tsx`), types in code font, named types linking to their line in "View source".
- **CI.** `scripts/check-registry.ts` fails when a design's props member has no doc comment. The pull request that adds the rule also adds any missing comments to the existing designs, so it lands green.
- **Rejected:** the full type checker (slow on React Native's types, prints expanded types); `react-docgen-typescript` (another dependency on the same compiler API, aimed at web components); hand-written tables (they drift).
- **Files:** `scripts/design-props.ts` (create); `apps/site/src/lib/designs.ts`, `apps/site/src/app/designs/[id]/page.tsx`, `scripts/check-registry.ts`, existing `registry/designs/*/*.tsx` as needed (modify); `apps/site/src/components/props-table.tsx` (create).
- **Built 2026-11-21**, with two changes from the plan above. (1) The reader runs in `apps/site/scripts/build-props.ts` (part of the site's `build` and `dev`), which writes `apps/site/generated/design-props.json` (gitignored); `designs.ts` reads that file, because importing the reader from page code would bundle `typescript` into the static export. (2) `colors` and `haptics` mean the same in every design, so a member with one of those names and no doc comment gets shared text (`SHARED_DESCRIPTIONS` in `scripts/design-props.ts`) instead of 41 copies of the same comment. Defaults also come from a doc comment's "Default <value>" sentence when there is no initializer or `@default` tag, and a `const` initializer from the same file is shown by its value. Eight members had no comment and got one (Mini Player, Companion Chip, Bar Sheet, Playful Tiles).

## Out of scope

Live web demos, docs beyond the README, analytics, a custom domain.
