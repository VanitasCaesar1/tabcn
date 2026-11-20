import { Text } from 'react-native';

import { TabBarRoot, TabButton, TabIndicator, TabList, useTabBar } from '../index';

/** Minimal design built only on the public API, used by the adapter tests. */
export function TestBar({ placement = 'docked' }: { placement?: 'docked' | 'floating' }) {
  const { tabs } = useTabBar();
  return (
    <TabBarRoot placement={placement} testID="bar">
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
