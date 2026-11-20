import { Stack, useLocalSearchParams } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { tabBar } from 'tabcn/expo-router';

import { findDesign, LAYOUT_LABELS } from '@/catalog';
import { CurrentDemoProvider, demos, TAB_ROUTES } from '@/demos';
import { useColors } from '@/use-colors';

export default function DesignLayout() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const design = findDesign(id);
  const demo = demos[id];
  const colors = useColors();

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

  const bar = demo.render({
    onActionPress: () => Alert.alert('Action', 'The action button ran its callback.'),
  });

  return (
    <CurrentDemoProvider value={demo}>
      <Stack.Screen options={{ title: design.title }} />
      <Tabs
        tabBar={tabBar(bar)}
        screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: demo.background } }}
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
    </CurrentDemoProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  layout: { fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 },
  summary: { fontSize: 17, textAlign: 'center', lineHeight: 24 },
  status: { fontSize: 13 },
});
