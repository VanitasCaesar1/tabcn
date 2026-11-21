/**
 * Scrub the bar (docs/designs/bottom-components.md, Scrub the bar): TabScrub in
 * tabcn/gestures, the indicator target it shares through the tab list, and the Scrub Pill
 * design.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { type ComponentType, useLayoutEffect } from 'react';
import { Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  createGestureController,
  getByGestureTestId,
} from 'react-native-gesture-handler/jest-utils';

import { TabScrub, type TabScrubProps } from '../gestures';
import {
  TabBarRoot,
  type TabBarState,
  TabBarStateProvider,
  TabButton,
  TabIndicator,
  useTabBar,
} from '../index';
import { type TabFrame, type TabListContextValue, useTabListContext } from '../TabList';
import { makeTabState } from './fixtures';

/** Three 100 pt tabs, left to right. */
const LTR: Record<number, TabFrame> = {
  0: { x: 0, y: 0, width: 100, height: 50 },
  1: { x: 100, y: 0, width: 100, height: 50 },
  2: { x: 200, y: 0, width: 100, height: 50 },
};
/** The same tabs laid out right to left: the first tab is on the right. */
const RTL: Record<number, TabFrame> = {
  0: { x: 200, y: 0, width: 100, height: 50 },
  1: { x: 100, y: 0, width: 100, height: 50 },
  2: { x: 0, y: 0, width: 100, height: 50 },
};

let list: TabListContextValue | null = null;

/** Host measuring is a no-op under Jest: hands the list the frames a device would measure. */
function Frames({ frames }: { frames: Record<number, TabFrame> }) {
  const context = useTabListContext('Frames');
  list = context;
  useLayoutEffect(() => {
    context.frames.value = frames;
  });
  return null;
}

type ScrubCallbacks = Pick<TabScrubProps, 'onTabCross' | 'onScrubStart' | 'onScrubEnd'>;

function ScrubBar({
  frames = LTR,
  ...callbacks
}: ScrubCallbacks & {
  frames?: Record<number, TabFrame>;
}) {
  const { tabs } = useTabBar();
  return (
    <TabBarRoot placement="floating" testID="bar">
      <TabScrub {...callbacks}>
        <TabIndicator />
        <Frames frames={frames} />
        {tabs.map((tab) => (
          <TabButton key={tab.key} tab={tab}>
            <Text>{tab.label}</Text>
          </TabButton>
        ))}
      </TabScrub>
    </TabBarRoot>
  );
}

function App({
  state,
  frames,
  ...callbacks
}: ScrubCallbacks & {
  state: TabBarState;
  frames?: Record<number, TabFrame>;
}) {
  return (
    <GestureHandlerRootView>
      <TabBarStateProvider value={state}>
        <ScrubBar frames={frames} {...callbacks} />
      </TabBarStateProvider>
    </GestureHandlerRootView>
  );
}

function focus(state: TabBarState, index: number): TabBarState {
  return {
    ...state,
    activeIndex: index,
    tabs: state.tabs.map((tab) => ({ ...tab, focused: tab.index === index })),
  };
}

const target = () => list?.scrub?.value ?? null;
const scrubber = () => createGestureController(getByGestureTestId('tabcn-scrub'));

/** Presses at `from`, slides through `through`, and lifts at the last point (y = 25). */
async function slide(xs: number[], liftY = 25) {
  const pan = scrubber();
  const [first = 0, ...rest] = xs;
  await act(async () => {
    pan.begin({ x: first, y: 25 });
    pan.activate({ x: first + 12, y: 25 });
    for (const x of rest) pan.update({ x, y: 25 });
    pan.end({ x: rest.at(-1) ?? first, y: liftY });
  });
}

beforeEach(() => {
  list = null;
});

describe('TabScrub', () => {
  it('is a tab list: taps still press tabs, and nothing follows a finger until one slides', async () => {
    const state = makeTabState();
    await render(<App state={state} />);
    expect(list?.scrub).toBeDefined();
    expect(target()).toBeNull();
    await act(async () => {
      await fireEvent.press(screen.getAllByRole('tab')[1] as never);
    });
    expect(state.tabs[1]?.press).toHaveBeenCalled();
  });

  it('follows the finger, reports each tab crossed and presses the tab it lifts on', async () => {
    const state = makeTabState();
    const crossed: string[] = [];
    await render(<App state={state} onTabCross={(tab) => crossed.push(tab.label)} />);
    const pan = scrubber();
    await act(async () => {
      pan.begin({ x: 50, y: 25 });
      pan.activate({ x: 62, y: 25 });
    });
    // Centred on the finger, kept inside the first tab's outer edge.
    expect(target()).toEqual({ x: 12, y: 0, width: 100, height: 50 });
    await act(async () => pan.update({ x: 150, y: 25 }));
    expect(target()).toEqual({ x: 100, y: 0, width: 100, height: 50 });
    await act(async () => pan.update({ x: 290, y: 25 }));
    // Held at the last tab's outer edge.
    expect(target()).toEqual({ x: 200, y: 0, width: 100, height: 50 });
    expect(crossed).toEqual(['Search', 'Profile']);
    expect(state.tabs[2]?.press).not.toHaveBeenCalled();

    await act(async () => pan.end({ x: 290, y: 25 }));
    expect(state.tabs[2]?.press).toHaveBeenCalledTimes(1);
    // The indicator stays on the chosen tab until the navigator makes it active.
    expect(target()).toEqual(LTR[2]);
  });

  it('reports when a scrub starts and how it ends, before the chosen tab is pressed', async () => {
    const state = makeTabState();
    const events: string[] = [];
    const callbacks: ScrubCallbacks = {
      onScrubStart: (tab) => events.push(`start ${tab.label}`),
      onTabCross: (tab) => events.push(`cross ${tab.label}`),
      onScrubEnd: (tab) => {
        const pressed = (state.tabs[2]?.press as jest.Mock | undefined)?.mock.calls.length ?? 0;
        events.push(`end ${tab?.label ?? 'none'} (pressed ${pressed})`);
      },
    };
    await render(<App state={state} {...callbacks} />);
    await slide([50, 150, 250]);
    expect(events).toEqual([
      'start Home',
      'cross Search',
      'cross Profile',
      'end Profile (pressed 0)',
    ]);

    // Lifted far from the bar: no tab.
    events.length = 0;
    await slide([50, 150], 25 + 200);
    expect(events).toEqual(['start Home', 'cross Search', 'end none (pressed 1)']);

    // The system took the touch: no tab.
    events.length = 0;
    const pan = scrubber();
    await act(async () => {
      pan.begin({ x: 150, y: 25 });
      pan.activate({ x: 162, y: 25 });
      pan.cancel({ x: 162, y: 25 });
    });
    expect(events).toEqual(['start Search', 'end none (pressed 1)']);

    // Lifted on the active tab: that tab, and nothing is pressed.
    events.length = 0;
    await slide([30, 70]);
    expect(events).toEqual(['start Home', 'end Home (pressed 1)']);
    expect(state.tabs[0]?.press).not.toHaveBeenCalled();
  });

  it('lets go of the indicator once the chosen tab is active', async () => {
    const state = makeTabState();
    const view = await render(<App state={state} />);
    await slide([50, 150, 250]);
    expect(target()).toEqual(LTR[2]);
    await view.rerender(<App state={focus(state, 2)} />);
    expect(target()).toBeNull();
  });

  it('lets go after a moment when the press was prevented', async () => {
    const state = makeTabState();
    await render(<App state={state} />);
    await slide([50, 150]);
    expect(state.tabs[1]?.press).toHaveBeenCalled();
    expect(target()).toEqual(LTR[1]);
    await act(async () => new Promise<void>((resolve) => setTimeout(resolve, 600)));
    expect(target()).toBeNull();
  });

  it('changes nothing when lifted on the active tab or far from the bar', async () => {
    const state = makeTabState();
    const crossed = jest.fn();
    await render(<App state={state} onTabCross={crossed} />);
    await slide([30, 70]);
    expect(crossed).not.toHaveBeenCalled();
    expect(state.tabs[0]?.press).not.toHaveBeenCalled();
    expect(target()).toBeNull();

    await slide([50, 150, 250], 25 + 200);
    expect(crossed).toHaveBeenCalledTimes(2);
    expect(state.tabs[2]?.press).not.toHaveBeenCalled();
    expect(target()).toBeNull();
  });

  it('returns to the active tab when the system takes the touch', async () => {
    const state = makeTabState();
    await render(<App state={state} />);
    const pan = scrubber();
    await act(async () => {
      pan.begin({ x: 50, y: 25 });
      pan.activate({ x: 62, y: 25 });
      pan.update({ x: 150, y: 25 });
    });
    expect(target()).not.toBeNull();
    await act(async () => pan.cancel({ x: 150, y: 25 }));
    expect(target()).toBeNull();
    expect(state.tabs[1]?.press).not.toHaveBeenCalled();
  });

  it('leaves a touch that held still for a long press to the tab', async () => {
    let now = 1000;
    const clock = jest.spyOn(Date, 'now').mockImplementation(() => now);
    const state = makeTabState();
    const crossed = jest.fn();
    await render(<App state={state} onTabCross={crossed} />);
    const pan = scrubber();
    await act(async () => {
      pan.begin({ x: 50, y: 25 });
      now += 600;
      pan.activate({ x: 62, y: 25 });
      pan.update({ x: 150, y: 25 });
      pan.end({ x: 150, y: 25 });
    });
    expect(target()).toBeNull();
    expect(crossed).not.toHaveBeenCalled();
    expect(state.tabs[1]?.press).not.toHaveBeenCalled();
    clock.mockRestore();
  });

  it('works right to left: it goes by where each tab is drawn', async () => {
    const state = makeTabState();
    const crossed: string[] = [];
    await render(<App state={state} frames={RTL} onTabCross={(tab) => crossed.push(tab.label)} />);
    await slide([250, 150, 50]);
    expect(crossed).toEqual(['Search', 'Profile']);
    expect(state.tabs[2]?.press).toHaveBeenCalledTimes(1);
  });
});

describe('scrub-pill', () => {
  const { ScrubPill } = require('../../../../registry/designs/scrub-pill/scrub-pill') as {
    ScrubPill: ComponentType<{ haptics?: boolean; scrub?: boolean }>;
  };

  it('draws one tab per route, presses through, and scrubs', async () => {
    const state = makeTabState();
    await render(
      <GestureHandlerRootView>
        <TabBarStateProvider value={state}>
          <ScrubPill haptics={false} />
        </TabBarStateProvider>
      </GestureHandlerRootView>,
    );
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(3);
    expect(tabs[0]?.props.accessibilityState).toMatchObject({ selected: true });
    await act(async () => {
      await fireEvent.press(tabs[1] as never);
    });
    expect(state.tabs[1]?.press).toHaveBeenCalledTimes(1);
    // Host measuring is a no-op under Jest, so a slide finds no frames and chooses nothing.
    await slide([50, 150]);
    expect(state.tabs[1]?.press).toHaveBeenCalledTimes(1);
  });
});
