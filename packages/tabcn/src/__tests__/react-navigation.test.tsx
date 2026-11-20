import { createBottomTabNavigator, useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { BackHandler, Pressable, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { TabBarProvider, TabPanel, useTabBar, useTabPanel } from '../index';
import { tabBar, useTabBarOverride } from '../react-navigation';
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

function Tray() {
  const navigation = useNavigation();
  useTabBarOverride(
    <Pressable role="button" onPress={() => navigation.navigate('home' as never)}>
      <Text>close tray</Text>
    </Pressable>,
  );
  return <Text>explore screen</Text>;
}

function PositionProbe() {
  const { position } = useTabBar();
  return <Text>{`position ${position}`}</Text>;
}

describe('tabcn/react-navigation useTabBarOverride', () => {
  it('shows the override while its screen is focused and restores the tabs on blur', async () => {
    await render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <NavigationContainer>
          <TabBarProvider>
            <Tab.Navigator tabBar={tabBar(<TestBar />)} screenOptions={{ headerShown: false }}>
              <Tab.Screen name="home">{() => <ScreenBody name="home" />}</Tab.Screen>
              <Tab.Screen name="explore" component={Tray} />
            </Tab.Navigator>
          </TabBarProvider>
        </NavigationContainer>
      </SafeAreaProvider>,
    );
    expect(screen.getAllByRole('tab')).toHaveLength(2);
    await fireEvent.press(screen.getByText('explore'));
    expect(screen.getByText('close tray')).toBeTruthy();
    expect(screen.queryAllByRole('tab')).toHaveLength(0);

    // The tray's own control navigates as the app decides; the tabs come back on blur.
    await fireEvent.press(screen.getByText('close tray'));
    expect(screen.getByText(/home screen/)).toBeTruthy();
    expect(screen.queryByText('close tray')).toBeNull();
    expect(screen.getAllByRole('tab')).toHaveLength(2);
  });
});

describe('tabcn/react-navigation position', () => {
  it.each([
    ['left', 'left'],
    ['bottom', 'bottom'],
    ['right', 'bottom'],
  ] as const)('tabBarPosition %s gives position %s', async (tabBarPosition, expected) => {
    await render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <NavigationContainer>
          <Tab.Navigator
            tabBar={tabBar(<PositionProbe />)}
            screenOptions={{ headerShown: false, tabBarPosition }}
          >
            <Tab.Screen name="home">{() => <ScreenBody name="home" />}</Tab.Screen>
          </Tab.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>,
    );
    expect(screen.getByText(`position ${expected}`)).toBeTruthy();
  });
});

function PanelScreen() {
  const navigation = useNavigation();
  const panel = useTabPanel('create');
  return (
    <>
      <TabPanel id="create">
        <Text>create panel</Text>
      </TabPanel>
      <Text>{`create ${panel.state}`}</Text>
      <Pressable role="button" onPress={panel.open}>
        <Text>open panel</Text>
      </Pressable>
      <Pressable role="button" onPress={() => navigation.navigate('compose' as never)}>
        <Text>write a post</Text>
      </Pressable>
    </>
  );
}

const Outer = createBottomTabNavigator();

describe('tabcn/react-navigation panels', () => {
  it('Android back leaves an open panel alone while a screen covers the tab navigator', async () => {
    const handlers: ((event: never) => boolean | null | undefined)[] = [];
    const add = jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_e, handler) => {
      handlers.unshift(handler);
      return {
        remove: () => {
          handlers.splice(handlers.indexOf(handler), 1);
        },
      };
    });
    const back = () => {
      let consumed: boolean | null | undefined;
      for (const handler of handlers) {
        consumed = handler(undefined as never);
        if (consumed) break;
      }
      return consumed;
    };
    await render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <NavigationContainer>
          <Outer.Navigator screenOptions={{ headerShown: false }} backBehavior="history">
            <Outer.Screen name="main">
              {() => (
                <TabBarProvider>
                  <Tab.Navigator
                    tabBar={tabBar(<TestBar />)}
                    screenOptions={{ headerShown: false }}
                  >
                    <Tab.Screen name="home" component={PanelScreen} />
                  </Tab.Navigator>
                </TabBarProvider>
              )}
            </Outer.Screen>
            <Outer.Screen name="compose">{() => <Text>compose screen</Text>}</Outer.Screen>
          </Outer.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>,
    );
    await fireEvent.press(screen.getByText('open panel'));
    expect(screen.getByText('create open', { includeHiddenElements: true })).toBeTruthy();

    // A screen opens over the tab navigator; the panel underneath stays open.
    await fireEvent.press(screen.getByText('write a post', { includeHiddenElements: true }));
    expect(screen.getByText('compose screen')).toBeTruthy();
    let consumed: boolean | null | undefined;
    await act(async () => {
      consumed = handlers[0]?.(undefined as never);
    });
    // Not consumed: the navigator's own back handler takes it.
    expect(consumed).toBe(false);
    expect(screen.getByText('create open', { includeHiddenElements: true })).toBeTruthy();

    // Back pops the covering screen first, then closes the panel.
    await act(async () => {
      back();
    });
    expect(screen.queryByText('compose screen')).toBeNull();
    expect(screen.getByText('create open', { includeHiddenElements: true })).toBeTruthy();
    await act(async () => {
      back();
    });
    expect(screen.getByText('create hidden')).toBeTruthy();
    add.mockRestore();
  });
});
