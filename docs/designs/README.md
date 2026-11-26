# Design docs

Write the design here before building anything that changes the public API of `tabcn` or how designs are installed. One file per design: `docs/designs/<topic>.md`.

| Doc                                                                                                                                                                                        | Status                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------- |
| [`foundation.md`](foundation.md): core API, navigator adapters, motion primitives, registry/install flow                                                                                   | Approved 2026-11-20    |
| [`website.md`](website.md): the tabcn site (ui-lab-style pages, demo videos, Expo Go QR, registry hosting)                                                                                 | Approved 2026-11-20    |
| [`panels.md`](panels.md): panels that slide out from behind the tab bar (provider, anchors, override slot, `react-native-tabcn/gestures`), plus mini player, context tray and quick-create | Approved 2026-11-20    |
| [`motion-and-rail.md`](motion-and-rail.md): minimize on scroll, rolling badge counts, and a side rail for tablets                                                                          | Proposed 2026-11-20    |
| [`composer-dock-split.md`](composer-dock-split.md): Composer Dock split into files of one registry item; same-item imports                                                                 | Approved 2026-11-21    |
| [`panelui.md`](panelui.md): PanelUI Colors, every design's colours from a running PanelUI theme                                                                                            | Approved 2026-11-22    |
| [`account-dock.md`](account-dock.md): Account Dock, a floating bar that folds into an account bar with a workspace and account sheet and a status menu                                     | Approved 2026-11-22    |
| [`filter-chips.md`](filter-chips.md): Filter Chips, a strip of filter chips above the bar that grows into a card of options and folds the choice back into its chip                        | Approved 2026-11-23    |
| [`panel-cover.md`](panel-cover.md): `TabPanel` `coversBar` and `backdrop`, a panel that takes the bar's place over a dimmed or blurred screen                                              | Approved 2026-11-23    |
| [`ambient-bar.md`](ambient-bar.md): Ambient Bar, a bar with no colour of its own that blurs the content scrolling behind it                                                                | Approved 2026-11-23    |
| [`ink-underline.md`](ink-underline.md): Ink Underline, serif text tabs with a hand-drawn underline that draws itself under the active tab                                                  | Approved 2026-11-24    |
| [`thumb-arc.md`](thumb-arc.md): Thumb Arc, a round corner button whose tabs fan out on an arc for one thumb                                                                                | Proposed 2026-11-24    |
| [`sticker-pills.md`](sticker-pills.md): Sticker Pills, glossy sticker icons on label pills that pop in their own colour                                                                    | Implemented 2026-11-24 |
| [`reply-stack.md`](reply-stack.md): Reply Stack, X's frosted-glass bar, a reply field above it, a compose button; minimizes on scroll                                                      | Implemented 2026-11-25 |
| [`ask-dock.md`](ask-dock.md): Ask Dock, a search prompt over a glass tab bar that folds into an orb's status pill while a search runs                                                      | Implemented 2026-11-27 |
| [`selection-toolbar.md`](selection-toolbar.md): Selection Toolbar, the tab bar turned into an action bar while a screen selects                                                            | Implemented 2026-11-24 |

The npm package is published as `react-native-tabcn`: npm turned down `tabcn` as too close to `table`. Docs written before that (2026-11-21) say `tabcn` for the package and `tabcn/<entry>` for its entry points; read those as `react-native-tabcn` and `react-native-tabcn/<entry>`.
