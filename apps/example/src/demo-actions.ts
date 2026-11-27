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
  // A product's add button fills the bag (the count on the cart rolls each time); the Search tab
  // turns the row into a back button and an "Ask a follow-up" field; Back brings the tabs back.
  'cart-pill': [
    { wait: 800 },
    { tap: 'Add to bag' },
    { wait: 1000 },
    { tap: 'Add to bag' },
    { wait: 1200 },
    { tab: 1 },
    { wait: 1800 },
    { tap: 'Back' },
    { wait: 1600 },
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
  // Home has the reply row. Leave it for Alerts (the row sinks away), then slide a finger along
  // the bar back to Home: the lens follows it and the row rises again. Scroll the post down: the
  // bar shrinks to the Home circle with the row docked beside it; tap the circle to bring the
  // tabs back.
  'reply-stack': [
    { wait: 900 },
    { tab: 3 },
    { wait: 1200 },
    { pan: [272, 818, -215, 0, 1200] },
    { wait: 1300 },
    { pan: [200, 520, 0, -70, 700] },
    { wait: 1600 },
    { tap: 'Home, show all tabs' },
    { wait: 1200 },
  ],
  // Add a photo, send it: the bar folds into the orb's pill through three status lines and
  // unfolds as the matches come in. Then to Collection (the prompt sinks away) and back.
  'ask-dock': [
    { wait: 900 },
    { tap: 'Add photo' },
    { wait: 900 },
    { tap: 'Search' },
    { wait: 5800 },
    { tab: 1 },
    { wait: 1200 },
    { tab: 0 },
    { wait: 1300 },
  ],
  // Opens on Chat; each new tab's pill pops in its own colour. Left, then right, then back.
  'sticker-pills': [
    { wait: 900 },
    { tab: 0 },
    { wait: 1300 },
    { tab: 2 },
    { wait: 1300 },
    { tab: 3 },
    { wait: 1300 },
    { tab: 1 },
    { wait: 1300 },
  ],
  // Each tab change draws the new stroke and wipes the old one: forward through the tabs, then
  // back to the first (a long move, so both strokes show at once).
  'ink-underline': [
    { wait: 900 },
    { tab: 1 },
    { wait: 1300 },
    { tab: 2 },
    { wait: 1300 },
    { tab: 3 },
    { wait: 1300 },
    { tab: 0 },
    { wait: 1500 },
  ],
  // Select turns the pill into the toolbar (actions dimmed at 0); three files roll the count
  // 1, 2, 3; Move ends selection and the tabs come back.
  'selection-toolbar': [
    { wait: 600 },
    { tap: 'Select' },
    { wait: 1000 },
    { tap: 'Lease agreement.pdf' },
    { wait: 600 },
    { tap: 'Budget 2027.xlsx' },
    { wait: 600 },
    { tap: 'Launch film v3.mov' },
    { wait: 1200 },
    { tap: 'Move' },
    { wait: 1600 },
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
  // Press the corner button and slide up-left: the fan opens under the finger, Saved grows as the
  // finger reaches it, and lifting there chooses it. A tap opens the fan and leaves it open; tap
  // Guides. Then slide left from the button to Explore. Points are on iPhone 17 Pro.
  'thumb-arc': [
    { wait: 500 },
    { pan: [350, 793, -105, -105, 1000] },
    { wait: 700 },
    { tapAt: [350, 793] },
    { wait: 1100 },
    { tap: 'Guides' },
    { wait: 700 },
    { pan: [350, 793, -149, 0, 900] },
    { wait: 1000 },
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

/**
 * Longer storyboards for the studio videos (apps/site/scripts/studio.py), which show a design in
 * full rather than in a few seconds. Same steps as DEMO_ACTIONS; a design without one here uses
 * its DEMO_ACTIONS.
 */
export const STUDIO_ACTIONS: Record<string, DemoStep[]> = {
  // Search: scroll the trends (the bar shrinks to the Search circle, the compose button beside
  // it) and back. Explore, then Alerts, and press the compose button. Slide a finger along the
  // bar back to Home (the lens follows it; the reply row rises). Scroll the post: the row docks
  // beside the Home circle; tap the circle. Slide to Chat, scroll, tap the circle, and home.
  'reply-stack': [
    { wait: 900 },
    { tab: 1 },
    { wait: 1300 },
    { pan: [200, 620, 0, -170, 600] },
    { wait: 1700 },
    { pan: [200, 420, 0, 170, 600] },
    { wait: 3300 },
    { tab: 2 },
    { wait: 1200 },
    { tab: 3 },
    { wait: 1200 },
    { tap: 'Post' },
    { wait: 3300 },
    { pan: [272, 818, -214, 0, 1300] },
    { wait: 1600 },
    { pan: [200, 600, 0, -140, 600] },
    { wait: 1900 },
    { tap: 'Home, show all tabs' },
    { wait: 3300 },
    { pan: [58, 818, 286, 0, 1400] },
    { wait: 1600 },
    { pan: [200, 620, 0, -170, 600] },
    { wait: 1700 },
    { tap: 'Chat, show all tabs' },
    { wait: 1300 },
    { tab: 0 },
    { wait: 1600 },
  ],
};
