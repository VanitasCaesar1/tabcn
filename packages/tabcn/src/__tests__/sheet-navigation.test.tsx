/**
 * Sheet navigation (docs/designs/bottom-components.md, Sheet navigation): the Section Sheet
 * design, a tab bar that is one persistent sheet with the sections in its header, and the
 * core rule it relies on: an empty (zero-height) floating bar hides nothing behind it, so
 * panels meet its top edge with no overlap.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { ComponentType, ReactNode } from 'react';
import { Dimensions, Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import {
  type SnapPoint,
  TabBarProvider,
  type TabBarState,
  TabBarStateProvider,
  TabPanel,
  type TabPanelControls,
  useTabBarInset,
  useTabPanel,
} from '../index';
import { closest, flatStyle, layoutFrame, makeTabState, mockScreenReader } from './fixtures';

const { SectionSheet } = require('../../../../registry/designs/section-sheet/section-sheet') as {
  SectionSheet: ComponentType<{
    sections: Record<string, ReactNode>;
    collapsedHeight?: number;
    snapPoints?: readonly SnapPoint[];
    haptics?: boolean;
  }>;
};

const PANEL = 'section-sheet';
const COLLAPSED = 76;
// makeTabState: bottom inset 34, top 0. The sheet's bar sits on the bottom safe area.
const INSET = 34;
const screenHeight = Dimensions.get('window').height;

const controls: Record<string, TabPanelControls> = {};
function Controls({ id }: { id: string }) {
  controls[id] = useTabPanel(id);
  return null;
}

let inset = -1;
function InsetReader() {
  inset = useTabBarInset();
  return null;
}

const sections = {
  home: <Text>home body</Text>,
  search: <Text>search body</Text>,
  profile: <Text>profile body</Text>,
};

function App({ state, children }: { state: TabBarState; children?: ReactNode }) {
  return (
    <GestureHandlerRootView>
      <TabBarProvider>
        {children}
        <Controls id={PANEL} />
        <InsetReader />
        <TabBarStateProvider value={state}>
          <SectionSheet sections={sections} haptics={false} />
        </TabBarStateProvider>
      </TabBarProvider>
    </GestureHandlerRootView>
  );
}

/** The same tab state with another tab focused, as the navigator would hand it over. */
function focus(state: TabBarState, index: number): TabBarState {
  return {
    ...state,
    activeIndex: index,
    tabs: state.tabs.map((tab) => ({ ...tab, focused: tab.index === index })),
  };
}

const grabber = () =>
  screen.getByRole('adjustable', { name: 'Sheet', includeHiddenElements: true });

/** Lays out the sheet's empty floating bar: a zero-height root and box on the safe area. */
async function layoutBar() {
  const root = closest(grabber(), (props) => {
    const style = flatStyle({ props } as never);
    return typeof props.onLayout === 'function' && style.bottom !== undefined;
  });
  if (!root) throw new Error('no bar root');
  await act(async () => {
    await fireEvent(root, 'layout', layoutFrame(0, 0, 390, 0));
  });
  const box = root.children.find(
    (c) => typeof c !== 'string' && typeof c.props.onLayout === 'function',
  );
  if (!box || typeof box === 'string') throw new Error('no bar box');
  await act(async () => {
    await fireEvent(box, 'layout', layoutFrame(195, 0, 0, 0));
  });
}

const sheetWindow = () =>
  closest(grabber(), (props) => {
    const style = props.style as { position?: string } | undefined;
    return style?.position === 'absolute' && 'top' in (style ?? {});
  });

beforeEach(() => {
  for (const key of Object.keys(controls)) delete controls[key];
  inset = -1;
});

describe('section-sheet', () => {
  it('rests as a collapsed strip that reports its own height and reaches the screen’s edge', async () => {
    const state = makeTabState();
    await render(<App state={state} />);
    await layoutBar();
    expect(controls[PANEL]?.state).toBe('peek');
    // Screens pad for the strip: the bottom safe area plus the collapsed height.
    expect(state.reportHeight).toHaveBeenLastCalledWith(INSET + COLLAPSED);
    expect(inset).toBe(INSET + COLLAPSED);
    // No overlap under an empty bar: the window runs from the full height down to the
    // screen's bottom edge, so the visible strip is exactly the reported height.
    const style = flatStyle(sheetWindow());
    expect(style.top).toBe(-(screenHeight - INSET));
    expect((style.top as number) + (style.height as number)).toBe(INSET);
    expect(style.width).toBe(390);
  });

  it('keeps the strip’s height for screens and toasts while raised, and is modal only at full', async () => {
    const state = makeTabState();
    await render(<App state={state} />);
    await layoutBar();
    await act(async () => controls[PANEL]?.snapTo(0));
    expect(controls[PANEL]).toMatchObject({ state: 'open', snap: 0 });
    expect(state.reportHeight).toHaveBeenLastCalledWith(INSET + COLLAPSED);
    expect(inset).toBe(INSET + COLLAPSED);
    expect(sheetWindow()?.props.accessibilityViewIsModal).toBe(false);
    // The sections stay readable at half height.
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    await act(async () => controls[PANEL]?.snapTo(1));
    expect(sheetWindow()?.props.accessibilityViewIsModal).toBe(true);
  });

  it('draws the sections as tabs in its header and presses through to the navigator', async () => {
    const state = makeTabState();
    await render(<App state={state} />);
    await layoutBar();
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(3);
    expect(tabs[1]?.props.accessibilityLabel).toBe('Search, tab, 2 of 3');
    expect(tabs[0]?.props.accessibilityState).toMatchObject({ selected: true });
    await act(async () => {
      await fireEvent.press(tabs[1] as never);
    });
    expect(state.tabs[1]?.press).toHaveBeenCalled();
  });

  it('keeps its height on a section change, crossfading bodies that stay mounted', async () => {
    const state = makeTabState();
    const view = await render(<App state={state} />);
    await layoutBar();
    await act(async () => controls[PANEL]?.snapTo(0));
    expect(screen.getByText('home body')).toBeTruthy();
    expect(screen.queryByText('search body', { includeHiddenElements: true })).toBeNull();

    await view.rerender(<App state={focus(state, 1)} />);
    expect(controls[PANEL]).toMatchObject({ state: 'open', snap: 0 });
    expect(screen.getByText('search body')).toBeTruthy();
    // The first body is still there, faded out, untouchable and hidden from screen readers.
    const home = screen.getByText('home body', { includeHiddenElements: true });
    expect(screen.queryByText('home body')).toBeNull();
    const wrapper = closest(home, (props) => props.pointerEvents === 'none');
    expect(wrapper?.props.accessibilityElementsHidden).toBe(true);
    expect(flatStyle(wrapper).opacity).toBe(0);
  });

  it('moves between heights with its adjustable grabber', async () => {
    await render(<App state={makeTabState()} />);
    await layoutBar();
    expect(grabber().props.accessibilityValue).toEqual({ text: 'Collapsed' });
    const act_ = async (actionName: string) =>
      act(async () => {
        await fireEvent(grabber(), 'accessibilityAction', { nativeEvent: { actionName } });
      });
    await act_('increment');
    expect(controls[PANEL]).toMatchObject({ state: 'open', snap: 0 });
    expect(grabber().props.accessibilityValue).toEqual({ text: 'Half height' });
    await act_('increment');
    expect(controls[PANEL]?.snap).toBe(1);
    expect(grabber().props.accessibilityValue).toEqual({ text: 'Full height' });
    await act_('decrement');
    await act_('decrement');
    expect(controls[PANEL]?.state).toBe('peek');
  });

  it('hides its bodies from screen readers while it rests at the strip, below the screen’s edge', async () => {
    await render(<App state={makeTabState()} />);
    await layoutBar();
    expect(controls[PANEL]?.state).toBe('peek');
    // The header stays readable: the grabber and the sections.
    expect(screen.getByRole('adjustable', { name: 'Sheet' })).toBeTruthy();
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(screen.queryByText('home body')).toBeNull();
    expect(screen.getByText('home body', { includeHiddenElements: true })).toBeTruthy();
    await act(async () => controls[PANEL]?.snapTo(0));
    expect(screen.getByText('home body')).toBeTruthy();
    await act(async () => controls[PANEL]?.peek());
    expect(screen.queryByText('home body')).toBeNull();
  });

  it('with a screen reader on, goes between the strip and full height with its grabber', async () => {
    const reader = mockScreenReader(true);
    await render(<App state={makeTabState()} />);
    await layoutBar();
    const act_ = async (actionName: string) =>
      act(async () => {
        await fireEvent(grabber(), 'accessibilityAction', { nativeEvent: { actionName } });
      });
    await act_('increment');
    expect(controls[PANEL]).toMatchObject({ state: 'open', snap: 1 });
    expect(grabber().props.accessibilityValue).toEqual({ text: 'Full height' });
    await act_('decrement');
    expect(controls[PANEL]?.state).toBe('peek');
    reader.restore();
  });

  it('stays at its strip under a sheet opened over it, and shows again when that one rests', async () => {
    await render(
      <App state={makeTabState()}>
        <TabPanel id="other" snapPoints={['40%']}>
          <Text>other sheet</Text>
        </TabPanel>
        <Controls id="other" />
      </App>,
    );
    await layoutBar();
    await act(async () => controls.other?.open());
    expect(controls[PANEL]?.state).toBe('peek');
    expect(controls.other?.state).toBe('open');
    await act(async () => controls.other?.hide());
    expect(controls[PANEL]?.state).toBe('peek');
    expect(screen.getAllByRole('tab')).toHaveLength(3);
  });

  it('comes back when another bar panel pushes it away, with a development warning', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await render(
      <App state={makeTabState()}>
        <TabPanel id="player" peekHeight={60}>
          <Text>player</Text>
        </TabPanel>
        <Controls id="player" />
      </App>,
    );
    await layoutBar();
    await act(async () => controls.player?.peek());
    expect(controls[PANEL]?.state).toBe('peek');
    expect(controls.player?.state).toBe('hidden');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('pushed the sheet away'));
    warn.mockRestore();
  });

  it('draws the sections as a plain floating bar without a provider', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const state = makeTabState();
    await render(
      <TabBarStateProvider value={state}>
        <SectionSheet sections={sections} haptics={false} />
      </TabBarStateProvider>,
    );
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(3);
    await act(async () => {
      await fireEvent.press(tabs[2] as never);
    });
    expect(state.tabs[2]?.press).toHaveBeenCalled();
    expect(screen.queryByText('home body')).toBeNull();
    warn.mockRestore();
  });
});
