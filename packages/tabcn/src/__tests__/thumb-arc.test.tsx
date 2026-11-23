/**
 * Thumb Arc (docs/designs/thumb-arc.md): a corner button whose tabs fan out on an arc. Tap to
 * open the fan and tap a tab; or hold or slide from the button and lift on a tab. The gestures
 * are driven with gesture handler's Jest controller, in the button's own points: with three tabs
 * the arc's radius is 128 and the button's centre is (30, 30), so the tabs sit at (-98, 30),
 * (-60.5, -60.5) and (30, -98).
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { ComponentType } from 'react';
import { BackHandler, I18nManager } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  createGestureController,
  getByGestureTestId,
} from 'react-native-gesture-handler/jest-utils';

import { type TabBarState, TabBarStateProvider } from '../index';
import { makeTabState } from './fixtures';

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
}));
const Haptics = require('expo-haptics') as { selectionAsync: jest.Mock; impactAsync: jest.Mock };

const { ThumbArc } = require('../../../../registry/designs/thumb-arc/thumb-arc') as {
  ThumbArc: ComponentType<{ haptics?: boolean; side?: 'right' | 'left' }>;
};

/** Where each of three tabs sits, left to right, in the button's points. */
const LEFT: [number, number] = [-98, 30];
const MIDDLE: [number, number] = [-60.5, -60.5];
const TOP: [number, number] = [30, -98];

async function show(state: TabBarState, props: { side?: 'right' | 'left' } = {}) {
  return render(
    <GestureHandlerRootView>
      <TabBarStateProvider value={state}>
        <ThumbArc {...props} />
      </TabBarStateProvider>
    </GestureHandlerRootView>,
  );
}

const button = () => screen.getByRole('button', { name: /^Tabs/ });
const tabs = () => screen.queryAllByRole('tab');

/** A press that slides from the button's centre through `points` and lifts at the last one. */
async function slide(points: [number, number][], how: 'end' | 'cancel' = 'end') {
  const pan = createGestureController(getByGestureTestId('thumb-arc-slide'));
  const at = ([x, y]: [number, number]) => ({ x, y, translationX: x - 30, translationY: y - 30 });
  const [first = [30, 30], ...rest] = points;
  await act(async () => {
    pan.begin({ x: 30, y: 30, translationX: 0, translationY: 0 });
    pan.activate(at(first));
    for (const point of rest) pan.update(at(point));
    pan[how](at(rest.at(-1) ?? first));
  });
}

/** A press held still on the button until the fan opens, then moved through `points`. */
async function hold(points: [number, number][] = []) {
  const pan = createGestureController(getByGestureTestId('thumb-arc-hold'));
  const at = ([x, y]: [number, number]) => ({ x, y, translationX: x - 30, translationY: y - 30 });
  await act(async () => {
    pan.begin({ x: 30, y: 30, translationX: 0, translationY: 0 });
    pan.activate({ x: 30, y: 30, translationX: 0, translationY: 0 });
    for (const point of points) pan.update(at(point));
    pan.end(at(points.at(-1) ?? [30, 30]));
  });
}

beforeEach(() => {
  Haptics.selectionAsync.mockClear();
  Haptics.impactAsync.mockClear();
});

describe('thumb-arc', () => {
  it('is one button naming the current tab while closed', async () => {
    await show(makeTabState());
    expect(button().props.accessibilityLabel).toBe('Tabs, Home selected');
    expect(button().props.accessibilityState).toMatchObject({ expanded: false });
    expect(tabs()).toHaveLength(0);
  });

  it('opens on a tap, shows each tab with its state, and closes after a choice', async () => {
    const state = makeTabState();
    await show(state);
    await fireEvent.press(button());
    expect(button().props.accessibilityState).toMatchObject({ expanded: true });
    const open = tabs();
    expect(open).toHaveLength(3);
    expect(open[0]?.props.accessibilityState).toMatchObject({ selected: true });
    expect(open[1]?.props.accessibilityState).toMatchObject({ selected: false });
    await fireEvent.press(open[2] as never);
    expect(state.tabs[2]?.press).toHaveBeenCalledTimes(1);
    expect(tabs()).toHaveLength(0);
  });

  it('closes on a second tap, on the dimmed screen and on the back button', async () => {
    const handlers: ((event: never) => boolean | null | undefined)[] = [];
    const add = jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_e, handler) => {
      handlers.push(handler);
      return {
        remove: () => {
          handlers.splice(handlers.indexOf(handler), 1);
        },
      };
    });
    await show(makeTabState());
    await fireEvent.press(button());
    await fireEvent.press(button());
    expect(tabs()).toHaveLength(0);

    await fireEvent.press(button());
    await fireEvent.press(screen.getByRole('button', { name: 'Close tabs' }));
    expect(tabs()).toHaveLength(0);

    await fireEvent.press(button());
    expect(handlers).toHaveLength(1);
    await act(async () => {
      for (const handler of [...handlers].reverse()) if (handler(undefined as never)) return;
    });
    expect(tabs()).toHaveLength(0);
    expect(handlers).toHaveLength(0);
    add.mockRestore();
  });

  it('chooses the tab a slide lifts on, with a haptic each time the tab changes', async () => {
    const state = makeTabState();
    await show(state);
    await slide([[0, 30], LEFT, MIDDLE, TOP, MIDDLE]);
    // Left, then middle, top and middle again: four changes of tab.
    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(4);
    expect(state.tabs[1]?.press).toHaveBeenCalledTimes(1);
    expect(state.tabs[0]?.press).not.toHaveBeenCalled();
    expect(tabs()).toHaveLength(0);
  });

  it('cancels when the finger lifts away from the tabs, or the system takes the touch', async () => {
    const state = makeTabState();
    await show(state);
    // Down and to the right of the button: nothing is there.
    await slide([LEFT, [120, 90]]);
    await slide([LEFT, MIDDLE], 'cancel');
    for (const tab of state.tabs) expect(tab.press).not.toHaveBeenCalled();
    expect(tabs()).toHaveLength(0);
  });

  it('opens on a hold; lifted without sliding, it stays open to tap a tab', async () => {
    const state = makeTabState();
    await show(state);
    await hold();
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
    expect(tabs()).toHaveLength(3);
    await fireEvent.press(tabs()[1] as never);
    expect(state.tabs[1]?.press).toHaveBeenCalledTimes(1);
  });

  it('chooses after a hold and a slide', async () => {
    const state = makeTabState();
    await show(state);
    await hold([LEFT, TOP]);
    expect(state.tabs[2]?.press).toHaveBeenCalledTimes(1);
    expect(tabs()).toHaveLength(0);
  });

  it('fills the arc in reading order: from the right in right-to-left apps', async () => {
    const rtl = I18nManager.isRTL;
    I18nManager.isRTL = true;
    try {
      const state = makeTabState();
      await show(state);
      // The top of the arc is its rightmost place: the first tab's in RTL.
      await slide([TOP]);
      expect(state.tabs[0]?.press).toHaveBeenCalledTimes(1);
      await slide([LEFT]);
      expect(state.tabs[2]?.press).toHaveBeenCalledTimes(1);
    } finally {
      I18nManager.isRTL = rtl;
    }
  });

  it('badges the button with what waits in the other tabs, and each tab with its own', async () => {
    const base = makeTabState();
    const counts = { ...base, tabs: base.tabs.map((t, i) => ({ ...t, badge: [4, 3, 2][i] })) };
    const view = await show(counts);
    // Home's own 4 is on screen already: the button counts Search's and Profile's.
    expect(button().props.accessibilityLabel).toBe('Tabs, Home selected, 5 new');
    await fireEvent.press(button());
    expect(tabs()[1]?.props.accessibilityLabel).toMatch(/^Search, 3/);

    const dots = {
      ...base,
      tabs: base.tabs.map((t, i) => ({ ...t, badge: i === 2 ? '' : undefined })),
    };
    await view.rerender(
      <GestureHandlerRootView>
        <TabBarStateProvider value={dots}>
          <ThumbArc />
        </TabBarStateProvider>
      </GestureHandlerRootView>,
    );
    expect(button().props.accessibilityLabel).toBe('Tabs, Home selected, new');
  });

  it('closes when another tab becomes active from elsewhere', async () => {
    const state = makeTabState();
    const view = await show(state);
    await fireEvent.press(button());
    expect(tabs()).toHaveLength(3);
    const next: TabBarState = {
      ...state,
      activeIndex: 1,
      tabs: state.tabs.map((tab) => ({ ...tab, focused: tab.index === 1 })),
    };
    await view.rerender(
      <GestureHandlerRootView>
        <TabBarStateProvider value={next}>
          <ThumbArc />
        </TabBarStateProvider>
      </GestureHandlerRootView>,
    );
    expect(tabs()).toHaveLength(0);
    expect(button().props.accessibilityLabel).toBe('Tabs, Search selected');
  });
});
