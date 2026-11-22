import { Stack, useLocalSearchParams } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { Alert, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { TabBarProvider } from 'react-native-tabcn';
import { tabBar } from 'react-native-tabcn/expo-router';

import { findDesign, LAYOUT_LABELS } from '@/catalog';
import { CurrentDemoProvider, demos, RAIL_MIN_WIDTH, screenBackground, TAB_ROUTES } from '@/demos';
import { useDemoScreenColors } from '@/panel-theme';
import { useColors } from '@/use-colors';

export default function DesignLayout() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const design = findDesign(id);
  const demo = demos[id];
  const colors = useColors();
  const { width } = useWindowDimensions();
  // Under a PanelUI theme every screen takes the theme's background.
  const themedScreen = useDemoScreenColors();

  if (!design || !demo) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: design?.title ?? id }} />
        {design ? (
          <>
            <Text style={[styles.layout, { color: colors.muted }]}>
              {LAYOUT_LABELS[design.layout]}
            </Text>
            <Text style={[styles.summary, { color: colors.text }]}>{design.summary}</Text>
            <Text style={[styles.status, { color: colors.muted }]}>Not built yet</Text>
          </>
        ) : (
          <Text style={{ color: colors.text }}>Unknown design: {id}</Text>
        )}
      </View>
    );
  }

  const ctx = {
    onActionPress: () => Alert.alert('Action', 'The action button ran its callback.'),
    routes: TAB_ROUTES,
  };
  const bar = demo.render(ctx);
  // Side Rail: a rail on the left on wide windows (iPad, landscape), a bottom bar otherwise.
  const tabBarPosition = demo.railWhenWide && width >= RAIL_MIN_WIDTH ? 'left' : 'bottom';

  return (
    <CurrentDemoProvider value={demo}>
      <Stack.Screen options={{ title: design.title, headerShown: !demo.fullScreen }} />
      {/* Lets screens drive the bar: panels, the override slot, minimize on scroll. */}
      <TabBarProvider>
        <Tabs
          tabBar={tabBar(bar)}
          screenOptions={{
            headerShown: false,
            tabBarPosition,
            tabBarHideOnKeyboard: demo.hideOnKeyboard,
            sceneStyle: { backgroundColor: themedScreen?.background ?? demo.background },
          }}
        >
          {TAB_ROUTES.map((name, i) => {
            const tab = demo.tabs[i];
            return (
              <Tabs.Screen
                key={name}
                name={name}
                options={
                  tab
                    ? {
                        title: tab.label,
                        sceneStyle: {
                          backgroundColor: themedScreen?.background ?? screenBackground(demo, i),
                        },
                        tabBarBadge: tab.badge,
                        tabBarIcon: ({ focused, color, size }) =>
                          tab.icon({ focused, color: String(color), size }),
                      }
                    : { href: null }
                }
              />
            );
          })}
        </Tabs>
        {/* A panel demo's panel, declared once here so it stays across tabs. */}
        {demo.panel?.(ctx)}
      </TabBarProvider>
    </CurrentDemoProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  layout: { fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 },
  summary: { fontSize: 17, textAlign: 'center', lineHeight: 24 },
  status: { fontSize: 13 },
});
