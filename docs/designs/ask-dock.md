# Ask Dock

-   **Status:** Implemented (2026-11-27) from six still screens of an "AI movie search" app concept the owner shared (an X post, 2026-11-26). No foundation changes.
-   **Design:** `ask-dock`, a tab bar in `registry/`, in four files.

## Overview

A bar for apps you ask things of. A frosted capsule holds the tabs, each an icon over its label, with a soft lit pill behind the active one. Above it floats a prompt card: a text field, photo and video buttons and a round send button. While a search runs, the capsule folds into a small status pill: a glossy orb with eyes beside a line of status that changes as the search goes on. When the search ends, the pill unfolds back into the tabs.

## The reference, measured

From the stills (2328 px wide mockups, the phone screen about 1262 px across), scaled to a 402 pt screen:

-   **Tab capsule.** 279 by 65 pt for three tabs: it hugs its tabs rather than spanning the screen. Its bottom edge sits about 1 pt above the home indicator's safe area. A faint white edge; the screen's blue shows through.
-   **Tabs.** Icon (about 22 pt) over label (about 14 pt, semibold), 91 pt a tab. The lit pill is 95 by 58 pt: a lighter, see-through capsule. The active icon is solid (Discover's lens fills), the active label white; idle ones a light grey-blue.
-   **Prompt.** 362 by 96 pt (20 pt from each side), 22 pt corners, 26 pt above the capsule. "Describe a movie, or paste a clue…" at about 17 pt; photo and video buttons with a short divider between them at its lower left; a 37 pt round send button at its lower right.
-   **Focused prompt** (with the keyboard up): it rides just over the keyboard, its fill darkens to near black and a thin ring runs from blue at the top left to violet at the bottom right. The send button turns white with a blue arrow once there is text. An attached still sits over the prompt's top left corner (about 87 by 46 pt in the mockup) with a white round remove button. The tab capsule is left behind the keyboard.
-   **Searching.** The prompt and tabs are gone; a pill 207 by 37 pt with a 38 pt orb at its start reads "Taking a closer look…" at about 16 pt in white. Its fill is a lighter, brighter blue than the capsule.
-   **The orb.** A glossy sphere: bright blue at the lower left, a deep blue core right of centre, violet at the upper right, white gloss along its upper edge, and two white eyes left of centre.
-   **Not part of this design:** the screens themselves (the hero orb and headline, the analysing card, the results list, the film page). The demo draws its own versions of them.

## Decisions

-   **The orb is the reference's mascot.** At the owner's request (2026-11-27) the orb matches the stills: the same blue-violet glossy sphere and the two bean eyes with a notch on their right side, like opening quote marks. The rest of the demo is new: the app is "Seek", its films are made up, and its icons and copy are drawn fresh.
-   **The orb moves like Treato's Maya.** Its face runs on the technique Maya's engine is built on, ported from [bloub](https://github.com/jeremy-prt/bloub) (MIT, Jérémy Perret; the licence is in `ask-dock-orb.tsx`): the eyes are painted on a sphere through the head's gaze (yaw, pitch, roll), so an eye turned towards the edge narrows; a blink schedule drawn ahead (1.9 to 4.6 s apart, sometimes double, 0.18 s each, squashed vertically on screen); and a slow gaze drift from looping noise with periods prime to each other. Every frame is a pure function of time, computed on the UI thread (`useFrameCallback`) and pushed to react-native-svg paths, the same pipeline Maya uses. Moves between poses are ease-outs (quint, 450 ms); the face never springs.
-   **Rest and busy.** At rest the head looks up and to the left (yaw -23°, pitch 7.5°, eyes 13.5° either side of it, 0.29 by 0.55 of the radius, measured from the stills), drifts and blinks. While a search runs it scans: the gaze glances 24° to one side, holds, glances to the other, every 2.4 s, looking a little down, and the body's colours turn once every 3.6 s. `alive={false}` holds the rest frame (the status pill's orb uses it, so a hidden orb runs no clock). Reduce motion holds one still frame.
-   **The fold is the design's own idea, from the stills.** The stills show the bar and, separately, the status pill a little above where the bar was; nothing shows the change. Ask Dock makes it one motion: the capsule narrows round its centre into the pill and rises 52 pt, where the reference's pill sits (one spring, lively, with a little overshoot: stiffness 90, damping 14; Reanimated's duration-based springs do most of their move in the first fifth of their duration, which read as a jump), the tabs fade in the first 40% of it, the orb pops in from 40% of its size, then the line slides in. Unfolding runs the same spring backwards, a little firmer.
-   **The pill fits its line.** Each status line is measured off screen; the pill glides to the new width when the line changes, and the old line lifts out as the new one rises 8 pt in (220 ms; the old one is gone in the first 70% of it). Both are driven by one shared value on the UI thread, not by layout animations, which cost a React commit each. While the pill waits, a faint band of light (white at 20% at its peak) sweeps across the line, not the orb, every 2 s; it is off with reduce motion.
-   **The status belongs to the app.** `status` (a string, or `null`) drives the fold; the design keeps no timers. `onStatusPress` makes the pill a button (cancel, in the demo). Status changes are announced to screen readers.
-   **The prompt is opt-in and owned by the bar.** `prompt` holds its placeholder, `onSend`, `onAddPhoto`, `onAddVideo` and an `attachment`. The text is the prompt's own state and clears on send. `showPrompt` hides it on tabs where it doesn't belong (the demo shows it on Discover only), sinking away in 150 ms and rising back in 220 ms.
-   **The keyboard.** Only when the prompt has focus does it ride the keyboard (`useAnimatedKeyboard`, a transform while the keyboard moves, then a spacer under the tabs once it settles so the lifted prompt stays inside the bar's box and touchable, as in Composer Dock). The tab capsule stays put behind the keyboard, as in the reference.
-   **Glass.** A dark-tinted `BlurView` on iOS and the web (twice the intensity on the web, where expo-blur is half as strong); a dense fill on Android. Nothing over a blur fades its parent's opacity (iOS shows the screen sharp through a faded blur), so the prompt's blur strength follows its presence and only the layers over it fade.
-   **Dark only, for now.** The reference is a night-sky app. Every colour can be overridden through `colors` and `orbColors`.
-   **The orb is exported.** `Orb` (`ask-dock-orb.tsx`) is the same orb at any size, so a screen can show a large one over its empty state, as the reference and the demo do.
-   **Motion.** Lit pill: `tabcnSpring` with a 10% stretch as it sets off. Icons crossfade to solid and labels brighten on the tab's focus progress. Send button: lights in 160 ms with a pop to 110%. Focus ring: 200 ms in, 140 ms out. Attachment card: grows in from 90% and 10 pt low with a slight overshoot (240 ms), and shrinks away in 150 ms. Exits ease out, never in: each follows a tap. Pressed tab: 92%. Pressed pill: 96%. Reduce motion makes every change instant and keeps the orb still.
-   **Tab count.** Made for three; two to five fit (the tabs narrow from 91 pt only when the screen can't hold them).
-   **Haptics.** A tick on pressing an inactive tab and on removing an attachment, a light tap on send, and a tick as the bar unfolds.

## Out of scope

-   A light glass variant.
-   Voice input (the reference shows only the keyboard's own dictation).
-   The "Cancel search" button at the screen's top: it belongs to the screen (the demo draws one; the pill cancels too).

## Verification

-   Registry bar tests (one tab per route, presses through, works under a provider), plus Ask Dock's own: sending typed text and an attachment without text, the remove button, the folded pill pressing through with the tabs and prompt hidden from screen readers, and the bar with no prompt.
-   On the iOS simulator against the stills: the capsule, lit pill, prompt and status pill sizes and colours; the orb side by side with the reference at the same scale; the status lines and the unfold frame by frame at 30 fps; the keyboard ride with the prompt focused.
-   **Performance.** Every animation runs on the UI thread; nothing re-renders per frame. Worklets capture plain colour strings, not the `colors` object, so a parent re-render with the same colours doesn't rebuild them. The orb's blink lookup is a binary search over its schedule, and its clock runs only while it is busy or `alive` (the pill's orb never runs one at rest; the demo's large orb stops when its tab is off screen). Measured with a UI-thread frame probe on the simulator (Expo Go, dev build): no dropped frames at rest with the orb drifting and blinking; one frame of about 50 ms as the fold starts (the React commit that hands over the status), after which the fold plays out over about 270 ms.
-   Still to check on a device: that commit frame on a release build, and 120 Hz.
