/**
 * A maps app: a drawn city map under the whole screen (blocks, streets, a river, parks, pins and
 * where you are), the chosen place in a card above the bar, and places nearby below the map.
 * Drawn with react-native-svg, no map SDK. Places and streets are invented.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated from 'react-native-reanimated';
import Svg, { Circle, G, Path, Rect, Text as SvgText } from 'react-native-svg';

import {
  Glyph,
  Hairline,
  Hidden,
  ICONS,
  LargeTitle,
  num,
  type Palette,
  Photo,
  RoundButton,
  rotate,
  type SceneProps,
  SearchField,
  SectionHeader,
  scenePalette,
  turnOf,
  useSceneTop,
} from './kit';
import { PLACES } from './photos';

const SPOTS = [
  {
    name: 'Café Arden',
    kind: 'Café',
    walk: '4 min',
    rating: '4.7',
    reviews: '1,204',
    hours: 'Open until 22:00',
  },
  {
    name: 'The Corner House',
    kind: 'Restaurant',
    walk: '9 min',
    rating: '4.5',
    reviews: '862',
    hours: 'Open until 23:30',
  },
  {
    name: 'Long Table',
    kind: 'Bakery',
    walk: '12 min',
    rating: '4.8',
    reviews: '2,310',
    hours: 'Closes at 18:00',
  },
];

// Pins in map units (the map is drawn 600 x 1000, then moved per tab).
const PINS = [
  { x: 210, y: 470, label: 'Café Arden', place: 0 },
  { x: 360, y: 330, label: 'The Corner House', place: 1 },
  { x: 150, y: 640, label: 'Long Table', place: 2 },
  { x: 430, y: 560, label: 'Mill Park' },
  { x: 300, y: 760, label: 'Harbor Market' },
];

const STREETS = [
  { name: 'HARBOR STREET', x: 20, y: 398 },
  { name: 'ELM AVENUE', x: 420, y: 758 },
];

export function MapsScene(props: SceneProps) {
  const palette = scenePalette('maps', props.scheme, props.themed);
  const { width, height } = useWindowDimensions();
  const top = useSceneTop();
  const chosen = PINS[turnOf(props) % 3] ?? PINS[0];
  // Each tab looks at another part of the map, centred on its chosen place.
  const dx = width / 2 - (chosen?.x ?? 0);
  const dy = height * 0.46 - (chosen?.y ?? 0);
  const spot = SPOTS[chosen?.place ?? 0] ?? SPOTS[0];
  return (
    <Animated.ScrollView
      style={[styles.flex, { backgroundColor: palette.background }]}
      contentContainerStyle={{ paddingBottom: props.barHeight + 24 }}
      showsVerticalScrollIndicator={false}
      onScroll={props.onScroll}
      scrollEventThrottle={16}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ height }}>
        <Hidden style={StyleSheet.absoluteFill}>
          <CityMap
            palette={palette}
            width={width}
            height={height}
            dx={dx}
            dy={dy}
            chosen={turnOf(props) % 3}
          />
          <LinearGradient
            pointerEvents="none"
            colors={[palette.background, fade(palette.background)]}
            locations={[0.45, 1]}
            style={[styles.topShade, { height: top + 170 }]}
          />
        </Hidden>
        <View style={{ paddingTop: top }}>
          {props.nav}
          <Hidden>
            <LargeTitle
              title={props.title}
              palette={palette}
              accessory={<RoundButton icon={ICONS.sliders} palette={palette} />}
            />
            <SearchField label="Search places" palette={palette} />
          </Hidden>
          {props.children}
        </View>
        {spot ? (
          <Hidden style={[styles.cardWrap, { bottom: props.barHeight + 14 }]}>
            <PlaceCard spot={spot} photo={PLACES[chosen?.place ?? 0]} palette={palette} />
          </Hidden>
        ) : null}
      </View>
      <Hidden style={styles.below}>
        <Nearby palette={palette} index={turnOf(props)} />
      </Hidden>
    </Animated.ScrollView>
  );
}

/** The same colour, fully transparent, for the end of a fade (any colour it can't read: none). */
function fade(color: string) {
  return /^#[0-9a-f]{6}$/i.test(color) ? `${color}00` : 'transparent';
}

function CityMap({
  palette,
  width,
  height,
  dx,
  dy,
  chosen,
}: {
  palette: Palette;
  width: number;
  height: number;
  dx: number;
  dy: number;
  chosen: number;
}) {
  const ink = palette.text;
  const blocks: { x: number; y: number; w: number; h: number }[] = [];
  for (let col = -2; col < 10; col++) {
    for (let row = -2; row < 14; row++) {
      const w = col % 3 === 1 ? 52 : 64;
      const h = row % 4 === 2 ? 60 : 78;
      blocks.push({ x: col * 76, y: row * 90, w, h });
    }
  }
  return (
    <Svg width={width} height={height}>
      <Rect x={0} y={0} width={width} height={height} fill={palette.background} />
      <G transform={`translate(${dx} ${dy})`}>
        <G transform="rotate(-14 300 500)">
          {blocks.map((b) => (
            <Rect
              key={`${b.x},${b.y}`}
              x={b.x}
              y={b.y}
              width={b.w}
              height={b.h}
              rx={4}
              fill={ink}
              fillOpacity={palette.dark ? 0.07 : 0.05}
            />
          ))}
          {/* Parks. */}
          <Rect
            x={380}
            y={450}
            width={140}
            height={170}
            rx={10}
            fill="#6f8f62"
            fillOpacity={0.24}
          />
          <Rect
            x={-80}
            y={180}
            width={130}
            height={150}
            rx={10}
            fill="#6f8f62"
            fillOpacity={0.24}
          />
          {/* Avenues. */}
          <Path
            d="M-200 405 H900 M-200 765 H900 M288 -300 V1400"
            stroke={palette.surface}
            strokeWidth={11}
          />
          <Path
            d="M-200 405 H900 M-200 765 H900 M288 -300 V1400"
            stroke={ink}
            strokeOpacity={0.08}
            strokeWidth={1}
          />
          {STREETS.map((street) => (
            <SvgText
              key={street.name}
              x={street.x}
              y={street.y}
              fontSize={11}
              fontWeight="600"
              fill={palette.subtle}
            >
              {street.name}
            </SvgText>
          ))}
        </G>
        {/* The bay along the south-west, and a pond in the park to the north-east. */}
        <Path
          d="M-400 520 C -200 560, -40 640, 90 760 S 260 930, 360 1010 S 560 1180, 700 1400 L -400 1400 Z"
          fill="#5f87a8"
          fillOpacity={palette.dark ? 0.32 : 0.3}
        />
        <Path
          d="M470 170 C 520 120, 610 140, 620 205 S 560 290, 500 270 S 430 215, 470 170 Z"
          fill="#5f87a8"
          fillOpacity={palette.dark ? 0.32 : 0.3}
        />
        {/* Where you are. */}
        <Circle cx={250} cy={560} r={34} fill={palette.accent} fillOpacity={0.16} />
        <Circle
          cx={250}
          cy={560}
          r={9}
          fill={palette.accent}
          stroke={palette.surface}
          strokeWidth={3}
        />
        {PINS.map((pin, i) => {
          const on = i === chosen;
          return (
            <G key={pin.label}>
              <Circle
                cx={pin.x}
                cy={pin.y}
                r={on ? 17 : 12}
                fill={on ? palette.text : palette.surface}
                stroke={on ? palette.surface : palette.text}
                strokeOpacity={on ? 1 : 0.25}
                strokeWidth={on ? 3 : 1}
              />
              <Circle cx={pin.x} cy={pin.y} r={on ? 5 : 3.5} fill={on ? palette.surface : ink} />
              {/* The label twice: a halo in the map's colour, then the text over it. */}
              <SvgText
                x={pin.x + (on ? 24 : 18)}
                y={pin.y + 4}
                fontSize={on ? 14 : 12}
                fontWeight="600"
                fill={palette.background}
                stroke={palette.background}
                strokeWidth={4}
                strokeLinejoin="round"
              >
                {pin.label}
              </SvgText>
              <SvgText
                x={pin.x + (on ? 24 : 18)}
                y={pin.y + 4}
                fontSize={on ? 14 : 12}
                fontWeight="600"
                fill={palette.text}
              >
                {pin.label}
              </SvgText>
            </G>
          );
        })}
      </G>
    </Svg>
  );
}

function PlaceCard({
  spot,
  photo,
  palette,
}: {
  spot: (typeof SPOTS)[number];
  photo: number;
  palette: Palette;
}) {
  return (
    <View style={[styles.card, { backgroundColor: palette.surface }]}>
      <Photo source={photo} palette={palette} style={styles.cardPhoto} />
      <View style={styles.cardBody}>
        <Text numberOfLines={1} style={[styles.name, { color: palette.text }]}>
          {spot.name}
        </Text>
        <View style={styles.ratingRow}>
          <Glyph d={ICONS.star} color={palette.text} fill={palette.text} size={13} />
          <Text style={[styles.meta, num, { color: palette.subtle }]}>
            {spot.rating} ({spot.reviews}) · {spot.kind}
          </Text>
        </View>
        <Text style={[styles.meta, num, { color: palette.subtle }]}>
          {spot.walk} walk · {spot.hours}
        </Text>
        <View style={[styles.directions, { backgroundColor: palette.text }]}>
          <Text style={[styles.directionsText, { color: palette.surface }]}>Directions</Text>
        </View>
      </View>
    </View>
  );
}

function Nearby({ palette, index }: { palette: Palette; index: number }) {
  const spots = rotate(
    SPOTS.map((spot, i) => ({ ...spot, photo: PLACES[i] })),
    index,
  );
  return (
    <View>
      <SectionHeader title="Nearby" palette={palette} action="See all" />
      <View style={[styles.list, { backgroundColor: palette.surface }]}>
        {spots.map((spot, i) => (
          <View key={spot.name}>
            <View style={styles.row}>
              <Photo source={spot.photo} palette={palette} style={styles.thumb} />
              <View style={styles.flex}>
                <Text style={[styles.name, { color: palette.text }]}>{spot.name}</Text>
                <Text style={[styles.meta, num, { color: palette.subtle }]}>
                  {spot.kind} · {spot.walk} walk · {spot.rating}
                </Text>
              </View>
              <Glyph d={ICONS.chevron} color={palette.subtle} size={18} />
            </View>
            {i < spots.length - 1 ? <Hairline palette={palette} inset={80} /> : null}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topShade: { position: 'absolute', top: 0, left: 0, right: 0 },
  cardWrap: { position: 'absolute', left: 12, right: 12 },
  card: {
    flexDirection: 'row',
    gap: 12,
    padding: 10,
    borderRadius: 18,
    borderCurve: 'continuous',
    boxShadow: '0 6px 24px rgba(0, 0, 0, 0.12)',
  },
  cardPhoto: { width: 104, height: 104, borderRadius: 12 },
  cardBody: { flex: 1, gap: 3, justifyContent: 'center' },
  name: { fontSize: 16, fontWeight: '600' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { fontSize: 13 },
  directions: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },
  directionsText: { fontSize: 14, fontWeight: '600' },
  below: { paddingTop: 24 },
  list: { marginHorizontal: 16, borderRadius: 14, borderCurve: 'continuous' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10 },
  thumb: { width: 58, height: 58, borderRadius: 10 },
});
