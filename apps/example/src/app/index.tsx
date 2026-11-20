import { Link } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { TABCN_VERSION } from 'tabcn';

import { catalog, LAYOUT_LABELS } from '@/catalog';
import { useColors } from '@/use-colors';

export default function Gallery() {
  const colors = useColors();
  return (
    <FlatList
      contentInsetAdjustmentBehavior="automatic"
      data={catalog}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <Text style={[styles.header, { color: colors.muted }]}>
          {catalog.length} designs · tabcn {TABCN_VERSION}
        </Text>
      }
      ItemSeparatorComponent={() => <View style={styles.gap} />}
      renderItem={({ item }) => (
        <Link href={{ pathname: '/designs/[id]', params: { id: item.id } }} asChild>
          <Pressable
            style={({ pressed }) => [
              styles.row,
              { backgroundColor: colors.card, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text style={[styles.ref, { color: colors.muted }]}>
              {String(item.ref).padStart(2, '0')}
            </Text>
            <View style={styles.body}>
              <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
              <Text style={[styles.meta, { color: colors.muted }]}>
                {LAYOUT_LABELS[item.layout]} · {item.status}
              </Text>
            </View>
          </Pressable>
        </Link>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16 },
  header: { fontSize: 13, marginBottom: 12 },
  gap: { height: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 14 },
  ref: { fontSize: 15, fontVariant: ['tabular-nums'], width: 22 },
  body: { flex: 1, gap: 2 },
  title: { fontSize: 17, fontWeight: '600' },
  meta: { fontSize: 13 },
});
