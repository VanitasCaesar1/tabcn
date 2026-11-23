/**
 * Render work found by the 2026-11-24 performance audit: the adapters' bar state across
 * navigator renders, and the bar root across re-renders of a screen that declares a panel.
 */
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Profiler, useState } from 'react';
import { Pressable, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  TabBarProvider,
  type TabBarState,
  TabBarStateProvider,
  TabPanel,
  useTabBar,
  useTabPanel,
} from '../index';
import { tabBar } from '../react-navigation';
import { layoutEvent, makeTabState, safeAreaMetrics, TestBar } from './fixtures';

const Tab = createBottomTabNavigator();
const seen: TabBarState[] = [];

/** Records every bar state it renders with. */
function Probe() {
  const state = useTabBar();
  seen.push(state);
  return (
    <>
      {state.tabs.map((tab) => (
        <Pressable key={tab.key} role="tab" onPress={tab.press}>
          <Text>{tab.label}</Text>
        </Pressable>
      ))}
    </>
  );
}

let rerender: () => void = () => {};

function Navigator() {
  const [count, setCount] = useState(0);
  rerender = () => setCount((c) => c + 1);
  return (
    <SafeAreaProvider initialMetrics={safeAreaMetrics}>
      <NavigationContainer>
        {/* A new element and new options objects on every render, as in most apps. */}
        <Tab.Navigator tabBar={tabBar(<Probe />)} screenOptions={{ headerShown: false }}>
          <Tab.Screen name="home" options={{ title: 'Home' }}>
            {() => <Text>{`home screen ${count}`}</Text>}
          </Tab.Screen>
          <Tab.Screen name="search" options={{ title: 'Search' }}>
            {() => <Text>search screen</Text>}
          </Tab.Screen>
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

describe('adapter state across navigator renders', () => {
  beforeEach(() => {
    seen.length = 0;
  });

  it('keeps the state and each tab object when a re-render changes nothing the bar reads', async () => {
    await render(<Navigator />);
    const before = seen.at(-1);
    await act(async () => rerender());
    expect(screen.getByText('home screen 1')).toBeTruthy();
    const after = seen.at(-1);
    expect(after).toBe(before);
    expect(after?.tabs[0]).toBe(before?.tabs[0]);
    expect(after?.tabs[1]).toBe(before?.tabs[1]);
  });

  it('rebuilds the tabs whose focus changed and still navigates with the cached press', async () => {
    await render(<Navigator />);
    const before = seen.at(-1);
    await fireEvent.press(screen.getByText('Search'));
    expect(screen.getByText('search screen')).toBeTruthy();
    const after = seen.at(-1);
    expect(after?.activeIndex).toBe(1);
    expect(after?.tabs[1]?.focused).toBe(true);
    expect(after?.tabs[1]).not.toBe(before?.tabs[1]);
    // Home's press was built before the switch; it reads the latest navigator state.
    await fireEvent.press(screen.getByText('Home'));
    expect(seen.at(-1)?.activeIndex).toBe(0);
  });
});

const PANEL_CONTENT = <Text>panel content</Text>;
let rerenderScreen: () => void = () => {};

/** A screen that declares a sheet, passing new option objects on each render. */
function PanelScreen() {
  const [count, setCount] = useState(0);
  rerenderScreen = () => setCount((c) => c + 1);
  const panel = useTabPanel('sheet');
  return (
    <>
      <Text>{`screen ${count}, ${panel.state}`}</Text>
      <TabPanel id="sheet" peekHeight={40} initialState="peek" snapPoints={['50%', '100%']}>
        {PANEL_CONTENT}
      </TabPanel>
    </>
  );
}

/** A screen whose panel's content changes. */
function ChangingScreen() {
  const [label, setLabel] = useState('first');
  rerenderScreen = () => setLabel('second');
  return (
    <TabPanel id="sheet" peekHeight={40} initialState="peek">
      <Text>{label}</Text>
    </TabPanel>
  );
}

describe('a screen that declares a panel', () => {
  it("doesn't re-render the bar when it re-renders with the same panel", async () => {
    const onRender = jest.fn();
    await render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <TabBarProvider>
          <PanelScreen />
          <TabBarStateProvider value={makeTabState()}>
            <Profiler id="bar" onRender={onRender}>
              <TestBar placement="floating" />
            </Profiler>
          </TabBarStateProvider>
        </TabBarProvider>
      </SafeAreaProvider>,
    );
    await act(async () => {
      await fireEvent(screen.getByTestId('bar'), 'layout', layoutEvent(64));
    });
    expect(screen.getByText('panel content')).toBeTruthy();
    onRender.mockClear();

    await act(async () => rerenderScreen());
    expect(screen.getByText('screen 1, peek')).toBeTruthy();
    expect(onRender).not.toHaveBeenCalled();
  });

  it('re-renders the panel with new content', async () => {
    await render(
      <TabBarProvider>
        <ChangingScreen />
        <TabBarStateProvider value={makeTabState()}>
          <TestBar />
        </TabBarStateProvider>
      </TabBarProvider>,
    );
    expect(screen.getByText('first')).toBeTruthy();
    await act(async () => rerenderScreen());
    expect(screen.getByText('second')).toBeTruthy();
    expect(screen.queryByText('first')).toBeNull();
  });
});
