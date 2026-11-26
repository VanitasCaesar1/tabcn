/**
 * Smoke test for every design in registry/. Each tab bar renders with real tab state,
 * exposes one `tab` per route, and pressing a tab calls the navigator. Each panel renders
 * under a TabBarProvider with a test bar and shows when it is peeked, opened or set as the
 * override. Designs live outside this package, so they're loaded from the registry by id;
 * the example app's catalog says which are tab bars and which are panels.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { ComponentType, ReactNode } from 'react';
import {
  BackHandler,
  I18nManager,
  type StyleProp,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
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
  items: { name: string; categories?: string[] }[];
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
const ACCOUNT_DOCK_PROPS = {
  workspaces: [
    { id: 'north', name: 'Northwind Studio', detail: '342 members' },
    { id: 'field', name: 'Field Notes', detail: '1,212 members' },
  ],
  workspaceId: 'north',
  onWorkspaceChange: () => {},
  accounts: [
    { id: 'sam', name: 'Sam Rivera' },
    { id: 'alex', name: 'Alex Moreau' },
  ],
  accountId: 'sam',
  onAccountChange: () => {},
  status: 'online',
  onStatusChange: () => {},
  haptics: false,
};

const REQUIRED_PROPS: Record<string, Record<string, unknown>> = {
  'section-sheet': { sections: { 'tab-0': <Text>First section</Text> } },
  'account-dock': ACCOUNT_DOCK_PROPS,
};

/**
 * Designs whose tabs stay hidden until something opens them, and how to open them: Thumb Arc's
 * tabs fan out from its button.
 */
const OPEN_TABS: Record<string, () => Promise<unknown>> = {
  'thumb-arc': () => fireEvent.press(screen.getByRole('button', { name: /^Tabs/ })),
};

// Theme items (PanelUI Colors) colour designs rather than being one.
const ids = registry.items
  .filter((item) => !item.categories?.includes('theme'))
  .map((item) => item.name);
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
 * three below, Filter Chips further down, and Bar Sheet, Companion Chip, Sub-Tabs and Slider
 * Sheet in bottom-designs.test.tsx. A new
 * panel fails here until it gets one.
 */
const PANELS_WITH_TESTS = [
  'mini-player',
  'context-tray',
  'quick-create',
  'bar-sheet',
  'companion-chip',
  'sub-tabs',
  'filter-chips',
  'slider-sheet',
  'selection-toolbar',
];

test('every panel has a smoke test', () => {
  expect([...panels].sort()).toEqual([...PANELS_WITH_TESTS].sort());
});

// Every bar renders inside gesture handler's root view, as in an app: Scrub Pill and Section
// Sheet use 'react-native-tabcn/gestures', which needs it.

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
    await OPEN_TABS[id]?.();
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
    await OPEN_TABS[id]?.();
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
    await OPEN_TABS[id]?.();
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
  // Mini Player drags with 'react-native-tabcn/gestures', which needs gesture handler's root view.
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

// Selection Toolbar ------------------------------------------------------------------------

const selectionToolbar =
  require('../../../../registry/designs/selection-toolbar/selection-toolbar') as {
    SelectionToolbar: ComponentType<Record<string, unknown>>;
  };

/** A screen in select mode: the toolbar as its override, with three actions. */
function Selecting({
  count,
  onMove = () => {},
  onDone = () => {},
}: {
  count: number;
  onMove?: () => void;
  onDone?: () => void;
}) {
  const actions = [
    { id: 'share', label: 'Share', icon: () => null, onPress: () => {} },
    { id: 'move', label: 'Move', icon: () => null, onPress: onMove },
    { id: 'delete', label: 'Delete', icon: () => null, onPress: () => {}, destructive: true },
  ];
  return (
    <PanelApp bar={<TestBar placement="floating" />}>
      <OverrideScreen
        element={
          <selectionToolbar.SelectionToolbar
            count={count}
            actions={actions}
            onDone={onDone}
            haptics={false}
          />
        }
      />
    </PanelApp>
  );
}

describe('selection-toolbar', () => {
  const press = (target: Parameters<typeof fireEvent.press>[0]) =>
    act(async () => {
      await fireEvent.press(target);
    });

  it('shows the count in the bar’s place; actions are off until something is selected', async () => {
    const onMove = jest.fn();
    const view = await render(<Selecting count={0} onMove={onMove} />);
    expect(screen.getByLabelText('0 selected')).toBeTruthy();
    const move = () => screen.getByRole('button', { name: 'Move' });
    expect(move().props.accessibilityState).toEqual(expect.objectContaining({ disabled: true }));
    await press(move());
    expect(onMove).not.toHaveBeenCalled();

    await view.rerender(<Selecting count={3} onMove={onMove} />);
    expect(screen.getByLabelText('3 selected')).toBeTruthy();
    expect(move().props.accessibilityState?.disabled).toBeFalsy();
    await press(move());
    expect(onMove).toHaveBeenCalledTimes(1);
  });

  it('ends selection from Done, the escape gesture and Android back', async () => {
    const handlers: ((event: never) => boolean | null | undefined)[] = [];
    const add = jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_e, handler) => {
      handlers.push(handler);
      return {
        remove: () => {
          handlers.splice(handlers.indexOf(handler), 1);
        },
      };
    });
    const onDone = jest.fn();
    await render(<Selecting count={2} onDone={onDone} />);
    const done = screen.getByRole('button', { name: 'Done' });
    await press(done);
    expect(onDone).toHaveBeenCalledTimes(1);

    // The screen-reader escape gesture reaches the toolbar from the element in focus.
    let toolbar: ReturnType<typeof screen.getByRole> | null = done;
    while (toolbar && !toolbar.props.onAccessibilityEscape) toolbar = toolbar.parent;
    await act(async () => toolbar?.props.onAccessibilityEscape());
    expect(onDone).toHaveBeenCalledTimes(2);

    let consumed: boolean | null | undefined;
    await act(async () => {
      for (const handler of [...handlers].reverse()) {
        consumed = handler(undefined as never);
        if (consumed) return;
      }
    });
    expect(consumed).toBe(true);
    expect(onDone).toHaveBeenCalledTimes(3);
    add.mockRestore();
  });
});

// Account Dock -----------------------------------------------------------------------------

const accountDock = require('../../../../registry/designs/account-dock/account-dock') as {
  AccountDock: ComponentType<Record<string, unknown>>;
};

/** Account Dock under a provider, with three tabs and `activeIndex` selected. */
function Dock({ activeIndex = 0, ...props }: { activeIndex?: number } & Record<string, unknown>) {
  const { state } = makeState(3, activeIndex, []);
  return (
    <GestureHandlerRootView>
      <TabBarProvider>
        <Controls id="account-dock" />
        <TabBarStateProvider value={state}>
          <accountDock.AccountDock {...ACCOUNT_DOCK_PROPS} {...props} />
        </TabBarStateProvider>
      </TabBarProvider>
    </GestureHandlerRootView>
  );
}

describe('account-dock', () => {
  const chip = () => screen.getByLabelText(/^Account and workspace, Northwind Studio, Sam Rivera/);

  async function openDock() {
    await act(async () => {
      await fireEvent.press(chip());
    });
    expect(controls['account-dock']?.state).toBe('open');
  }

  beforeEach(() => {
    for (const key of Object.keys(controls)) delete controls[key];
  });

  it('opens from the chip with the workspaces, and choosing one keeps it open', async () => {
    const onWorkspaceChange = jest.fn();
    await render(<Dock onWorkspaceChange={onWorkspaceChange} />);
    expect(chip().props.accessibilityState).toEqual({ expanded: false });
    expect(shows('Field Notes')).toBe(false);
    await openDock();
    expect(shows('Workspaces')).toBe(true);
    await act(async () => {
      await fireEvent.press(screen.getByLabelText('Field Notes, 1,212 members'));
    });
    expect(onWorkspaceChange).toHaveBeenCalledWith('field');
    expect(controls['account-dock']?.state).toBe('open');
  });

  it('switches to the accounts and sets a status from the radio group', async () => {
    const onAccountChange = jest.fn();
    const onStatusChange = jest.fn();
    await render(<Dock onAccountChange={onAccountChange} onStatusChange={onStatusChange} />);
    await openDock();
    await act(async () => {
      await fireEvent.press(screen.getByText('Accounts'));
    });
    await act(async () => {
      await fireEvent.press(screen.getByLabelText('Alex Moreau'));
    });
    expect(onAccountChange).toHaveBeenCalledWith('alex');
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
    await act(async () => {
      await fireEvent.press(screen.getByLabelText('Status, Online'));
    });
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(4);
    expect(radios.filter((r) => r.props.accessibilityState?.checked)).toHaveLength(1);
    await act(async () => {
      await fireEvent.press(screen.getByLabelText('Idle'));
    });
    expect(onStatusChange).toHaveBeenCalledWith('idle');
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
  });

  it('Android back closes the status menu first, then the dock', async () => {
    const handlers: ((event: never) => boolean | null | undefined)[] = [];
    const add = jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_e, handler) => {
      handlers.push(handler);
      return {
        remove: () => {
          handlers.splice(handlers.indexOf(handler), 1);
        },
      };
    });
    // As React Native does: the latest listener first, until one handles it.
    const back = () =>
      act(async () => {
        for (const handler of [...handlers].reverse()) if (handler(undefined as never)) return;
      });
    await render(<Dock />);
    await openDock();
    await act(async () => {
      await fireEvent.press(screen.getByText('Accounts'));
    });
    await act(async () => {
      await fireEvent.press(screen.getByLabelText('Status, Online'));
    });
    expect(screen.getAllByRole('radio')).toHaveLength(4);
    await back();
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
    expect(controls['account-dock']?.state).toBe('open');
    await back();
    expect(controls['account-dock']?.state).toBe('hidden');
    add.mockRestore();
  });

  it('folds back on a tab change, and opens on the workspaces next time', async () => {
    const view = await render(<Dock activeIndex={0} />);
    await openDock();
    await act(async () => {
      await fireEvent.press(screen.getByText('Accounts'));
    });
    await view.rerender(<Dock activeIndex={1} />);
    expect(controls['account-dock']?.state).toBe('hidden');
    await openDock();
    expect(shows('Workspaces')).toBe(true);
    expect(shows('Field Notes')).toBe(true);
  });
});

// Filter Chips -----------------------------------------------------------------------------

const filterChips = require('../../../../registry/designs/filter-chips/filter-chips') as {
  FilterChips: ComponentType<Record<string, unknown>>;
};

const FILTER_GROUPS = [
  {
    id: 'sort',
    label: 'Sort',
    options: [
      { id: 'recommended', label: 'Recommended' },
      { id: 'rated', label: 'Top rated' },
    ],
  },
  {
    id: 'delivery',
    label: 'Delivery',
    multiple: true,
    options: [
      { id: 'today', label: 'Ships today' },
      { id: 'free', label: 'Free delivery' },
      { id: 'pickup', label: 'Store pickup' },
    ],
  },
];

function Filters(props: Record<string, unknown>) {
  return (
    <PanelApp bar={<TestBar placement="floating" />}>
      <filterChips.FilterChips groups={FILTER_GROUPS} value={{}} onChange={jest.fn()} {...props} />
      <Controls id="filters" />
    </PanelApp>
  );
}

describe('filter-chips', () => {
  const press = (target: Parameters<typeof fireEvent.press>[0]) =>
    act(async () => {
      await fireEvent.press(target);
    });

  beforeEach(() => {
    for (const key of Object.keys(controls)) delete controls[key];
  });

  it('peeks as the strip; a chip opens its group, and Apply hands over the draft', async () => {
    const onChange = jest.fn();
    await render(<Filters onChange={onChange} />);
    expect(controls.filters?.state).toBe('peek');
    const sort = screen.getByLabelText('Sort, Any');
    expect(sort.props.accessibilityState).toEqual({ expanded: false });
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
    await press(sort);
    expect(controls.filters?.state).toBe('open');
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    await press(screen.getByRole('radio', { name: 'Top rated' }));
    expect(screen.getByRole('radio', { name: 'Top rated' }).props.accessibilityState).toEqual({
      checked: true,
    });
    expect(onChange).not.toHaveBeenCalled();
    await press(screen.getByRole('button', { name: 'Apply' }));
    expect(onChange).toHaveBeenCalledWith({ sort: ['rated'] });
    expect(controls.filters?.state).toBe('peek');
  });

  it('Android back folds the sheet and drops the draft', async () => {
    const handlers: ((event: never) => boolean | null | undefined)[] = [];
    const add = jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_e, handler) => {
      handlers.push(handler);
      return {
        remove: () => {
          handlers.splice(handlers.indexOf(handler), 1);
        },
      };
    });
    const onChange = jest.fn();
    await render(<Filters onChange={onChange} />);
    await press(screen.getByLabelText('Delivery, Any'));
    await press(screen.getByRole('checkbox', { name: 'Ships today' }));
    await act(async () => {
      for (const handler of [...handlers].reverse()) if (handler(undefined as never)) return;
    });
    expect(controls.filters?.state).toBe('peek');
    expect(onChange).not.toHaveBeenCalled();
    // Opening again starts from what is applied, not the dropped draft.
    await press(screen.getByLabelText('Delivery, Any'));
    expect(screen.getByRole('checkbox', { name: 'Ships today' }).props.accessibilityState).toEqual({
      checked: false,
    });
    add.mockRestore();
  });

  it('names the choice on its chip; Clear empties the draft and clear-all applies at once', async () => {
    const onChange = jest.fn();
    await render(
      <Filters onChange={onChange} value={{ sort: ['rated'], delivery: ['free', 'today'] }} />,
    );
    expect(screen.getByLabelText('Sort, Top rated')).toBeTruthy();
    // Several choices: the first in the group's order, and how many more.
    expect(screen.getByLabelText('Delivery, Ships today +1')).toBeTruthy();
    const all = screen.getByLabelText('All filters, 2 applied');
    await press(all);
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
    await press(screen.getByRole('button', { name: 'Clear' }));
    expect(
      screen.getAllByRole('checkbox').filter((c) => c.props.accessibilityState?.checked),
    ).toHaveLength(0);
    expect(onChange).not.toHaveBeenCalled();
    await press(screen.getByRole('button', { name: 'Apply' }));
    expect(onChange).toHaveBeenCalledWith({});
    onChange.mockClear();
    await press(screen.getByRole('button', { name: 'Clear all filters' }));
    expect(onChange).toHaveBeenCalledWith({});
  });

  it('Apply with nothing changed just folds back', async () => {
    const onChange = jest.fn();
    await render(<Filters onChange={onChange} />);
    await press(screen.getByLabelText('All filters'));
    expect(screen.getByRole('button', { name: 'Clear' }).props.accessibilityState).toMatchObject({
      disabled: true,
    });
    await press(screen.getByRole('button', { name: 'Apply' }));
    expect(onChange).not.toHaveBeenCalled();
    expect(controls.filters?.state).toBe('peek');
  });
});

// Search Dock, Cart Pill ------------------------------------------------------------------

const { SearchDock } = require('../../../../registry/designs/search-dock/search-dock') as {
  SearchDock: ComponentType<Record<string, unknown>>;
};
const { CartPill } = require('../../../../registry/designs/cart-pill/cart-pill') as {
  CartPill: ComponentType<Record<string, unknown>>;
};

function Bar({ children }: { children: ReactNode }) {
  const { state } = makeState(3, 0, []);
  return <TabBarStateProvider value={state}>{children}</TabBarStateProvider>;
}

describe('search-dock', () => {
  // The Home tile: the first tab.
  const tileShadow = () => {
    const [home] = screen.getAllByRole('tab');
    return StyleSheet.flatten(home?.props.style).boxShadow;
  };

  it('lifts its white tiles off a white page with a faint neutral shadow by default', async () => {
    await render(
      <Bar>
        <SearchDock haptics={false} />
      </Bar>,
    );
    expect(tileShadow()).toBe('0 1px 2px rgba(0, 0, 0, 0.1), 0 4px 16px rgba(0, 0, 0, 0.1)');
  });

  it('draws no shadow with `shadow: null` or a transparent one', async () => {
    for (const shadow of [null, 'transparent']) {
      await render(
        <Bar>
          <SearchDock haptics={false} colors={{ shadow }} />
        </Bar>,
      );
      expect(tileShadow()).toBeUndefined();
    }
  });
});

/** Cart Pill in Shop's row: a cart, and search on the second tab (`tab-1`). */
function Shop({ state, ...props }: { state: TabBarState } & Record<string, unknown>) {
  return (
    <TabBarStateProvider value={state}>
      <CartPill
        material="tint"
        onCartPress={() => {}}
        search={{ route: 'tab-1' }}
        haptics={false}
        {...props}
      />
    </TabBarStateProvider>
  );
}

describe('cart-pill', () => {
  // expo-blur's native view, as the test renderer names it.
  const blurs = () => {
    let count = 0;
    const walk = (node: ReturnType<typeof screen.toJSON>) => {
      if (!node || typeof node === 'string') return;
      if (Array.isArray(node)) return node.forEach(walk);
      if (/ExpoBlur/.test(node.type)) count += 1;
      for (const child of node.children ?? []) walk(child as typeof node);
    };
    walk(screen.toJSON());
    return count;
  };

  it('blurs the screen edge with one masked blur, not a stack of them', async () => {
    // A solid pill, so the only blur is the edge's.
    await render(
      <Bar>
        <CartPill material="tint" haptics={false} />
      </Bar>,
    );
    expect(blurs()).toBe(1);
    await render(
      <Bar>
        <CartPill material="tint" edgeBlur={false} haptics={false} />
      </Bar>,
    );
    expect(blurs()).toBe(0);
  });

  // Every node in the rendered tree, for props the queries don't reach (GlassView renders as a
  // plain View with its props under Jest).
  const nodes = () => {
    const all: { type: string; props: { style?: StyleProp<ViewStyle>; [key: string]: unknown } }[] =
      [];
    const walk = (node: ReturnType<typeof screen.toJSON>) => {
      if (!node || typeof node === 'string') return;
      if (Array.isArray(node)) return node.forEach(walk);
      all.push(node);
      for (const child of node.children ?? []) walk(child as typeof node);
    };
    walk(screen.toJSON());
    return all;
  };

  it('draws clear Liquid Glass with a faint lens, not milky glass and a white block', async () => {
    await render(
      <Bar>
        <CartPill material="glass" onBackPress={() => {}} onCartPress={() => {}} haptics={false} />
      </Bar>,
    );
    const glass = nodes().filter((node) => node.props.glassEffectStyle != null);
    // The pill, the back button and the cart.
    expect(glass).toHaveLength(3);
    expect(glass.map((node) => node.props.tintColor)).toEqual([
      undefined,
      undefined,
      'rgba(84, 50, 234, 0.92)',
    ]);
    expect(glass.filter((node) => node.props.isInteractive)).toHaveLength(2);
    const fills = nodes().map((node) => StyleSheet.flatten(node.props.style)?.backgroundColor);
    expect(fills).toContain('rgba(0, 0, 0, 0.07)');
    expect(fills).not.toContain('#ffffff');
    // Glass draws its own depth: no shadow on top.
    const shadows = nodes().map((node) => StyleSheet.flatten(node.props.style)?.boxShadow);
    expect(shadows.filter(Boolean)).toHaveLength(0);
  });

  describe('search', () => {
    // Home, Search, Explore, Orders; Search is `tab-1`.
    function shopState(activeIndex: number) {
      const { state, press } = makeState(4, 0, []);
      const at = (index: number): TabBarState => ({
        ...state,
        activeIndex: index,
        tabs: state.tabs.map((tab) => ({ ...tab, focused: tab.index === index })),
      });
      return { state: at(activeIndex), at, press };
    }
    const press = (target: Parameters<typeof fireEvent.press>[0]) =>
      act(async () => {
        await fireEvent.press(target);
      });

    it('shows the tabs and the cart, and no field, away from the search tab', async () => {
      await render(<Shop state={shopState(0).state} />);
      expect(screen.getAllByRole('tab')).toHaveLength(4);
      expect(screen.getByLabelText('Cart')).toBeTruthy();
      expect(screen.queryByLabelText('Ask a follow-up')).toBeNull();
    });

    it('swaps the tabs and the cart for back and the field on the search tab', async () => {
      await render(<Shop state={shopState(1).state} />);
      expect(screen.getByLabelText('Ask a follow-up')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Back' })).toBeTruthy();
      expect(screen.queryAllByRole('tab')).toHaveLength(0);
      expect(screen.queryByLabelText('Cart')).toBeNull();
    });

    it('goes back to the tab that was active before search', async () => {
      const { state, at, press: navigate } = shopState(2);
      const view = await render(<Shop state={state} />);
      await view.rerender(<Shop state={at(1)} />);
      await press(screen.getByRole('button', { name: 'Back' }));
      expect(navigate).toHaveBeenLastCalledWith(2);
    });

    it('goes back to the first tab when search was the first one shown', async () => {
      const { state, press: navigate } = shopState(1);
      await render(<Shop state={state} />);
      await press(screen.getByRole('button', { name: 'Back' }));
      expect(navigate).toHaveBeenLastCalledWith(0);
    });

    it('takes back over from onBackPress on the search tab', async () => {
      const onBackPress = jest.fn();
      const { state, press: navigate } = shopState(1);
      await render(<Shop state={state} onBackPress={onBackPress} />);
      // The pushed-screen back is hidden with the tabs; only search's own back is reachable.
      expect(screen.getAllByRole('button', { name: 'Back' })).toHaveLength(1);
      await press(screen.getByRole('button', { name: 'Back' }));
      expect(onBackPress).not.toHaveBeenCalled();
      expect(navigate).toHaveBeenLastCalledWith(0);
    });

    it('sends the typed text and clears the field', async () => {
      const onSubmit = jest.fn();
      await render(<Shop state={shopState(1).state} search={{ route: 'tab-1', onSubmit }} />);
      const field = screen.getByLabelText('Ask a follow-up');
      await act(async () => {
        await fireEvent.changeText(field, 'Something warmer');
      });
      await act(async () => {
        await fireEvent(field, 'submitEditing');
      });
      expect(onSubmit).toHaveBeenCalledWith('Something warmer');
      expect(screen.getByLabelText('Ask a follow-up').props.value).toBe('');
    });
  });
});

// Ink Underline ---------------------------------------------------------------------------

describe('ink-underline', () => {
  const { InkUnderline } = require('../../../../registry/designs/ink-underline/ink-underline') as {
    InkUnderline: ComponentType<{ haptics?: boolean }>;
  };

  function inkState(badges: (string | number | undefined)[], activeIndex = 0) {
    const { state } = makeState(badges.length, activeIndex, []);
    const labels = ['Today', 'Plan', 'Sessions', 'You'];
    return {
      ...state,
      tabs: state.tabs.map((tab) => ({
        ...tab,
        label: labels[tab.index] ?? tab.label,
        badge: badges[tab.index],
      })),
    };
  }

  it('reads each badge with its label, and draws it as a superscript count or a dot', async () => {
    await render(
      <TabBarStateProvider value={inkState([undefined, 2, undefined, ''])}>
        <InkUnderline haptics={false} />
      </TabBarStateProvider>,
    );
    expect(screen.getByRole('tab', { name: 'Today, tab, 1 of 4' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Plan, 2, tab, 2 of 4' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'You, tab, 4 of 4' })).toBeTruthy();
    // The count is drawn once the label has a width (it hangs just after the label), hidden
    // from screen readers: the tab's label already reads it.
    expect(screen.queryByText('2', { includeHiddenElements: true })).toBeNull();
    await measured('Plan', 34);
    expect(screen.queryByText('2')).toBeNull();
    expect(screen.getByText('2', { includeHiddenElements: true })).toBeTruthy();
  });

  type Host = ReturnType<typeof screen.getByText>;

  /** The SVG views under a host element: the strokes. */
  function strokesUnder(node: Host | null): Host[] {
    if (!node) return [];
    const kids = (node.children ?? []).filter((c): c is Host => typeof c !== 'string');
    return [...(node.type === 'RNSVGSvgView' ? [node] : []), ...kids.flatMap(strokesUnder)];
  }

  async function measured(label: string, width: number) {
    const text = screen.getByText(label);
    await act(async () => {
      fireEvent(text, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width, height: 21 } } });
    });
    return strokesUnder(text.parent as Host | null);
  }

  /** Where a stroke's main path (the first in its SVG group) starts, from its `d`. */
  const startX = (stroke: Host | undefined) => {
    const group = stroke?.children?.[0] as Host | undefined;
    const path = group?.children?.[0] as Host | undefined;
    return Number(/^M([\d.]+)/.exec(String(path?.props.d))?.[1]);
  };

  it('draws no stroke until a label is measured, then one as wide as the label and a bit', async () => {
    await render(
      <TabBarStateProvider value={inkState([undefined, undefined, undefined])}>
        <InkUnderline haptics={false} />
      </TabBarStateProvider>,
    );
    expect(strokesUnder(screen.getByText('Today').parent as Host | null)).toHaveLength(0);
    const strokes = await measured('Today', 44.2);
    expect(strokes).toHaveLength(1);
    // Rounded to half a point, plus 3 pt past each end.
    expect(strokes[0]?.props.width).toBe(50);
    // Drawn from the leading edge: the left.
    expect(startX(strokes[0])).toBeLessThan(5);
  });

  it('starts the stroke at the right in a right-to-left layout', async () => {
    const rtl = jest.replaceProperty(I18nManager, 'isRTL', true);
    try {
      await render(
        <TabBarStateProvider value={inkState([undefined, undefined])}>
          <InkUnderline haptics={false} />
        </TabBarStateProvider>,
      );
      const strokes = await measured('Today', 44);
      expect(startX(strokes[0])).toBeGreaterThan(45);
    } finally {
      rtl.restore();
    }
  });

  it('keeps one tab selected as the active tab moves', async () => {
    const view = await render(
      <TabBarStateProvider value={inkState([undefined, 2, undefined])}>
        <InkUnderline haptics={false} />
      </TabBarStateProvider>,
    );
    await view.rerender(
      <TabBarStateProvider value={inkState([undefined, 2, undefined], 2)}>
        <InkUnderline haptics={false} />
      </TabBarStateProvider>,
    );
    const selected = screen
      .getAllByRole('tab')
      .filter((t) => t.props.accessibilityState?.selected === true);
    expect(selected.map((t) => t.props.accessibilityLabel)).toEqual(['Sessions, tab, 3 of 3']);
  });
});

// Sticker Pills --------------------------------------------------------------------------

describe('sticker-pills', () => {
  const { StickerPills } = require('../../../../registry/designs/sticker-pills/sticker-pills') as {
    StickerPills: ComponentType<{ haptics?: boolean }>;
  };

  function stickerState(badges: (string | number | undefined)[], activeIndex = 0) {
    const { state } = makeState(badges.length, activeIndex, []);
    return {
      ...state,
      tabs: state.tabs.map((tab) => ({ ...tab, badge: badges[tab.index] })),
    };
  }

  it('reads each badge with its label, and draws a count or a dot on the sticker', async () => {
    await render(
      <TabBarStateProvider value={stickerState([undefined, 3, ''])}>
        <StickerPills haptics={false} />
      </TabBarStateProvider>,
    );
    expect(screen.getByRole('tab', { name: 'Tab 2, 3, tab, 2 of 3' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Tab 3, tab, 3 of 3' })).toBeTruthy();
    expect(screen.queryByText('3')).toBeNull();
    expect(screen.getByText('3', { includeHiddenElements: true })).toBeTruthy();
  });
});

// Reply Stack ----------------------------------------------------------------------------

describe('reply-stack', () => {
  const { ReplyStack } = require('../../../../registry/designs/reply-stack/reply-stack') as {
    ReplyStack: ComponentType<{
      reply?: { onPress?: () => void };
      showReply?: boolean;
      haptics?: boolean;
    }>;
  };

  it('shows the reply row over the tabs, and presses through to its handler', async () => {
    const onPress = jest.fn();
    const { state } = makeState(3, 0, []);
    await render(
      <TabBarStateProvider value={state}>
        <ReplyStack haptics={false} reply={{ onPress }} />
      </TabBarStateProvider>,
    );
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    await fireEvent.press(screen.getByRole('button', { name: 'Post your reply' }));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Add photo' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add GIF' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Expand' })).toBeTruthy();
  });

  it('draws only the tabs when the row is hidden or there is no reply', async () => {
    const { state } = makeState(3, 0, []);
    const { rerender } = await render(
      <TabBarStateProvider value={state}>
        <ReplyStack haptics={false} reply={{}} showReply={false} />
      </TabBarStateProvider>,
    );
    expect(screen.queryByRole('button', { name: 'Post your reply' })).toBeNull();
    await rerender(
      <TabBarStateProvider value={state}>
        <ReplyStack haptics={false} />
      </TabBarStateProvider>,
    );
    expect(screen.queryByRole('button', { name: 'Post your reply' })).toBeNull();
    expect(screen.getAllByRole('tab')).toHaveLength(3);
  });
});
