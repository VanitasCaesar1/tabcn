import { act, fireEvent, screen } from '@testing-library/react-native';
import { Tabs, useBottomTabBarHeight } from 'expo-router/js-tabs';
import { renderRouter } from 'expo-router/testing-library';
import { Text } from 'react-native';

import { tabBar } from '../expo-router';
import { layoutEvent, TestBar } from './fixtures';

function ScreenBody({ name }: { name: string }) {
  const height = useBottomTabBarHeight();
  return <Text>{`${name} screen, bar ${height}`}</Text>;
}

async function renderApp(placement: 'docked' | 'floating' = 'docked') {
  await renderRouter({
    _layout: () => (
      <Tabs
        tabBar={tabBar(<TestBar placement={placement} />)}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen name="index" options={{ title: 'Home' }} />
        <Tabs.Screen name="search" options={{ title: 'Search' }} />
        <Tabs.Screen name="settings" options={{ href: null }} />
      </Tabs>
    ),
    index: () => <ScreenBody name="home" />,
    search: () => <ScreenBody name="search" />,
    settings: () => <ScreenBody name="settings" />,
  });
}

describe('tabcn/expo-router', () => {
  it('lists visible tabs and drops href: null routes', async () => {
    await renderApp();
    expect(screen.getAllByRole('tab')).toHaveLength(2);
    expect(screen.queryByText('settings')).toBeNull();
  });

  it('switches screens on press', async () => {
    await renderApp();
    expect(screen.getByText(/home screen/)).toBeTruthy();
    await fireEvent.press(screen.getByText('Search'));
    expect(screen.getByText(/search screen/)).toBeTruthy();
    expect(screen.getByRole('tab', { selected: true })).toHaveAccessibleName('Search, tab, 2 of 2');
  });

  it('reports a floating bar as its height plus the bottom gap', async () => {
    await renderApp('floating');
    await act(async () => {
      await fireEvent(screen.getByTestId('bar'), 'layout', layoutEvent(64));
    });
    // 64 bar + insets.bottom (0 in the router test environment) + default offset 12
    expect(screen.getByText(/home screen, bar 76/)).toBeTruthy();
  });
});
