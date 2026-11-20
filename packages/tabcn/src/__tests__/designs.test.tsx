/**
 * Smoke test for every design in registry/. Each tab bar renders with real tab state,
 * exposes one `tab` per route, and pressing a tab calls the navigator. Each panel renders
 * under a TabBarProvider with a test bar and shows when it is peeked, opened or set as the
 * override. Designs live outside this package, so they're loaded from the registry by id;
 * the example app's catalog says which are tab bars and which are panels.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { ComponentType, ReactNode } from 'react';
import { Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import {
  TabBarProvider,
  TabBarRoot,
  type TabBarState,
  TabBarStateProvider,
  TabButton,
  type TabIconProps,
  type TabItem,
  TabList,
  type TabPanelControls,
  usePanelAnchor,
  useTabBar,
  useTabPanel,
} from '../index';
import { useOverrideSlot } from '../override';
import { TestBar } from './fixtures';

const registry = require('../../../../registry/registry.json') as {
  items: { name: string }[];
};
const { catalog } = require('../../../../apps/example/src/catalog') as {
  catalog: { id: string; kind: 'bar' | 'panel' }[];
};

type Module = Record<string, unknown>;

function loadDesign(id: string) {
  const design = require(`../../../../registry/designs/${id}/${id}`) as Module;
  let icons: Module = {};
  try {
    icons = require(`../../../../registry/designs/${id}/icons`) as Module;
  } catch {
    // Text-only designs (Segment + Search) ship no icons.
  }
  const Component = Object.values(design).find(
    (v): v is ComponentType<Record<string, unknown>> =>
      typeof v === 'function' && /^[A-Z]/.test((v as { name: string }).name),
  );
  // Icon components only: icons files may also export helpers (Search Dock's createAvatarIcon).
  const iconList = Object.entries(icons)
    .filter(([name, v]) => typeof v === 'function' && /^[A-Z]\w*Icon$/.test(name))
    .map(([, v]) => v as ComponentType<TabIconProps>);
  return { Component, iconList };
}

/** The navigator's bar position; undefined, as in state built by hand, means bottom. */
type Position = TabBarState['position'] | undefined;

function makeState(
  count: number,
  activeIndex: number,
  icons: ComponentType<TabIconProps>[],
  position?: Position,
) {
  const press = jest.fn();
  const tabs: TabItem[] = Array.from({ length: count }, (_, index) => {
    const Icon = icons[index % Math.max(icons.length, 1)];
    return {
      key: `tab-${index}`,
      routeName: `tab-${index}`,
      index,
      focused: index === activeIndex,
      label: `Tab ${index + 1}`,
      renderIcon: Icon ? (props: TabIconProps) => <Icon {...props} /> : undefined,
      press: () => press(index),
      longPress: jest.fn(),
    };
  });
  const state: TabBarState = {
    tabs,
    activeIndex,
    insets: { top: 0, right: 0, bottom: 34, left: 0 },
    hideOnKeyboard: false,
    reportHeight: jest.fn(),
    ...(position ? { position } : {}),
  };
  return { state, press };
}

/**
 * Props a design can't render without, beyond `onActionPress`. Section Sheet's bodies are
 * keyed by route name (makeState names routes `tab-0`, `tab-1`…).
 */
const REQUIRED_PROPS: Record<string, Record<string, unknown>> = {
  'section-sheet': { sections: { 'tab-0': <Text>First section</Text> } },
};

const ids = registry.items.map((item) => item.name);
const kindOf = (id: string) => catalog.find((entry) => entry.id === id)?.kind;
const bars = ids.filter((id) => kindOf(id) === 'bar');
const panels = ids.filter((id) => kindOf(id) === 'panel');

test('every registry item is a tab bar or a panel in the catalog', () => {
  expect(bars.length + panels.length).toBe(ids.length);
  expect(bars.length).toBe(catalog.filter((entry) => entry.kind === 'bar').length);
  expect(panels.length).toBe(catalog.filter((entry) => entry.kind === 'panel').length);
  expect(panels).toEqual(expect.arrayContaining(['mini-player', 'context-tray', 'quick-create']));
});

/**
 * Panels need their own smoke test (each has its own props and its own way of showing): the
 * three below, and Bar Sheet, Companion Chip and Sub-Tabs in bottom-designs.test.tsx. A new
 * panel fails here until it gets one.
 */
const PANELS_WITH_TESTS = [
  'mini-player',
  'context-tray',
  'quick-create',
  'bar-sheet',
  'companion-chip',
  'sub-tabs',
];

test('every panel has a smoke test', () => {
  expect([...panels].sort()).toEqual([...PANELS_WITH_TESTS].sort());
});

// Every bar renders inside gesture handler's root view, as in an app: Scrub Pill and Section
// Sheet use 'tabcn/gestures', which needs it.

/** Tab bars; Side Rail also as a rail (a navigator with `tabBarPosition: 'left'`). */
const barCases: [string, string, Position][] = bars.flatMap((id): [string, string, Position][] =>
  id === 'side-rail'
    ? [
        [`${id} (position bottom)`, id, 'bottom'],
        [`${id} (position left)`, id, 'left'],
      ]
    : [[id, id, undefined]],
);

describe.each(barCases)('%s', (_name, id, position) => {
  const { Component, iconList } = loadDesign(id);
  // Designs with fewer icons than four (Orbs, Center CTA, Segment + Search) get that many tabs.
  const count = Math.max(2, Math.min(4, iconList.length || 2));

  it('exports a component', () => {
    expect(Component).toBeDefined();
  });

  it('renders one tab per route and presses through to the navigator', async () => {
    if (!Component) return;
    const { state, press } = makeState(count, 0, iconList, position);
    await render(
      <GestureHandlerRootView>
        <TabBarStateProvider value={state}>
          <Component onActionPress={jest.fn()} {...REQUIRED_PROPS[id]} />
        </TabBarStateProvider>
      </GestureHandlerRootView>,
    );
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(count);
    const second = tabs[1];
    if (!second) throw new Error('expected a second tab');
    await fireEvent.press(second);
    expect(press).toHaveBeenCalledWith(1);
  });

  it('works unchanged under a TabBarProvider', async () => {
    if (!Component) return;
    const { state, press } = makeState(count, 0, iconList, position);
    await render(
      <GestureHandlerRootView>
        <TabBarProvider>
          <TabBarStateProvider value={state}>
            <Component onActionPress={jest.fn()} {...REQUIRED_PROPS[id]} />
          </TabBarStateProvider>
        </TabBarProvider>
      </GestureHandlerRootView>,
    );
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(count);
    const last = tabs[count - 1];
    if (!last) throw new Error('expected a last tab');
    await fireEvent.press(last);
    expect(press).toHaveBeenCalledWith(count - 1);
  });

  it('re-renders when the active tab changes', async () => {
    if (!Component) return;
    const first = makeState(count, 0, iconList, position);
    const view = await render(
      <GestureHandlerRootView>
        <TabBarStateProvider value={first.state}>
          <Component onActionPress={jest.fn()} {...REQUIRED_PROPS[id]} />
        </TabBarStateProvider>
      </GestureHandlerRootView>,
    );
    const next = makeState(count, count - 1, iconList, position);
    await view.rerender(
      <GestureHandlerRootView>
        <TabBarStateProvider value={next.state}>
          <Component onActionPress={jest.fn()} {...REQUIRED_PROPS[id]} />
        </TabBarStateProvider>
      </GestureHandlerRootView>,
    );
    const selected = screen
      .getAllByRole('tab')
      .filter((t) => t.props.accessibilityState?.selected === true);
    expect(selected).toHaveLength(1);
  });
});

// Panels ----------------------------------------------------------------------------------

const controls: Record<string, TabPanelControls> = {};

function Controls({ id }: { id: string }) {
  controls[id] = useTabPanel(id);
  return null;
}

/** A floating test bar with a + button marked as the 'action' anchor (for Quick Create). */
function BarWithAction() {
  const { tabs } = useTabBar();
  const anchor = usePanelAnchor('action');
  return (
    <TabBarRoot placement="floating" testID="bar">
      <TabList>
        {tabs.map((tab) => (
          <TabButton key={tab.key} tab={tab}>
            <Text>{tab.label}</Text>
          </TabButton>
        ))}
      </TabList>
      <View {...anchor} testID="plus" />
    </TabBarRoot>
  );
}

function PanelApp({ bar, children }: { bar: ReactNode; children: ReactNode }) {
  const { state } = makeState(3, 0, []);
  // Mini Player drags with 'tabcn/gestures', which needs gesture handler's root view.
  return (
    <GestureHandlerRootView>
      <TabBarProvider>
        {children}
        <TabBarStateProvider value={state}>{bar}</TabBarStateProvider>
      </TabBarProvider>
    </GestureHandlerRootView>
  );
}

/** What useTabBarOverride does while its screen is focused. */
function OverrideScreen({ element }: { element: ReactNode }) {
  useOverrideSlot(element, true);
  return null;
}

/** Screen-reader visible text (hidden panels are left out of the query). */
const shows = (text: string) => screen.queryAllByText(text).length > 0;

describe('panels', () => {
  beforeEach(() => {
    for (const key of Object.keys(controls)) delete controls[key];
  });

  it('lists the panel designs', () => {
    expect(panels.length).toBeGreaterThan(0);
  });

  it('mini-player: registers its panel and shows on peek() and open()', async () => {
    const MiniPlayer = loadDesign('mini-player').Component;
    if (!MiniPlayer) throw new Error('mini-player exports no component');
    await render(
      <PanelApp bar={<TestBar placement="floating" />}>
        <MiniPlayer
          track={{ title: 'Slow Tide', artist: 'Harbor Lights', duration: 214 }}
          playing
          progress={0.25}
          onPlayPause={jest.fn()}
          onNext={jest.fn()}
        />
        <Controls id="player" />
      </PanelApp>,
    );
    expect(controls.player?.state).toBe('hidden');
    expect(shows('Slow Tide')).toBe(false);
    await act(async () => controls.player?.peek());
    expect(controls.player?.state).toBe('peek');
    expect(shows('Slow Tide')).toBe(true);
    await act(async () => controls.player?.open());
    expect(controls.player?.state).toBe('open');
    expect(shows('Slow Tide')).toBe(true);
    await act(async () => controls.player?.hide());
    expect(shows('Slow Tide')).toBe(false);
  });

  it('quick-create: opens from the bar’s action anchor and closes after an action', async () => {
    const design = require('../../../../registry/designs/quick-create/quick-create') as {
      QuickCreate: ComponentType<{
        actions: { label: string; icon: () => ReactNode; onPress: () => void }[];
      }>;
    };
    const onVoice = jest.fn();
    await render(
      <PanelApp bar={<BarWithAction />}>
        <design.QuickCreate
          actions={[
            { label: 'Voice', icon: () => null, onPress: onVoice },
            { label: 'Text', icon: () => null, onPress: jest.fn() },
          ]}
        />
        <Controls id="create" />
      </PanelApp>,
    );
    expect(shows('Voice')).toBe(false);
    expect(screen.getByTestId('plus').props.accessibilityState).toEqual({ expanded: false });
    await act(async () => controls.create?.open());
    expect(controls.create?.state).toBe('open');
    expect(shows('Voice')).toBe(true);
    const voice = screen.getByText('Voice');
    await act(async () => {
      await fireEvent.press(voice);
    });
    expect(onVoice).toHaveBeenCalled();
    expect(controls.create?.state).toBe('hidden');
  });

  it('context-tray: shows in the bar’s place as the override and runs onClose', async () => {
    const ContextTray = loadDesign('context-tray').Component;
    if (!ContextTray) throw new Error('context-tray exports no component');
    const onClose = jest.fn();
    await render(
      <PanelApp bar={<TestBar placement="floating" />}>
        <OverrideScreen
          element={<ContextTray label="Explored" progress={0.5} onClose={onClose} />}
        />
      </PanelApp>,
    );
    expect(shows('Explored')).toBe(true);
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    });
    expect(onClose).toHaveBeenCalled();
  });
});
