/**
 * Companions and the toast inset (docs/designs/bottom-components.md, Companions and Toast
 * inset): TabBarCompanion placement, visibility, collisions and peek riding; useTabBarInset
 * with the keyboard, a rail, a covered navigator and an open sheet; the one-navigator rule
 * and the override warning.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { type ReactNode, useState } from 'react';
import { Keyboard, Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useAdapterBridge } from '../adapter-bridge';
import { companionFrame, companionLift } from '../companions';
import {
  TabBarCompanion,
  type TabBarCompanionProps,
  TabBarProvider,
  type TabBarRootProps,
  type TabBarState,
  TabBarStateProvider,
  TabPanel,
  type TabPanelControls,
  useTabBarInset,
  useTabPanel,
} from '../index';
import { useOverrideSlot } from '../override';
import { type TabBarStore, useTabBarProvider } from '../provider';
import * as stateModule from '../state';
import { closest, layoutFrame, makeTabState, TestBar } from './fixtures';

// makeTabState: bottom inset 34. A floating bar sits 12 pt above it.
const GAP = 34 + 12;
const BAR = 64;

const controls: Record<string, TabPanelControls> = {};
function Controls({ id }: { id: string }) {
  controls[id] = useTabPanel(id);
  return null;
}

let store: TabBarStore | null = null;
function GrabStore() {
  store = useTabBarProvider()?.store ?? null;
  return null;
}

const insets: number[] = [];
function InsetReader() {
  const inset = useTabBarInset();
  insets.push(inset);
  return <Text>{`inset ${inset}`}</Text>;
}
const lastInset = () => insets.at(-1);

function Companion({ label, ...props }: Partial<TabBarCompanionProps> & { label: string }) {
  return (
    <TabBarCompanion position="above-end" {...props}>
      <Text>{label}</Text>
    </TabBarCompanion>
  );
}

function App({
  state = makeTabState(),
  placement = 'floating',
  provider = true,
  bar = true,
  children,
}: {
  state?: TabBarState;
  placement?: TabBarRootProps['placement'];
  provider?: boolean;
  bar?: boolean;
  children?: ReactNode;
}) {
  const body = (
    <>
      {children}
      <InsetReader />
      {bar ? (
        <TabBarStateProvider value={state}>
          <TestBar placement={placement} />
        </TabBarStateProvider>
      ) : null}
    </>
  );
  return (
    <GestureHandlerRootView>
      {provider ? (
        <TabBarProvider>
          <GrabStore />
          {body}
        </TabBarProvider>
      ) : (
        body
      )}
    </GestureHandlerRootView>
  );
}

let setViews: (views: number) => void = () => {};
/** A screen whose companion re-renders on its own state. */
function Views() {
  const [views, set] = useState(12);
  setViews = set;
  return <Companion label={`${views} views`} />;
}

function Navigator() {
  useAdapterBridge({ index: 0, routes: [{ key: 'a', name: 'a' }] }, () => true);
  return null;
}

function Override({ on }: { on: boolean }) {
  useOverrideSlot(on ? <Text>tray</Text> : null, true);
  return null;
}

/** Lays out the root and, for a floating bar, its box (the pill). */
async function layout(placement: TabBarRootProps['placement'] = 'floating', height = BAR) {
  const root = screen.getByTestId('bar');
  await act(async () => {
    await fireEvent(root, 'layout', layoutFrame(0, 0, 390, height));
  });
  if (placement === 'floating') {
    const box = root.children.find(
      (c) => typeof c !== 'string' && typeof c.props.onLayout === 'function',
    );
    // Without a provider the bar box doesn't report its frame.
    if (!box || typeof box === 'string') return;
    await act(async () => {
      await fireEvent(box, 'layout', layoutFrame(45, 0, 300, height));
    });
  }
}

/** The companion's own box (the view the layer positions), found from its text. */
const companionBox = (label: string) =>
  closest(
    screen.getByText(label, { includeHiddenElements: true }),
    (props) => typeof props.onLayout === 'function',
  );

async function layoutCompanion(label: string, height: number) {
  const box = companionBox(label);
  if (!box) throw new Error(`no box for ${label}`);
  await act(async () => {
    await fireEvent(box, 'layout', layoutFrame(0, 0, 48, height));
  });
}

/** Captures keyboard listeners, so a test can show and hide the keyboard. */
function mockKeyboard() {
  const listeners = new Map<string, Set<() => void>>();
  const spy = jest.spyOn(Keyboard, 'addListener').mockImplementation(((
    event: string,
    callback: () => void,
  ) => {
    const set = listeners.get(event) ?? new Set();
    set.add(callback);
    listeners.set(event, set);
    return { remove: () => set.delete(callback) };
  }) as never);
  const emit = (event: string) => {
    for (const callback of listeners.get(event) ?? []) callback();
  };
  return {
    show: () => act(async () => emit('keyboardWillShow')),
    hide: () => act(async () => emit('keyboardWillHide')),
    restore: () => spy.mockRestore(),
  };
}

beforeEach(() => {
  for (const key of Object.keys(controls)) delete controls[key];
  insets.length = 0;
  store = null;
});

describe('companionFrame', () => {
  it('places above-positions over the bar box, lined up with an edge or centred', () => {
    expect(companionFrame('above', 8, 0)).toMatchObject({
      position: 'absolute',
      bottom: '100%',
      left: 0,
      right: 0,
      alignItems: 'center',
      paddingBottom: 8,
    });
    expect(companionFrame('above-start', 8, 0)).toMatchObject({ start: 0, paddingBottom: 8 });
    expect(companionFrame('above-end', 12, 4)).toMatchObject({ end: 4, paddingBottom: 12 });
  });

  it('places start and end beside the bar, vertically centred', () => {
    expect(companionFrame('start', 8, 0)).toMatchObject({
      end: '100%',
      top: 0,
      bottom: 0,
      justifyContent: 'center',
      paddingEnd: 8,
    });
    expect(companionFrame('end', 8, 0)).toMatchObject({ start: '100%', paddingStart: 8 });
  });

  it('uses start and end, never left and right, for one-sided positions (right-to-left)', () => {
    // React Native mirrors `start` and `end` in a right-to-left layout; `left` and `right`
    // would stay put.
    for (const position of ['above-start', 'above-end', 'start', 'end'] as const) {
      const frame = companionFrame(position, 8, 0);
      expect(frame).not.toHaveProperty('left');
      expect(frame).not.toHaveProperty('right');
    }
  });
});

describe('companionLift', () => {
  it('rises by the part of a peeking panel above the bar’s top edge', () => {
    expect(companionLift(64, 16)).toBe(48);
    expect(companionLift(10, 16)).toBe(0);
    expect(companionLift(0, 0)).toBe(0);
  });
});

describe('TabBarCompanion', () => {
  it('draws its content inside the bar box', async () => {
    await render(
      <App>
        <Companion label="Locate" />
      </App>,
    );
    await layout();
    const box = companionBox('Locate');
    expect(box?.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ end: 0, bottom: '100%' })]),
    );
    // Inside the bar root.
    expect(closest(box, (props) => props.testID === 'bar')).not.toBeNull();
  });

  it('renders nothing without a provider', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await render(
      <App provider={false}>
        <Companion label="Locate" />
      </App>,
    );
    expect(screen.queryByText('Locate', { includeHiddenElements: true })).toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('<TabBarCompanion> needs'));
    warn.mockRestore();
  });

  it("doesn't draw start or end under a docked bar, and warns", async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await render(
      <App placement="docked">
        <Companion label="Beside" position="start" />
        <Companion label="Over" position="above-start" />
      </App>,
    );
    await layout('docked');
    expect(screen.queryByText('Beside', { includeHiddenElements: true })).toBeNull();
    expect(screen.getByText('Over')).toBeTruthy();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('<TabBarCompanion position="start"> isn\'t drawn under a docked bar'),
    );
    warn.mockRestore();
  });

  it('hides a companion that isn’t visible, from touches and screen readers', async () => {
    const view = await render(
      <App>
        <Companion label="Locate" visible={false} />
      </App>,
    );
    expect(screen.queryByText('Locate')).toBeNull();
    expect(companionBox('Locate')?.props.pointerEvents).toBe('none');
    await view.rerender(
      <App>
        <Companion label="Locate" visible />
      </App>,
    );
    expect(screen.getByText('Locate')).toBeTruthy();
    expect(companionBox('Locate')?.props.pointerEvents).toBe('box-none');
  });

  it('keeps two declarations at one position, and warns only while both are visible', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const view = await render(
      <App>
        <Companion label="Map button" position="above-start" visible />
        <Companion label="Search pill" position="above-start" visible={false} />
      </App>,
    );
    // Both are drawn (each crossfades on its own), only one is reachable.
    expect(companionBox('Map button')).not.toBeNull();
    expect(companionBox('Search pill')).not.toBeNull();
    expect(screen.getByText('Map button')).toBeTruthy();
    expect(screen.queryByText('Search pill')).toBeNull();
    expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('are visible at once'));

    // Switching tabs: one fades out as the other fades in.
    await view.rerender(
      <App>
        <Companion label="Map button" position="above-start" visible={false} />
        <Companion label="Search pill" position="above-start" visible />
      </App>,
    );
    expect(screen.queryByText('Map button')).toBeNull();
    expect(screen.getByText('Search pill')).toBeTruthy();
    expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('are visible at once'));

    await view.rerender(
      <App>
        <Companion label="Map button" position="above-start" visible />
        <Companion label="Search pill" position="above-start" visible />
      </App>,
    );
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('two <TabBarCompanion position="above-start"> are visible at once'),
    );
    warn.mockRestore();
  });

  it('fades out while a panel is open at any height, a sheet’s lowest included', async () => {
    await render(
      <App>
        <Companion label="Locate" />
        <TabPanel id="sheet" snapPoints={[200, '100%']}>
          <Text>sheet body</Text>
        </TabPanel>
        <Controls id="sheet" />
      </App>,
    );
    await layout();
    expect(screen.getByText('Locate')).toBeTruthy();
    await act(async () => controls.sheet?.open());
    expect(controls.sheet?.snap).toBe(0);
    expect(screen.queryByText('Locate')).toBeNull();
    await act(async () => controls.sheet?.hide());
    expect(screen.getByText('Locate')).toBeTruthy();
  });

  it("doesn't change the reported height", async () => {
    const state = makeTabState();
    await render(
      <App state={state}>
        <Companion label="Locate" />
      </App>,
    );
    await layout();
    await layoutCompanion('Locate', 56);
    expect(state.reportHeight).toHaveBeenLastCalledWith(BAR + GAP);
  });

  it('re-renders only the companion layer when a screen re-renders its companion', async () => {
    await render(
      <App>
        <Views />
      </App>,
    );
    await layout();
    await layoutCompanion('12 views', 40);
    const spy = jest.spyOn(stateModule, 'useTabBar');
    await act(async () => setViews(13));
    expect(screen.getByText('13 views')).toBeTruthy();
    // TabBarRoot, the design and its tabs all read useTabBar(); none of them re-rendered.
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('useTabBarInset', () => {
  it('is 0 without a provider', async () => {
    await render(<App provider={false} />);
    await layout();
    expect(lastInset()).toBe(0);
  });

  it('is the reported height plus the tallest visible companion above the bar', async () => {
    const view = await render(
      <App>
        <Companion label="Locate" />
        <Companion label="Beside" position="end" />
      </App>,
    );
    await layout();
    expect(lastInset()).toBe(BAR + GAP);
    // The companion's box includes its gap (paddingBottom); companions beside the bar don't count.
    await layoutCompanion('Locate', 56);
    await layoutCompanion('Beside', 300);
    expect(lastInset()).toBe(BAR + GAP + 56);
    await view.rerender(
      <App>
        <Companion label="Locate" visible={false} />
        <Companion label="Beside" position="end" />
      </App>,
    );
    expect(lastInset()).toBe(BAR + GAP);
  });

  it('counts a peeking panel, but not an open sheet', async () => {
    await render(
      <App>
        <TabPanel id="player" peekHeight={60}>
          <Text>player</Text>
        </TabPanel>
        <TabPanel id="sheet" snapPoints={['50%', '100%']}>
          <Text>sheet body</Text>
        </TabPanel>
        <Controls id="player" />
        <Controls id="sheet" />
      </App>,
    );
    await layout();
    await act(async () => controls.player?.peek());
    expect(lastInset()).toBe(BAR + GAP + 60);
    await act(async () => controls.player?.hide());
    expect(lastInset()).toBe(BAR + GAP);
    // An open sheet overlays the screen: toasts may draw over it, at any height.
    await act(async () => controls.sheet?.open());
    expect(controls.sheet?.state).toBe('open');
    expect(lastInset()).toBe(BAR + GAP);
    await act(async () => controls.sheet?.snapTo(1));
    expect(lastInset()).toBe(BAR + GAP);
  });

  it.each([
    ['without', false],
    ['with', true],
  ])('is 0 while the keyboard is up, %s tabBarHideOnKeyboard', async (_name, hide) => {
    const keyboard = mockKeyboard();
    const state = makeTabState({ hideOnKeyboard: hide });
    await render(<App state={state} />);
    await layout();
    expect(lastInset()).toBe(BAR + GAP);
    await keyboard.show();
    expect(lastInset()).toBe(0);
    // The bar itself hides only when the screen asks for it.
    expect(screen.getByTestId('bar').props.pointerEvents).toBe(hide ? 'none' : 'box-none');
    await keyboard.hide();
    expect(lastInset()).toBe(BAR + GAP);
    keyboard.restore();
  });

  it('is 0 for a rail', async () => {
    await render(<App placement="rail" state={makeTabState({ position: 'left' })} />);
    await layout('rail');
    expect(lastInset()).toBe(0);
  });

  it('is 0 while the tab navigator is covered by a pushed screen or a modal', async () => {
    await render(<App />);
    await layout();
    expect(lastInset()).toBe(BAR + GAP);
    await act(async () => store?.setNavigatorFocused(false));
    expect(lastInset()).toBe(0);
    await act(async () => store?.setNavigatorFocused(true));
    expect(lastInset()).toBe(BAR + GAP);
  });

  it('drops to 0 when the bar unmounts', async () => {
    const view = await render(<App />);
    await layout();
    expect(lastInset()).toBe(BAR + GAP);
    await view.rerender(<App bar={false} />);
    expect(lastInset()).toBe(0);
  });
});

describe('one tab navigator per provider', () => {
  it('warns when a second tab navigator attaches', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const view = await render(
      <TabBarProvider>
        <Navigator />
      </TabBarProvider>,
    );
    expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('more than one tab navigator'));
    await view.rerender(
      <TabBarProvider>
        <Navigator />
        <Navigator />
      </TabBarProvider>,
    );
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('more than one tab navigator'));
    warn.mockRestore();
  });
});

describe('overrides from outside the tab navigator', () => {
  const message = 'useTabBarOverride() was called from a screen outside the tab navigator';

  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it("doesn't warn when focus settles within a moment (returning from a modal)", async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const view = await render(
      <TabBarProvider>
        <GrabStore />
        <Override on={false} />
      </TabBarProvider>,
    );
    await act(async () => store?.setNavigatorFocused(false));
    // The tab screen focuses first, then the navigator.
    await view.rerender(
      <TabBarProvider>
        <GrabStore />
        <Override on />
      </TabBarProvider>,
    );
    await act(async () => store?.setNavigatorFocused(true));
    await act(async () => jest.advanceTimersByTime(1000));
    expect(warn).not.toHaveBeenCalledWith(expect.stringContaining(message));
    warn.mockRestore();
  });

  it('warns when an override is set while the tab navigator stays covered', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const view = await render(
      <TabBarProvider>
        <GrabStore />
        <Override on={false} />
      </TabBarProvider>,
    );
    await act(async () => store?.setNavigatorFocused(false));
    await view.rerender(
      <TabBarProvider>
        <GrabStore />
        <Override on />
      </TabBarProvider>,
    );
    await act(async () => jest.advanceTimersByTime(1000));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining(message));
    warn.mockRestore();
  });
});
