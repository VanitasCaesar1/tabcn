import { act, fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Tabs, useBottomTabBarHeight } from 'expo-router/js-tabs';
import { renderRouter } from 'expo-router/testing-library';
import { Text } from 'react-native';

import { tabBar, useTabBarOverride } from '../expo-router';
import { TabBarProvider, useTabBar } from '../index';
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

function Tray() {
  useTabBarOverride(<Text>tray controls</Text>);
  return <Text>explore screen</Text>;
}

describe('tabcn/expo-router useTabBarOverride', () => {
  it('shows the override while its screen is focused and restores the tabs on blur', async () => {
    await renderRouter({
      _layout: () => (
        <TabBarProvider>
          <Tabs tabBar={tabBar(<TestBar />)} screenOptions={{ headerShown: false }}>
            <Tabs.Screen name="index" options={{ title: 'Home' }} />
            <Tabs.Screen name="explore" options={{ title: 'Explore' }} />
          </Tabs>
        </TabBarProvider>
      ),
      index: () => <ScreenBody name="home" />,
      explore: () => <Tray />,
    });
    expect(screen.getAllByRole('tab')).toHaveLength(2);
    expect(screen.queryByText('tray controls')).toBeNull();

    await fireEvent.press(screen.getByText('Explore'));
    expect(screen.getByText('tray controls')).toBeTruthy();
    // The tabs stay mounted but are hidden from screen readers.
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
    expect(screen.getAllByRole('tab', { includeHiddenElements: true })).toHaveLength(2);

    await act(async () => router.navigate('/'));
    expect(screen.getByText(/home screen/)).toBeTruthy();
    expect(screen.queryByText('tray controls')).toBeNull();
    expect(screen.getAllByRole('tab')).toHaveLength(2);
  });
});

function PositionProbe() {
  const { position } = useTabBar();
  return <Text>{`position ${position}`}</Text>;
}

describe('tabcn/expo-router position', () => {
  it.each([
    ['left', 'left'],
    ['bottom', 'bottom'],
    ['top', 'bottom'],
  ] as const)('tabBarPosition %s gives position %s', async (tabBarPosition, expected) => {
    await renderRouter({
      _layout: () => (
        <Tabs
          tabBar={tabBar(<PositionProbe />)}
          screenOptions={{ headerShown: false, tabBarPosition }}
        >
          <Tabs.Screen name="index" />
        </Tabs>
      ),
      index: () => <ScreenBody name="home" />,
    });
    expect(screen.getByText(`position ${expected}`)).toBeTruthy();
  });
});
