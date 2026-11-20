import type { screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';

import {
  TabBarRoot,
  type TabBarRootProps,
  type TabBarState,
  TabButton,
  TabIndicator,
  type TabItem,
  TabList,
  useTabBar,
} from '../index';

/** Minimal design built only on the public API, used by the adapter tests. */
export function TestBar({
  placement = 'docked',
  minimizeBehavior,
}: {
  placement?: TabBarRootProps['placement'];
  minimizeBehavior?: TabBarRootProps['minimizeBehavior'];
}) {
  const { tabs } = useTabBar();
  return (
    <TabBarRoot placement={placement} minimizeBehavior={minimizeBehavior} testID="bar">
      <TabList>
        <TabIndicator />
        {tabs.map((tab) => (
          <TabButton key={tab.key} tab={tab}>
            <Text>{tab.label}</Text>
          </TabButton>
        ))}
      </TabList>
    </TabBarRoot>
  );
}

export const safeAreaMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

export const layoutEvent = (height: number) => ({
  nativeEvent: { layout: { x: 0, y: 0, width: 390, height } },
});

export const layoutFrame = (x: number, y: number, width: number, height: number) => ({
  nativeEvent: { layout: { x, y, width, height } },
});

/** Made-up tab state for rendering a design without a navigator. */
export function makeTabState(overrides: Partial<TabBarState> = {}): TabBarState {
  const tabs: TabItem[] = ['Home', 'Search', 'Profile'].map((label, index) => ({
    key: `tab-${index}`,
    routeName: label.toLowerCase(),
    index,
    focused: index === 0,
    label,
    press: jest.fn(),
    longPress: jest.fn(),
  }));
  return {
    tabs,
    activeIndex: 0,
    insets: { top: 0, right: 0, bottom: 34, left: 0 },
    hideOnKeyboard: false,
    reportHeight: jest.fn(),
    ...overrides,
  };
}

type HostElement = ReturnType<typeof screen.getByText>;

/** The nearest host element at or above `element` whose props match `test`. */
export function closest(
  element: HostElement | null,
  test: (props: Record<string, unknown>) => boolean,
): HostElement | null {
  let node = element;
  while (node) {
    if (test(node.props as Record<string, unknown>)) return node;
    node = node.parent as HostElement | null;
  }
  return null;
}

export const flatStyle = (element: HostElement | null) =>
  (StyleSheet.flatten(element?.props.style as never) ?? {}) as Record<string, unknown>;
