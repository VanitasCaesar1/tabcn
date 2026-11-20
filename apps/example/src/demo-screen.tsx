import { router } from 'expo-router';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { catalog } from '@/catalog';
import { demos, useCurrentDemo } from '@/demos';

const rows = Array.from({ length: 40 }, (_, i) => i + 1);

/**
 * Sample tab screen on the reference's background. The list pads its bottom by
 * the tab bar's reported height, so the last row stays visible above floating bars.
 */
export function DemoScreen({ index }: { index: number }) {
  // Read from context, not route params: Expo Router creates the non-initial tab
  // routes of a dynamic [id] layout without params.
  const demo = useCurrentDemo();
  const id = Object.keys(demos).find((key) => demos[key] === demo);
  const barHeight = useBottomTabBarHeight();
  const built = catalog.filter((d) => demos[d.id]);
  const next = built[(built.findIndex((d) => d.id === id) + 1) % built.length];
  const title = demo?.tabs[index]?.label ?? '';
  const text = demo?.dark ? '#ffffff' : '#111114';
  const card = demo?.dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.7)';

  return (
    <FlatList
      data={rows}
      keyExtractor={String}
      style={{ backgroundColor: demo?.background }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[styles.list, { paddingBottom: barHeight + 16 }]}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={[styles.title, { color: text }]}>{title}</Text>
          {next ? (
            <Pressable
              role="button"
              accessibilityLabel={`Next design: ${next.title}`}
              hitSlop={10}
              onPress={() => {
                // Keep one design screen on the stack: Expo Router's tab navigation
                // resolves a tab's params against the first matching [id] screen.
                router.dismissTo('/');
                router.push({ pathname: '/designs/[id]', params: { id: next.id } });
              }}
              style={[styles.next, { backgroundColor: card }]}
            >
              <Text style={{ color: text, fontWeight: '600' }}>Next: {next.title}</Text>
            </Pressable>
          ) : null}
        </View>
      }
      renderItem={({ item }) => (
        <View style={[styles.row, { backgroundColor: card }]}>
          <Text style={{ color: text }}>
            {title} item {item}
            {item === rows.length ? ' (last row)' : ''}
          </Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 8 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: { fontSize: 28, fontWeight: '700' },
  next: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  row: { padding: 16, borderRadius: 12 },
});
