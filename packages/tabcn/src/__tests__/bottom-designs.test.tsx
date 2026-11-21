/**
 * Smoke tests for the copy-in designs of docs/designs/bottom-components.md: Bar Sheet
 * (Sheets), Companion Chip (Companions) and Sub-Tabs (Sub-tabs), each under a
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
