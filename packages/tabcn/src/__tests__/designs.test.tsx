/**
 * Smoke test for every design in registry/: each one renders with real tab state, exposes
 * one `tab` per route, and pressing a tab calls the navigator. Designs live outside this
 * package, so they're loaded from the registry by id.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ComponentType } from 'react';

import { type TabBarState, TabBarStateProvider, type TabIconProps, type TabItem } from '../index';

const registry = require('../../../../registry/registry.json') as {
  items: { name: string }[];
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
  const iconList = Object.values(icons).filter(
    (v): v is ComponentType<TabIconProps> => typeof v === 'function',
  );
  return { Component, iconList };
}

function makeState(count: number, activeIndex: number, icons: ComponentType<TabIconProps>[]) {
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
  };
  return { state, press };
}

const ids = registry.items.map((item) => item.name);

test('the registry lists all 20 designs', () => {
  expect(ids).toHaveLength(20);
});

describe.each(ids)('%s', (id) => {
  const { Component, iconList } = loadDesign(id);
  // Designs with fewer icons than four (Orbs, Center CTA, Segment + Search) get that many tabs.
  const count = Math.max(2, Math.min(4, iconList.length || 2));

  it('exports a component', () => {
    expect(Component).toBeDefined();
  });

  it('renders one tab per route and presses through to the navigator', async () => {
    if (!Component) return;
    const { state, press } = makeState(count, 0, iconList);
    await render(
      <TabBarStateProvider value={state}>
        <Component onActionPress={jest.fn()} />
      </TabBarStateProvider>,
    );
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(count);
    const second = tabs[1];
    if (!second) throw new Error('expected a second tab');
    await fireEvent.press(second);
    expect(press).toHaveBeenCalledWith(1);
  });

  it('re-renders when the active tab changes', async () => {
    if (!Component) return;
    const first = makeState(count, 0, iconList);
    const view = await render(
      <TabBarStateProvider value={first.state}>
        <Component onActionPress={jest.fn()} />
      </TabBarStateProvider>,
    );
    const next = makeState(count, count - 1, iconList);
    await view.rerender(
      <TabBarStateProvider value={next.state}>
        <Component onActionPress={jest.fn()} />
      </TabBarStateProvider>,
    );
    const selected = screen
      .getAllByRole('tab')
      .filter((t) => t.props.accessibilityState?.selected === true);
    expect(selected).toHaveLength(1);
  });
});
