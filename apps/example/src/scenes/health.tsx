/**
 * A health and wellbeing app: today's three rings (steps, water, mindful minutes), the week's
 * steps, today's plan and a few audio sessions. Shown behind trackers (Glass Expand and Context
 * Tray's Steps / Water / Plan) and CHANI's Mono Type (Grow, Charts, Audio).
 *
 * The rings and bars are drawn in the scene's text and accent tones, not activity colours, so the
 * bar on top stays the only strong colour on screen.
 */
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import {
  Glyph,
  Hairline,
  ICONS,
  num,
  type Palette,
  Photo,
  RoundButton,
  type SceneProps,
  SceneScroll,
  SectionHeader,
  scenePalette,
} from './kit';
import { PLACES } from './photos';

const RINGS = [
  { label: 'Steps', value: '8,412', goal: 'of 10,000', share: 0.84 },
  { label: 'Water', value: '1.6 L', goal: 'of 2.5 L', share: 0.64 },
  { label: 'Mindful', value: '12 min', goal: 'of 20 min', share: 0.6 },
];

// Steps per day, Monday to Sunday; today is Thursday.
const WEEK = [
  { id: 'mon', day: 'M', steps: 9120 },
  { id: 'tue', day: 'T', steps: 6480 },
  { id: 'wed', day: 'W', steps: 11240 },
  { id: 'thu', day: 'T', steps: 8412 },
  { id: 'fri', day: 'F', steps: 0 },
  { id: 'sat', day: 'S', steps: 0 },
  { id: 'sun', day: 'S', steps: 0 },
];
const TODAY = 3;

const PLAN = [
  { title: 'Morning walk', detail: '7:30 · 20 min', done: true },
  { title: 'Glass of water', detail: '4 of 8 today', done: true },
  { title: 'Stretch', detail: '13:00 · 10 min', done: false },
  { title: 'Wind down', detail: '21:30 · no screens', done: false },
];

const SESSIONS = [
  { title: 'Slow morning', detail: 'Breath · 9 min' },
  { title: 'Walking meditation', detail: 'Outdoors · 15 min' },
  { title: 'Evening wind-down', detail: 'Sleep · 12 min' },
];

export function HealthScene(props: SceneProps) {
  const palette = scenePalette('health', props.scheme, props.themed);
  return (
    <SceneScroll
      scene={props}
      palette={palette}
      accessory={<RoundButton icon={ICONS.plus} palette={palette} />}
      sections={[
        <Rings key="rings" palette={palette} />,
        <Week key="week" palette={palette} />,
        <Plan key="plan" palette={palette} />,
        <Sessions key="sessions" palette={palette} />,
      ]}
    />
  );
}

function Rings({ palette }: { palette: Palette }) {
  return (
    <View>
      <SectionHeader title="Today" palette={palette} action="Thursday" />
      <View style={[styles.card, styles.rings, { backgroundColor: palette.surface }]}>
        {RINGS.map((ring) => (
          <View key={ring.label} style={styles.ring}>
            <Ring share={ring.share} palette={palette} />
            <Text style={[styles.ringValue, num, { color: palette.text }]}>{ring.value}</Text>
            <Text style={[styles.sub, { color: palette.subtle }]}>
              {ring.label} {ring.goal}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Ring({ share, palette }: { share: number; palette: Palette }) {
  const size = 64;
  const stroke = 7;
  const r = (size - stroke) / 2;
  const length = 2 * Math.PI * r;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={palette.subtle}
        strokeOpacity={0.22}
        strokeWidth={stroke}
        fill="none"
      />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={palette.text}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${length * share} ${length}`}
        // Start at twelve o'clock.
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        fill="none"
      />
    </Svg>
  );
}

function Week({ palette }: { palette: Palette }) {
  const most = Math.max(...WEEK.map((d) => d.steps));
  return (
    <View>
      <SectionHeader title="This week" palette={palette} action="Steps" />
      <View style={[styles.card, styles.week, { backgroundColor: palette.surface }]}>
        <View>
          <Text style={[styles.big, num, { color: palette.text }]}>35,252</Text>
          <Text style={[styles.sub, { color: palette.subtle }]}>8,813 a day on average</Text>
        </View>
        <View style={styles.bars}>
          {WEEK.map((d, i) => (
            <View key={d.id} style={styles.barColumn}>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: `${Math.max(4, (d.steps / most) * 100)}%`,
                      backgroundColor: i === TODAY ? palette.text : palette.subtle,
                      opacity: d.steps === 0 ? 0.18 : i === TODAY ? 1 : 0.45,
                    },
                  ]}
                />
              </View>
              <Text
                style={[
                  styles.day,
                  { color: i === TODAY ? palette.text : palette.subtle },
                  i === TODAY && styles.dayToday,
                ]}
              >
                {d.day}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function Plan({ palette }: { palette: Palette }) {
  return (
    <View>
      <SectionHeader title="Plan" palette={palette} action="Edit" />
      <View style={[styles.card, { backgroundColor: palette.surface }]}>
        {PLAN.map((item, i) => (
          <View key={item.title}>
            <View style={styles.planRow}>
              <View
                style={[
                  styles.check,
                  item.done
                    ? { backgroundColor: palette.text, borderColor: palette.text }
                    : { borderColor: palette.subtle },
                ]}
              >
                {item.done ? (
                  <Glyph
                    d="M6.5 12.5l3.5 3.5 7.5-8"
                    size={14}
                    color={palette.background}
                    strokeWidth={2.4}
                  />
                ) : null}
              </View>
              <View style={styles.middle}>
                <Text
                  style={[
                    styles.name,
                    { color: item.done ? palette.subtle : palette.text },
                    item.done && styles.doneText,
                  ]}
                >
                  {item.title}
                </Text>
                <Text style={[styles.sub, num, { color: palette.subtle }]}>{item.detail}</Text>
              </View>
            </View>
            {i < PLAN.length - 1 ? <Hairline palette={palette} inset={52} /> : null}
          </View>
        ))}
      </View>
    </View>
  );
}

function Sessions({ palette }: { palette: Palette }) {
  return (
    <View>
      <SectionHeader title="Listen" palette={palette} action="See all" />
      <View style={styles.sessions}>
        {SESSIONS.map((s, i) => (
          <View key={s.title} style={styles.sessionRow}>
            <Photo source={PLACES[i % PLACES.length]} palette={palette} style={styles.thumb} />
            <View style={styles.middle}>
              <Text style={[styles.name, { color: palette.text }]}>{s.title}</Text>
              <Text style={[styles.sub, { color: palette.subtle }]}>{s.detail}</Text>
            </View>
            <View style={[styles.play, { backgroundColor: palette.surface }]}>
              <Glyph d={ICONS.play} size={16} color={palette.text} fill={palette.text} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, borderRadius: 16, borderCurve: 'continuous' },
  rings: { flexDirection: 'row', paddingVertical: 18, paddingHorizontal: 8 },
  ring: { flex: 1, alignItems: 'center', gap: 4 },
  ringValue: { fontSize: 17, fontWeight: '700', marginTop: 6 },
  week: { padding: 16, gap: 16 },
  big: { fontSize: 30, fontWeight: '700', letterSpacing: -0.4 },
  bars: { flexDirection: 'row', gap: 10, height: 120 },
  barColumn: { flex: 1, alignItems: 'center', gap: 6 },
  barTrack: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 6, borderCurve: 'continuous' },
  day: { fontSize: 12, fontWeight: '500' },
  dayToday: { fontWeight: '700' },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  middle: { flex: 1, gap: 2 },
  name: { fontSize: 16, fontWeight: '600' },
  doneText: { textDecorationLine: 'line-through' },
  sub: { fontSize: 13 },
  sessions: { paddingHorizontal: 16, gap: 14 },
  sessionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumb: { width: 64, height: 64, borderRadius: 12 },
  play: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
