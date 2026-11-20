/**
 * The same designs under plain React Navigation (`@react-navigation/bottom-tabs`), the way an
 * app without Expo Router uses tabcn: `tabBar={tabBar(<Design />)}` from 'tabcn/react-navigation'.
 * The navigator runs in its own independent tree inside this Expo Router screen.
 */
import { createBottomTabNavigator, useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import {
  NavigationContainer,
  NavigationIndependentTree,
  useNavigation,
} from '@react-navigation/native';
import { Stack } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabBarProvider } from 'tabcn';
import { tabBar } from 'tabcn/react-navigation';

import { catalog } from '@/catalog';
import { type Demo, demos, RAIL_MIN_WIDTH, screenBackground } from '@/demos';
import { Pattern } from '@/pattern';

const Tab = createBottomTabNavigator();

export default function ReactNavigationDemo() {
  const [id, setId] = useState('sliding-capsule');
  const demo = demos[id] as Demo;
  const { width } = useWindowDimensions();
  const ctx = {
    onActionPress: () => Alert.alert('Action', 'The action button ran its callback.'),
    // This navigator's route names, for designs keyed by route (Colour Flood, Live Tabs).
    routes: demo.tabs.map((_, i) => `tab-${i}`),
  };
  const bar = demo.render(ctx);

  return (
    <View style={styles.flex}>
      <Stack.Screen options={{ title: 'React Navigation', headerShown: !demo.fullScreen }} />
      <NavigationIndependentTree>
        {/* A new container per design, so each starts on its own initial tab. */}
        <NavigationContainer key={id}>
          <TabBarProvider>
            <Tab.Navigator
              initialRouteName={`tab-${demo.initialTab ?? 0}`}
              tabBar={tabBar(bar)}
              screenOptions={{
                headerShown: false,
                // Side Rail: a rail on the left on wide windows, a bottom bar otherwise.
                tabBarPosition: demo.railWhenWide && width >= RAIL_MIN_WIDTH ? 'left' : 'bottom',
                tabBarHideOnKeyboard: demo.hideOnKeyboard,
                sceneStyle: { backgroundColor: demo.background },
              }}
            >
              {demo.tabs.map((tab, i) => (
                <Tab.Screen
                  key={tab.label}
                  name={`tab-${i}`}
                  options={{
                    title: tab.label,
                    sceneStyle: { backgroundColor: screenBackground(demo, i) },
                    tabBarBadge: tab.badge,
                    tabBarIcon: ({ focused, color, size }) =>
                      tab.icon({ focused, color: String(color), size }),
                  }}
                >
                  {() => <Screen demo={demo} id={id} onPick={setId} index={i} />}
                </Tab.Screen>
              ))}
            </Tab.Navigator>
            {/* A panel demo's panel (Mini Player, Quick Create, Bar Sheet…), beside the navigator. */}
            {demo.panel?.(ctx)}
          </TabBarProvider>
        </NavigationContainer>
      </NavigationIndependentTree>
    </View>
  );
}

function Screen({
  demo,
  id,
  onPick,
  index,
}: {
  demo: Demo;
  id: string;
  onPick: (id: string) => void;
  index: number;
}) {
  const barHeight = useBottomTabBarHeight();
  const navigation = useNavigation();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const text = demo.dark ? '#ffffff' : '#111114';
  const chip = demo.dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.06)';
  const built = catalog.filter((d) => demos[d.id]);
  const Extra = demo.extra;
  const background = screenBackground(demo, index);
  return (
    // The stack header is transparent on iOS 26, so clear it by hand.
    <View style={[styles.flex, { backgroundColor: background, paddingTop: insets.top + 44 }]}>
      {demo.pattern ? (
        <Pattern spec={demo.pattern} centerY={height - barHeight + (demo.barHeight ?? 58) / 2} />
      ) : null}
      <Text style={[styles.title, { color: text }]}>{demo.tabs[index]?.label}</Text>
      <Text style={[styles.note, { color: text }]}>
        Rendered by @react-navigation/bottom-tabs with tabBar() from 'tabcn/react-navigation'.
      </Text>
      <ScrollView
        horizontal
        style={styles.chipRow}
        contentContainerStyle={styles.chips}
        showsHorizontalScrollIndicator={false}
      >
        {built.map((d) => (
          <Pressable
            key={d.id}
            role="button"
            accessibilityState={{ selected: d.id === id }}
            onPress={() => onPick(d.id)}
            style={[styles.chip, { backgroundColor: d.id === id ? text : chip }]}
          >
            <Text style={{ color: d.id === id ? background : text, fontWeight: '600' }}>
              {d.title}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      {/* A panel demo's controls, the override slot, or a list to scroll: the same as under
          Expo Router, wired to this navigator. */}
      {Extra ? (
        <Extra
          index={index}
          text={text}
          chip={chip}
          adapter="react-navigation"
          barHeight={barHeight}
          goToFirstTab={() => navigation.navigate('tab-0' as never)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  title: { fontSize: 30, fontWeight: '700', marginTop: 24, marginHorizontal: 20 },
  note: { fontSize: 14, opacity: 0.7, marginTop: 6, marginHorizontal: 20 },
  // A horizontal ScrollView grows by default; keep the chips one row tall so the extra below gets the rest.
  chipRow: { flexGrow: 0 },
  chips: { gap: 8, paddingHorizontal: 20, paddingVertical: 16 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
});
