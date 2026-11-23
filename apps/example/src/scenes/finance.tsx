/**
 * An investing app: the balance with today's change and a chart, the holdings list (from the
 * Ambient Bar demo) and a watchlist. Companies are invented.
 *
 * Marks are monochrome by default. With `vivid` (Ambient Bar) they take each company's colour and
 * the changes sit on solid green or red chips, as trading apps draw them, so the bar's in-place
 * blur has colour to carry as rows pass under it.
 */
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import {
  Hairline,
  ICONS,
  num,
  type Palette,
  RoundButton,
  type SceneAction,
  type SceneProps,
  SceneScroll,
  SectionHeader,
  scenePalette,
  turnOf,
  useSceneActions,
} from './kit';

const HOLDINGS = [
  { name: 'Northwind Air', ticker: 'NWA', mark: '#ff2b3a', value: '$4,586.17', change: '+5.2%' },
  { name: 'Bluepeak Radio', ticker: 'BPR', mark: '#2f5bff', value: '$3,869.02', change: '+15.9%' },
  { name: 'Verdant Labs', ticker: 'VRD', mark: '#00c853', value: '$2,758.72', change: '+7.9%' },
  { name: 'Ember Foods', ticker: 'EMB', mark: '#ff7a00', value: '$2,093.84', change: '-4.4%' },
  { name: 'Violet Systems', ticker: 'VIO', mark: '#9b30ff', value: '$1,980.41', change: '+3.1%' },
  { name: 'Harbor Freight', ticker: 'HBF', mark: '#00b8d4', value: '$1,412.33', change: '+8.8%' },
  { name: 'Crimson Energy', ticker: 'CRE', mark: '#e91e63', value: '$1,087.72', change: '-2.6%' },
  { name: 'Sunline Motors', ticker: 'SUN', mark: '#ffc400', value: '$982.10', change: '+21.4%' },
  { name: 'Cobalt Health', ticker: 'CBH', mark: '#3d5afe', value: '$871.55', change: '+0.9%' },
  { name: 'Moss & Pine', ticker: 'MSP', mark: '#2e7d32', value: '$640.01', change: '+12.2%' },
  { name: 'Ruby Logistics', ticker: 'RBL', mark: '#d50000', value: '$512.96', change: '-6.1%' },
  { name: 'Aurora Media', ticker: 'AUR', mark: '#d500f9', value: '$433.20', change: '+4.5%' },
];

const WATCH = [
  { name: 'Quarry & Co', ticker: 'QRY', price: '$118.40', change: '+1.2%' },
  { name: 'Lumen Grid', ticker: 'LMG', price: '$42.07', change: '-0.8%' },
  { name: 'Tidewater', ticker: 'TDW', price: '$76.93', change: '+2.4%' },
  { name: 'Oakline Rail', ticker: 'OKR', price: '$231.15', change: '-1.9%' },
  { name: 'Pebble Bank', ticker: 'PBB', price: '$18.62', change: '+0.3%' },
];

const RANGES = ['1D', '1W', '1M', '3M', '1Y', 'All'];

// One week of prices, in chart units (0 at the top, 100 at the bottom).
const SERIES = [72, 70, 74, 66, 68, 61, 63, 58, 60, 52, 55, 49, 51, 44, 47, 40, 43, 36, 39, 33, 30];

const UP = { text: '#2f9e6a', chip: '#14b85a' };
const DOWN = { text: '#d0483f', chip: '#e0284a' };

/** A change's colour: green or red, or the screen's ink on a flooded tab (Colour Flood's Pay). */
function changeColor(palette: Palette, up: boolean) {
  if (palette.flood) return palette.text;
  return up ? UP.text : DOWN.text;
}

export function FinanceScene(props: SceneProps) {
  const palette = scenePalette('finance', props.scheme, props.themed);
  const vivid = props.vivid ?? false;
  // Slider Sheet's demo opens its sheet from the first holding's row.
  const holding = useSceneActions()?.holding;
  // Each tab starts the holdings somewhere else; Ambient Bar gets three rounds of them, so there
  // is always a mark scrolling under its bar. With the holding action, Northwind Air (the row
  // that opens the sheet) stays first, so it's on screen.
  const start = holding ? 0 : (turnOf(props) * 3) % HOLDINGS.length;
  const turn = [...HOLDINGS.slice(start), ...HOLDINGS.slice(0, start)];
  const rows = (vivid ? [0, 1] : [0]).flatMap((round) =>
    turn.map((row) => ({ ...row, key: `${round}-${row.ticker}` })),
  );
  return (
    <SceneScroll
      scene={props}
      palette={palette}
      accessory={<RoundButton icon={ICONS.search} palette={palette} />}
      // In colour, the holdings come first on every tab, so marks are under the bar from the start.
      lead={vivid ? <Holdings palette={palette} rows={rows} vivid /> : undefined}
      sections={[
        <Summary key="summary" palette={palette} range={turnOf(props)} />,
        ...(vivid
          ? []
          : [
              <Holdings
                key="holdings"
                palette={palette}
                rows={rows}
                vivid={false}
                action={holding}
              />,
            ]),
        <Watchlist key="watch" palette={palette} />,
      ]}
    />
  );
}

function Summary({ palette, range }: { palette: Palette; range: number }) {
  const width = 358;
  const height = 150;
  const step = width / (SERIES.length - 1);
  const points = SERIES.map(
    (v, i) => `${(i * step).toFixed(1)},${((v / 100) * height).toFixed(1)}`,
  );
  const line = `M${points.join(' L')}`;
  const area = `${line} L${width},${height} L0,${height} Z`;
  return (
    <View style={styles.pad}>
      <Text style={[styles.label, { color: palette.subtle }]}>Total balance</Text>
      <Text style={[styles.balance, num, { color: palette.text }]}>$48,215.62</Text>
      <Text style={[styles.change, num, { color: changeColor(palette, true) }]}>
        +$1,204.18 (2.56%) today
      </Text>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={styles.chart}>
        <Defs>
          <LinearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={palette.accent} stopOpacity={0.22} />
            <Stop offset="1" stopColor={palette.accent} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Path d={area} fill="url(#fill)" />
        <Path d={line} stroke={palette.accent} strokeWidth={2} fill="none" />
      </Svg>
      <View style={styles.ranges}>
        {RANGES.map((label, i) => {
          const on = i === (range + 1) % RANGES.length;
          return (
            <View
              key={label}
              style={[styles.range, on ? { backgroundColor: palette.surface } : null]}
            >
              <Text
                style={[
                  styles.rangeText,
                  { color: on ? palette.text : palette.subtle, fontWeight: on ? '600' : '500' },
                ]}
              >
                {label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function Holdings({
  palette,
  rows,
  vivid,
  action,
}: {
  palette: Palette;
  rows: ((typeof HOLDINGS)[number] & { key: string })[];
  vivid: boolean;
  /** Runs from the first holding's row (HOLDINGS[0]), drawn as a button named by the action. */
  action?: SceneAction;
}) {
  return (
    <View>
      <SectionHeader title="Holdings" palette={palette} action="Sort" />
      {rows.map((row, i) => {
        const up = row.change.startsWith('+');
        const tone = up ? UP : DOWN;
        return (
          <View key={row.key}>
            <RowFrame action={row.key === `0-${HOLDINGS[0]?.ticker}` ? action : undefined}>
              <View style={[styles.mark, { backgroundColor: vivid ? row.mark : palette.surface }]}>
                <Text style={[styles.markText, { color: vivid ? '#ffffff' : palette.text }]}>
                  {row.name[0]}
                </Text>
              </View>
              <View style={styles.middle}>
                <Text numberOfLines={1} style={[styles.name, { color: palette.text }]}>
                  {row.name}
                </Text>
                <Text style={[styles.sub, { color: palette.subtle }]}>{row.ticker}</Text>
              </View>
              <View style={styles.right}>
                <Text style={[styles.value, num, { color: palette.text }]}>{row.value}</Text>
                {vivid ? (
                  <View style={[styles.chip, { backgroundColor: tone.chip }]}>
                    <Text style={[styles.chipText, num]}>{row.change}</Text>
                  </View>
                ) : (
                  <Text style={[styles.sub, num, { color: changeColor(palette, up) }]}>
                    {row.change}
                  </Text>
                )}
              </View>
            </RowFrame>
            {i < rows.length - 1 ? <Hairline palette={palette} inset={74} /> : null}
          </View>
        );
      })}
    </View>
  );
}

/** A holding's row: a button running the scene action when one is given, else a plain row. */
function RowFrame({ action, children }: { action?: SceneAction; children: ReactNode }) {
  if (!action) return <View style={styles.row}>{children}</View>;
  return (
    <Pressable
      role="button"
      accessibilityLabel={action.label}
      onPress={action.onPress}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
    >
      {children}
    </Pressable>
  );
}

function Watchlist({ palette }: { palette: Palette }) {
  return (
    <View>
      <SectionHeader title="Watchlist" palette={palette} action="Edit" />
      <View style={[styles.card, { backgroundColor: palette.surface }]}>
        {WATCH.map((row, i) => {
          const up = row.change.startsWith('+');
          return (
            <View key={row.ticker}>
              <View style={styles.watchRow}>
                <View style={styles.middle}>
                  <Text style={[styles.name, { color: palette.text }]}>{row.ticker}</Text>
                  <Text style={[styles.sub, { color: palette.subtle }]}>{row.name}</Text>
                </View>
                <Text style={[styles.value, num, { color: palette.text }]}>{row.price}</Text>
                <Text style={[styles.watchChange, num, { color: changeColor(palette, up) }]}>
                  {row.change}
                </Text>
              </View>
              {i < WATCH.length - 1 ? <Hairline palette={palette} inset={14} /> : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: 16 },
  label: { fontSize: 15 },
  balance: { fontSize: 40, fontWeight: '700', letterSpacing: -0.5, marginTop: 2 },
  change: { fontSize: 15, fontWeight: '600', marginTop: 4 },
  chart: { marginTop: 18 },
  ranges: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  range: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderCurve: 'continuous' },
  rangeText: { fontSize: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  mark: {
    width: 46,
    height: 46,
    borderRadius: 12,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markText: { fontSize: 18, fontWeight: '700' },
  middle: { flex: 1, gap: 2 },
  name: { fontSize: 16, fontWeight: '600' },
  sub: { fontSize: 13 },
  right: { alignItems: 'flex-end', gap: 4 },
  value: { fontSize: 16, fontWeight: '600' },
  chip: { borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  chipText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  card: { marginHorizontal: 16, borderRadius: 14, borderCurve: 'continuous' },
  watchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  watchChange: { width: 56, textAlign: 'right', fontSize: 14, fontWeight: '600' },
});
