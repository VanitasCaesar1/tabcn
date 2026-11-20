import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/use-colors';

const rows = Array.from({ length: 40 }, (_, i) => i + 1);

/**
 * Sample tab screen. The list pads its bottom by the tab bar's reported height,
 * so the last row stays visible above floating bars.
 */
export function DemoScreen({ title }: { title: string }) {
  const colors = useColors();
  const barHeight = useBottomTabBarHeight();
  return (
    <FlatList
      data={rows}
      keyExtractor={String}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[styles.list, { paddingBottom: barHeight + 16 }]}
      ListHeaderComponent={<Text style={[styles.title, { color: colors.text }]}>{title}</Text>}
      renderItem={({ item }) => (
        <View style={[styles.row, { backgroundColor: colors.card }]}>
          <Text style={{ color: colors.text }}>
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
  title: { fontSize: 28, fontWeight: '700', marginBottom: 8 },
  row: { padding: 16, borderRadius: 12 },
});
