/**
 * Smoke tests for the copy-in designs of docs/designs/bottom-components.md: Bar Sheet
 * (Sheets), Companion Chip (Companions), Sub-Tabs (Sub-tabs) and Slider Sheet (a sheet with
 * one snap point), each under a
 * TabBarProvider with a test bar. They are panels in the catalog, so designs.test.tsx checks
 * that they are covered here; like its panels, they are loaded from registry/ by path.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { ComponentType, ReactNode } from 'react';
import { Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import {
  TabBarCompanion,
  TabBarProvider,
  TabBarRoot,
  type TabBarState,
  TabBarStateProvider,
  TabButton,
  type TabItem,
  TabList,
  type TabPanelControls,
  useTabBar,
  useTabPanel,
} from '../index';
import { layoutFrame, makeTabState, mockScreenReader, TestBar } from './fixtures';

const designs = '../../../../registry/designs';

const controls: Record<string, TabPanelControls> = {};
function Controls({ id }: { id: string }) {
  controls[id] = useTabPanel(id);
  return null;
}

function Shell({
  state,
  bar = <TestBar placement="floating" />,
  children,
}: {
  state: TabBarState;
  bar?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <GestureHandlerRootView>
      <TabBarProvider>
        {children}
        <TabBarStateProvider value={state}>{bar}</TabBarStateProvider>
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

async function layoutBar(height = 64) {
  const root = screen.getByTestId('bar');
  await act(async () => {
    await fireEvent(root, 'layout', layoutFrame(0, 0, 390, height));
  });
  const box = root.children.find(
    (c) => typeof c !== 'string' && typeof c.props.onLayout === 'function',
  );
  if (box && typeof box !== 'string') {
    await act(async () => {
      await fireEvent(box, 'layout', layoutFrame(45, 0, 300, height));
    });
  }
}

// Bar Sheet -------------------------------------------------------------------------------

const { BarSheet } = require(`${designs}/bar-sheet/bar-sheet`) as {
  BarSheet: ComponentType<{ title: string; subtitle?: string; children?: ReactNode }>;
};

function SheetApp({ state }: { state: TabBarState }) {
  return (
    <Shell state={state}>
      <BarSheet title="Comments" subtitle="128 replies">
        <Text>first comment</Text>
      </BarSheet>
      <Controls id="sheet" />
    </Shell>
  );
}

// Sub-Tabs ----------------------------------------------------------------------------------

const subTabs = require(`${designs}/sub-tabs/sub-tabs`) as {
  SubTabs: ComponentType<{
    name: string;
    items: { label: string; onPress: () => void }[];
  }>;
  useSubTabs: (
    name: string,
    options?: { width?: number; actionLabel?: string; haptics?: boolean },
  ) => {
    tabProps: Record<string, unknown>;
    anchorProps: Record<string, unknown> & { style: Record<string, unknown> };
    open: boolean;
  };
};

let anchorStyle: Record<string, unknown> = {};

function LibraryTab({ tab }: { tab: TabItem }) {
  const sub = subTabs.useSubTabs('library', { width: 168 });
  anchorStyle = sub.anchorProps.style;
  return (
    <TabButton tab={tab} {...sub.tabProps}>
      <Text>{tab.label}</Text>
      <View {...sub.anchorProps} testID="sub-anchor" />
    </TabButton>
  );
}

function SubTabsBar() {
  const { tabs } = useTabBar();
  return (
    <TabBarRoot placement="floating" testID="bar">
      <TabList>
        {tabs.map((tab) =>
          tab.index === 1 ? (
            <LibraryTab key={tab.key} tab={tab} />
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

function SubTabsApp({ state, onAlbums }: { state: TabBarState; onAlbums: () => void }) {
  return (
    <Shell state={state} bar={<SubTabsBar />}>
      <subTabs.SubTabs
        name="library"
        items={[
          { label: 'Albums', onPress: onAlbums },
          { label: 'Artists', onPress: jest.fn() },
        ]}
      />
      <Controls id="sub-tabs:library" />
    </Shell>
  );
}

beforeEach(() => {
  for (const key of Object.keys(controls)) delete controls[key];
});

describe('bar-sheet', () => {
  it('opens to its lowest snap point and moves with its adjustable grabber', async () => {
    await render(<SheetApp state={makeTabState()} />);
    await layoutBar();
    expect(screen.queryByText('Comments')).toBeNull();
    await act(async () => controls.sheet?.open());
    expect(controls.sheet).toMatchObject({ state: 'open', snap: 0 });
    expect(screen.getByText('first comment')).toBeTruthy();

    const grabber = screen.getByRole('adjustable', { name: 'Comments sheet' });
    expect(grabber.props.accessibilityValue).toEqual({ text: '60 percent of the screen' });
    await act(async () => {
      await fireEvent(grabber, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    });
    expect(controls.sheet?.snap).toBe(1);
    expect(
      screen.getByRole('adjustable', { name: 'Comments sheet' }).props.accessibilityValue,
    ).toEqual({ text: 'Full height' });
    // Decrementing from the lowest returns it to rest.
    await act(async () => controls.sheet?.snapTo(0));
    await act(async () => {
      await fireEvent(
        screen.getByRole('adjustable', { name: 'Comments sheet' }),
        'accessibilityAction',
        {
          nativeEvent: { actionName: 'decrement' },
        },
      );
    });
    expect(controls.sheet?.state).toBe('hidden');
  });

  it('with a screen reader on, opens to full height and decrementing there slides it away', async () => {
    const reader = mockScreenReader(true);
    await render(<SheetApp state={makeTabState()} />);
    await layoutBar();
    await act(async () => controls.sheet?.open());
    expect(controls.sheet).toMatchObject({ state: 'open', snap: 1 });
    const grabber = screen.getByRole('adjustable', { name: 'Comments sheet' });
    expect(grabber.props.accessibilityValue).toEqual({ text: 'Full height' });
    await act(async () => {
      await fireEvent(grabber, 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
    });
    expect(controls.sheet?.state).toBe('hidden');
    reader.restore();
  });

  it('slides away when another tab is chosen', async () => {
    const state = makeTabState();
    const view = await render(<SheetApp state={state} />);
    await layoutBar();
    await act(async () => controls.sheet?.snapTo(1));
    expect(controls.sheet?.state).toBe('open');
    await view.rerender(<SheetApp state={focus(state, 2)} />);
    expect(controls.sheet?.state).toBe('hidden');
  });
});

describe('companion-chip', () => {
  const { CompanionChip } = require(`${designs}/companion-chip/companion-chip`) as {
    CompanionChip: ComponentType<{
      variant?: 'round' | 'pill' | 'count';
      label?: string;
      count?: number;
      accessibilityLabel?: string;
      icon?: (props: { color: string; size: number }) => ReactNode;
      onPress?: () => void;
    }>;
  };

  it.each([
    ['round', { variant: 'round' as const, accessibilityLabel: 'Locate me' }, 'Locate me'],
    ['pill', { variant: 'pill' as const, label: 'Search' }, 'Search'],
    ['count', { variant: 'count' as const, label: 'Views', count: 32 }, '32 Views'],
  ])('draws the %s form against the bar and presses through', async (_name, props, name) => {
    const onPress = jest.fn();
    await render(
      <Shell state={makeTabState()}>
        <TabBarCompanion position="above-end">
          <CompanionChip {...props} icon={() => <View />} onPress={onPress} />
        </TabBarCompanion>
      </Shell>,
    );
    await layoutBar();
    const chip = screen.getByRole('button', { name });
    await act(async () => {
      await fireEvent.press(chip);
    });
    expect(onPress).toHaveBeenCalled();
  });
});

describe('sub-tabs', () => {
  const libraryTab = () => screen.getAllByRole('tab', { includeHiddenElements: true })[1];

  it('opens on long press, reads expanded, names its action, and closes after a choice', async () => {
    const onAlbums = jest.fn();
    await render(<SubTabsApp state={makeTabState()} onAlbums={onAlbums} />);
    await layoutBar();
    expect(libraryTab()?.props.accessibilityActions).toEqual([
      { name: 'longpress', label: 'Show sub-tabs' },
    ]);
    expect(libraryTab()?.props.accessibilityState).toMatchObject({ expanded: false });
    // A wider drawer: an invisible anchor of that width, centred on the tab.
    expect(anchorStyle).toMatchObject({ position: 'absolute', left: '50%', width: 168 });
    expect(anchorStyle.marginLeft).toBe(-84);

    await act(async () => {
      await fireEvent(libraryTab() as never, 'longPress');
    });
    expect(controls['sub-tabs:library']?.state).toBe('open');
    expect(libraryTab()?.props.accessibilityState).toMatchObject({ expanded: true });
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: 'Albums' }));
    });
    expect(onAlbums).toHaveBeenCalled();
    expect(controls['sub-tabs:library']?.state).toBe('hidden');
  });

  it('opens from the screen-reader action and closes when the tab changes', async () => {
    const state = makeTabState();
    const view = await render(<SubTabsApp state={state} onAlbums={jest.fn()} />);
    await layoutBar();
    await act(async () => {
      await fireEvent(libraryTab() as never, 'accessibilityAction', {
        nativeEvent: { actionName: 'longpress' },
      });
    });
    expect(controls['sub-tabs:library']?.state).toBe('open');
    await view.rerender(<SubTabsApp state={focus(state, 2)} onAlbums={jest.fn()} />);
    expect(controls['sub-tabs:library']?.state).toBe('hidden');
  });
});

// Slider Sheet ------------------------------------------------------------------------------

const sliderSheet = require(`${designs}/slider-sheet/slider-sheet`) as {
  SliderSheet: ComponentType<{
    title: string | ((value: number) => string);
    subtitle?: string;
    amount?: (value: number) => string;
    detail?: (value: number) => ReactNode;
    action: string | ((value: number) => string);
    onConfirm: (value: number) => void;
    steps?: number;
    value?: number;
    defaultValue?: number;
    onValueChange?: (value: number) => void;
    labels?: { slider?: string };
    haptics?: boolean;
  }>;
};

function SliderApp({
  state,
  onConfirm = jest.fn(),
  ...props
}: {
  state: TabBarState;
  defaultValue?: number;
  value?: number;
  steps?: number;
  onValueChange?: (value: number) => void;
  onConfirm?: (value: number) => void;
}) {
  return (
    <Shell state={state}>
      <sliderSheet.SliderSheet
        title={(v) => (v === 1 ? 'Close NWA Long' : 'Reduce NWA Long')}
        subtitle="Reduce part of your position or close it fully"
        amount={(v) => `$${(v * 100).toFixed(2)}`}
        detail={(v) => <Text>{v === 1 ? '→ Closed' : `→ $${(1 - v).toFixed(2)}`}</Text>}
        action={(v) => (v === 1 ? 'Close position' : 'Reduce position')}
        onConfirm={onConfirm}
        labels={{ slider: 'Amount to reduce' }}
        haptics={false}
        {...props}
      />
      <Controls id="slider" />
    </Shell>
  );
}

describe('slider-sheet', () => {
  const slider = () => screen.getByRole('adjustable', { name: 'Amount to reduce' });
  const adjust = (actionName: 'increment' | 'decrement') =>
    act(async () => {
      await fireEvent(slider(), 'accessibilityAction', { nativeEvent: { actionName } });
    });

  it('opens above the bar at one step and moves a step at a time, never below one', async () => {
    const onValueChange = jest.fn();
    await render(<SliderApp state={makeTabState()} onValueChange={onValueChange} />);
    await layoutBar();
    expect(screen.queryByText('Reduce NWA Long')).toBeNull();
    await act(async () => controls.slider?.open());
    expect(controls.slider).toMatchObject({ state: 'open', snap: 0 });
    expect(screen.getByText('Reduce NWA Long')).toBeTruthy();
    expect(screen.getByText('$25.00')).toBeTruthy();
    expect(slider().props.accessibilityValue).toMatchObject({ now: 25, text: '25 percent' });

    await adjust('increment');
    expect(onValueChange).toHaveBeenLastCalledWith(0.5);
    expect(slider().props.accessibilityValue).toMatchObject({ now: 50, text: '50 percent' });
    expect(screen.getByText('$50.00')).toBeTruthy();

    await adjust('decrement');
    await adjust('decrement');
    // One step is the least: 0 isn't offered.
    expect(onValueChange).toHaveBeenLastCalledWith(0.25);
    expect(onValueChange).toHaveBeenCalledTimes(2);
    expect(slider().props.accessibilityValue).toMatchObject({ now: 25 });
  });

  it('snaps a starting value to the nearest step, and to one step rather than 0', async () => {
    const first = await render(<SliderApp state={makeTabState()} defaultValue={0.6} />);
    await layoutBar();
    await act(async () => controls.slider?.open());
    expect(slider().props.accessibilityValue).toMatchObject({ now: 50 });
    await first.unmount();

    await render(<SliderApp state={makeTabState()} defaultValue={0.02} steps={10} />);
    await layoutBar();
    await act(async () => controls.slider?.open());
    expect(slider().props.accessibilityValue).toMatchObject({ now: 10 });
  });

  it('reads "Close" at 100% and confirms with the value', async () => {
    const onConfirm = jest.fn();
    await render(<SliderApp state={makeTabState()} defaultValue={0.75} onConfirm={onConfirm} />);
    await layoutBar();
    await act(async () => controls.slider?.open());
    expect(screen.getByRole('button', { name: 'Reduce position' })).toBeTruthy();
    await adjust('increment');
    expect(screen.getByText('Close NWA Long')).toBeTruthy();
    expect(screen.getByText('→ Closed')).toBeTruthy();
    // The top step is the most.
    await adjust('increment');
    expect(slider().props.accessibilityValue).toMatchObject({ now: 100, text: '100 percent' });
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: 'Close position' }));
    });
    expect(onConfirm).toHaveBeenCalledWith(1);
  });

  it('follows a controlled value', async () => {
    const view = await render(<SliderApp state={makeTabState()} value={0.25} />);
    await layoutBar();
    await act(async () => controls.slider?.open());
    await view.rerender(<SliderApp state={makeTabState()} value={0.75} />);
    expect(slider().props.accessibilityValue).toMatchObject({ now: 75 });
    expect(screen.getByText('$75.00')).toBeTruthy();
  });

  it('closes from its grabber and when another tab is chosen', async () => {
    const state = makeTabState();
    const view = await render(<SliderApp state={state} />);
    await layoutBar();
    await act(async () => controls.slider?.open());
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    });
    expect(controls.slider?.state).toBe('hidden');
    await act(async () => controls.slider?.open());
    expect(controls.slider?.state).toBe('open');
    await view.rerender(<SliderApp state={focus(state, 1)} />);
    expect(controls.slider?.state).toBe('hidden');
  });
});
