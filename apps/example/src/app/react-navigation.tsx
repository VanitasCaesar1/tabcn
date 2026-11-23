/**
 * The same designs under plain React Navigation (`@react-navigation/bottom-tabs`), the way an
 * app without Expo Router uses tabcn: `tabBar={tabBar(<Design />)}` from 'react-native-tabcn/react-navigation'.
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
import { TabBarProvider, useMinimizeOnScroll } from 'react-native-tabcn';
import { tabBar } from 'react-native-tabcn/react-navigation';

import { catalog } from '@/catalog';
import { type Demo, demoScene, demos, RAIL_MIN_WIDTH } from '@/demos';
import { SCENE_COMPONENTS, sceneBackground, scenePalette } from '@/scenes';
import { floodColors } from '@/scenes/kit';

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
                animation: demo.fadeScreens ? 'fade' : undefined,
                sceneStyle: { backgroundColor: demo.background },
              }}
            >
              {demo.tabs.map((tab, i) => (
                <Tab.Screen
                  key={tab.label}
                  name={`tab-${i}`}
                  options={{
                    title: tab.label,
                    sceneStyle: { backgroundColor: screenColor(demo, id, i) },
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

/** A tab's screen colour: its flood colour, or its scene's background. */
function screenColor(demo: Demo, id: string, index: number) {
  const scene = demoScene(id, demo, index);
  return scene.flood ?? sceneBackground(scene.name, scene.scheme);
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
  const onScroll = useMinimizeOnScroll();
  const built = catalog.filter((d) => demos[d.id]);
  const Extra = demo.extra;
  const setting = demoScene(id, demo, index);
  const colors = setting.flood ? floodColors(setting.flood) : undefined;
  const palette = scenePalette(setting.name, setting.scheme, colors);
  const Scene = SCENE_COMPONENTS[setting.name];
  const scene = (
    <Scene
      index={index}
      barHeight={barHeight}
      scheme={setting.scheme}
      themed={colors}
      title={demo.tabs[index]?.label ?? ''}
      vivid={demo.vivid}
      onScroll={onScroll}
      // The stack header is transparent on iOS 26, so clear it by hand.
      nav={demo.fullScreen ? null : <View style={styles.header} />}
    >
      <Text style={[styles.note, { color: palette.subtle }]}>
        Rendered by @react-navigation/bottom-tabs with tabBar() from
        'react-native-tabcn/react-navigation'.
      </Text>
      <ScrollView
        horizontal
        style={styles.chipRow}
        contentContainerStyle={styles.chips}
        showsHorizontalScrollIndicator={false}
      >
        {built.map((d) => {
          const on = d.id === id;
          return (
            <Pressable
              key={d.id}
              role="button"
              accessibilityState={{ selected: on }}
              onPress={() => onPick(d.id)}
              style={[styles.chip, { backgroundColor: on ? palette.text : palette.surface }]}
            >
              <Text style={[styles.chipText, { color: on ? palette.background : palette.text }]}>
                {d.title}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </Scene>
  );
  // A panel demo's behaviour, hung on the scene's controls: the same as under Expo Router,
  // wired to this navigator.
  return Extra ? (
    <Extra
      index={index}
      adapter="react-navigation"
      barHeight={barHeight}
      goToFirstTab={() => navigation.navigate('tab-0' as never)}
    >
      {scene}
    </Extra>
  ) : (
    scene
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { height: 44 },
  note: { fontSize: 14, marginHorizontal: 16 },
  // A horizontal ScrollView grows by default; keep the chips one row tall.
  chipRow: { flexGrow: 0 },
  chips: { gap: 8, paddingHorizontal: 16, paddingVertical: 14 },
  chip: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 9, borderCurve: 'continuous' },
  chipText: { fontSize: 15, fontWeight: '500' },
});
