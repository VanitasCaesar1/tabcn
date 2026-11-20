import { type Href, Link } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { catalog, LAYOUT_LABELS } from '@/catalog';
import { demos, designHref } from '@/demos';
import { DesignPreview } from '@/preview';
import { useColors } from '@/use-colors';
import { useExpoGoLinks } from '@/use-expo-go-links';

export default function Gallery() {
  const colors = useColors();
  useExpoGoLinks();
  return (
    <FlatList
      contentInsetAdjustmentBehavior="automatic"
      data={catalog}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <View style={styles.headerBox}>
          <Text style={[styles.header, { color: colors.muted }]}>
            {catalog.filter((d) => d.status === 'ready').length} of {catalog.length} designs built.
            Each opens under Expo Router.
          </Text>
          {/* Cast: typed routes regenerate only when Metro runs. */}
          <Link href={'/react-navigation' as Href} asChild>
            <Pressable
              role="link"
              style={({ pressed }) => [
                styles.rnLink,
                { backgroundColor: colors.card, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={[styles.title, { color: colors.text }]}>React Navigation demo</Text>
              <Text style={[styles.meta, { color: colors.muted }]}>
                Every design under @react-navigation/bottom-tabs
              </Text>
            </Pressable>
          </Link>
        </View>
      }
      ItemSeparatorComponent={() => <View style={styles.gap} />}
      renderItem={({ item }) => {
        const demo = demos[item.id];
        return (
          <Link
            href={
              demo ? designHref(item.id) : { pathname: '/designs/[id]', params: { id: item.id } }
            }
            asChild
          >
            <Pressable
              style={({ pressed }) => [
                styles.card,
                { backgroundColor: colors.card, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <View style={styles.row}>
                <Text style={[styles.ref, { color: colors.muted }]}>
                  {String(item.ref).padStart(2, '0')}
                </Text>
                <View style={styles.body}>
                  <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
                  <Text style={[styles.meta, { color: colors.muted }]}>
                    {LAYOUT_LABELS[item.layout]} · {item.status}
                  </Text>
                </View>
              </View>
              {demo ? <DesignPreview demo={demo} /> : null}
            </Pressable>
          </Link>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16 },
  headerBox: { gap: 12, marginBottom: 12 },
  header: { fontSize: 13 },
  rnLink: { padding: 14, borderRadius: 14, gap: 2 },
  card: { padding: 12, borderRadius: 16, gap: 12 },
  gap: { height: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 2 },
  ref: { fontSize: 15, fontVariant: ['tabular-nums'], width: 22 },
  body: { flex: 1, gap: 2 },
  title: { fontSize: 17, fontWeight: '600' },
  meta: { fontSize: 13 },
});
