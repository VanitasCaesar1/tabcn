import { type Href, Redirect, router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { catalog, type DesignEntry, LAYOUT_LABELS } from '@/catalog';
import { demos, designHref } from '@/demos';
import { DESIGN_TAGS, type DesignStyle, STYLES } from '@/design-tags';
import { embed } from '@/embed';
import { Glyph, ICONS } from '@/scenes/kit';
import { type AppColors, useColors } from '@/use-colors';
import { useExpoGoLinks } from '@/use-expo-go-links';

type Filter = DesignStyle | 'all' | 'panels';

interface Section {
  key: string;
  title: string;
  data: DesignEntry[];
}

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  ...STYLES.map((s) => ({ id: s.id, label: s.label })),
  { id: 'panels', label: 'Panels' },
];

export default function Gallery() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  useExpoGoLinks();

  const sections = useMemo(() => {
    const words = query.trim().toLowerCase();
    const matches = (d: DesignEntry) =>
      !words || `${d.title} ${d.summary} ${LAYOUT_LABELS[d.layout]}`.toLowerCase().includes(words);
    const styleOf = (d: DesignEntry) => DESIGN_TAGS[d.id]?.style;
    const list: Section[] = [];
    if (filter !== 'panels') {
      for (const style of STYLES) {
        if (filter !== 'all' && filter !== style.id) continue;
        const data = catalog.filter(
          (d) => d.kind === 'bar' && styleOf(d) === style.id && matches(d),
        );
        if (data.length) list.push({ key: style.id, title: style.label, data });
      }
    }
    const panels = catalog.filter(
      (d) =>
        d.kind === 'panel' &&
        (filter === 'all' || filter === 'panels' || styleOf(d) === filter) &&
        matches(d),
    );
    if (panels.length) {
      list.push({
        key: 'panels',
        title: 'Panels',
        data: panels,
      });
    }
    return list;
  }, [query, filter]);

  // The site's live preview opens straight on its design.
  if (embed?.design && demos[embed.design]) return <Redirect href={designHref(embed.design)} />;

  return (
    <SectionList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.list, { paddingTop: insets.top + 12 }]}
      sections={sections}
      keyExtractor={(item) => item.id}
      stickySectionHeadersEnabled={false}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <Header
          colors={colors}
          query={query}
          setQuery={setQuery}
          filter={filter}
          setFilter={setFilter}
        />
      }
      renderSectionHeader={({ section }) => (
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {section.title}
            <Text style={[styles.count, { color: colors.faint }]}> {section.data.length}</Text>
          </Text>
        </View>
      )}
      renderItem={({ item, index, section }) => (
        <Row
          design={item}
          colors={colors}
          first={index === 0}
          last={index === section.data.length - 1}
        />
      )}
      ListEmptyComponent={
        <Text style={[styles.empty, { color: colors.muted }]}>
          No designs match “{query.trim()}”.
        </Text>
      }
      ListFooterComponent={<Footer colors={colors} bottom={insets.bottom} />}
    />
  );
}

function Header({
  colors,
  query,
  setQuery,
  filter,
  setFilter,
}: {
  colors: AppColors;
  query: string;
  setQuery: (query: string) => void;
  filter: Filter;
  setFilter: (filter: Filter) => void;
}) {
  return (
    <View style={styles.header}>
      <Text style={[styles.title, { color: colors.text }]}>tabcn</Text>
      <Text style={[styles.lede, { color: colors.muted }]}>
        {catalog.length} animated tab bars and panels for React Native.
      </Text>
      <View style={[styles.search, { backgroundColor: colors.field }]}>
        <Glyph d={ICONS.search} color={colors.muted} size={17} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search designs"
          placeholderTextColor={colors.muted}
          returnKeyType="search"
          autoCorrect={false}
          clearButtonMode="while-editing"
          accessibilityLabel="Search designs"
          style={[styles.searchInput, { color: colors.text }]}
        />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipRow}
        contentContainerStyle={styles.chips}
        accessibilityRole="radiogroup"
        accessibilityLabel="Style"
      >
        {FILTERS.map((f) => {
          const on = f.id === filter;
          return (
            <Pressable
              key={f.id}
              role="radio"
              accessibilityState={{ selected: on }}
              onPress={() => setFilter(f.id)}
              style={({ pressed }) => [
                styles.chip,
                on
                  ? { backgroundColor: colors.text, borderColor: colors.text }
                  : { borderColor: colors.border },
                { opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Text style={[styles.chipText, { color: on ? colors.background : colors.text }]}>
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function Row({
  design,
  colors,
  first,
  last,
}: {
  design: DesignEntry;
  colors: AppColors;
  first: boolean;
  last: boolean;
}) {
  const built = Boolean(demos[design.id]);
  const href: Href = built
    ? designHref(design.id)
    : { pathname: '/designs/[id]', params: { id: design.id } };
  return (
    <Pressable
      role="link"
      accessibilityHint={design.summary}
      onPress={() => router.push(href)}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? colors.field : colors.card, borderColor: colors.border },
        first && styles.rowFirst,
        last && styles.rowLast,
      ]}
    >
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text numberOfLines={1} style={[styles.rowTitle, { color: colors.text }]}>
            {design.title}
          </Text>
          <Text numberOfLines={1} style={[styles.layout, { color: colors.faint }]}>
            {LAYOUT_LABELS[design.layout]}
          </Text>
        </View>
        <Text numberOfLines={2} style={[styles.summary, { color: colors.muted }]}>
          {design.summary}
        </Text>
      </View>
      <Glyph d={ICONS.chevron} color={colors.faint} size={16} strokeWidth={2.2} />
      {last ? null : <View style={[styles.separator, { backgroundColor: colors.border }]} />}
    </Pressable>
  );
}

function Footer({ colors, bottom }: { colors: AppColors; bottom: number }) {
  return (
    <View style={[styles.footer, { paddingBottom: bottom + 32 }]}>
      <Pressable
        role="link"
        // Cast: typed routes regenerate only when Metro runs.
        onPress={() => router.push('/react-navigation' as Href)}
        style={({ pressed }) => [
          styles.row,
          styles.rowFirst,
          styles.rowLast,
          { backgroundColor: pressed ? colors.field : colors.card, borderColor: colors.border },
        ]}
      >
        <View style={styles.rowBody}>
          <Text style={[styles.rowTitle, { color: colors.text }]}>React Navigation</Text>
          <Text style={[styles.summary, { color: colors.muted }]}>
            Every design under @react-navigation/bottom-tabs, without Expo Router.
          </Text>
        </View>
        <Glyph d={ICONS.chevron} color={colors.faint} size={16} strokeWidth={2.2} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16 },
  header: { gap: 14, paddingBottom: 8 },
  title: { fontSize: 34, fontWeight: '700', letterSpacing: 0.3 },
  lede: { fontSize: 15, lineHeight: 21, marginTop: -6 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 38,
    paddingHorizontal: 10,
    borderRadius: 11,
    borderCurve: 'continuous',
  },
  searchInput: { flex: 1, fontSize: 17, paddingVertical: 0, outlineStyle: 'none' } as object,
  chipRow: { flexGrow: 0, marginHorizontal: -16 },
  chips: { gap: 8, paddingHorizontal: 16 },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipText: { fontSize: 14, fontWeight: '500' },
  sectionHeader: { gap: 2, paddingTop: 26, paddingBottom: 10, paddingHorizontal: 4 },
  sectionTitle: { fontSize: 20, fontWeight: '700' },
  count: { fontSize: 15, fontWeight: '500', fontVariant: ['tabular-nums'] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingLeft: 16,
    paddingRight: 12,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  rowFirst: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  rowLast: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  rowBody: { flex: 1, gap: 3 },
  rowTop: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  rowTitle: { flexShrink: 1, fontSize: 16, fontWeight: '600' },
  layout: { marginLeft: 'auto', fontSize: 12, fontWeight: '500' },
  summary: { fontSize: 13.5, lineHeight: 18.5 },
  separator: {
    position: 'absolute',
    left: 16,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
  },
  empty: { fontSize: 15, textAlign: 'center', paddingVertical: 40 },
  footer: { paddingTop: 28 },
});
