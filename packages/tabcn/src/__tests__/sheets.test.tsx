/**
 * Sheets (docs/designs/bottom-components.md, Sheets): TabPanel snapPoints, snap and snapTo,
 * sheet geometry under floating and docked bars, modality at the highest snap point,
 * multi-stop dragging and PanelScrollView.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Dimensions, StyleSheet, Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  createGestureController,
  getByGestureTestId,
} from 'react-native-gesture-handler/jest-utils';
import { type SharedValue, useSharedValue } from 'react-native-reanimated';

import { PanelDragArea, PanelScrollView } from '../gestures';
import {
  type SnapPoint,
  TabBarProvider,
  type TabBarRootProps,
  type TabBarState,
  TabBarStateProvider,
  TabPanel,
  type TabPanelControls,
  useTabPanel,
} from '../index';
import { resolveSheet, type SheetGeometry } from '../PanelLayer';
import { type TabBarProviderValue, useTabBarProvider } from '../provider';
import { settleStop } from '../sheet-math';
import {
  closest,
  flatStyle,
  layoutFrame,
  makeTabState,
  mockScreenReader,
  TestBar,
} from './fixtures';

const controls: Record<string, TabPanelControls> = {};
function Controls({ id }: { id: string }) {
  controls[id] = useTabPanel(id);
  return null;
}

let offset: SharedValue<number> | null = null;
function Body() {
  const scrolled = useSharedValue(0);
  offset = scrolled;
  return (
    <PanelScrollView scrollViewOffset={scrolled} contentContainerStyle={{ paddingBottom: 10 }}>
      <Text>sheet body</Text>
    </PanelScrollView>
  );
}

function Sheet({
  snapPoints = [300, '100%'],
  peekHeight,
}: {
  snapPoints?: readonly SnapPoint[];
  peekHeight?: number;
}) {
  return (
    <TabPanel id="sheet" snapPoints={snapPoints} peekHeight={peekHeight}>
      <PanelDragArea>
        <Text>sheet header</Text>
      </PanelDragArea>
      <Body />
    </TabPanel>
  );
}

function App({
  state = makeTabState(),
  placement = 'floating',
  minimizeBehavior,
  children,
}: {
  state?: TabBarState;
  placement?: TabBarRootProps['placement'];
  minimizeBehavior?: TabBarRootProps['minimizeBehavior'];
  children?: ReactNode;
}) {
  return (
    <GestureHandlerRootView>
      <TabBarProvider>
        {children}
        <Controls id="sheet" />
        <Text>screen body</Text>
        <TabBarStateProvider value={state}>
          <TestBar placement={placement} minimizeBehavior={minimizeBehavior} />
        </TabBarStateProvider>
      </TabBarProvider>
    </GestureHandlerRootView>
  );
}

const screenHeight = Dimensions.get('window').height;
// makeTabState: bottom inset 34, top 0. A floating bar sits 12 pt above the inset.
const GAP = 34 + 12;
const BAR = 83;

/** Lays out the root and, for a floating bar, its box (the pill). */
async function layout(placement: 'floating' | 'docked') {
  const root = screen.getByTestId('bar');
  await act(async () => {
    await fireEvent(root, 'layout', layoutFrame(0, 0, 390, BAR));
  });
  if (placement === 'floating') {
    const box = root.children.find(
      (c) => typeof c !== 'string' && typeof c.props.onLayout === 'function',
    );
    if (!box || typeof box === 'string') throw new Error('no bar box');
    await act(async () => {
      await fireEvent(box, 'layout', layoutFrame(45, 0, 300, BAR));
    });
  }
}

const sheetWindow = () =>
  closest(screen.getByText('sheet header', { includeHiddenElements: true }), (props) => {
    const style = props.style as { position?: string } | undefined;
    return style?.position === 'absolute' && 'top' in (style ?? {});
  });

beforeEach(() => {
  for (const key of Object.keys(controls)) delete controls[key];
});

describe('resolveSheet', () => {
  const floating: SheetGeometry = {
    width: 390,
    height: 83,
    left: 0,
    right: 0,
    roomAboveRoot: 700,
    belowRoot: 46,
    docked: false,
  };

  it('resolves points and percentages of the room above the anchor', () => {
    const sheet = resolveSheet(
      [200, '50%', '100%'],
      0,
      { x: 45, y: 0, width: 300, height: 83 },
      16,
      floating,
    );
    expect(sheet.snapVisible).toEqual([216, 366, 716]);
    // Full width of the root, not the pill.
    expect(sheet).toMatchObject({ left: 0, width: 390 });
    // Runs down to the screen's bottom edge: 83 - 16 behind the bar, then the 46 pt gap.
    expect(sheet.hiddenVisible).toBe(-113);
    expect(sheet.contentHeight).toBe(716 + 113);
    expect(sheet.top).toBe(16 - 716);
    expect(sheet.hiddenBottom).toBe(16 + 113);
  });

  it('clamps snap points to the room and the peek to the highest', () => {
    const sheet = resolveSheet([5000], 9000, { x: 0, y: 0, width: 300, height: 83 }, 16, floating);
    expect(sheet.snapVisible).toEqual([716]);
    expect(sheet.peekVisible).toBe(716);
  });

  it('ends at the bar’s top edge under a docked bar', () => {
    const sheet = resolveSheet(['100%'], 0, { x: 0, y: 0, width: 390, height: 83 }, 0, {
      ...floating,
      left: 10,
      right: 20,
      belowRoot: 0,
      docked: true,
    });
    expect(sheet).toMatchObject({ left: 10, width: 360, hiddenVisible: 0, hiddenBottom: 0 });
    expect(sheet.contentHeight).toBe(700);
    expect(sheet.top + sheet.contentHeight).toBe(0);
  });
});

describe('settleStop', () => {
  const stops = [-100, 300, 900];
  it('settles on the nearest stop', () => {
    expect(settleStop(stops, 350, 0)).toBe(1);
    expect(settleStop(stops, 650, 0)).toBe(2);
    expect(settleStop(stops, 50, 0)).toBe(0);
  });
  it('moves one stop in a flick’s direction', () => {
    expect(settleStop(stops, 310, -1200)).toBe(2);
    expect(settleStop(stops, 300, 1200)).toBe(0);
    expect(settleStop(stops, 890, 1200)).toBe(1);
    expect(settleStop(stops, 900, -1200)).toBe(2);
  });
});

describe('snap points', () => {
  it('open() goes to the lowest; snapTo moves between them (clamped); hide resets', async () => {
    await render(
      <App>
        <Sheet />
      </App>,
    );
    expect(controls.sheet).toMatchObject({ state: 'hidden', snap: -1 });
    await act(async () => controls.sheet?.open());
    expect(controls.sheet).toMatchObject({ state: 'open', snap: 0 });
    await act(async () => controls.sheet?.snapTo(1));
    expect(controls.sheet?.snap).toBe(1);
    await act(async () => controls.sheet?.snapTo(9));
    expect(controls.sheet?.snap).toBe(1);
    await act(async () => controls.sheet?.toggle());
    expect(controls.sheet).toMatchObject({ state: 'hidden', snap: -1 });
    await act(async () => controls.sheet?.snapTo(1));
    expect(controls.sheet).toMatchObject({ state: 'open', snap: 1 });
  });

  it('keeps snap at -1 for a panel without snap points', async () => {
    await render(
      <App>
        <TabPanel id="sheet">
          <Text>plain</Text>
        </TabPanel>
      </App>,
    );
    await act(async () => controls.sheet?.snapTo(1));
    expect(controls.sheet).toMatchObject({ state: 'open', snap: -1 });
  });

  it("doesn't change the reported height", async () => {
    const state = makeTabState();
    await render(
      <App state={state}>
        <Sheet />
      </App>,
    );
    await layout('floating');
    expect(state.reportHeight).toHaveBeenLastCalledWith(BAR + GAP);
    await act(async () => controls.sheet?.open());
    await act(async () => controls.sheet?.snapTo(1));
    expect(state.reportHeight).toHaveBeenLastCalledWith(BAR + GAP);
  });
});

describe('sheet geometry', () => {
  it('takes the full width under a floating bar and runs to the screen’s bottom edge', async () => {
    await render(
      <App>
        <Sheet />
      </App>,
    );
    await layout('floating');
    const room = screenHeight - GAP - BAR;
    const highest = room + 16;
    expect(flatStyle(sheetWindow())).toMatchObject({
      left: 0,
      width: 390,
      top: 16 - highest,
      height: highest + (BAR - 16) + GAP,
      overflow: 'hidden',
      opacity: 1,
    });
  });

  it('ends at the bar’s top edge under a docked bar', async () => {
    await render(
      <App placement="docked">
        <Sheet />
      </App>,
    );
    await layout('docked');
    const style = flatStyle(sheetWindow());
    expect(style.top).toBe(-(screenHeight - BAR));
    expect((style.top as number) + (style.height as number)).toBe(0);
  });

  it('pads the scroll view by the part that never shows', async () => {
    await render(
      <App>
        <Sheet />
      </App>,
    );
    await layout('floating');
    const scroll = closest(
      screen.getByText('sheet body', { includeHiddenElements: true }),
      (props) => props.contentContainerStyle !== undefined,
    );
    expect(StyleSheet.flatten(scroll?.props.contentContainerStyle)).toMatchObject({
      paddingBottom: 10 + 16 + (BAR - 16) + GAP,
    });
  });
});

describe('sheet modality', () => {
  it('is modal only at its highest snap point', async () => {
    await render(
      <App>
        <Sheet />
      </App>,
    );
    await layout('floating');
    await act(async () => controls.sheet?.open());
    // Lower down, the screen and the tabs stay readable and the sheet is not modal.
    expect(screen.getByTestId('bar').props.accessibilityViewIsModal).toBe(false);
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(screen.getByText('screen body')).toBeTruthy();
    expect(sheetWindow()?.props.accessibilityViewIsModal).toBe(false);
    expect(screen.getByText('sheet header')).toBeTruthy();

    await act(async () => controls.sheet?.snapTo(1));
    expect(screen.getByTestId('bar').props.accessibilityViewIsModal).toBe(true);
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
    expect(screen.queryByText('screen body')).toBeNull();
    expect(sheetWindow()?.props.accessibilityViewIsModal).toBe(true);
  });
});

describe('a sheet over a peeking panel', () => {
  it('covers the peek while open and gives it back, with its reserved height, when it rests', async () => {
    const state = makeTabState();
    await render(
      <App state={state}>
        <Sheet />
        <TabPanel id="player" peekHeight={64}>
          <Text>player strip</Text>
        </TabPanel>
        <Controls id="player" />
      </App>,
    );
    await layout('floating');
    await act(async () => controls.player?.peek());
    expect(state.reportHeight).toHaveBeenLastCalledWith(BAR + GAP + 64);
    expect(screen.getByText('player strip')).toBeTruthy();

    await act(async () => controls.sheet?.open());
    // The player keeps its peek and its reserved height, so screens don't move, but it is
    // drawn behind the bar and hidden from screen readers while the sheet covers it.
    expect(controls.player?.state).toBe('peek');
    expect(state.reportHeight).toHaveBeenLastCalledWith(BAR + GAP + 64);
    expect(screen.queryByText('player strip')).toBeNull();
    expect(screen.getByText('player strip', { includeHiddenElements: true })).toBeTruthy();
    await act(async () => controls.sheet?.snapTo(1));
    expect(controls.player?.state).toBe('peek');

    await act(async () => controls.sheet?.hide());
    expect(controls.player?.state).toBe('peek');
    expect(screen.getByText('player strip')).toBeTruthy();
    expect(state.reportHeight).toHaveBeenLastCalledWith(BAR + GAP + 64);
  });
});

let grabbed: TabBarProviderValue | null = null;
function Grab() {
  grabbed = useTabBarProvider();
  return null;
}

describe('a minimizing bar', () => {
  it('keeps a sheet’s heights while the bar animates, applying only the settled size', async () => {
    const state = makeTabState();
    await render(
      <App state={state} minimizeBehavior="onScrollDown">
        <Grab />
        <Sheet />
      </App>,
    );
    await layout('floating');
    await act(async () => controls.sheet?.open());
    const before = flatStyle(sheetWindow());
    // A minimize is in flight: the design lays the bar out smaller on every frame.
    const minimize = grabbed?.minimize;
    if (!minimize) throw new Error('no provider');
    minimize.target.value = 1;
    for (const height of [80, 70, 60]) {
      await act(async () => {
        await fireEvent(screen.getByTestId('bar'), 'layout', layoutFrame(0, 0, 390, height));
      });
    }
    expect(flatStyle(sheetWindow())).toEqual(before);
    expect(state.reportHeight).toHaveBeenLastCalledWith(BAR + GAP);
    minimize.target.value = 0;
  });
});

describe('screen readers', () => {
  it('opens a sheet only to its highest snap point while a screen reader is on', async () => {
    const reader = mockScreenReader(true);
    await render(
      <App>
        <Sheet />
      </App>,
    );
    await layout('floating');
    await act(async () => controls.sheet?.open());
    expect(controls.sheet).toMatchObject({ state: 'open', snap: 1 });
    await act(async () => controls.sheet?.snapTo(0));
    expect(controls.sheet?.snap).toBe(1);
    // At the highest stop it's modal, so nothing a screen reader reaches is off-screen.
    expect(sheetWindow()?.props.accessibilityViewIsModal).toBe(true);
    await act(async () => controls.sheet?.toggle());
    expect(controls.sheet).toMatchObject({ state: 'hidden', snap: -1 });
    reader.restore();
  });

  it('moves a sheet open lower down to its highest when a screen reader turns on', async () => {
    const reader = mockScreenReader(false);
    await render(
      <App>
        <Sheet />
      </App>,
    );
    await layout('floating');
    await act(async () => controls.sheet?.open());
    expect(controls.sheet?.snap).toBe(0);
    await reader.change(true);
    expect(controls.sheet?.snap).toBe(1);
    // Off again: every stop is reachable once more.
    await reader.change(false);
    await act(async () => controls.sheet?.snapTo(0));
    expect(controls.sheet?.snap).toBe(0);
    reader.restore();
  });

  it('glides a sheet dragged lower back to its highest snap point', async () => {
    const reader = mockScreenReader(true);
    await render(
      <App>
        <Grab />
        <Sheet />
      </App>,
    );
    await layout('floating');
    await act(async () => controls.sheet?.open());
    const handle = grabbed?.store.getHandle('sheet');
    if (!handle) throw new Error('no drag handle');
    const [, lower = 0, highest = 0] = handle.stops.value;
    expect(handle.visible.value).toBe(highest);
    // Let go right on the lower stop: the store keeps the sheet at its highest, and so must
    // the sheet itself, or content would sit off-screen where a screen reader still reaches it.
    const pan = createGestureController(getByGestureTestId('tabcn-drag-sheet'));
    await act(async () => {
      pan.begin();
      pan.activate();
      pan.update({ translationY: highest - lower });
      pan.end({ translationY: highest - lower, velocityY: 0 });
    });
    expect(controls.sheet).toMatchObject({ state: 'open', snap: 1 });
    expect(handle.visible.value).toBe(highest);
    expect(sheetWindow()?.props.accessibilityViewIsModal).toBe(true);
    reader.restore();
  });
});

describe('snap points on a named anchor', () => {
  it('are ignored, with a development warning naming the panel', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await render(
      <App>
        <TabPanel id="sheet" anchor={{ name: 'action' }} snapPoints={[200, '100%']}>
          <Text>anchored</Text>
        </TabPanel>
      </App>,
    );
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('<TabPanel id="sheet"> has snapPoints but is anchored to "action"'),
    );
    // A plain panel: open has no snap index.
    await act(async () => controls.sheet?.open());
    expect(controls.sheet).toMatchObject({ state: 'open', snap: -1 });
    warn.mockRestore();
  });
});

describe('dragging a sheet', () => {
  it('settles on the nearest stop, flicks one stop, and slides away below the lowest', async () => {
    await render(
      <App>
        <Sheet />
      </App>,
    );
    await layout('floating');
    await act(async () => controls.sheet?.open());
    const pan = createGestureController(getByGestureTestId('tabcn-drag-sheet'));
    await act(async () => {
      pan.begin();
      pan.activate();
      pan.update({ translationY: -100 });
      pan.end({ translationY: -100, velocityY: 0 });
    });
    expect(controls.sheet?.snap).toBe(0);
    await act(async () => {
      pan.begin();
      pan.activate();
      pan.update({ translationY: -60 });
      pan.end({ translationY: -60, velocityY: -1500 });
    });
    expect(controls.sheet?.snap).toBe(1);
    await act(async () => {
      pan.begin();
      pan.activate();
      pan.update({ translationY: 5000 });
      pan.end({ translationY: 5000, velocityY: 0 });
    });
    expect(controls.sheet?.state).toBe('hidden');
  });

  it('returns to its peek, not hidden, when it has one', async () => {
    await render(
      <App>
        <Sheet peekHeight={60} />
      </App>,
    );
    await layout('floating');
    await act(async () => controls.sheet?.open());
    const pan = createGestureController(getByGestureTestId('tabcn-drag-sheet'));
    await act(async () => {
      pan.begin();
      pan.activate();
      pan.update({ translationY: 5000 });
      pan.end({ translationY: 5000, velocityY: 0 });
    });
    expect(controls.sheet?.state).toBe('peek');
  });
});

describe('PanelScrollView', () => {
  it('moves the sheet below its top; at the top only a downward drag from the content’s top', async () => {
    await render(
      <App>
        <Sheet />
      </App>,
    );
    await layout('floating');
    await act(async () => controls.sheet?.open());
    const pan = createGestureController(getByGestureTestId('tabcn-scroll-sheet'));
    // Below the top, an upward drag moves the sheet.
    await act(async () => {
      pan.begin();
      pan.activate();
      pan.update({ translationY: -10 });
      pan.update({ translationY: -200 });
      pan.end({ translationY: -200, velocityY: -1500 });
    });
    expect(controls.sheet?.snap).toBe(1);

    // At the top with the content scrolled down, a downward drag scrolls the content.
    if (offset) offset.value = 120;
    await act(async () => {
      pan.begin();
      pan.activate();
      pan.update({ translationY: 10 });
      pan.update({ translationY: 600 });
      pan.end({ translationY: 600, velocityY: 1500 });
    });
    expect(controls.sheet?.snap).toBe(1);

    // At the content's top, the same drag moves the sheet down a stop.
    if (offset) offset.value = 0;
    await act(async () => {
      pan.begin();
      pan.activate();
      pan.update({ translationY: 10 });
      pan.update({ translationY: 100 });
      pan.end({ translationY: 100, velocityY: 1500 });
    });
    expect(controls.sheet?.snap).toBe(0);
  });
});
