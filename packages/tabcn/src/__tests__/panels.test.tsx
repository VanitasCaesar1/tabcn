/**
 * Panels (docs/designs/panels.md): TabBarProvider, TabPanel, useTabPanel, usePanelAnchor,
 * the panel layer inside TabBarRoot, height reporting, accessibility and tabcn/gestures.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { type ReactNode, useEffect } from 'react';
import { AccessibilityInfo, BackHandler, Platform, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  createGestureController,
  getByGestureTestId,
} from 'react-native-gesture-handler/jest-utils';
import { PanelDragArea } from '../gestures';
import {
  type PanelAnchor,
  type PanelState,
  TabBarProvider,
  TabBarRoot,
  type TabBarState,
  TabBarStateProvider,
  TabButton,
  TabList,
  TabPanel,
  type TabPanelControls,
  usePanelAnchor,
  useTabBar,
  useTabPanel,
} from '../index';
import { useOverrideSlot } from '../override';
import { closest, flatStyle, layoutEvent, layoutFrame, makeTabState, TestBar } from './fixtures';

const controls: Record<string, TabPanelControls> = {};

function Controls({ id }: { id: string }) {
  const panel = useTabPanel(id);
  controls[id] = panel;
  return <Text>{`${id}: ${panel.state}`}</Text>;
}

interface PanelSpec {
  id: string;
  anchor?: PanelAnchor;
  peekHeight?: number;
  initialState?: PanelState;
}

function App({
  state,
  panels = [],
  bar = <TestBar />,
  provider = true,
  children,
}: {
  state: TabBarState;
  panels?: PanelSpec[];
  bar?: ReactNode;
  provider?: boolean;
  children?: ReactNode;
}) {
  const body = (
    <>
      {panels.map((p) => (
        <TabPanel key={p.id} {...p}>
          <Text>{`${p.id} content`}</Text>
        </TabPanel>
      ))}
      {panels.map((p) => (
        <Controls key={p.id} id={p.id} />
      ))}
      {children}
      <TabBarStateProvider value={state}>{bar}</TabBarStateProvider>
    </>
  );
  return provider ? <TabBarProvider>{body}</TabBarProvider> : body;
}

/** Where the + button sits relative to TabBarRoot, as the device would measure it. */
let plusFrame = { x: 300, y: 10, width: 56, height: 56 };

/** A bar with an action button marked as the `action` anchor. */
function BarWithAction() {
  const anchor = usePanelAnchor('action');
  return (
    <TabBarRoot placement="docked" testID="bar">
      <TabList />
      <View
        testID="plus"
        accessibilityState={anchor.accessibilityState}
        onLayout={anchor.onLayout}
        ref={(node) => {
          if (node) {
            // Host measureLayout is a no-op under Jest; report a frame like the device would.
            (node as unknown as { measureLayout: unknown }).measureLayout = (
              _relativeTo: unknown,
              onSuccess: (x: number, y: number, w: number, h: number) => void,
            ) => onSuccess(plusFrame.x, plusFrame.y, plusFrame.width, plusFrame.height);
          }
          anchor.ref(node);
        }}
      />
    </TabBarRoot>
  );
}

/** A bar panel whose content is a drag handle. */
function Player() {
  return (
    <TabPanel id="player" peekHeight={64}>
      <PanelDragArea panel="player">
        <Text>player content</Text>
      </PanelDragArea>
    </TabPanel>
  );
}

function Details({ label }: { label: string }) {
  return (
    <TabPanel id="details" peekHeight={40} initialState="peek">
      <Text>{label}</Text>
    </TabPanel>
  );
}

let mounts = 0;
let unmounts = 0;
function TrayContent() {
  useEffect(() => {
    mounts += 1;
    return () => {
      unmounts += 1;
    };
  }, []);
  return <Text>tray</Text>;
}

/** A screen that sets the override slot as if focused. */
function OverrideScreen({ on }: { on: boolean }) {
  useOverrideSlot(on ? <TrayContent /> : null, true);
  return null;
}

/** The absolutely positioned window a panel is drawn in. */
const panelWindow = (id: string) =>
  closest(screen.getByText(`${id} content`, { includeHiddenElements: true }), (props) => {
    const style = props.style as { position?: string } | undefined;
    return style?.position === 'absolute' && 'top' in (style ?? {});
  });

async function layoutBar(height = 83, width = 390) {
  await act(async () => {
    await fireEvent(screen.getByTestId('bar'), 'layout', layoutFrame(0, 0, width, height));
  });
}

async function layoutPanel(id: string, height: number) {
  const text = screen.getByText(`${id} content`, { includeHiddenElements: true });
  const content = closest(text, (props) => typeof props.onLayout === 'function');
  if (!content) throw new Error(`no measured content view for ${id}`);
  await act(async () => {
    await fireEvent(content, 'layout', layoutEvent(height));
  });
}

beforeEach(() => {
  for (const key of Object.keys(controls)) delete controls[key];
  plusFrame = { x: 300, y: 10, width: 56, height: 56 };
});

describe('panels without a provider (CUJ 4)', () => {
  it('renders the bar exactly as before and reports its own height', async () => {
    const state = makeTabState();
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await render(<App state={state} provider={false} panels={[{ id: 'player' }]} />);
    await layoutBar(83);
    expect(state.reportHeight).toHaveBeenLastCalledWith(83);
    // No panel layer, no wrapper: the root's only child is the design's TabList.
    const root = screen.getByTestId('bar');
    expect(root.children).toHaveLength(1);
    expect(screen.getByTestId('bar').children[0]).toBe(
      closest(screen.getAllByRole('tab')[0] ?? null, (p) => p.role === 'tablist'),
    );
    expect(screen.queryByText('player content', { includeHiddenElements: true })).toBeNull();
    expect(controls.player?.state).toBe('hidden');
    await act(async () => controls.player?.open());
    expect(controls.player?.state).toBe('hidden');
    warn.mockRestore();
  });
});

describe('TabPanel', () => {
  it('draws its content inside the bar root, before the bar', async () => {
    await render(<App state={makeTabState()} panels={[{ id: 'player', peekHeight: 64 }]} />);
    const root = screen.getByTestId('bar');
    const content = screen.getByText('player content', { includeHiddenElements: true });
    expect(closest(content, (p) => p.testID === 'bar')).toBe(root);
    const order = JSON.stringify(screen.toJSON());
    expect(order.indexOf('player content')).toBeLessThan(order.indexOf('"tablist"'));
  });

  it('peek, open and hide update state; only one panel is open at a time', async () => {
    await render(
      <App
        state={makeTabState()}
        panels={[
          { id: 'player', peekHeight: 64 },
          { id: 'create', anchor: { name: 'action' } },
        ]}
      />,
    );
    expect(controls.player?.state).toBe('hidden');
    await act(async () => controls.player?.peek());
    expect(controls.player?.state).toBe('peek');
    await act(async () => controls.player?.open());
    expect(controls.player?.state).toBe('open');
    // Opening another panel returns the open one to its resting state (its peek).
    await act(async () => controls.create?.open());
    expect(controls.create?.state).toBe('open');
    expect(controls.player?.state).toBe('peek');
    await act(async () => controls.create?.toggle());
    expect(controls.create?.state).toBe('hidden');
    await act(async () => controls.player?.hide());
    expect(controls.player?.state).toBe('hidden');
  });

  it('starts in initialState', async () => {
    await render(
      <App
        state={makeTabState()}
        panels={[{ id: 'player', peekHeight: 64, initialState: 'peek' }]}
      />,
    );
    expect(controls.player?.state).toBe('peek');
  });

  it('shows one visible panel per anchor: a second bar panel that peeks hides the first', async () => {
    await render(
      <App
        state={makeTabState()}
        panels={[
          { id: 'player', peekHeight: 64 },
          { id: 'upload', peekHeight: 40 },
          { id: 'create', anchor: { name: 'action' }, peekHeight: 20 },
        ]}
      />,
    );
    await act(async () => controls.player?.peek());
    await act(async () => controls.create?.peek());
    expect(controls.player?.state).toBe('peek');
    await act(async () => controls.upload?.peek());
    expect(controls.upload?.state).toBe('peek');
    expect(controls.player?.state).toBe('hidden');
    // A different anchor keeps its own visible panel.
    expect(controls.create?.state).toBe('peek');
  });

  it('reports bar + peek height while peeking or open, and the bar alone when hidden', async () => {
    const state = makeTabState();
    await render(<App state={state} panels={[{ id: 'player', peekHeight: 64 }]} />);
    await layoutBar(83);
    expect(state.reportHeight).toHaveBeenLastCalledWith(83);
    await act(async () => controls.player?.peek());
    expect(state.reportHeight).toHaveBeenLastCalledWith(83 + 64);
    await act(async () => controls.player?.open());
    expect(state.reportHeight).toHaveBeenLastCalledWith(83 + 64);
    await act(async () => controls.player?.hide());
    expect(state.reportHeight).toHaveBeenLastCalledWith(83);
  });

  it('places a bar panel over the bar, its bottom edge behind the bar', async () => {
    await render(<App state={makeTabState()} panels={[{ id: 'player', peekHeight: 64 }]} />);
    await layoutBar(83, 390);
    await layoutPanel('player', 300);
    const style = flatStyle(panelWindow('player'));
    expect(style).toMatchObject({ left: 0, width: 390, top: -300, opacity: 1 });
  });

  it('places a { name } panel at the anchor element measured against TabBarRoot', async () => {
    await render(
      <App
        state={makeTabState()}
        bar={<BarWithAction />}
        panels={[{ id: 'create', anchor: { name: 'action' } }]}
      />,
    );
    await layoutBar(83, 390);
    await act(async () => {
      await fireEvent(screen.getByTestId('plus'), 'layout', layoutFrame(300, 10, 56, 56));
    });
    await layoutPanel('create', 200);
    expect(flatStyle(panelWindow('create'))).toMatchObject({ left: 300, width: 56, top: 10 - 200 });

    // The anchor reads as expanded while its panel is open.
    expect(screen.getByTestId('plus').props.accessibilityState).toEqual({ expanded: false });
    await act(async () => controls.create?.open());
    // (The open panel is modal, so the bar's own elements are hidden from screen readers.)
    expect(
      screen.getByTestId('plus', { includeHiddenElements: true }).props.accessibilityState,
    ).toEqual({ expanded: true });
  });

  it('leaves expanded out of the anchor while no panel is anchored to it', async () => {
    await render(
      <App state={makeTabState()} bar={<BarWithAction />} panels={[{ id: 'player' }]} />,
    );
    // A bar panel is registered, but none is anchored to 'action'.
    expect(screen.getByTestId('plus').props.accessibilityState?.expanded).toBeUndefined();
    await screen.rerender(
      <App
        state={makeTabState()}
        bar={<BarWithAction />}
        panels={[{ id: 'player' }, { id: 'create', anchor: { name: 'action' } }]}
      />,
    );
    expect(screen.getByTestId('plus').props.accessibilityState?.expanded).toBe(false);
  });

  it('removes the panel when the declaring TabPanel unmounts', async () => {
    const state = makeTabState();
    const { rerender } = await render(
      <App state={state} panels={[{ id: 'player', peekHeight: 64, initialState: 'peek' }]} />,
    );
    await layoutBar(83);
    await layoutPanel('player', 120);
    expect(state.reportHeight).toHaveBeenLastCalledWith(83 + 64);
    await rerender(<App state={state} panels={[]} />);
    expect(screen.queryByText('player content', { includeHiddenElements: true })).toBeNull();
    expect(state.reportHeight).toHaveBeenLastCalledWith(83);
  });
});

describe('panel accessibility', () => {
  it('makes an open panel modal; escape returns it to rest', async () => {
    await render(<App state={makeTabState()} panels={[{ id: 'player', peekHeight: 64 }]} />);
    await layoutBar();
    await layoutPanel('player', 200);
    expect(panelWindow('player')?.props.accessibilityElementsHidden).toBe(true);
    await act(async () => controls.player?.open());
    const open = panelWindow('player');
    expect(open?.props.accessibilityViewIsModal).toBe(true);
    expect(open?.props.accessibilityElementsHidden).toBe(false);
    const onEscape = open?.props.onAccessibilityEscape as (() => void) | undefined;
    await act(async () => onEscape?.());
    expect(controls.player?.state).toBe('peek');
  });

  it('Android back closes an open panel and is consumed; it does nothing when none is open', async () => {
    const handlers: ((event: never) => boolean | null | undefined)[] = [];
    const add = jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_e, handler) => {
      handlers.push(handler);
      return {
        remove: () => {
          handlers.splice(handlers.indexOf(handler), 1);
        },
      };
    });
    await render(<App state={makeTabState()} panels={[{ id: 'create' }]} />);
    expect(handlers).toHaveLength(0);
    await act(async () => controls.create?.open());
    expect(handlers).toHaveLength(1);
    let consumed: boolean | null | undefined;
    await act(async () => {
      consumed = handlers[0]?.(undefined as never);
    });
    expect(consumed).toBe(true);
    expect(controls.create?.state).toBe('hidden');
    expect(handlers).toHaveLength(0);
    add.mockRestore();
  });

  it('on the web, Escape closes an open panel; other keys do nothing', async () => {
    const listeners: ((event: { key: string }) => void)[] = [];
    const doc = {
      addEventListener: (_type: string, listener: (event: { key: string }) => void) => {
        listeners.push(listener);
      },
      removeEventListener: (_type: string, listener: (event: { key: string }) => void) => {
        listeners.splice(listeners.indexOf(listener), 1);
      },
    };
    const os = jest.replaceProperty(Platform, 'OS', 'web');
    const hadDocument = 'document' in globalThis;
    const previous = (globalThis as { document?: unknown }).document;
    (globalThis as { document?: unknown }).document = doc;
    try {
      await render(<App state={makeTabState()} panels={[{ id: 'create' }]} />);
      expect(listeners).toHaveLength(0);
      await act(async () => controls.create?.open());
      expect(listeners).toHaveLength(1);
      await act(async () => listeners[0]?.({ key: 'Enter' }));
      expect(controls.create?.state).toBe('open');
      await act(async () => listeners[0]?.({ key: 'Escape' }));
      expect(controls.create?.state).toBe('hidden');
      expect(listeners).toHaveLength(0);
    } finally {
      os.restore();
      if (hadDocument) (globalThis as { document?: unknown }).document = previous;
      else delete (globalThis as { document?: unknown }).document;
    }
  });
});

describe('panel lifetime and ids', () => {
  const shown = (label: string) => screen.queryByText(label, { includeHiddenElements: true });

  it('two TabPanels with one id: the latest shows; the panel stays until the last unmounts', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const state = makeTabState();
    const { rerender } = await render(
      <App state={state}>
        <Details key="a" label="first details" />
        <Controls id="details" />
      </App>,
    );
    expect(shown('first details')).toBeTruthy();
    await rerender(
      <App state={state}>
        <Details key="a" label="first details" />
        <Details key="b" label="second details" />
        <Controls id="details" />
      </App>,
    );
    expect(shown('second details')).toBeTruthy();
    expect(shown('first details')).toBeNull();
    // Re-rendering the first declaration doesn't take the panel back.
    await rerender(
      <App state={state}>
        <Details key="a" label="first details, updated" />
        <Details key="b" label="second details" />
        <Controls id="details" />
      </App>,
    );
    expect(shown('second details')).toBeTruthy();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('<TabPanel id="details">'));

    // The top one unmounts (a pushed screen pops): the panel stays, showing the other.
    await rerender(
      <App state={state}>
        <Details key="a" label="first details, updated" />
        <Controls id="details" />
      </App>,
    );
    expect(shown('first details, updated')).toBeTruthy();
    expect(controls.details?.state).toBe('peek');

    await rerender(
      <App state={state}>
        <Controls id="details" />
      </App>,
    );
    expect(shown('first details, updated')).toBeNull();
    warn.mockRestore();
  });
});

describe('anchors', () => {
  it('re-measure when the bar root lays out again, though their own frame did not change', async () => {
    await render(
      <App
        state={makeTabState()}
        bar={<BarWithAction />}
        panels={[{ id: 'create', anchor: { name: 'action' } }]}
      />,
    );
    await layoutBar(83, 390);
    await act(async () => {
      await fireEvent(screen.getByTestId('plus'), 'layout', layoutFrame(300, 10, 56, 56));
    });
    await layoutPanel('create', 200);
    expect(flatStyle(panelWindow('create'))).toMatchObject({ left: 300 });

    // A rotation widens the root; the + keeps its place in its parent but moves in the root.
    plusFrame = { ...plusFrame, x: 600 };
    await layoutBar(83, 844);
    expect(flatStyle(panelWindow('create'))).toMatchObject({ left: 600 });
  });
});

/** Where the anchor inside the second tab sits relative to TabBarRoot. */
const subTabFrame = { x: 130, y: 6, width: 160, height: 49 };

/** A docked bar whose second tab owns a long-press panel anchored inside it. */
function BarWithSubTabs({
  onLongPress,
  actions,
}: {
  onLongPress: () => void;
  actions?: { name: string; label?: string }[];
}) {
  const anchor = usePanelAnchor('library');
  const { tabs } = useTabBar();
  return (
    <TabBarRoot placement="docked" testID="bar">
      <TabList>
        {tabs.map((tab) =>
          tab.index === 1 ? (
            <TabButton
              key={tab.key}
              tab={tab}
              onLongPress={onLongPress}
              accessibilityActions={actions}
              accessibilityState={anchor.accessibilityState}
            >
              <Text>{tab.label}</Text>
              <View
                testID="sub-anchor"
                onLayout={anchor.onLayout}
                ref={(node) => {
                  if (node) {
                    (node as unknown as { measureLayout: unknown }).measureLayout = (
                      _relativeTo: unknown,
                      onSuccess: (x: number, y: number, w: number, h: number) => void,
                    ) =>
                      onSuccess(
                        subTabFrame.x,
                        subTabFrame.y,
                        subTabFrame.width,
                        subTabFrame.height,
                      );
                  }
                  anchor.ref(node);
                }}
              />
            </TabButton>
          ) : (
            <TabButton key={tab.key} tab={tab}>
              <Text>{tab.label}</Text>
            </TabButton>
          ),
        )}
      </TabList>
    </TabBarRoot>
  );
}

describe('sub-tabs: a panel above one tab', () => {
  async function renderSubTabs(
    actions?: { name: string; label?: string }[],
    state = makeTabState(),
  ) {
    const order: string[] = [];
    const longPress = state.tabs[1]?.longPress as jest.Mock;
    longPress.mockImplementation(() => order.push('tabLongPress'));
    const onLongPress = jest.fn(() => {
      order.push('onLongPress');
      controls.menu?.open();
    });
    await render(
      <App
        state={state}
        bar={<BarWithSubTabs onLongPress={onLongPress} actions={actions} />}
        panels={[{ id: 'menu', anchor: { name: 'library' } }]}
      />,
    );
    await layoutBar(83, 390);
    await act(async () => {
      await fireEvent(screen.getByTestId('sub-anchor'), 'layout', layoutFrame(0, 0, 160, 49));
    });
    await layoutPanel('menu', 120);
    return { order, onLongPress };
  }

  const libraryTab = () => screen.getAllByRole('tab', { includeHiddenElements: true })[1];

  it('takes the frame of the view inside the tab', async () => {
    await renderSubTabs();
    expect(flatStyle(panelWindow('menu'))).toMatchObject({
      left: subTabFrame.x,
      width: subTabFrame.width,
      top: subTabFrame.y - 120,
    });
  });

  it('runs onLongPress after the tab’s tabLongPress event', async () => {
    const { order } = await renderSubTabs();
    await act(async () => {
      await fireEvent(libraryTab() as never, 'longPress');
    });
    expect(order).toEqual(['tabLongPress', 'onLongPress']);
    expect(controls.menu?.state).toBe('open');
  });

  it('reports expanded and selected together on the tab', async () => {
    await renderSubTabs(undefined, makeTabState({ activeIndex: 1 }));
    // makeTabState focuses the first tab; the second reads selected: false.
    expect(libraryTab()?.props.accessibilityState).toEqual({ expanded: false, selected: false });
    await act(async () => controls.menu?.open());
    expect(libraryTab()?.props.accessibilityState).toEqual({ expanded: true, selected: false });
    // Other tabs keep `selected` only.
    expect(
      screen.getAllByRole('tab', { includeHiddenElements: true })[0]?.props.accessibilityState,
    ).toEqual({
      selected: true,
    });
  });

  it('offers the long press to screen readers with a default spoken name', async () => {
    const { onLongPress } = await renderSubTabs();
    expect(libraryTab()?.props.accessibilityActions).toEqual([
      { name: 'longpress', label: 'Long press' },
    ]);
    await act(async () => {
      await fireEvent(libraryTab() as never, 'accessibilityAction', {
        nativeEvent: { actionName: 'longpress' },
      });
    });
    expect(onLongPress).toHaveBeenCalledTimes(1);
    expect(controls.menu?.state).toBe('open');
  });

  it('keeps the label of a longpress action the design passes, and its other actions', async () => {
    await renderSubTabs([{ name: 'magicTap' }, { name: 'longpress', label: 'Show sub-tabs' }]);
    expect(libraryTab()?.props.accessibilityActions).toEqual([
      { name: 'magicTap' },
      { name: 'longpress', label: 'Show sub-tabs' },
    ]);
  });

  it('adds no action to a tab without onLongPress', async () => {
    await renderSubTabs();
    expect(
      screen.getAllByRole('tab', { includeHiddenElements: true })[0]?.props.accessibilityActions,
    ).toBeUndefined();
  });
});

describe('missing anchors', () => {
  afterEach(() => jest.useRealTimers());

  it("warn in development when the bar never marks the panel's anchor", async () => {
    jest.useFakeTimers();
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    // TestBar has no usePanelAnchor('compose') element.
    await render(
      <App state={makeTabState()} panels={[{ id: 'orphan', anchor: { name: 'compose' } }]} />,
    );
    await layoutBar();
    expect(warn).not.toHaveBeenCalled();
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('<TabPanel id="orphan"> is anchored to "compose"'),
    );
    warn.mockRestore();
  });

  it('stay quiet when the bar marks the anchor', async () => {
    jest.useFakeTimers();
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await render(
      <App
        state={makeTabState()}
        bar={<BarWithAction />}
        panels={[{ id: 'create', anchor: { name: 'action' } }]}
      />,
    );
    await layoutBar(83, 390);
    await act(async () => {
      await fireEvent(screen.getByTestId('plus'), 'layout', layoutFrame(300, 10, 56, 56));
    });
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('is anchored to'));
    warn.mockRestore();
  });
});

describe('open panel accessibility', () => {
  it('makes the bar root modal and hides the screens, the tabs and other panels', async () => {
    await render(
      <App
        state={makeTabState()}
        panels={[
          { id: 'player', peekHeight: 64, initialState: 'peek' },
          { id: 'create', anchor: { name: 'action' } },
        ]}
      >
        <Text>screen body</Text>
      </App>,
    );
    await layoutBar();
    await layoutPanel('player', 200);
    expect(screen.getByTestId('bar').props.accessibilityViewIsModal).toBe(false);
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(screen.getByText('player content')).toBeTruthy();

    await act(async () => controls.create?.open());
    expect(screen.getByTestId('bar').props.accessibilityViewIsModal).toBe(true);
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
    expect(screen.queryByText('screen body')).toBeNull();
    expect(screen.queryByText('player content')).toBeNull();
    expect(screen.getByText('create content')).toBeTruthy();

    await act(async () => controls.create?.hide());
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(screen.getByText('screen body')).toBeTruthy();
    expect(screen.getByText('player content')).toBeTruthy();
  });

  it('moves focus into the panel once it has opened', async () => {
    const send = jest.spyOn(AccessibilityInfo, 'sendAccessibilityEvent');
    send.mockClear();
    await render(<App state={makeTabState()} panels={[{ id: 'player', peekHeight: 64 }]} />);
    await layoutBar();
    await layoutPanel('player', 200);
    expect(send).not.toHaveBeenCalled();
    await act(async () => controls.player?.open());
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0]?.[1]).toBe('focus');
    send.mockRestore();
  });
});

describe('override slot', () => {
  const wrapperStyle = () => {
    const tab = screen.getAllByRole('tab', { includeHiddenElements: true })[0] ?? null;
    const list = closest(tab, (p) => p.role === 'tablist');
    const { opacity: _opacity, ...rest } = flatStyle((list?.parent ?? null) as typeof list);
    return rest;
  };

  beforeEach(() => {
    mounts = 0;
    unmounts = 0;
  });

  it('keeps the box the design fills the same while an override comes and goes', async () => {
    const state = makeTabState();
    const { rerender } = await render(
      <App state={state}>
        <OverrideScreen on={false} />
      </App>,
    );
    // The root's padding (the safe area) moves onto the wrapper: the root's padding box,
    // which absolutely positioned backgrounds fill, is the wrapper's too.
    const root = flatStyle(screen.getByTestId('bar'));
    expect(root).toMatchObject({ paddingBottom: 0, paddingLeft: 0, paddingRight: 0 });
    const before = wrapperStyle();
    expect(before).toMatchObject({ paddingBottom: 34, alignSelf: 'stretch' });
    expect(before.display).toBeUndefined();

    await rerender(
      <App state={state}>
        <OverrideScreen on />
      </App>,
    );
    expect(screen.getByText('tray')).toBeTruthy();
    expect(wrapperStyle()).toEqual(before);
    expect(StyleSheet.flatten(screen.getByTestId('bar').props.style)).toEqual(
      StyleSheet.flatten(root),
    );
  });

  it('keeps the fading-out element mounted as the same instance', async () => {
    const state = makeTabState();
    const { rerender } = await render(
      <App state={state}>
        <OverrideScreen on />
      </App>,
    );
    expect(mounts).toBe(1);
    await rerender(
      <App state={state}>
        <OverrideScreen on={false} />
      </App>,
    );
    expect(screen.queryByText('tray', { includeHiddenElements: true })).toBeNull();
    expect(mounts).toBe(1);
    expect(unmounts).toBe(1);
  });
});

describe('react-native-tabcn/gestures', () => {
  it('is never loaded by the core entry', () => {
    jest.isolateModules(() => {
      jest.doMock('react-native-gesture-handler', () => {
        throw new Error('core imported react-native-gesture-handler');
      });
      expect(() => require('../index')).not.toThrow();
      jest.dontMock('react-native-gesture-handler');
    });
  });

  it('PanelDragArea opens a panel on an upward flick and settles back on a short drag', async () => {
    await render(
      <GestureHandlerRootView>
        <App state={makeTabState()}>
          <Player />
          <Controls id="player" />
        </App>
      </GestureHandlerRootView>,
    );
    await layoutBar();
    await layoutPanel('player', 300);
    await act(async () => controls.player?.peek());
    const pan = createGestureController(getByGestureTestId('tabcn-drag-player'));
    await act(async () => {
      pan.begin();
      pan.activate();
      pan.update({ translationY: -40 });
      pan.end({ translationY: -40, velocityY: -1200 });
    });
    expect(controls.player?.state).toBe('open');
    await act(async () => {
      pan.begin();
      pan.activate();
      pan.update({ translationY: 30 });
      pan.end({ translationY: 30, velocityY: 0 });
    });
    // 30 points down from open is still nearer open than the peek.
    expect(controls.player?.state).toBe('open');
    await act(async () => {
      pan.begin();
      pan.activate();
      pan.update({ translationY: 220 });
      pan.end({ translationY: 220, velocityY: 0 });
    });
    expect(controls.player?.state).toBe('peek');
  });
});
