/**
 * Regression tests for bugs found by the 2026-11-23 audits: badge values from navigators, a ref
 * passed to TabButton, and BadgeCount's layout direction.
 */
import { render, screen } from '@testing-library/react-native';
import { createRef, useState } from 'react';
import { type Pressable, StyleSheet, Text } from 'react-native';

import { buildTabBarState } from '../build-state';
import {
  BadgeCount,
  TabBarRoot,
  TabBarStateProvider,
  TabButton,
  TabIndicator,
  TabList,
  useTabBar,
} from '../index';
import { closest, makeTabState } from './fixtures';

function stateWithBadge(badge: string | number | undefined) {
  return buildTabBarState({
    routes: [{ key: 'a', name: 'home' }],
    focusedIndex: 0,
    getOptions: () => ({ title: 'Home', tabBarBadge: badge }),
    insets: { top: 0, right: 0, bottom: 0, left: 0 },
    reportHeight: () => {},
    emitPress: () => false,
    emitLongPress: () => {},
    navigate: () => {},
  });
}

describe('badges from the navigator', () => {
  it('turns a count written as a string into a number', () => {
    expect(stateWithBadge('12').tabs[0]?.badge).toBe(12);
    expect(stateWithBadge(' 3 ').tabs[0]?.badge).toBe(3);
  });

  it('keeps text and empty badges as they are', () => {
    expect(stateWithBadge('New').tabs[0]?.badge).toBe('New');
    expect(stateWithBadge('').tabs[0]?.badge).toBe('');
    expect(stateWithBadge(7).tabs[0]?.badge).toBe(7);
  });

  it('drops numbers that are not counts', () => {
    expect(stateWithBadge(Number.NaN).tabs[0]?.badge).toBeUndefined();
    expect(stateWithBadge(-3).tabs[0]?.badge).toBeUndefined();
    expect(stateWithBadge(Number.POSITIVE_INFINITY).tabs[0]?.badge).toBeUndefined();
  });
});

describe('tab keys', () => {
  function keysFor(routes: { key: string; name: string }[]) {
    return buildTabBarState({
      routes,
      focusedIndex: 0,
      getOptions: () => ({}),
      insets: { top: 0, right: 0, bottom: 0, left: 0 },
      reportHeight: () => {},
      emitPress: () => false,
      emitLongPress: () => {},
      navigate: () => {},
    }).tabs.map((tab) => tab.key);
  }

  it('stays the same when the navigator gives a route a new key on its first visit', () => {
    // Expo Router: an unvisited tab's route is keyed "t4", then "t4:0-1-1" once visited.
    const before = keysFor([
      { key: 'index:0-1-0', name: 'index' },
      { key: 't4', name: 't4' },
    ]);
    const after = keysFor([
      { key: 'index:0-1-0', name: 'index' },
      { key: 't4:0-1-1', name: 't4' },
    ]);
    expect(after).toEqual(before);
  });
});

describe('tab icons', () => {
  it('can be drawn in one slot that switches tabs, even when they use different hooks', async () => {
    // Icons with hooks, as React Compiler makes them: a different number of hooks each.
    function One() {
      useState(0);
      return <Text>one</Text>;
    }
    function Two() {
      useState(0);
      useState(1);
      return <Text>two</Text>;
    }
    const build = (focusedIndex: number) =>
      buildTabBarState({
        routes: [
          { key: 'a', name: 'a' },
          { key: 'b', name: 'b' },
        ],
        focusedIndex,
        getOptions: (route) => ({ tabBarIcon: route.name === 'a' ? One : Two }),
        insets: { top: 0, right: 0, bottom: 0, left: 0 },
        reportHeight: () => {},
        emitPress: () => false,
        emitLongPress: () => {},
        navigate: () => {},
      });
    // A design that shows only the active tab's icon, in one place.
    function ActiveIcon({ index }: { index: number }) {
      const tab = build(index).tabs[index];
      return <>{tab?.renderIcon?.({ focused: true, color: 'black', size: 24 })}</>;
    }
    const view = await render(<ActiveIcon index={0} />);
    expect(screen.getByText('one')).toBeTruthy();
    await view.rerender(<ActiveIcon index={1} />);
    expect(screen.getByText('two')).toBeTruthy();
  });
});

/** A bar whose first tab gets `first` as its ref and the others `rest`. */
function Bar({
  first,
  rest,
}: {
  first: React.Ref<React.ComponentRef<typeof Pressable>>;
  rest: (node: unknown) => void;
}) {
  const { tabs } = useTabBar();
  return (
    <TabBarRoot placement="docked">
      <TabList>
        <TabIndicator />
        {tabs.map((tab) => (
          <TabButton key={tab.key} tab={tab} ref={tab.index === 0 ? first : rest}>
            <Text>{tab.label}</Text>
          </TabButton>
        ))}
      </TabList>
    </TabBarRoot>
  );
}

describe('TabButton', () => {
  it('sets a ref the design passes and still measures the tab', async () => {
    const passed = createRef<React.ComponentRef<typeof Pressable>>();
    const callback = jest.fn();
    await render(
      <TabBarStateProvider value={makeTabState()}>
        <Bar first={passed} rest={callback} />
      </TabBarStateProvider>,
    );
    expect(passed.current).not.toBeNull();
    expect(callback).toHaveBeenCalledWith(expect.anything());
  });
});

describe('BadgeCount', () => {
  it('lays its digits out left to right in every layout direction', async () => {
    await render(<BadgeCount value={120} />);
    // The digit row is the parent of the digits' slots: the "+" sits beside them.
    const plus = screen.getByText('+', { includeHiddenElements: true });
    const row = closest(
      plus,
      (props) => StyleSheet.flatten(props.style as never)?.flexDirection === 'row',
    );
    expect(StyleSheet.flatten(row?.props.style)?.direction).toBe('ltr');
  });
});
