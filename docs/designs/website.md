# tabcn website

- **Status:** approved by the owner on 2026-11-20 ("finish it and publish the site and repo at my github.io"). The decisions below were made in conversation before this doc was written.
- **URL:** https://vanitascaesar1.github.io/tabcn/
- **Source:** `apps/site`

## Goal

One place to see every tabcn design move, and to install one. A visitor should be able to pick a design, watch it on a real phone, open it on their own phone, and copy the install command.

## Decisions

1. **Look and structure follow [ui lab](https://lab.xevrion.dev/)** (github.com/xevrion/ui-lab, MIT, © 2026 Yash Bavadiya). We reuse its shell: dark-first theme with a light toggle, left sidebar listing every design by layout group with counts, top bar with search (⌘K), GitHub link and theme toggle, a hero, a "showcase" block, and per-design pages with a large dotted-grid stage, title, one-line description, category pill, "View source", an install box with package-manager tabs, Previous/Next cards and the footer. ui lab's MIT notice is kept in `apps/site/LICENSE-ui-lab` and credited in the footer.
2. **Demos are recordings, not live code.** tabcn is React Native and the site does not run react-native-web (web support is out of scope for the library). Each design page plays a short screen recording from the iOS simulator inside a phone frame, with a poster image while it loads.
3. **Open on your phone.** Each design page shows a QR code that opens the example app in Expo Go at that design, from an EAS Update published under the owner's Expo account. Until that update exists, the QR block links to the repo's "Run the example" instructions instead.
4. **The site serves the shadcn registry.** `https://vanitascaesar1.github.io/tabcn/r/<id>.json` is generated at build time from `registry/registry.json` and the design files, so the install command is `npx shadcn@latest add https://vanitascaesar1.github.io/tabcn/r/<id>.json`.
5. **Static export on GitHub Pages.** Next.js with `output: 'export'` and `basePath: '/tabcn'`, deployed by `.github/workflows/site.yml` on every push to `main`.

## Pages

| Path             | Content                                                                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `/`              | Hero, the newest designs playing in a showcase, a grid of all 20 with posters, how it works (foundation + copy-in designs), quick start    |
| `/designs/<id>/` | Stage with the recording in a phone frame, title, description, layout pill, View source, install, Expo Go QR, usage snippet, Previous/Next |
| `/r/<id>.json`   | shadcn registry item with file contents inlined                                                                                            |

## Out of scope

Live web demos, docs beyond the README, analytics, a custom domain.
