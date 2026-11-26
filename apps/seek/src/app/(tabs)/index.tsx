/**
 * Discover: ask for a film with a still, a clip or a description.
 * - At rest: the orb over one line of copy. Attach a still or open the keyboard and the orb
 *   steps back so nothing sits behind the prompt.
 * - Searching: the still in a glowing frame being analysed, with Cancel search; the bar has
 *   folded into Ask Dock's status pill.
 * - Matches: the question as a message, the orb's answer, the matches as cards with a match
 *   score and a "this one" button; skeleton cards stand in for a moment first.
 * - Found: the picked match as a large card that opens its film page.
 */
import { Orb } from '@registry/ask-dock/ask-dock-orb';
import { toast } from 'expo-hot-toast';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import { useIsFocused } from 'expo-router/react-navigation';
import { Button, Card, Chip, Skeleton, Typography } from 'panelui-native';
import { type ComponentRef, type RefObject, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  FadeIn,
  FadeInDown,
  interpolate,
  ReduceMotion,
  runOnJS,
  useAnimatedKeyboard,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { Analyzing } from '@/components/analyzing';
import { AppHeader, BackHeader, EdgeFade, HeaderBar, Sky, useDockTop } from '@/components/chrome';
import { Display } from '@/components/display';
import { BookmarkIcon, ChevronIcon, CloseIcon, RefreshIcon, ThumbIcon } from '@/components/icons';
import { Press } from '@/components/press';
import { TiltShimmer } from '@/components/tilt-shimmer';
import { film, MATCHES, STILL } from '@/lib/films';
import { cancel, isSaved, newSearch, pick, toggleSaved, useSeek } from '@/lib/search';

export default function Discover() {
  const { phase, query, attachment, picked, status } = useSeek();
  const bottom = useDockTop(true);
  // On Search, the hero orb flies down into the status pill: measured where it stands, then
  // drawn over everything for the flight while the hero's own orb steps aside.
  const heroOrb = useRef<ComponentRef<typeof View>>(null);
  const [flight, setFlight] = useState<Flight | null>(null);
  const reduceMotion = useReducedMotion();
  const busy = status !== null;
  const wasBusy = useRef(busy);
  useEffect(() => {
    if (busy && !wasBusy.current && phase === 'idle' && !reduceMotion) {
      heroOrb.current?.measureInWindow((x, y, width) => setFlight({ x, y, size: width }));
    }
    wasBusy.current = busy;
  }, [busy, phase, reduceMotion]);
  return (
    <View className="flex-1">
      <Sky bright={phase === 'searching'} />
      {phase === 'searching' ? (
        <HeaderBar>
          <View />
          <Button
            variant="outline"
            size="sm"
            onPress={cancel}
            className="rounded-full border-white/15 bg-[#1e285a]/60 px-4"
            endContent={<CloseIcon />}
          >
            Cancel search
          </Button>
        </HeaderBar>
      ) : phase === 'idle' ? (
        <AppHeader />
      ) : (
        <BackHeader title="Search result" backLabel="New search" onBack={newSearch} />
      )}
      {phase === 'idle' ? (
        <Hero attached={attachment !== null} bottom={bottom} orbRef={heroOrb} leaving={busy} />
      ) : phase === 'searching' ? (
        <Analyzing query={query} />
      ) : (
        <Matches query={query} picked={picked} bottom={bottom} />
      )}
      {flight ? <FlyingOrb from={flight} onLanded={() => setFlight(null)} /> : null}
    </View>
  );
}

interface Flight {
  x: number;
  y: number;
  size: number;
}

/**
 * The orb's flight into the status pill: it shrinks from where it stood to the pill's 40 pt orb,
 * falling on a curve (across steadily, down faster at the end), scanning as it goes, and hands
 * over to the pill's own orb as it lands. The landing spot is the pill's first line: Ask Dock's
 * capsule sits 2 pt above the safe area, the pill 52 pt above its centre, and "Looking at your
 * still…" makes the pill about 236 pt wide.
 */
function FlyingOrb({ from, onLanded }: { from: Flight; onLanded: () => void }) {
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(1, FLIGHT, (done) => {
      if (done) runOnJS(onLanded)();
    });
  }, [p, onLanded]);
  const toX = window.width / 2 - 236 / 2 + 20;
  const toY = window.height - insets.bottom - 2 - 65 / 2 - 52;
  const fromX = from.x + from.size / 2;
  const fromY = from.y + from.size / 2;
  const style = useAnimatedStyle(() => {
    const t = p.value;
    return {
      opacity: interpolate(t, [0.82, 1], [1, 0], Extrapolation.CLAMP),
      transform: [
        { translateX: (toX - fromX) * t },
        { translateY: (toY - fromY) * t * t },
        { scale: interpolate(t, [0, 1], [1, 40 / from.size]) },
      ],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.flight,
        { left: from.x, top: from.y, width: from.size, height: from.size },
        style,
      ]}
    >
      <Orb size={from.size} busy />
    </Animated.View>
  );
}

/**
 * The orb over one line of copy. Once a still is attached or the keyboard is up, the orb steps
 * back (smaller, higher) and the line clears.
 */
function Hero({
  attached,
  bottom,
  orbRef,
  leaving,
}: {
  attached: boolean;
  bottom: number;
  orbRef: RefObject<ComponentRef<typeof View> | null>;
  /** A search just started: the orb is in flight, and the line clears. */
  leaving: boolean;
}) {
  const focused = useIsFocused();
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
    <View
      className="flex-1 items-center justify-center gap-10 px-8"
      style={{ paddingBottom: bottom }}
    >
      <Animated.View style={orb}>
        {/* A soft bloom of the orb's own blue behind it. */}
        <Svg
          width={GLOW}
          height={GLOW}
          style={[styles.glow, leaving ? styles.away : null]}
          pointerEvents="none"
        >
          <Defs>
            <RadialGradient id="orbGlow" cx="0.5" cy="0.5" r="0.5">
              <Stop offset="0.28" stopColor="#2a5bff" stopOpacity={0.42} />
              <Stop offset="0.6" stopColor="#3a2bd8" stopOpacity={0.12} />
              <Stop offset="1" stopColor="#3a2bd8" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={GLOW / 2} cy={GLOW / 2} r={GLOW / 2} fill="url(#orbGlow)" />
        </Svg>
        {/* It drifts and blinks only while Discover is on screen. */}
        <View ref={orbRef} collapsable={false} style={leaving ? styles.away : null}>
          <Orb size={150} alive={focused} />
        </View>
      </Animated.View>
      <Animated.View style={[line, leaving ? styles.away : null]}>
        <Display size={33} align="center">
          Show me a still or a clip,{'\n'}and I'll{' '}
          <Display size={33} italic>
            find the film.
          </Display>
        </Display>
      </Animated.View>
    </View>
  );
}

function Matches({
  query,
  picked,
  bottom,
}: {
  query: string;
  picked: string | null;
  bottom: number;
}) {
  // Skeleton cards hold the places for a moment, as a real search would while it loads.
  const window = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 950);
    return () => clearTimeout(timer);
  }, []);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  useEffect(() => {
    if (picked) setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 60);
  }, [picked]);
  return (
    <EdgeFade bottom={bottom}>
      <ScrollView
        ref={scroll}
        contentContainerStyle={{
          gap: 12,
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: bottom + 64,
        }}
      >
        <View className="items-end gap-2">
          <View style={styles.askedThumb}>
            <Image source={STILL} style={StyleSheet.absoluteFill} contentFit="cover" />
          </View>
          <View className="rounded-[18px] bg-white/10 px-3.5 py-2.5">
            <Typography type="body-sm" className="text-[15px]">
              {query}
            </Typography>
          </View>
        </View>
        <Reply title="I found a few matches">
          These scenes look like your still. Pick the one you're after.
        </Reply>
        {loading
          ? MATCHES.map((m, i) => (
              <View
                key={m.id}
                className="ml-11 h-[88px] flex-row items-center gap-3.5 overflow-hidden rounded-[22px] bg-white/5 p-2"
              >
                <Skeleton className="h-[72px] w-[52px] rounded-xl" />
                <View className="flex-1 gap-2">
                  <Skeleton className="h-4 w-32 rounded-md" />
                  <Skeleton className="h-3 w-44 rounded-md" />
                </View>
                <TiltShimmer width={window.width - 84} delay={i * 140} />
              </View>
            ))
          : MATCHES.map((m, i) => (
              <Animated.View
                key={m.id}
                entering={FadeInDown.delay(70 * i)
                  .duration(260)
                  .reduceMotion(ReduceMotion.System)}
                className="flex-row items-center gap-3"
              >
                <MatchRow id={m.id} match={m.match} />
                <Button
                  variant="secondary"
                  size="icon"
                  accessibilityLabel={`${film(m.id).title} is the one`}
                  onPress={() => pick(m.id)}
                  className={
                    picked === m.id
                      ? 'rounded-full border-white bg-white'
                      : 'rounded-full border-white/15 bg-white/10'
                  }
                >
                  <ThumbIcon
                    color={picked === m.id ? '#0b0f1e' : '#ffffff'}
                    filled={picked === m.id}
                  />
                </Button>
              </Animated.View>
            ))}
        {picked ? (
          <Found id={picked} match={MATCHES.find((m) => m.id === picked)?.match ?? 0} />
        ) : loading ? null : (
          <Animated.View entering={FadeIn.delay(240).duration(260)} className="ml-11 mt-2 gap-3">
            <Typography type="body" weight="medium">
              Not among these?
            </Typography>
            <Button
              variant="outline"
              onPress={newSearch}
              className="rounded-full border-white/15 bg-[#1e285a]/60"
              endContent={<RefreshIcon />}
            >
              Try another search
            </Button>
          </Animated.View>
        )}
      </ScrollView>
    </EdgeFade>
  );
}

/** The orb's answer: its face beside a title and a line of text. */
function Reply({ title, children }: { title: string; children?: string }) {
  return (
    <View className="mt-3 flex-row gap-2.5">
      <Orb size={34} alive={false} />
      <View className="flex-1 gap-1">
        <Typography type="large">{title}</Typography>
        {children ? (
          <Typography type="body" muted className="leading-[21px]">
            {children}
          </Typography>
        ) : null}
      </View>
    </View>
  );
}

/** One match: poster, title, year and genre, its score, and a chevron to its page. */
function MatchRow({ id, match }: { id: string; match: number }) {
  const f = film(id);
  return (
    <Link href={`/film/${id}`} asChild>
      <Press accessibilityLabel={`${f.title}, ${match}% match`} style={styles.row}>
        <Card className="flex-row items-center gap-3.5 rounded-[22px] border-white/10 bg-white/[0.07] p-2 pr-3">
          <Link.AppleZoom>
            <Image source={f.poster} style={styles.poster} contentFit="cover" />
          </Link.AppleZoom>
          <View className="flex-1 gap-1">
            <View className="flex-row items-center justify-between gap-2">
              <Typography type="large" numberOfLines={1} className="flex-1">
                {f.title}
              </Typography>
              {/* A strong match reads in the accent; a weak one stays quiet. */}
              <Chip
                size="sm"
                className={
                  match >= 60
                    ? 'border-[#5b7cff]/50 bg-[#1f5bff]/35'
                    : 'border-white/10 bg-white/10'
                }
              >
                <Chip.Label className="text-white tabular-nums">{`${match}%`}</Chip.Label>
              </Chip>
            </View>
            <View className="flex-row items-center justify-between">
              <Typography type="body-sm" muted>
                {`${f.year} · Film · ${f.genre}`}
              </Typography>
              <ChevronIcon color="rgba(255,255,255,0.7)" />
            </View>
          </View>
        </Card>
      </Press>
    </Link>
  );
}

/** "Found it": the picked film as a large card that opens its page. */
function Found({ id, match }: { id: string; match: number }) {
  const f = film(id);
  const [saved, setSaved] = useState(isSaved(id));
  return (
    <Animated.View
      entering={FadeInDown.duration(320).reduceMotion(ReduceMotion.System)}
      className="gap-3"
    >
      <Reply title="Found it. That's the one." />
      <Link href={`/film/${id}`} asChild>
        <Press accessibilityLabel={`Open ${f.title}`} style={styles.foundPress} scale={0.98}>
          <Link.AppleZoom>
            <View style={styles.found}>
              <Image source={f.hero} style={StyleSheet.absoluteFill} contentFit="cover" />
              <LinearGradient
                colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.15)', 'rgba(2,4,15,0.92)']}
                locations={[0, 0.45, 1]}
                style={StyleSheet.absoluteFill}
              />
              <View className="flex-row items-start justify-between p-3">
                <Chip size="md" className="border-white/15 bg-black/35">
                  <Chip.Label className="text-white">{`${match}% visual match`}</Chip.Label>
                </Chip>
                <Button
                  variant="secondary"
                  size="icon"
                  accessibilityLabel={saved ? 'Remove from collection' : 'Save to collection'}
                  onPress={() => {
                    toggleSaved(id);
                    setSaved(!saved);
                    if (!saved) toast.success('Saved to Collection', { description: f.title });
                  }}
                  className="rounded-full border-white/20 bg-black/30"
                >
                  <BookmarkIcon filled={saved} />
                </Button>
              </View>
              <View className="flex-1" />
              <View className="gap-1.5 p-4">
                <Typography type="body-sm" className="text-white/80">
                  {`– ${f.director.name}`}
                </Typography>
                <Display size={42} className="text-white">
                  {f.title}
                </Display>
                <View className="flex-row gap-1.5">
                  {[String(f.year), 'Film', f.genre].map((tag) => (
                    <Chip key={tag} size="sm" className="border-white/15 bg-white/10">
                      <Chip.Label className="text-white">{tag}</Chip.Label>
                    </Chip>
                  ))}
                </View>
              </View>
            </View>
          </Link.AppleZoom>
        </Press>
      </Link>
      <Typography type="body" muted className="ml-11 mt-1 leading-[21px]">
        Want to find another? Add a still or a clip and I'll name it.
      </Typography>
    </Animated.View>
  );
}

const GLOW = 360;
const FLIGHT = {
  duration: 520,
  easing: Easing.bezier(0.45, 0, 0.2, 1),
  reduceMotion: ReduceMotion.System,
};
const STEP = { duration: 360, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System };

const styles = StyleSheet.create({
  flight: { position: 'absolute' },
  away: { opacity: 0 },
  glow: { position: 'absolute', left: (150 - GLOW) / 2, top: (150 - GLOW) / 2 },
  row: { flex: 1, marginLeft: 44 },
  foundPress: { marginLeft: 44 },
  askedThumb: {
    width: 104,
    height: 98,
    borderRadius: 18,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  poster: { width: 52, height: 72, borderRadius: 12 },
  found: {
    height: 300,
    borderRadius: 26,
    borderCurve: 'continuous',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: 'rgba(255,255,255,0.12)',
  },
});
