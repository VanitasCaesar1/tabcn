# tabcn: agent notes

Monorepo (Bun workspaces, hoisted `node_modules`). Read README.md for the layout.

- `packages/tabcn`: the foundation library, built with react-native-builder-bob. Keep the public API small; every export is a long-term promise.
- `apps/example`: Expo SDK 58 + Expo Router app. Routes live in `src/app/`. Use `bunx expo install <pkg>` to add Expo-compatible versions. Expo changes every SDK: check https://docs.expo.dev/versions/v58.0.0/ (and https://docs.expo.dev/llms.txt) instead of relying on memory.
- `registry/`: copyable designs. They may import only from `tabcn`, React Native, and the dependencies listed in their own registry entry.
- Expo Router 58 ships its own fork of React Navigation's bottom tabs (`expo-router/js-tabs`, types from `expo-router/react-navigation`). The foundation must work with both that fork and `@react-navigation/bottom-tabs`.
- New public API or install-flow changes start as a doc in `docs/designs/`.
- Native `ios/` and `android/` folders are generated; never edit them by hand.
- The README shows every design moving (`assets/readme/<id>.gif`, linked to its page on the site). Adding a design or changing how one looks means updating its GIF, the site's recording in `apps/site/public/videos/`, and its link-preview image (`python3 apps/site/scripts/og-images.py <recordings dir>`) in the same change.
- `main` is protected: work on a short-lived branch and open a pull request; CI's `check` must pass before it merges.

Before declaring work done: `bun run check`. For example-app changes, also `cd apps/example && bunx expo-doctor`.
