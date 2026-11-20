# Registry

The copyable designs. Each one is a single file, `designs/<id>/<id>.tsx`, that imports only `tabcn`, React Native, Reanimated and the npm packages listed for it in [`registry.json`](registry.json). Users install a design with the shadcn CLI and own the copy from then on.

`registry.json` follows the [shadcn registry format](https://ui.shadcn.com/docs/registry/registry-json). The tabcn website will serve the built item files at `/r/<id>.json` (see `docs/designs/foundation.md`).

The example app imports these files directly (`@registry/<id>/<id>`), so what it shows is exactly what users copy. The full list of planned designs and their status is in [`apps/example/src/catalog.ts`](../apps/example/src/catalog.ts).
