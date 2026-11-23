/**
 * A store: search, categories, a seasonal edit, a product grid and recently viewed items.
 * Brands, products and prices are invented.
 */
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  Glyph,
  ICONS,
  num,
  type Palette,
  Photo,
  RoundButton,
  rotate,
  type SceneProps,
  SceneScroll,
  SearchField,
  SectionHeader,
  scenePalette,
  turnOf,
  useSceneActions,
} from './kit';
import { PRODUCTS, SHOP_HERO } from './photos';

const ITEMS = [
  { name: 'Porcelain heel', brand: 'Atelier Nove', price: '$148' },
  { name: 'Rangefinder 35', brand: 'Kessler', price: '$389' },
  { name: 'Stamp mug', brand: 'Field & Kiln', price: '$24' },
  { name: 'Desk alarm clock', brand: 'Hollis', price: '$62' },
  { name: 'Portable typewriter', brand: 'Olen', price: '$215' },
  { name: 'Wool blanket scarf', brand: 'Mossgrove', price: '$86' },
  { name: 'Phone 12 mini', brand: 'Refurbished', price: '$329' },
  { name: 'Wireless controller', brand: 'Arcfield', price: '$59' },
];

const CATEGORIES = ['All', 'New in', 'Home', 'Cameras', 'Shoes', 'Gifts under $50'];

export function ShopScene(props: SceneProps) {
  const palette = scenePalette('shop', props.scheme, props.themed);
  const turn = turnOf(props);
  const items = rotate(
    ITEMS.map((item, i) => ({ ...item, photo: i })),
    turn * 2,
  );
  // The add button that carries the action's own label is on the first product of the grid
  // nearest the top.
  const firstGrid = rotate(['hero', 'grid-a', 'recent', 'grid-b'], turn).find((key) =>
    key.startsWith('grid'),
  );
  return (
    <SceneScroll
      scene={props}
      palette={palette}
      gap={26}
      accessory={<RoundButton icon={ICONS.bell} palette={palette} />}
      lead={<Search palette={palette} index={turnOf(props)} />}
      sections={[
        <Hero key="hero" palette={palette} />,
        <Grid
          key="grid-a"
          palette={palette}
          items={items.slice(0, 4)}
          title="Popular now"
          first={firstGrid === 'grid-a'}
        />,
        <Recent key="recent" palette={palette} items={items.slice(4)} />,
        <Grid
          key="grid-b"
          palette={palette}
          items={items.slice(4, 8)}
          title="New this week"
          first={firstGrid === 'grid-b'}
        />,
      ]}
    />
  );
}

function Search({ palette, index }: { palette: Palette; index: number }) {
  return (
    <View style={styles.searchBlock}>
      <SearchField label="Search the shop" palette={palette} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        {CATEGORIES.map((label, i) => {
          const on = i === index % CATEGORIES.length;
          return (
            <View
              key={label}
              style={[
                styles.chip,
                on
                  ? { backgroundColor: palette.text }
                  : { borderColor: palette.subtle, borderWidth: StyleSheet.hairlineWidth },
              ]}
            >
              <Text style={[styles.chipText, { color: on ? palette.background : palette.text }]}>
                {label}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function Hero({ palette }: { palette: Palette }) {
  return (
    <View style={styles.pad}>
      <Photo source={SHOP_HERO} palette={palette} style={styles.hero} />
      <View style={[styles.heroCard, { backgroundColor: palette.surface }]}>
        <Text style={[styles.heroTitle, { color: palette.text }]}>The winter edit</Text>
        <Text style={[styles.small, { color: palette.subtle }]}>
          Wool, leather and cast iron, picked by our buyers.
        </Text>
      </View>
    </View>
  );
}

type Item = (typeof ITEMS)[number] & { photo: number };

function Grid({
  palette,
  items,
  title,
  first,
}: {
  palette: Palette;
  items: Item[];
  title: string;
  first: boolean;
}) {
  const add = useSceneActions()?.addToBag;
  return (
    <View>
      <SectionHeader title={title} palette={palette} action="See all" />
      <View style={styles.grid}>
        {items.map((item, i) => (
          <View key={item.name} style={styles.cell}>
            <View style={styles.productBox}>
              <Photo source={PRODUCTS[item.photo]} palette={palette} style={styles.product} />
              <View style={[styles.save, { backgroundColor: palette.surface }]}>
                <Glyph d={ICONS.heart} color={palette.text} size={17} />
              </View>
              {add ? (
                <Pressable
                  role="button"
                  accessibilityLabel={first && i === 0 ? add.label : `Add ${item.name} to bag`}
                  hitSlop={8}
                  onPress={add.onPress}
                  style={({ pressed }) => [
                    styles.add,
                    { backgroundColor: palette.text, opacity: pressed ? 0.6 : 1 },
                  ]}
                >
                  <Glyph d={ICONS.plus} color={palette.background} size={18} strokeWidth={2.2} />
                </Pressable>
              ) : null}
            </View>
            <Text numberOfLines={1} style={[styles.small, { color: palette.subtle }]}>
              {item.brand}
            </Text>
            <Text numberOfLines={1} style={[styles.name, { color: palette.text }]}>
              {item.name}
            </Text>
            <Text style={[styles.price, num, { color: palette.text }]}>{item.price}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Recent({ palette, items }: { palette: Palette; items: Item[] }) {
  return (
    <View>
      <SectionHeader title="Recently viewed" palette={palette} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.recent}
      >
        {items.map((item) => (
          <View key={item.name} style={[styles.recentRow, { backgroundColor: palette.surface }]}>
            <Photo source={PRODUCTS[item.photo]} palette={palette} style={styles.thumb} />
            <View style={styles.recentText}>
              <Text numberOfLines={1} style={[styles.name, { color: palette.text }]}>
                {item.name}
              </Text>
              <Text style={[styles.small, num, { color: palette.subtle }]}>{item.price}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: 16 },
  searchBlock: { gap: 12 },
  chips: { gap: 8, paddingHorizontal: 16 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },
  chipText: { fontSize: 14, fontWeight: '500' },
  hero: { width: '100%', aspectRatio: 3 / 2, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  heroCard: {
    gap: 4,
    padding: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    borderCurve: 'continuous',
  },
  heroTitle: { fontSize: 22, fontWeight: '700' },
  small: { fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 16 },
  cell: { width: '47%', flexGrow: 1, gap: 2 },
  productBox: { marginBottom: 8 },
  product: { width: '100%', aspectRatio: 9 / 11, borderRadius: 12 },
  save: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  add: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: 15, fontWeight: '500' },
  price: { fontSize: 15, fontWeight: '600', marginTop: 2 },
  recent: { gap: 10, paddingHorizontal: 16 },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: 230,
    padding: 8,
    borderRadius: 14,
    borderCurve: 'continuous',
  },
  thumb: { width: 56, height: 56, borderRadius: 8 },
  recentText: { flex: 1, gap: 2 },
});
