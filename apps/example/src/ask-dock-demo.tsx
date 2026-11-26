/**
 * Ask Dock's demo: a film finder on a night sky. Discover has the prompt: add a still (or a clip)
 * and the orb steps back to make room; press Search and the bar folds into the orb's status pill
 * while the screen analyses the still, then unfolds as the matches come in. The pill, or "Cancel
 * search", stops it. Collection and History are plain screens with the prompt put away.
 * The films are made up. Photos: Unsplash via Lorem Picsum (assets/ask-dock/SOURCES.md).
 */
import { AskDock } from '@registry/ask-dock/ask-dock';
import { Orb } from '@registry/ask-dock/ask-dock-orb';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useSyncExternalStore } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  FadeIn,
  FadeInDown,
  FadeOut,
  interpolate,
  ReduceMotion,
  useAnimatedKeyboard,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Path, Stop, LinearGradient as SvgGradient } from 'react-native-svg';
import { useTabBar } from 'react-native-tabcn';

const STILL = require('../assets/ask-dock/still.jpg');
const AVATAR = require('../assets/ask-dock/avatar.jpg');
const POSTERS = {
  dust: require('../assets/ask-dock/dust-meridian.jpg'),
  orbit: require('../assets/ask-dock/red-orbit.jpg'),
  harbour: require('../assets/ask-dock/glass-harbour.jpg'),
  ferry: require('../assets/ask-dock/night-ferry.jpg'),
  tide: require('../assets/ask-dock/low-tide.jpg'),
  sun: require('../assets/ask-dock/paper-sun.jpg'),
  field: require('../assets/ask-dock/long-field.jpg'),
};

// The demo's state, shared by the bar and the screens.

type Phase = 'idle' | 'searching' | 'results';
interface State {
  phase: Phase;
  status: string | null;
  attachment: 'photo' | 'video' | null;
  query: string;
}

let state: State = { phase: 'idle', status: null, attachment: null, query: '' };
const listeners = new Set<() => void>();
const set = (next: Partial<State>) => {
  state = { ...state, ...next };
  for (const listener of listeners) listener();
};
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const useDemoState = () => useSyncExternalStore(subscribe, () => state);

let timers: ReturnType<typeof setTimeout>[] = [];
const clearTimers = () => {
  for (const timer of timers) clearTimeout(timer);
  timers = [];
};

/**
 * The search: three status lines, then the matches. The screen changes a moment after the bar
 * folds, and the matches show a moment after it unfolds, so each motion has the frame to itself.
 */
function search(text: string) {
  clearTimers();
  const what = state.attachment === 'video' ? 'clip' : 'still';
  set({ query: text || `What film is this ${what} from?`, status: `Looking at your ${what}…` });
  const step = (at: number, next: Partial<State>) => timers.push(setTimeout(() => set(next), at));
  step(450, { phase: 'searching' });
  step(1700, { status: 'Taking a closer look…' });
  step(3100, { status: 'Matching 1,204 scenes…' });
  step(4500, { status: null, attachment: null });
  step(4950, { phase: 'results' });
}

function cancel() {
  clearTimers();
  set({ phase: 'idle', status: null });
}

export function AskDockDemoBar() {
  const { activeIndex } = useTabBar();
  const { status, attachment } = useDemoState();
  return (
    <AskDock
      showPrompt={activeIndex === 0}
      status={status}
      onStatusPress={cancel}
      prompt={{
        placeholder: 'Describe a film, or paste a clue…',
        onSend: search,
        onAddPhoto: () => set({ attachment: 'photo' }),
        onAddVideo: () => set({ attachment: 'video' }),
        attachment: attachment
          ? {
              preview: <Image source={STILL} style={StyleSheet.absoluteFill} contentFit="cover" />,
              label: attachment === 'video' ? 'Clip from your library' : 'Still from your library',
              onRemove: () => set({ attachment: null }),
            }
          : undefined,
      }}
    />
  );
}

/** The screens: a night sky that lightens towards the bar, and each tab's page on it. */
export function AskDockScreen({ index }: { index: number }) {
  const insets = useSafeAreaInsets();
  const { phase, query, attachment } = useDemoState();
  const searching = index === 0 && phase === 'searching';
  // Discover clears the prompt; the other tabs clear only the tab capsule.
  const bottom = insets.bottom + (index === 0 ? 236 : 100);
  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={['#000000', '#02040f', '#071346', '#1a46b4', '#7fa6dc']}
        locations={[0, 0.42, 0.68, 0.88, 1]}
        style={StyleSheet.absoluteFill}
      />
      {/* While a search runs, the sky brightens from the bottom, as in the reference. */}
      {searching ? (
        <Animated.View
          entering={FadeIn.duration(320).reduceMotion(ReduceMotion.System)}
          exiting={FadeOut.duration(220).reduceMotion(ReduceMotion.System)}
          style={StyleSheet.absoluteFill}
        >
          <LinearGradient
            colors={['rgba(0,0,0,0)', 'rgba(20,70,190,0.55)', 'rgba(170,200,235,0.85)']}
            locations={[0.35, 0.62, 1]}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      ) : null}
      <Stars />
      <View style={{ paddingTop: insets.top }}>
        {searching ? (
          <View style={styles.header}>
            <View />
            <CancelButton />
          </View>
        ) : index === 0 && phase === 'results' ? (
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="New search"
                onPress={() => set({ phase: 'idle', query: '' })}
                style={({ pressed }) => [styles.round, pressed ? styles.pressed : null]}
              >
                <Svg width={20} height={20} viewBox="0 0 24 24">
                  <Path
                    d="M 19 12 H 5 M 11 5.5 L 4.5 12 L 11 18.5"
                    stroke="#ffffff"
                    strokeWidth={1.9}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </Svg>
              </Pressable>
              <Text style={styles.pageTitle}>Search result</Text>
            </View>
          </View>
        ) : (
          <Header />
        )}
      </View>
      {index === 0 ? (
        phase === 'idle' ? (
          <Hero bottom={bottom} attached={attachment !== null} />
        ) : phase === 'searching' ? (
          <Analyzing query={query} />
        ) : (
          <Results query={query} bottom={bottom} />
        )
      ) : index === 1 ? (
        <Collection bottom={bottom} />
      ) : (
        <History bottom={bottom} />
      )}
    </View>
  );
}

/** The app's mark and name, and the viewer's photo in a white ring. */
function Header() {
  return (
    <View style={styles.header}>
      <View style={styles.brand}>
        <Mark />
        <Text style={styles.brandText}>Seek</Text>
      </View>
      <View style={styles.avatarRing}>
        <Image source={AVATAR} style={styles.avatar} accessibilityLabel="Your profile" />
      </View>
    </View>
  );
}

/** Three four-pointed sparks in one blue-to-violet gradient: the app's mark. */
function Mark() {
  const spark = (cx: number, cy: number, r: number) =>
    `M ${cx} ${cy - r} Q ${cx + r * 0.16} ${cy - r * 0.16} ${cx + r} ${cy} Q ${cx + r * 0.16} ${cy + r * 0.16} ${cx} ${cy + r} Q ${cx - r * 0.16} ${cy + r * 0.16} ${cx - r} ${cy} Q ${cx - r * 0.16} ${cy - r * 0.16} ${cx} ${cy - r} Z`;
  return (
    <Svg width={30} height={30} viewBox="0 0 30 30">
      <Defs>
        <SvgGradient id="seekMark" x1="0" y1="1" x2="1" y2="0">
          <Stop offset="0" stopColor="#2f6bff" />
          <Stop offset="0.55" stopColor="#4a4dff" />
          <Stop offset="1" stopColor="#8a3dff" />
        </SvgGradient>
      </Defs>
      <Path d={spark(12, 17, 10.5)} fill="url(#seekMark)" />
      <Path d={spark(23.5, 7.5, 5.2)} fill="url(#seekMark)" />
      <Path d={spark(24, 22.5, 3.6)} fill="url(#seekMark)" />
    </Svg>
  );
}

/**
 * The empty state: the orb over one line of copy. Once a still is attached or the keyboard is
 * up, the orb steps back (smaller, higher) and the line clears, so nothing sits behind the prompt.
 */
function Hero({ bottom, attached }: { bottom: number; attached: boolean }) {
  const keyboard = useAnimatedKeyboard();
  const room = useSharedValue(attached ? 1 : 0);
  useEffect(() => {
    room.value = withTiming(attached ? 1 : 0, STEP);
  }, [attached, room]);
  const orb = useAnimatedStyle(() => {
    const k = Math.max(
      room.value,
      interpolate(keyboard.height.value, [0, 220], [0, 1], Extrapolation.CLAMP),
    );
    return {
      transform: [
        { translateY: interpolate(k, [0, 1], [0, -70]) },
        { scale: interpolate(k, [0, 1], [1, 0.66]) },
      ],
    };
  });
  const line = useAnimatedStyle(() => {
    const k = Math.max(
      room.value,
      interpolate(keyboard.height.value, [0, 220], [0, 1], Extrapolation.CLAMP),
    );
    return {
      opacity: interpolate(k, [0, 0.5], [1, 0], Extrapolation.CLAMP),
      transform: [{ translateY: interpolate(k, [0, 1], [0, -40]) }],
    };
  });
  return (
    <View style={[styles.hero, { paddingBottom: bottom }]}>
      <Animated.View style={orb}>
        <Orb size={150} />
      </Animated.View>
      <Animated.Text style={[styles.headline, line]}>
        Show me a still or a clip,{'\n'}and I'll find the film.
      </Animated.Text>
    </View>
  );
}

function CancelButton() {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Cancel search"
      onPress={cancel}
      style={({ pressed }) => [styles.cancel, pressed ? styles.pressed : null]}
    >
      <Text style={styles.cancelText}>Cancel search</Text>
      <Svg width={16} height={16} viewBox="0 0 24 24">
        <Path
          d="M 6 6 L 18 18 M 18 6 L 6 18"
          stroke="#ffffff"
          strokeWidth={1.8}
          strokeLinecap="round"
        />
      </Svg>
    </Pressable>
  );
}

/**
 * The still being analysed: full bleed in a glowing blue-to-violet frame, a band of light
 * sweeping down it, sparks twinkling over it and a magnifier circling at its centre.
 */
function Analyzing({ query }: { query: string }) {
  const reduceMotion = useReducedMotion();
  const sweep = useSharedValue(0);
  const circle = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    sweep.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.quad) }),
      -1,
    );
    circle.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.linear }), -1);
  }, [reduceMotion, sweep, circle]);
  const band = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(sweep.value, [0, 1], [-160, 520]) }],
  }));
  const lens = useAnimatedStyle(() => {
    const a = circle.value * Math.PI * 2;
    return { transform: [{ translateX: Math.cos(a) * 9 }, { translateY: Math.sin(a) * 9 }] };
  });
  return (
    <Animated.View
      entering={FadeInDown.duration(320).reduceMotion(ReduceMotion.System)}
      style={styles.analyzing}
    >
      <Text style={styles.query}>{query}</Text>
      <View style={styles.frameGlow}>
        <LinearGradient
          colors={['#3d6bff', '#5b4dff', '#7a36ff']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.frameRing}
        >
          <View style={styles.frame}>
            <Image source={STILL} style={StyleSheet.absoluteFill} contentFit="cover" />
            {/* The still's pale sky, warmed into the haze the rest of the frame has. */}
            <LinearGradient
              colors={[
                'rgba(120, 52, 14, 0.62)',
                'rgba(120, 52, 14, 0.18)',
                'rgba(10, 6, 30, 0.25)',
              ]}
              locations={[0, 0.42, 1]}
              style={StyleSheet.absoluteFill}
            />
            <Animated.View pointerEvents="none" style={[styles.band, band]}>
              <LinearGradient
                colors={['rgba(120,160,255,0)', 'rgba(150,180,255,0.32)', 'rgba(120,160,255,0)']}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
            {SPARKS.map((spark, i) => (
              <Twinkle
                key={`${spark.x}-${spark.y}`}
                {...spark}
                delay={i * 260}
                still={reduceMotion}
              />
            ))}
            <View style={styles.scan}>
              <Animated.View style={lens}>
                <Svg width={64} height={64} viewBox="0 0 24 24">
                  <Circle
                    cx={10.4}
                    cy={10.4}
                    r={6.4}
                    stroke="#ffffff"
                    strokeWidth={1.5}
                    fill="none"
                  />
                  <Path
                    d="M 15.2 15.2 L 19.8 19.8"
                    stroke="#ffffff"
                    strokeWidth={1.7}
                    strokeLinecap="round"
                  />
                </Svg>
              </Animated.View>
              <Text style={styles.scanText}>Analysing…</Text>
            </View>
          </View>
        </LinearGradient>
      </View>
    </Animated.View>
  );
}

/** Where the sparks sit on the still (percent) and how big they are. */
const SPARKS = [
  { x: 12, y: 12, size: 18 },
  { x: 74, y: 22, size: 30 },
  { x: 34, y: 44, size: 14 },
  { x: 10, y: 60, size: 24 },
  { x: 80, y: 64, size: 16 },
  { x: 24, y: 80, size: 15 },
  { x: 64, y: 84, size: 20 },
];

function Twinkle({
  x,
  y,
  size,
  delay,
  still,
}: {
  x: number;
  y: number;
  size: number;
  delay: number;
  still: boolean;
}) {
  const glow = useSharedValue(still ? 0.8 : 0);
  useEffect(() => {
    if (still) return;
    glow.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 520, easing: Easing.out(Easing.quad) }),
          withTiming(0.15, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
      ),
    );
  }, [still, delay, glow]);
  const style = useAnimatedStyle(() => ({
    opacity: glow.value,
    transform: [{ scale: 0.6 + 0.4 * glow.value }, { rotate: `${glow.value * 45}deg` }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.twinkle, { left: `${x}%`, top: `${y}%`, width: size, height: size }, style]}
    >
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d={sparkPath(10, 13, 9.5)} fill="#ffffff" fillOpacity={0.92} />
        <Path d={sparkPath(20, 4.5, 3.6)} fill="#ffffff" fillOpacity={0.8} />
      </Svg>
    </Animated.View>
  );
}

/** A four-pointed spark: long thin points with concave sides. */
function sparkPath(cx: number, cy: number, r: number) {
  const k = r * 0.12;
  return `M ${cx} ${cy - r} Q ${cx + k} ${cy - k} ${cx + r} ${cy} Q ${cx + k} ${cy + k} ${cx} ${cy + r} Q ${cx - k} ${cy + k} ${cx - r} ${cy} Q ${cx - k} ${cy - k} ${cx} ${cy - r} Z`;
}

const MATCHES = [
  { title: 'Dust Meridian', meta: '2017 · Film · Sci-fi', match: 72, poster: POSTERS.dust },
  { title: 'Red Orbit', meta: '2015 · Film · Adventure', match: 64, poster: POSTERS.orbit },
  { title: 'Glass Harbour', meta: '2014 · Film · Drama', match: 9, poster: POSTERS.harbour },
];

function Results({ query, bottom }: { query: string; bottom: number }) {
  return (
    <ScrollView contentContainerStyle={[styles.page, { paddingBottom: bottom }]}>
      <View style={styles.asked}>
        <View style={styles.askedThumb}>
          <Image source={STILL} style={StyleSheet.absoluteFill} contentFit="cover" />
        </View>
        <Text style={styles.askedText}>{query}</Text>
      </View>
      <View style={styles.reply}>
        <Orb size={34} />
        <View style={styles.replyBody}>
          <Text style={styles.replyTitle}>I found a few matches</Text>
          <Text style={styles.replyText}>
            These scenes look like your still. Pick the one you're after.
          </Text>
        </View>
      </View>
      {MATCHES.map((film, i) => (
        <Animated.View
          key={film.title}
          entering={FadeInDown.delay(80 * i)
            .duration(260)
            .reduceMotion(ReduceMotion.System)}
          style={styles.match}
        >
          <Image source={film.poster} style={styles.matchPoster} contentFit="cover" />
          <View style={styles.matchBody}>
            <Text style={styles.matchTitle}>{film.title}</Text>
            <Text style={styles.matchMeta}>{film.meta}</Text>
          </View>
          <View style={styles.percent}>
            <Text style={styles.percentText}>{film.match}%</Text>
          </View>
        </Animated.View>
      ))}
    </ScrollView>
  );
}

const SAVED = [
  { title: 'Dust Meridian', poster: POSTERS.dust },
  { title: 'Red Orbit', poster: POSTERS.orbit },
  { title: 'Night Ferry', poster: POSTERS.ferry },
  { title: 'Low Tide', poster: POSTERS.tide },
  { title: 'Paper Sun', poster: POSTERS.sun },
  { title: 'The Long Field', poster: POSTERS.field },
];

function Collection({ bottom }: { bottom: number }) {
  return (
    <ScrollView contentContainerStyle={[styles.page, { paddingBottom: bottom }]}>
      <Text style={styles.title}>Collection</Text>
      <View style={styles.grid}>
        {SAVED.map((film) => (
          <View key={film.title} style={styles.cell}>
            <Image source={film.poster} style={styles.gridPoster} contentFit="cover" />
            <Text style={styles.cellTitle}>{film.title}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const PAST = [
  {
    query: 'Lone figure over a hazy city',
    when: 'Today',
    found: 'Dust Meridian',
    poster: POSTERS.dust,
  },
  {
    query: 'Ring of sparks over water',
    when: 'Yesterday',
    found: 'Red Orbit',
    poster: POSTERS.orbit,
  },
  { query: 'Bridge lights in a storm', when: 'Mon', found: 'Night Ferry', poster: POSTERS.ferry },
  { query: 'Orange jellyfish, deep blue', when: 'Sun', found: 'Low Tide', poster: POSTERS.tide },
];

function History({ bottom }: { bottom: number }) {
  return (
    <ScrollView contentContainerStyle={[styles.page, { paddingBottom: bottom }]}>
      <Text style={styles.title}>History</Text>
      {PAST.map((item) => (
        <View key={item.query} style={styles.row}>
          <Image source={item.poster} style={styles.rowThumb} contentFit="cover" />
          <View style={styles.matchBody}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {item.query}
            </Text>
            <Text style={styles.matchMeta}>
              {item.when} · {item.found}
            </Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// Stars at fixed places (a small seeded random).
const STARS = (() => {
  let seed = 7;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  return Array.from({ length: 70 }, () => ({
    x: rand() * 100,
    y: rand() * 92,
    size: 0.8 + rand() * 1.2,
    opacity: 0.2 + rand() * 0.5,
  }));
})();

function Stars() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {STARS.map((star) => (
        <View
          key={`${star.x}-${star.y}`}
          style={[
            styles.star,
            {
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: star.size,
              height: star.size,
              opacity: star.opacity,
            },
          ]}
        />
      ))}
    </View>
  );
}

const STEP = { duration: 360, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System };

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000000' },
  star: { position: 'absolute', borderRadius: 2, backgroundColor: '#ffffff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 64,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandText: { color: '#ffffff', fontSize: 26, fontWeight: '700', letterSpacing: -0.8 },
  avatarRing: { width: 42, height: 42, borderRadius: 21, padding: 2, backgroundColor: '#ffffff' },
  avatar: { width: 38, height: 38, borderRadius: 19 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  round: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  pageTitle: { color: '#ffffff', fontSize: 21, fontWeight: '600', letterSpacing: -0.4 },
  cancel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 44,
    paddingLeft: 18,
    paddingRight: 14,
    borderRadius: 22,
    backgroundColor: 'rgba(30, 40, 90, 0.55)',
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  cancelText: { color: '#ffffff', fontSize: 16, fontWeight: '500' },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 40, paddingHorizontal: 32 },
  headline: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: -0.6,
    lineHeight: 30,
    textAlign: 'center',
  },
  analyzing: { flex: 1, alignItems: 'center', paddingTop: 36, gap: 26, paddingHorizontal: 30 },
  query: {
    color: '#ffffff',
    fontSize: 19,
    fontWeight: '500',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  frameGlow: {
    width: '100%',
    aspectRatio: 0.78,
    borderRadius: 34,
    borderCurve: 'continuous',
    boxShadow: '0 0 28px rgba(96, 84, 255, 0.55)',
  },
  frameRing: { flex: 1, borderRadius: 34, borderCurve: 'continuous', padding: 4 },
  frame: { flex: 1, borderRadius: 30, borderCurve: 'continuous', overflow: 'hidden' },
  band: { position: 'absolute', left: 0, right: 0, height: 150 },
  twinkle: { position: 'absolute' },
  scan: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: 4 },
  scanText: { color: '#ffffff', fontSize: 16, fontWeight: '600', letterSpacing: -0.2 },
  page: { paddingHorizontal: 20, paddingTop: 12, gap: 12 },
  title: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.8,
    marginBottom: 6,
  },
  asked: { alignItems: 'flex-end', gap: 8 },
  askedThumb: {
    width: 104,
    height: 98,
    borderRadius: 18,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  askedText: {
    color: '#ffffff',
    fontSize: 15,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 18,
    overflow: 'hidden',
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  reply: { flexDirection: 'row', gap: 10, marginTop: 10 },
  replyBody: { flex: 1, gap: 4 },
  replyTitle: { color: '#ffffff', fontSize: 17, fontWeight: '600' },
  replyText: { color: 'rgba(255,255,255,0.55)', fontSize: 15, lineHeight: 20 },
  match: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 8,
    paddingRight: 14,
    marginLeft: 44,
    borderRadius: 22,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  matchPoster: { width: 52, height: 72, borderRadius: 12 },
  matchBody: { flex: 1, gap: 4 },
  matchTitle: { color: '#ffffff', fontSize: 18, fontWeight: '600' },
  matchMeta: { color: 'rgba(255,255,255,0.55)', fontSize: 14 },
  percent: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  percentText: { color: '#ffffff', fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
  pressed: { opacity: 0.6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 18 },
  cell: { width: '48%', gap: 8 },
  gridPoster: { width: '100%', aspectRatio: 0.7, borderRadius: 18 },
  cellTitle: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 10,
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  rowThumb: { width: 56, height: 56, borderRadius: 14 },
  rowTitle: { color: '#ffffff', fontSize: 16, fontWeight: '500' },
});
