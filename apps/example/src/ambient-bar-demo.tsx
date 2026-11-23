/**
 * Ambient Bar's demo screen: a dark list of holdings with saturated marks and green or red
 * figures, scrolling under the bar, so the bar's blur has colour to carry. Names are invented.
 */
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type { DemoExtraProps } from '@/panel-demos';

const HOLDINGS = [
  { name: 'Northwind Air', mark: '#ff2b3a', value: '$4,586,173', change: '+5.2%' },
  { name: 'Bluepeak Radio', mark: '#2f5bff', value: '$3,869,020', change: '+15.9%' },
  { name: 'Verdant Labs', mark: '#00c853', value: '$2,758,724', change: '+79.0%' },
  { name: 'Ember Foods', mark: '#ff7a00', value: '$2,093,848', change: '-14.4%' },
  { name: 'Violet Systems', mark: '#9b30ff', value: '$1,980,412', change: '+3.1%' },
  { name: 'Harbor Freight Co', mark: '#00b8d4', value: '$1,412,330', change: '+8.8%' },
  { name: 'Crimson Energy', mark: '#e91e63', value: '$1,087,723', change: '-2.6%' },
  { name: 'Sunline Motors', mark: '#ffc400', value: '$982,104', change: '+21.4%' },
  { name: 'Cobalt Health', mark: '#3d5afe', value: '$871,550', change: '+0.9%' },
  { name: 'Moss & Pine', mark: '#2e7d32', value: '$640,018', change: '+12.2%' },
  { name: 'Ruby Logistics', mark: '#d50000', value: '$512,960', change: '-6.1%' },
  { name: 'Aurora Media', mark: '#d500f9', value: '$433,207', change: '+44.5%' },
];

export function AmbientBarScreen({ index, barHeight }: DemoExtraProps) {
  // Each tab starts the list somewhere else, so tabs differ; three rounds of it, so there is
  // always something scrolling under the bar.
  const turn = [...HOLDINGS.slice(index * 2), ...HOLDINGS.slice(0, index * 2)];
  const rows = [0, 1, 2].flatMap((round) =>
    turn.map((row) => ({ ...row, key: `${round}-${row.name}` })),
  );
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingBottom: barHeight + 24 }]}
      showsVerticalScrollIndicator={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {rows.map((row) => {
        const up = row.change.startsWith('+');
        return (
          <View key={row.key} style={styles.row}>
            <View style={[styles.mark, { backgroundColor: row.mark }]}>
              <Text style={styles.markText}>{row.name[0]}</Text>
            </View>
            <View style={styles.middle}>
              <Text numberOfLines={1} style={styles.name}>
                {row.name}
              </Text>
              <Text style={styles.sub}>Holding</Text>
            </View>
            <View style={styles.right}>
              <Text style={styles.value}>{row.value}</Text>
              <Text style={[styles.change, { color: up ? '#22e06b' : '#ff3b5c' }]}>
                {row.change}
              </Text>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 8, gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  mark: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markText: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
  middle: { flex: 1, gap: 2 },
  name: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
  sub: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  right: { alignItems: 'flex-end', gap: 2 },
  value: { color: '#ffffff', fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'] },
  change: { fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'] },
});
