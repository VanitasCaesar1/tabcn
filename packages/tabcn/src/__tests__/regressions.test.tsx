/**
 * Regression tests for bugs found by the 2026-11-23 audits: badge values from navigators, a ref
 * passed to TabButton, and BadgeCount's layout direction.
 */
import { render, screen } from '@testing-library/react-native';
import { createRef } from 'react';
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

describe('TabButton', () => {
  it('sets a ref the design passes and still measures the tab', async () => {
    const passed = createRef<React.ComponentRef<typeof Pressable>>();
    const callback = jest.fn();
    function Bar() {
      const { tabs } = useTabBar();
      return (
        <TabBarRoot placement="docked">
          <TabList>
            <TabIndicator />
            {tabs.map((tab) => (
              <TabButton key={tab.key} tab={tab} ref={tab.index === 0 ? passed : callback}>
                <Text>{tab.label}</Text>
              </TabButton>
            ))}
          </TabList>
        </TabBarRoot>
      );
    }
    await render(
      <TabBarStateProvider value={makeTabState()}>
        <Bar />
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
