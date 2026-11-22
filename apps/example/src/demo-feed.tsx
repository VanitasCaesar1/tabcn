/**
 * Placeholder app content behind a demo's bar, so a screen looks like an app and a glass bar has
 * something to blur: soft gradient media and text bars, with no copy of its own. Each tab gets a
 * layout (a feed, a grid or a list), so switching tabs changes the screen. Colours come from the
 * demo's text colour, so it sits on any background.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, StyleSheet, View } from 'react-native';

/** Soft two-stop gradients for the media blocks: colour for a glass bar to pick up. */
const MEDIA = [
  ['#ffb48a', '#ff7aa8'],
  ['#8fd3ff', '#6c7cff'],
  ['#b8f0c8', '#3fbf8f'],
  ['#ffe08a', '#ff9f43'],
  ['#d7b8ff', '#8a5cf6'],
  ['#9ff0ea', '#2bb3c0'],
] as const;

/** `#rgb`/`#rrggbb` at an opacity; anything else (already rgba) is returned as is. */
function alpha(color: string, a: number) {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color)?.[1];
  if (!hex) return color;
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex;
  const [r, g, b] = [0, 2, 4].map((i) => Number.parseInt(full.slice(i, i + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function Media({ i, style }: { i: number; style: object }) {
  const [from, to] = MEDIA[i % MEDIA.length] as readonly [string, string];
  return (
    <LinearGradient
      colors={[from, to]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.media, style]}
    />
  );
}

/** Two text bars standing in for a title and a caption. */
function Lines({ line, faint, short }: { line: string; faint: string; short?: boolean }) {
  return (
    <View style={styles.lines}>
      <View style={[styles.line, { backgroundColor: line, width: short ? '55%' : '80%' }]} />
      <View style={[styles.line, styles.thin, { backgroundColor: faint, width: '40%' }]} />
    </View>
  );
}

export function DemoFeed({
  index,
  text,
  barHeight,
}: {
  index: number;
  text: string;
  barHeight: number;
}) {
  const card = alpha(text, 0.06);
  const line = alpha(text, 0.16);
  const faint = alpha(text, 0.09);
  const layout = index % 3;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingBottom: barHeight + 24 }]}
      showsVerticalScrollIndicator={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {layout === 0
        ? [0, 1, 2, 3, 4].map((k) => (
            <View key={k} style={[styles.card, { backgroundColor: card }]}>
              <Media i={index * 2 + k} style={styles.hero} />
              <Lines line={line} faint={faint} />
            </View>
          ))
        : layout === 1
          ? [0, 1, 2, 3].map((row) => (
              <View key={row} style={styles.gridRow}>
                {[0, 1].map((col) => (
                  <View key={col} style={[styles.tile, { backgroundColor: card }]}>
                    <Media i={index + row * 2 + col} style={styles.square} />
                    <Lines line={line} faint={faint} short />
                  </View>
                ))}
              </View>
            ))
          : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => (
              <View key={k} style={[styles.row, { backgroundColor: card }]}>
                <Media i={index + k} style={styles.avatar} />
                <Lines line={line} faint={faint} />
              </View>
            ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { gap: 12, paddingHorizontal: 20, paddingTop: 16 },
  card: { borderRadius: 22, borderCurve: 'continuous', padding: 10, gap: 12 },
  media: { borderCurve: 'continuous' },
  hero: { height: 168, borderRadius: 14 },
  gridRow: { flexDirection: 'row', gap: 12 },
  tile: { flex: 1, borderRadius: 20, borderCurve: 'continuous', padding: 8, gap: 10 },
  square: { aspectRatio: 1, borderRadius: 13 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    borderCurve: 'continuous',
    padding: 10,
  },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  lines: { flex: 1, gap: 7, paddingHorizontal: 4, paddingBottom: 4 },
  line: { height: 10, borderRadius: 5 },
  thin: { height: 8, borderRadius: 4 },
});
