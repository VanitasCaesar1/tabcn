# Seek

A film finder built to show tabcn's **Ask Dock** in a real app, made with [PanelUI](https://panelui.dev)'s components. tabcn is independent of PanelUI; this app just uses both.

Show it a still or a clip (or describe the film), and the bar folds into Ask Dock's status pill while the still is analysed. Then pick the match that's right and open its page. The films, people and numbers are made up.

| Screen     | What's on it                                                                                                                      |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Discover   | The orb over one line of copy; it steps back when a still is attached or the keyboard opens                                       |
| Analysing  | The still in a glowing frame, with a light sweep, sparks and Cancel search; the bar is the status pill                            |
| Matches    | The question, the orb's answer, skeleton cards, then each match with its score and a "this one" button                            |
| Found it   | The picked film as a large card that opens its page                                                                               |
| Film page  | Parallax still, facts as chips, Save to Collection (with an Undo toast) and Watch on, synopsis, director and cast, more like this |
| Collection | Saved films as a poster grid, filtered by genre                                                                                   |
| History    | Past searches, each opening the film it found                                                                                     |

## What it uses

- **Tab bar:** `AskDock` from `registry/designs/ask-dock`, imported in place here (`@registry/ask-dock/*`); in your own app, `npx shadcn@latest add https://vanitascaesar1.github.io/tabcn/r/ask-dock.json` copies it in.
- **PanelUI:** `PanelUIProvider`, `Typography`, `Button`, `Chip`, `Card`, `Avatar` and `Avatar.Group`, `Item`, `Swipe`, `EmptyState` and `Skeleton`, all styled with Uniwind classes.
- **Notifications:** [expo-hot-toast](https://github.com/VanitasCaesar1/expo-hot-toast): glass toasts with Undo on a countdown (saving a film, removing a search), the Dynamic Island capsule (Share), and a toast that follows a promise (Watch on). It isn't on npm yet, so it installs from GitHub; Metro runs its `src` through the package's `react-native` export, and `tsconfig.json` points TypeScript at the same source.
- **Type:** [Instrument Serif](https://fonts.google.com/specimen/Instrument+Serif) (SIL Open Font License, via `@expo-google-fonts/instrument-serif`) for the wordmark, the hero line and film titles; the system face for everything else.
- **Edges:** lists fade out above the dock with an alpha mask (`EdgeFade`), so nothing shows in the gap between the prompt and the tabs; a colour fade couldn't match the gradient sky.
- **Transitions:** Expo Router's `Link.AppleZoom` and `Link.AppleZoomTarget` zoom the film page open from the poster or card you tapped (iOS 18 and later).
- **Theme:** `seek`, PanelUI's dark theme with Seek's colours (`src/global.css`): a night-blue page, translucent white cards and fills, a vivid blue for the main action.

## Run it

From the repository root, after `bun install`:

```bash
cd apps/seek && bunx expo start
```

Then open it in Expo Go (SDK 58). It needs no native build.

Photos: Unsplash via Lorem Picsum, credited in `assets/SOURCES.md`.
