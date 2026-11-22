# Panels that take the bar's place

-   **Status:** Approved (2026-11-23). The owner approved adding both options and a 0.4.0 release, without the Goldfish review.
-   **Package:** `react-native-tabcn`, minor release (new optional props only).
-   **First user:** Filter Chips (`docs/designs/filter-chips.md`).

## Problem

A panel today is drawn only inside its anchor's width and always behind the bar (`docs/designs/panels.md`). That is right for a mini player or a create menu. It can't do a focused takeover, where a card opens in the bar's place while the screen behind recedes. The Filter Chips reference does exactly that: the bar slides away, the screen blurs and dims, and the card sits where the bar was. Drawn in the bar's width above a sharp screen, with the bar still under it, the same card reads as a box stacked on the UI.

## Additions to `TabPanel`

```ts
/** While open, the bar slides away and the panel moves down into its place. */
coversBar?: boolean;
/**
 * Drawn over the whole screen, behind the panel, while it is open: a dim or a blur. It fades
 * with the panel's own slide, and tapping it returns the panel to rest.
 */
backdrop?: ReactNode;
```

Both default to off, so existing panels are unchanged.

### `coversBar`

-   While the panel is open and not leaving, `TabBarRoot` slides the bar box down by its height plus its bottom gap and fades it out. It runs on `tabcnSpring`, so it moves with the panel. The box can't be pressed while covered.
-   That panel's window moves down by the bar's height on the same spring, so whatever the panel draws above the bar ends where the bar's top edge was, now a bar's height lower. Its frame doesn't change: it is a transform, so nothing is laid out per frame and the panel's own measuring is untouched.
-   The bar's reported height (`useBottomTabBarHeight`, `useTabBarInset`) doesn't change. The screen behind is covered for the moment, not resized.
-   Floating bars only. A docked bar spans the screen's width and its tabs are laid out in the root with the panels, so there's no box to slide without reshaping the root for every docked design. Under a docked bar the option is ignored, with a development warning.
-   Screen readers: unchanged. An open plain panel is already modal, and the bar is already hidden from screen readers.

### `backdrop`

-   `PanelLayer` draws the element in a full-screen layer behind that panel's window, in front of the screens. The layer reaches past the root on every side, as sheets already do above it.
-   Its opacity follows the panel's own visible height between rest and open, so it fades exactly with the slide, drags included.
-   It takes touches only while the panel is open. A tap returns the panel to rest, like Android back. It is hidden from screen readers; the escape gesture and back already close the panel.
-   The design supplies the look: a dim `View`, or a `BlurView` from the design's own dependencies. The package stays free of blur libraries.

## Alternatives

-   **A design-local overlay.** A panel can't draw outside its window, which is clipped to the bar's width, and it can't move the bar.
-   **Hiding the bar through the navigator** (`tabBarStyle: { display: 'none' }`): that resizes every screen and loses the bar's own exit motion.
-   **One option, `modal`, doing both.** A mini player could want a backdrop without giving up the bar, and a takeover could want the bar gone over a sharp screen. Two orthogonal options cost one more prop.

## Tests

-   `coversBar`: the floating bar box stops taking touches while the panel is open and takes them again at rest. Under a docked bar it warns.
-   `backdrop`: drawn only while the panel shows, and pressing it returns an open panel to rest (peek or hidden).

## Rollout

Changeset: minor. Filter Chips requires `react-native-tabcn` 0.4.0 or later; its registry entry says so until the release is out.
