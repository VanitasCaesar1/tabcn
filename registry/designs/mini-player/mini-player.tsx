/**
 * Mini Player: a dark, frosted now-playing strip that peeks out from behind a floating tab bar
 * (artwork, title, artist, play/pause) and opens into a player: large artwork, title,
 * progress, and previous / play / next. Drag the strip up to open it and down to return it,
 * or tap it. Panel states glide on tabcnSpring (no overshoot); the strip and the player's
 * header crossfade, as do the play and pause glyphs. Reduce motion makes every change instant.
 *
 * The card blurs what is behind it on iOS and the web (expo-blur), under a translucent dark
 * fill. Android gets a near-opaque fill instead, with no blur, so it reads the same anywhere.
 * Changed from the reference for clarity: the card was a near-opaque fill with no blur on every
 * platform; it now blurs on iOS and the web, so the screen shows through softly behind it.
 *
 * Place it once under the `TabBarProvider` (beside `<Tabs>`, so it stays across tabs) and
 * drive it with `useTabPanel(id)`: `peek()` when a track starts, `hide()` when it stops.
 * Needs a `GestureHandlerRootView` around the app for dragging.
 * Not drawn while the bar is a rail (Side Rail on tablets): `TabBarRoot` leaves panels out
 * there, so `peek()` and `open()` change its state but show nothing.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { type ReactNode, useEffect } from 'react';
// 'react-native-tabcn/gestures' needs react-native-gesture-handler (an optional peer of tabcn). Importing it
// here names it as this design's own dependency, so `shadcn add` installs it.
import 'react-native-gesture-handler';
import {
  Image,
  type ImageSourcePropType,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import {
  type PanelState,
  TabPanel,
  tabcnTiming,
  usePanelOverlap,
  useTabBar,
  useTabPanel,
} from 'react-native-tabcn';
import { PanelDragArea } from 'react-native-tabcn/gestures';

/**
 * Whether the card draws a blur: iOS and the web (CSS backdrop-filter). Android's blur is costly
 * and uneven, so it gets the near-opaque fill alone.
 */
const BLUR = Platform.OS !== 'android';

const defaultColors = {
  /**
   * The card's fill. Where the card blurs (iOS, web) it sits over the blur at 0.72, so the
   * screen shows through softly while the text stays readable; on Android, with no blur, it is
   * near-opaque (0.94) so it reads the same over any screen. A colour you pass is used as is
   * on every platform.
   */
  background: BLUR ? 'rgba(22, 22, 26, 0.72)' : 'rgba(22, 22, 26, 0.94)',
  /** Hairline edge that catches the light. */
  border: 'rgba(255, 255, 255, 0.12)',
  /** Title, glyphs and the progress fill. */
  foreground: '#ffffff',
  /** Artist, times and the "Now playing" label. */
  muted: 'rgba(235, 235, 245, 0.6)',
  /** Progress track and grabber. */
  track: 'rgba(255, 255, 255, 0.16)',
  /** Square behind missing artwork. */
  artwork: '#2e2e35',
  /** The big play button. */
  control: '#ffffff',
  /** The glyph on the big play button. */
  onControl: '#151517',
};

export type MiniPlayerColors = typeof defaultColors;

const defaultLabels = {
  /** The play button, read by screen readers while paused. */
  play: 'Play',
  /** The same button while playing. */
  pause: 'Pause',
  /** The open player's header. */
  nowPlaying: 'Now playing',
  /** The chevron that returns the open player to its strip. */
  close: 'Close player',
  /** The previous-track button. */
  previous: 'Previous',
  /** The next-track button. */
  next: 'Next',
  /** Hint on the strip, after the track's title and artist. */
  openHint: 'Opens the player',
};

/** The player's words, for translation: pass the ones to change as `labels`. */
export type MiniPlayerLabels = typeof defaultLabels;

export interface MiniPlayerTrack {
  title: string;
  artist: string;
  /** Cover art. Without it, a note glyph on a plain square. */
  artwork?: ImageSourcePropType;
  /** Length in seconds. With `progress`, shows elapsed and remaining time. */
  duration?: number;
}

/** What `renderOpen` gets to draw its own open layout. */
export interface MiniPlayerOpenProps {
  track: MiniPlayerTrack;
  playing: boolean;
  /** 0 to 1. */
  progress: number;
  onPlayPause: () => void;
  onNext: () => void;
  onPrevious?: () => void;
  /** Returns the player to its strip. */
  close: () => void;
  colors: MiniPlayerColors;
}

export interface MiniPlayerProps {
  /** Panel id for `useTabPanel(id)`. Default `'player'`. */
  id?: string;
  /** The track shown: title, artist, and optionally artwork and length. */
  track: MiniPlayerTrack;
  /** Shows the pause glyph while true and the play glyph while false. */
  playing: boolean;
  /** Runs when the play/pause button is pressed. */
  onPlayPause: () => void;
  /** Runs when the next button is pressed. */
  onNext: () => void;
  /** Shown dimmed and disabled when missing. */
  onPrevious?: () => void;
  /** Playback position, 0 to 1. Default 0. */
  progress?: number;
  /**
   * Replaces the default open layout (below the header). The panel has no scroll view, so
   * keep it short enough for a landscape phone: the default shrinks its artwork to fit.
   */
  renderOpen?: (player: MiniPlayerOpenProps) => ReactNode;
  /** State when first mounted. Default `'hidden'`: call `peek()` when a track starts. */
  initialState?: PanelState;
  colors?: Partial<MiniPlayerColors>;
  /** The header text and screen-reader labels, merged over the English defaults. */
  labels?: Partial<MiniPlayerLabels>;
  /** Corner radius of the card. Default 24. */
  radius?: number;
  /** Selection haptic on every button and on tapping the strip. Default true. */
  haptics?: boolean;
}

export function MiniPlayer({ id = 'player', initialState, ...props }: MiniPlayerProps) {
  // How much of the card the bar hides: 16 pt under a floating bar, 0 under a docked one. The
  // strip shows in full above either, with the rest tucked behind the bar.
  const tuck = usePanelOverlap();
  return (
    <TabPanel id={id} peekHeight={STRIP + tuck} initialState={initialState}>
      <Player id={id} tuck={tuck} {...props} />
    </TabPanel>
  );
}

function Player({
  id,
  track,
  playing,
  onPlayPause,
  onNext,
  onPrevious,
  progress = 0,
  renderOpen,
  colors: custom,
  labels: customLabels,
  radius = 24,
  haptics = true,
  tuck,
}: Omit<MiniPlayerProps, 'initialState'> & { id: string; tuck: number }) {
  const colors = { ...defaultColors, ...custom };
  const labels = { ...defaultLabels, ...customLabels };
  const panel = useTabPanel(id);
  const open = panel.state === 'open';
  const fraction = Math.min(1, Math.max(0, progress));
  const artSize = useOpenArtSize(!!track.duration, tuck);

  // The strip and the open header share the top of the card and crossfade.
  const openness = useSharedValue(open ? 1 : 0);
  useEffect(() => {
    openness.value = withTiming(open ? 1 : 0, tabcnTiming);
  }, [open, openness]);
  const stripStyle = useAnimatedStyle(() => ({ opacity: 1 - openness.value }));
  const headerStyle = useAnimatedStyle(() => ({ opacity: openness.value }));

  const withHaptic = (run?: () => void) => () => {
    if (haptics) Haptics.selectionAsync();
    run?.();
  };
  const close = () => {
    if (panel.state === 'open') panel.toggle();
  };

  return (
    <PanelDragArea panel={id}>
      <View style={[styles.card, { borderColor: colors.border, borderRadius: radius }]}>
        {/* The blur (iOS, web), then the fill over it; the card's corners clip both. */}
        {BLUR ? <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} /> : null}
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]}
        />
        <View style={{ height: STRIP + tuck }}>
          {/* Peek strip: the visible part of the card while the panel rests above the bar. */}
          <Animated.View
            pointerEvents={open ? 'none' : 'box-none'}
            importantForAccessibility={open ? 'no-hide-descendants' : 'auto'}
            accessibilityElementsHidden={open}
            style={[styles.strip, stripStyle]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${track.title}, ${track.artist}`}
              accessibilityHint={labels.openHint}
              onPress={withHaptic(panel.open)}
              style={styles.stripMain}
            >
              <Artwork track={track} size={STRIP_ART} radius={9} colors={colors} />
              <View style={styles.stripText}>
                <Text
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.3}
                  style={[styles.stripTitle, { color: colors.foreground }]}
                >
                  {track.title}
                </Text>
                <Text
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.3}
                  style={[styles.stripArtist, { color: colors.muted }]}
                >
                  {track.artist}
                </Text>
              </View>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={playing ? labels.pause : labels.play}
              hitSlop={6}
              onPress={withHaptic(onPlayPause)}
              style={({ pressed }) => [styles.stripButton, pressed && styles.pressed]}
            >
              <PlayPauseGlyph playing={playing} color={colors.foreground} size={22} />
            </Pressable>
          </Animated.View>

          {/* Open header: grabber, label, and a chevron back to the strip. */}
          <Animated.View
            pointerEvents={open ? 'box-none' : 'none'}
            importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}
            accessibilityElementsHidden={!open}
            style={[StyleSheet.absoluteFill, headerStyle]}
          >
            <View style={[styles.grabber, { backgroundColor: colors.track }]} />
            <View style={styles.header}>
              <Text
                maxFontSizeMultiplier={1.3}
                style={[styles.headerLabel, { color: colors.muted }]}
              >
                {labels.nowPlaying}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={labels.close}
                hitSlop={6}
                onPress={withHaptic(close)}
                style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
              >
                <ChevronDownGlyph color={colors.foreground} size={24} />
              </Pressable>
            </View>
          </Animated.View>
        </View>

        {/* Below the strip: clipped out of the panel's window until it opens. */}
        <View
          importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}
          accessibilityElementsHidden={!open}
          style={[styles.body, { paddingBottom: tuck + 20 }]}
        >
          {renderOpen ? (
            renderOpen({
              track,
              playing,
              progress: fraction,
              onPlayPause,
              onNext,
              onPrevious,
              close,
              colors,
            })
          ) : (
            <>
              {artSize > 0 ? (
                <View style={[styles.bigArtFrame, { width: artSize }]}>
                  <Artwork track={track} size="fill" radius={18} colors={colors} />
                </View>
              ) : null}
              <View style={styles.titles}>
                <Text numberOfLines={1} style={[styles.title, { color: colors.foreground }]}>
                  {track.title}
                </Text>
                <Text numberOfLines={1} style={[styles.artist, { color: colors.muted }]}>
                  {track.artist}
                </Text>
              </View>
              <Progress fraction={fraction} duration={track.duration} colors={colors} />
              <View style={styles.controls}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={labels.previous}
                  accessibilityState={{ disabled: !onPrevious }}
                  disabled={!onPrevious}
                  onPress={withHaptic(onPrevious)}
                  style={({ pressed }) => [
                    styles.skip,
                    !onPrevious && styles.disabled,
                    pressed && styles.pressed,
                  ]}
                >
                  <SkipGlyph direction="previous" color={colors.foreground} size={30} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={playing ? labels.pause : labels.play}
                  onPress={withHaptic(onPlayPause)}
                  style={({ pressed }) => [
                    styles.play,
                    { backgroundColor: colors.control },
                    pressed && styles.pressed,
                  ]}
                >
                  <PlayPauseGlyph playing={playing} color={colors.onControl} size={30} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={labels.next}
                  onPress={withHaptic(onNext)}
                  style={({ pressed }) => [styles.skip, pressed && styles.pressed]}
                >
                  <SkipGlyph direction="next" color={colors.foreground} size={30} />
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>
    </PanelDragArea>
  );
}

/**
 * The open player's artwork size. The panel opens upwards from the bar and has no scroll
 * view, so everything above the artwork (the header with its close button) must stay below
 * the top of the screen: the artwork takes what height is left, up to 300 pt, and is dropped
 * when less than MIN_ART is left (a phone in landscape, or very large text).
 */
function useOpenArtSize(hasTimes: boolean, tuck: number) {
  const { height, fontScale } = useWindowDimensions();
  const { insets } = useTabBar();
  // Room for the whole card: from just under the status bar down to the bar's top edge,
  // plus the strip that tucks behind the bar.
  const room = height - insets.top - TOP_MARGIN - insets.bottom - BAR_ALLOWANCE + tuck;
  const text = (TITLE_TEXT + (hasTimes ? TIME_TEXT : 0)) * fontScale;
  const rest = openFixed(tuck) + (hasTimes ? TIME_GAP : 0) + text;
  const art = Math.min(MAX_ART, Math.floor(room - rest));
  return art >= MIN_ART ? art : 0;
}

function Artwork({
  track,
  size,
  radius,
  colors,
}: {
  track: MiniPlayerTrack;
  /** Points, or 'fill' for a square as wide as its parent. */
  size: number | 'fill';
  radius: number;
  colors: MiniPlayerColors;
}) {
  const box =
    size === 'fill'
      ? { width: '100%' as const, aspectRatio: 1, borderRadius: radius }
      : { width: size, height: size, borderRadius: radius };
  if (track.artwork) {
    return (
      <Image
        source={track.artwork}
        accessibilityIgnoresInvertColors
        style={[box, { backgroundColor: colors.artwork }]}
      />
    );
  }
  return (
    <View style={[box, styles.artFallback, { backgroundColor: colors.artwork }]}>
      <NoteGlyph color={colors.muted} size={size === 'fill' ? 64 : size * 0.5} />
    </View>
  );
}

function Progress({
  fraction,
  duration,
  colors,
}: {
  fraction: number;
  duration?: number;
  colors: MiniPlayerColors;
}) {
  const percent = Math.round(fraction * 100);
  return (
    <View style={styles.progress}>
      <View
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: percent }}
        style={[styles.progressTrack, { backgroundColor: colors.track }]}
      >
        <View
          style={[
            styles.progressFill,
            { width: `${fraction * 100}%`, backgroundColor: colors.foreground },
          ]}
        />
      </View>
      {duration ? (
        <View style={styles.times}>
          <Text style={[styles.time, { color: colors.muted }]}>{clock(fraction * duration)}</Text>
          <Text style={[styles.time, { color: colors.muted }]}>
            {/* Rounded up, so elapsed and remaining always add up to the length. */}-
            {clock(Math.ceil(duration - fraction * duration))}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const clock = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/** Play and pause glyphs in one place, crossfading. */
function PlayPauseGlyph({
  playing,
  color,
  size,
}: {
  playing: boolean;
  color: string;
  size: number;
}) {
  const shown = useSharedValue(playing ? 1 : 0);
  useEffect(() => {
    shown.value = withTiming(playing ? 1 : 0, tabcnTiming);
  }, [playing, shown]);
  const pause = useAnimatedStyle(() => ({ opacity: shown.value }));
  const play = useAnimatedStyle(() => ({ opacity: 1 - shown.value }));
  return (
    <View style={{ width: size, height: size }}>
      <Animated.View style={[StyleSheet.absoluteFill, play]}>
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M8 5.6v12.8a1 1 0 0 0 1.53.85l10.07-6.4a1 1 0 0 0 0-1.7L9.53 4.75A1 1 0 0 0 8 5.6Z"
            fill={color}
          />
        </Svg>
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, pause]}>
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x={6} y={5} width={4.2} height={14} rx={1.3} fill={color} />
          <Rect x={13.8} y={5} width={4.2} height={14} rx={1.3} fill={color} />
        </Svg>
      </Animated.View>
    </View>
  );
}

function SkipGlyph({
  direction,
  color,
  size,
}: {
  direction: 'next' | 'previous';
  color: string;
  size: number;
}) {
  // Drawn for "next"; mirrored for "previous".
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <G transform={direction === 'previous' ? 'matrix(-1 0 0 1 24 0)' : undefined}>
        <Path
          d="M5 6.4v11.2a1 1 0 0 0 1.57.82l8.1-5.6a1 1 0 0 0 0-1.64l-8.1-5.6A1 1 0 0 0 5 6.4Z"
          fill={color}
        />
        <Rect x={16.6} y={5.5} width={2.4} height={13} rx={1.2} fill={color} />
      </G>
    </Svg>
  );
}

function ChevronDownGlyph({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M6 9.5l6 6 6-6"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

function NoteGlyph({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M9 17V6.6l10-2.1V15"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Circle cx={6.6} cy={17} r={2.4} fill={color} />
      <Circle cx={16.6} cy={15} r={2.4} fill={color} />
    </Svg>
  );
}

/**
 * The strip's visible row above the bar. The panel peeks this much plus `usePanelOverlap()`,
 * the part tucked behind the bar (16 pt under a floating bar, 0 under a docked one).
 */
const STRIP = 48;
const STRIP_ART = 36;
/** Open artwork: at most this size, and dropped below MIN_ART. */
const MAX_ART = 300;
const MIN_ART = 96;
/** Space the open card keeps from the status bar. */
const TOP_MARGIN = 8;
/** Generous height of a bar above the bottom inset (the bar's own height plus its offset). */
const BAR_ALLOWANCE = 100;
/**
 * The open card without its artwork, at the default text size: the header (strip + tuck),
 * body padding (4 + tuck + 20), the titles' margin and gap (22), the progress margin and track
 * (20), and the controls' margin and play button (78).
 */
const openFixed = (tuck: number) => STRIP + tuck + 4 + tuck + 20 + 22 + 20 + 78;
/** Line heights that grow with Dynamic Type: title and artist; elapsed and remaining times. */
const TITLE_TEXT = 44;
const TIME_TEXT = 14;
/** The gap above the times, only when they show. */
const TIME_GAP = 6;

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  strip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: STRIP,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: (STRIP - STRIP_ART) / 2,
    paddingRight: 8,
  },
  stripMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, height: '100%' },
  stripText: { flex: 1, gap: 1 },
  stripTitle: { fontSize: 14, fontWeight: '600' },
  stripArtist: { fontSize: 12, fontWeight: '500' },
  stripButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  grabber: {
    position: 'absolute',
    top: 8,
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  header: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 20,
    paddingRight: 10,
  },
  headerLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  headerButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 20, paddingTop: 4 },
  bigArtFrame: { maxWidth: '100%', alignSelf: 'center' },
  artFallback: { alignItems: 'center', justifyContent: 'center' },
  titles: { marginTop: 20, gap: 2 },
  title: { fontSize: 20, fontWeight: '700' },
  artist: { fontSize: 15, fontWeight: '500' },
  progress: { marginTop: 16, gap: 6 },
  progressTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  times: { flexDirection: 'row', justifyContent: 'space-between' },
  time: { fontSize: 11, fontWeight: '500', fontVariant: ['tabular-nums'] },
  controls: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
  },
  skip: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  play: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.35 },
  pressed: { opacity: 0.6 },
});
