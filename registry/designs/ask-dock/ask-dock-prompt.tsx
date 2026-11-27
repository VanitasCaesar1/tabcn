/**
 * Ask Dock's prompt: a frosted card with a text field, photo and video buttons and a round send
 * button, plus the attachment chip that sits over its corner. Focused, the card darkens and a
 * blue-to-violet ring lights round it. Also the frost both the card and the tab capsule are made of.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { type ComponentRef, type ReactNode, type Ref, useEffect, useId, useState } from 'react';
import {
  Keyboard,
  Platform,
  Pressable,
  type StyleProp,
  StyleSheet,
  TextInput,
  View,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  ReduceMotion,
  runOnJS,
  type SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import type { AskDockColors, AskDockLabels } from './ask-dock';
import { CloseIcon, PhotoIcon, SendIcon, VideoIcon } from './ask-dock-icons';

/** Something added to the prompt: drawn as a small card over the prompt's top corner. */
export interface AskAttachment {
  /** The thumbnail, such as an `<Image>`. It fills a 144 by 80 pt card. */
  preview: ReactNode;
  /** Read by screen readers, such as "Photo from your library". Default "Attachment". */
  label?: string;
  /** Shows the remove button on the card; runs when it's pressed. */
  onRemove?: () => void;
}

/**
 * Frost: a blur (a dense fill on Android, which can't blur what's behind the bar) under a tint.
 * `presence` fades it. iOS can't blur inside a view whose opacity, or any parent's, is below 1,
 * so the blur's strength follows `presence` and only the layers over it fade.
 */
export function Frost({
  intensity,
  fill,
  tintStyle,
  presence,
  initial = 1,
  style,
}: {
  intensity: number;
  /** Android's fill. */
  fill: string;
  /** The tint over the blur: an animated style that sets its `backgroundColor`. */
  tintStyle: ReturnType<typeof useAnimatedStyle>;
  presence?: SharedValue<number>;
  /** `presence` when it mounts: the blur's plain starting strength, which the web build needs. */
  initial?: number;
  style?: StyleProp<ViewStyle>;
}) {
  // expo-blur's web blur is half as strong as iOS at the same intensity.
  const strength = Platform.OS === 'web' ? intensity * 2 : intensity;
  const blur = useAnimatedProps(() => ({ intensity: (presence?.value ?? 1) * strength }));
  const fade = useAnimatedStyle(() => ({ opacity: presence?.value ?? 1 }));
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.clip, style]}>
      {Platform.OS === 'android' ? (
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: fill }, fade]} />
      ) : (
        <AnimatedBlurView
          intensity={initial * strength}
          animatedProps={blur}
          tint="dark"
          style={StyleSheet.absoluteFill}
        />
      )}
      <Animated.View style={[StyleSheet.absoluteFill, tintStyle, fade]} />
    </View>
  );
}

/** A gradient stop's colour and opacity: react-native-svg ignores an `rgba()` stop's alpha. */
function stop(color: string) {
  const rgba = color.match(/^rgba\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)$/);
  if (!rgba) return { stopColor: color, stopOpacity: 1 };
  return { stopColor: `rgb(${rgba[1]}, ${rgba[2]}, ${rgba[3]})`, stopOpacity: Number(rgba[4]) };
}

export function Prompt({
  colors,
  labels,
  placeholder,
  width,
  intensity,
  presence,
  focus,
  busy,
  haptics,
  attachment,
  onSend,
  onAddPhoto,
  onAddVideo,
  inputRef,
  initial,
}: {
  colors: AskDockColors;
  labels: AskDockLabels;
  placeholder: string;
  width: number;
  intensity: number;
  /** 1 shown, 0 gone (folded into the status pill, or hidden). */
  presence: SharedValue<number>;
  /** 1 while the field has focus: written here, read by the dock to ride the keyboard. */
  focus: SharedValue<number>;
  busy: boolean;
  haptics: boolean;
  attachment?: AskAttachment;
  onSend?: (text: string) => void;
  onAddPhoto?: () => void;
  onAddVideo?: () => void;
  inputRef?: Ref<ComponentRef<typeof TextInput>>;
  /** Shown (1) or not (0) as it mounts. */
  initial: number;
}) {
  const [text, setText] = useState('');
  const ready = text.trim().length > 0 || attachment !== undefined;
  const ringId = `ring${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  const tint = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      focus.value,
      [0, 1],
      [colors.promptTint, colors.promptFocused],
    ),
  }));
  const fade = useAnimatedStyle(() => ({ opacity: presence.value }));

  // The attachment card grows in from 90% from its lower left corner, and shrinks away in 150 ms,
  // staying mounted (with the attachment it last had) until it has gone.
  const [chip, setChip] = useState(attachment);
  if (attachment && attachment !== chip) setChip(attachment);
  // A boolean for the worklet: the attachment itself holds a React element, which can't cross
  // to the UI thread.
  const attached = attachment !== undefined;
  const chipIn = useSharedValue(attached ? 1 : 0);
  useEffect(() => {
    chipIn.value = withTiming(attached ? 1 : 0, attached ? CHIP_IN : CHIP_OUT, (done) => {
      if (done && !attached) runOnJS(setChip)(undefined);
    });
  }, [attached, chipIn]);
  const chipMotion = useAnimatedStyle(() => ({
    opacity: chipIn.value * presence.value,
    transform: [
      { translateX: -CHIP_W * 0.05 * (1 - chipIn.value) },
      { translateY: 10 * (1 - chipIn.value) },
      { scale: 0.9 + 0.1 * chipIn.value },
    ],
  }));
  const edge = useAnimatedStyle(() => ({ opacity: presence.value * (1 - focus.value) }));
  const ring = useAnimatedStyle(() => ({ opacity: presence.value * focus.value }));

  const send = () => {
    if (!ready || busy) return;
    if (haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const query = text.trim();
    setText('');
    Keyboard.dismiss();
    onSend?.(query);
  };

  return (
    <View style={{ width }}>
      {chip ? (
        <Animated.View style={[styles.chip, chipMotion]}>
          <Chip attachment={chip} colors={colors} labels={labels} haptics={haptics} />
        </Animated.View>
      ) : null}
      <View style={[styles.card, { width }]}>
        <Frost
          intensity={intensity}
          fill={colors.promptFill}
          tintStyle={tint}
          presence={presence}
          initial={initial}
          style={styles.cardRadius}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            styles.cardRadius,
            styles.edge,
            { borderColor: colors.promptRim },
            edge,
          ]}
        />
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, ring]}>
          <Svg width={width} height={PROMPT_HEIGHT}>
            <Defs>
              <LinearGradient id={ringId} x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" {...stop(colors.ring)} />
                <Stop offset="1" {...stop(colors.ringEnd)} />
              </LinearGradient>
            </Defs>
            <Rect
              x={0.75}
              y={0.75}
              width={width - 1.5}
              height={PROMPT_HEIGHT - 1.5}
              rx={RADIUS - 0.75}
              fill="none"
              stroke={`url(#${ringId})`}
              strokeWidth={1.5}
            />
          </Svg>
        </Animated.View>
        <Animated.View style={[styles.content, fade]}>
          <TextInput
            ref={inputRef}
            value={text}
            onChangeText={setText}
            editable={!busy}
            placeholder={placeholder}
            placeholderTextColor={colors.placeholder}
            selectionColor={colors.ring}
            accessibilityLabel={placeholder}
            returnKeyType="search"
            submitBehavior="blurAndSubmit"
            onSubmitEditing={send}
            onFocus={() => {
              focus.value = withTiming(1, FOCUS_IN);
            }}
            onBlur={() => {
              focus.value = withTiming(0, FOCUS_OUT);
            }}
            maxFontSizeMultiplier={1.4}
            style={[styles.input, { color: colors.text }]}
          />
          <View style={styles.tools}>
            {onAddPhoto ? (
              <ToolButton label={labels.addPhoto} onPress={onAddPhoto} disabled={busy}>
                <PhotoIcon color={colors.action} size={TOOL_ICON} />
              </ToolButton>
            ) : null}
            {onAddPhoto && onAddVideo ? (
              <View style={[styles.divider, { backgroundColor: colors.action }]} />
            ) : null}
            {onAddVideo ? (
              <ToolButton label={labels.addVideo} onPress={onAddVideo} disabled={busy}>
                <VideoIcon color={colors.action} size={TOOL_ICON} />
              </ToolButton>
            ) : null}
            <View style={styles.spring} />
            <SendButton ready={ready} colors={colors} label={labels.send} onPress={send} />
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

function ToolButton({
  label,
  onPress,
  disabled,
  children,
}: {
  label: string;
  onPress: () => void;
  disabled: boolean;
  children: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [styles.tool, pressed ? styles.pressed : null]}
    >
      {children}
    </Pressable>
  );
}

/**
 * The send button: a faint disc while there's nothing to send, and white with a blue arrow once
 * there is, popping a little as it lights. Pressed, it dips.
 */
function SendButton({
  ready,
  colors,
  label,
  onPress,
}: {
  ready: boolean;
  colors: AskDockColors;
  label: string;
  onPress: () => void;
}) {
  const lit = useSharedValue(ready ? 1 : 0);
  const scale = useSharedValue(1);
  const press = useSharedValue(1);
  useEffect(() => {
    lit.value = withTiming(ready ? 1 : 0, ready ? LIGHT_UP : LIGHT_DOWN);
    if (ready) scale.value = withSequence(withTiming(1.1, POP_OUT), withSpring(1, POP_BACK));
  }, [ready, lit, scale]);
  const body = useAnimatedStyle(() => ({ transform: [{ scale: scale.value * press.value }] }));
  const litStyle = useAnimatedStyle(() => ({ opacity: lit.value }));
  const idleStyle = useAnimatedStyle(() => ({ opacity: 1 - lit.value }));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !ready }}
      onPress={onPress}
      onPressIn={() => {
        press.value = withTiming(0.9, PRESS_DOWN);
      }}
      onPressOut={() => {
        press.value = withSpring(1, POP_BACK);
      }}
      hitSlop={6}
    >
      <Animated.View style={[styles.send, body]}>
        <Animated.View style={[styles.sendFace, { backgroundColor: colors.send }, idleStyle]}>
          <SendIcon color={colors.sendIcon} size={20} />
        </Animated.View>
        <Animated.View style={[styles.sendFace, { backgroundColor: colors.sendReady }, litStyle]}>
          <SendIcon color={colors.sendReadyIcon} size={20} />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

function Chip({
  attachment,
  colors,
  labels,
  haptics,
}: {
  attachment: AskAttachment;
  colors: AskDockColors;
  labels: AskDockLabels;
  haptics: boolean;
}) {
  const label = attachment.label ?? 'Attachment';
  return (
    <View>
      <View accessible accessibilityRole="image" accessibilityLabel={label} style={styles.thumb}>
        {attachment.preview}
      </View>
      {attachment.onRemove ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${labels.remove}: ${label}`}
          hitSlop={10}
          onPress={() => {
            if (haptics) Haptics.selectionAsync();
            attachment.onRemove?.();
          }}
          style={({ pressed }) => [
            styles.remove,
            { backgroundColor: colors.chipButton },
            pressed ? styles.pressed : null,
          ]}
        >
          <CloseIcon color={colors.chipButtonIcon} size={12} />
        </Pressable>
      ) : null}
    </View>
  );
}

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

/** Measured from the reference: a 96 pt card with 22 pt corners. */
export const PROMPT_HEIGHT = 96;
const RADIUS = 22;
const CHIP_W = 144;
const CHIP_IN = {
  duration: 240,
  easing: Easing.bezier(0.34, 1.4, 0.64, 1),
  reduceMotion: ReduceMotion.System,
};
const CHIP_OUT = {
  duration: 150,
  easing: Easing.out(Easing.quad),
  reduceMotion: ReduceMotion.System,
};
const TOOL_ICON = 24;

const FOCUS_IN = {
  duration: 200,
  easing: Easing.out(Easing.cubic),
  reduceMotion: ReduceMotion.System,
};
const FOCUS_OUT = {
  duration: 140,
  easing: Easing.out(Easing.quad),
  reduceMotion: ReduceMotion.System,
};
const LIGHT_UP = {
  duration: 160,
  easing: Easing.out(Easing.quad),
  reduceMotion: ReduceMotion.System,
};
const LIGHT_DOWN = {
  duration: 120,
  easing: Easing.out(Easing.quad),
  reduceMotion: ReduceMotion.System,
};
const POP_OUT = {
  duration: 90,
  easing: Easing.out(Easing.quad),
  reduceMotion: ReduceMotion.System,
};
const POP_BACK = { duration: 320, dampingRatio: 0.6, reduceMotion: ReduceMotion.System };
const PRESS_DOWN = {
  duration: 90,
  easing: Easing.out(Easing.quad),
  reduceMotion: ReduceMotion.System,
};

const styles = StyleSheet.create({
  clip: { overflow: 'hidden', borderCurve: 'continuous' },
  card: { height: PROMPT_HEIGHT },
  cardRadius: { borderRadius: RADIUS, borderCurve: 'continuous' },
  edge: { borderWidth: StyleSheet.hairlineWidth * 2 },
  content: { flex: 1, paddingTop: 10, paddingBottom: 10, paddingHorizontal: 12 },
  input: {
    fontSize: 17,
    paddingHorizontal: 8,
    paddingVertical: 6,
    // The web draws a focus outline round inputs; the ring is the focus state here.
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
  },
  tools: { flex: 1, flexDirection: 'row', alignItems: 'flex-end' },
  tool: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  divider: { width: 1, height: 12, marginBottom: 14, opacity: 0.45, marginHorizontal: 2 },
  spring: { flex: 1 },
  pressed: { opacity: 0.55 },
  send: { width: 40, height: 40 },
  sendFace: {
    ...StyleSheet.absoluteFill,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: { alignSelf: 'flex-start', marginBottom: 12 },
  thumb: {
    width: CHIP_W,
    height: 80,
    borderRadius: 16,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  remove: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
