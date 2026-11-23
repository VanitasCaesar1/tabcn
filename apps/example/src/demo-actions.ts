/**
 * How to show each interactive design in a recording: ordered steps that open its behaviour,
 * use it and close it again in about 6 to 8 seconds, through the demo's own controls. Plain
 * data with no React Native imports, so recording scripts can read it.
 *
 * - `tap` and `longPress` name an element by its accessibility label, exactly as the app sets
 *   it. Tab buttons are the exception: on iOS tabcn reads them as "<label>, tab, 3 of 5", so
 *   match a tab's label as the start of the element's label.
 * - `tab` switches to the tab at that index (0 is the first), however the recorder does that.
 * - `wait` holds for that many milliseconds so the motion can finish on camera.
 * - `tapAt` taps a point, in points on the recording phone (iPhone 17 Pro, 402 x 874), for a
 *   control screen readers can't reach at that moment (an open panel is modal on iOS).
 * - `pan` drags a finger from [x, y] by [dx, dy] over that many milliseconds, in the same points,
 *   for a control that is dragged (a slider). The step lasts as long as the drag.
 *
 * Plain tab bars have no entry: the recorder switches their tabs.
 */
export type DemoStep =
  | { tap: string }
  | { longPress: string }
  | { tab: number }
  | { wait: number }
  | { tapAt: [number, number] }
  | { pan: [number, number, number, number, number] };

export const DEMO_ACTIONS: Record<string, DemoStep[]> = {
  // Tap the strip to open the player, skip a track, close it with its own chevron.
  'mini-player': [
    { tap: 'Slow Tide, Harbor Lights' },
    { wait: 1800 },
    { tap: 'Next' },
    { wait: 1500 },
    { tap: 'Close player' },
    { wait: 1500 },
  ],
  // A post's comment button opens the sheet; its grabber raises it; its close button closes it.
  'bar-sheet': [
    { tap: 'Comments' },
    { wait: 1800 },
    { tap: 'Comments sheet' },
    { wait: 1800 },
    { tap: 'Close comments' },
    { wait: 1500 },
  ],
  // The plus opens the create menu; picking an action closes it; the plus opens and closes it.
  'quick-create': [
    { tap: 'Create' },
    { wait: 1600 },
    { tap: 'Voice' },
    { wait: 1400 },
    { tap: 'Create' },
    { wait: 1600 },
    // While the menu is open it is the only thing a screen reader (and so the recorder) reaches.
    { tap: 'Text' },
    { wait: 1400 },
  ],
  // A product's add button fills the bag; the count on the cart button rolls each time.
  'cart-pill': [
    { wait: 800 },
    { tap: 'Add to bag' },
    { wait: 1200 },
    { tap: 'Add to bag' },
    { wait: 1200 },
    { tap: 'Add to bag' },
    { wait: 2000 },
  ],
  // The chip's own toast, a product's add toast (both clear the bar and chip), then the search
  // field raises the keyboard and the bar and chip slide away for it.
  'companion-chip': [
    { tap: 'Nearest store' },
    { wait: 2700 },
    { tap: 'Add to bag' },
    { wait: 2700 },
    { tap: 'Search the shop' },
    { wait: 2000 },
  ],
  // Messages come in on their own: the Chats count rolls up every 2 seconds.
  'glass-badges': [{ wait: 7000 }],
  // The timer counts down in place of its label and the download ring fills on their own.
  'live-tabs': [{ wait: 2000 }, { tab: 1 }, { wait: 2500 }, { tab: 2 }, { wait: 2500 }],
  // Long-press Library for its drawer, then choose a sub-tab.
  'sub-tabs': [{ longPress: 'Library' }, { wait: 1800 }, { tap: 'Albums' }, { wait: 1800 }],
  // The Plan tab puts the tray in the bar's place; it fills by itself; its close returns.
  'context-tray': [{ tab: 2 }, { wait: 5000 }, { tap: 'Close' }, { wait: 1800 }],
  // A chip grows into its sheet; choose an option and apply it.
  'filter-chips': [
    { tap: 'Sort, Any' },
    { wait: 1600 },
    { tap: 'Lowest price' },
    { wait: 900 },
    { tap: 'Apply' },
    { wait: 2000 },
  ],
  // The sheet's sections are its tabs.
  'section-sheet': [
    { wait: 800 },
    { tab: 1 },
    { wait: 1800 },
    { tab: 2 },
    { wait: 1800 },
    { tab: 0 },
    { wait: 1500 },
  ],
  // The first holding opens the sheet; the chip is dragged from 25% to 75% (it turns into the
  // knob, with the percentage bubble over it), then back to 50%; the button confirms and closes
  // it. The drags start on the chip where it rests on iPhone 17 Pro.
  'slider-sheet': [
    { tap: 'Northwind Air' },
    { wait: 800 },
    { pan: [120, 634, 170, 0, 1200] },
    { wait: 500 },
    { pan: [263, 634, -85, 0, 900] },
    { wait: 500 },
    { tap: 'Reduce position' },
    { wait: 1300 },
  ],
  // The chip folds the tabs into an account bar; pick another workspace, then fold back with the
  // round button (by position: the open sheet hides it from accessibility).
  'account-dock': [
    { tap: 'Account and workspace, Northwind Studio, Sam Rivera, Online' },
    { wait: 1800 },
    { tap: 'Field Notes, 1,212 members' },
    { wait: 1600 },
    // The round button at the start of the dock: back to the tabs, now on Field Notes.
    { tapAt: [45, 800] },
    { wait: 1800 },
  ],
  // Hold Projects for its recent items, then open the attachment menu.
  'composer-dock': [
    { longPress: 'Projects' },
    { wait: 1800 },
    { tap: 'Close menu' },
    { wait: 900 },
    { tap: 'Add files and more' },
    { wait: 1800 },
    { tap: 'Close menu' },
    { wait: 1000 },
  ],
};
