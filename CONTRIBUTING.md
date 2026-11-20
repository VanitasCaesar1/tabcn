# Contributing

## Setup

```bash
bun install
bun run example
```

`bun run check` runs lint (Biome), typecheck (every workspace) and the package build. CI runs the same command on every pull request.

## Design first

Changes to the public API of `packages/tabcn`, or to how designs are installed, start as a design doc in [`docs/designs/`](docs/designs/). Write the doc, get it reviewed, then implement against it. Bug fixes and changes inside an approved design don't need a doc.

## Adding a design

1. Build it in `registry/<id>/` using only the public `tabcn` API plus the dependencies it declares.
2. Show it in the example app and set its `status` in `apps/example/src/catalog.ts`.
3. Check it on iOS and Android, in light and dark mode, with "Reduce Motion" on, and with VoiceOver/TalkBack.

Designs must not include another app's logos, mascots, illustrations or name. Use generic icons, or let users pass their own.

## Releases

Releases use [Changesets](https://github.com/changesets/changesets). If your change affects users of `packages/tabcn`, run `bun run changeset` and commit the file it creates.
