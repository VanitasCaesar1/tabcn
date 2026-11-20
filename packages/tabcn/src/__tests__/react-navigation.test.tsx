import { createBottomTabNavigator, useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { tabBar } from '../react-navigation';
import { layoutEvent, safeAreaMetrics, TestBar } from './fixtures';

function ScreenBody({ name }: { name: string }) {
  const height = useBottomTabBarHeight();
  return <Text>{`${name} screen, bar ${height}`}</Text>;
}

const Tab = createBottomTabNavigator();

function App({
  onPress,
  onLongPress,
  preventProfile = false,
}: {
  onPress?: () => void;
  onLongPress?: () => void;
  preventProfile?: boolean;
}) {
  return (
    <SafeAreaProvider initialMetrics={safeAreaMetrics}>
      <NavigationContainer>
        <Tab.Navigator tabBar={tabBar(<TestBar />)} screenOptions={{ headerShown: false }}>
          <Tab.Screen
            name="home"
            options={{ title: 'Home' }}
            listeners={{ tabPress: onPress, tabLongPress: onLongPress }}
          >
            {() => <ScreenBody name="home" />}
          </Tab.Screen>
          <Tab.Screen name="search" options={{ tabBarLabel: 'Find', title: 'Search' }}>
            {() => <ScreenBody name="search" />}
          </Tab.Screen>
          <Tab.Screen
            name="profile"
            listeners={{
              tabPress: (e) => {
                if (preventProfile) e.preventDefault();
              },
            }}
          >
            {() => <ScreenBody name="profile" />}
          </Tab.Screen>
          <Tab.Screen name="secret" options={{ tabBarItemStyle: { display: 'none' } }}>
            {() => <ScreenBody name="secret" />}
          </Tab.Screen>
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

describe('tabcn/react-navigation', () => {
  it('lists visible tabs with labels resolved in order: tabBarLabel, title, route name', async () => {
    await render(<App />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(3);
    expect(screen.getByText('Home')).toBeTruthy();
    expect(screen.getByText('Find')).toBeTruthy();
    expect(screen.getByText('profile')).toBeTruthy();
    expect(screen.queryByText('secret')).toBeNull();
  });

  it('switches screens on press and marks the tab selected', async () => {
    await render(<App />);
    expect(screen.getByText(/home screen/)).toBeTruthy();
    await fireEvent.press(screen.getByText('Find'));
    expect(screen.getByText(/search screen/)).toBeTruthy();
    expect(screen.getByRole('tab', { selected: true })).toHaveAccessibleName('Find, tab, 2 of 3');
  });

  it('does not switch when a tabPress listener calls preventDefault()', async () => {
    await render(<App preventProfile />);
    await fireEvent.press(screen.getByText('profile'));
    expect(screen.getByText(/home screen/)).toBeTruthy();
    expect(screen.queryByText(/profile screen/)).toBeNull();
  });

  it('emits tabPress and tabLongPress', async () => {
    const onPress = jest.fn();
    const onLongPress = jest.fn();
    await render(<App onPress={onPress} onLongPress={onLongPress} />);
    await fireEvent.press(screen.getByText('Home'));
    await fireEvent(screen.getByText('Home'), 'longPress');
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it("reports TabBarRoot's height to useBottomTabBarHeight()", async () => {
    await render(<App />);
    await act(async () => {
      await fireEvent(screen.getByTestId('bar'), 'layout', layoutEvent(83));
    });
    expect(screen.getByText('home screen, bar 83')).toBeTruthy();
  });
});
