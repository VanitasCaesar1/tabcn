/**
 * Composer Dock's composer: the input bar (a glass pill that opens into a two-row card while
 * focused) with +, the text field, dictation, the voice button that turns into Send, and the
 * model chip. Part of the Composer Dock design (composer-dock.tsx).
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import { GlassView } from 'expo-glass-effect';
import { type ReactNode, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Path, Rect } from 'react-native-svg';
import {
  appear,
  COMPOSER_GAP,
  type ComposerDockColors,
  type ComposerDockLabels,
  disappear,
  fade,
  GLASS_STYLE,
  glide,
  type ViewRef,
} from './composer-dock-theme';

export function Composer({
  composerRef,
  colors,
  labels,
  placeholder,
  model,
  onModelPress,
  onSend,
  onVoicePress,
  onDictatePress,
  onAttachPress,
  dimmed,
  glass,
}: {
  composerRef: ViewRef;
  colors: ComposerDockColors;
  labels: ComposerDockLabels;
  placeholder: string;
  model?: string;
  onModelPress?: () => void;
  onSend?: (text: string) => void;
  onVoicePress?: () => void;
  onDictatePress?: () => void;
  onAttachPress?: () => void;
  dimmed: boolean;
  glass: boolean;
}) {
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const hasText = text.trim().length > 0;

  const dim = useSharedValue(dimmed ? 1 : 0);
  useEffect(() => {
    dim.value = withTiming(dimmed ? 1 : 0, fade);
  }, [dimmed, dim]);
  const dimStyle = useAnimatedStyle(() => ({ opacity: 1 - dim.value * 0.6 }));

  const send = () => {
    const value = text.trim();
    if (!value) return;
    onSend?.(value);
    setText('');
  };

  const plus = onAttachPress ? (
    <CircleButton
      key="plus"
      label={labels.addFiles}
      onPress={onAttachPress}
      glass={glass}
      tint={colors.glassTint}
    >
      <PlusGlyph color={colors.foreground} />
    </CircleButton>
  ) : null;
  const dictate = onDictatePress ? (
    <CircleButton
      key="dictate"
      label={labels.dictate}
      onPress={onDictatePress}
      glass={glass}
      tint={colors.glassTint}
    >
      <MicGlyph color={colors.dictate} />
    </CircleButton>
  ) : null;
  // Send while there is text; otherwise the voice button, only when it has something to do.
  const action =
    hasText || onVoicePress ? (
      <CircleButton
        key="action"
        label={hasText ? labels.send : labels.voiceMode}
        onPress={hasText ? send : onVoicePress}
        background={colors.foreground}
      >
        {hasText ? (
          <Animated.View key="send" entering={appear} exiting={disappear}>
            <ArrowUpGlyph color={colors.onForeground} />
          </Animated.View>
        ) : (
          <Animated.View key="voice" entering={appear} exiting={disappear}>
            <WaveGlyph color={colors.onForeground} />
          </Animated.View>
        )}
      </CircleButton>
    ) : null;

  return (
    <Animated.View
      ref={composerRef}
      collapsable={false}
      layout={glide}
      style={[
        styles.composer,
        focused ? styles.composerOpen : null,
        glass
          ? styles.composerGlass
          : { backgroundColor: colors.composer, borderColor: colors.border },
        dimStyle,
      ]}
    >
      {glass ? (
        <GlassView
          glassEffectStyle={GLASS_STYLE}
          tintColor={colors.glassTint}
          isInteractive
          style={[StyleSheet.absoluteFill, { borderRadius: focused ? 22 : 24 }]}
        />
      ) : null}
      {/* Every child is keyed, so the field stays mounted (and focused) when the pill opens
          into the card and the buttons move to the second row. */}
      <Animated.View layout={glide} style={styles.firstRow}>
        {focused ? null : (
          <Animated.View key="plus-rest" entering={appear} exiting={disappear}>
            {plus}
          </Animated.View>
        )}
        <Animated.View key="field" layout={glide} style={styles.fieldBox}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={placeholder}
            placeholderTextColor={colors.placeholder}
            accessibilityLabel={placeholder}
            multiline
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={[styles.field, focused ? styles.fieldOpen : null, { color: colors.foreground }]}
          />
        </Animated.View>
        {focused ? null : (
          <Animated.View key="end-rest" entering={appear} exiting={disappear} style={styles.ends}>
            {dictate}
            {action}
          </Animated.View>
        )}
      </Animated.View>
      {focused ? (
        <Animated.View entering={appear} exiting={disappear} style={styles.secondRow}>
          <View style={styles.ends}>
            {plus}
            {model ? (
              <Pressable
                role="button"
                accessibilityLabel={labels.model(model)}
                onPress={onModelPress}
                // 28 pt tall: the slop brings the touch target to 44 pt.
                hitSlop={8}
                style={[styles.chip, glass ? null : { backgroundColor: colors.control }]}
              >
                {glass ? (
                  <GlassView
                    glassEffectStyle={GLASS_STYLE}
                    tintColor={colors.glassTint}
                    isInteractive
                    style={[StyleSheet.absoluteFill, styles.chipGlass]}
                  />
                ) : null}
                <Text style={[styles.chipText, { color: colors.foreground }]}>{model}</Text>
                <GaugeGlyph color={colors.foreground} />
              </Pressable>
            ) : null}
          </View>
          <View style={styles.ends}>
            {dictate}
            {action}
          </View>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

function CircleButton({
  label,
  onPress,
  background,
  glass,
  tint,
  children,
}: {
  label: string;
  onPress?: () => void;
  background?: string;
  /** Sits in its own small Liquid Glass circle, as the app's + and dictation buttons do. */
  glass?: boolean;
  tint?: string;
  children: ReactNode;
}) {
  return (
    <Pressable
      role="button"
      accessibilityLabel={label}
      onPress={onPress}
      // 34 pt wide: the slop brings the touch target to 44 pt.
      hitSlop={5}
      style={({ pressed }) => [
        styles.circle,
        background ? { backgroundColor: background } : null,
        { opacity: pressed ? 0.6 : 1 },
      ]}
    >
      {glass ? (
        <GlassView
          glassEffectStyle={GLASS_STYLE}
          tintColor={tint}
          style={[StyleSheet.absoluteFill, styles.circleGlass]}
        />
      ) : null}
      {children}
    </Pressable>
  );
}

const stroke = {
  fill: 'none',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

export function PlusGlyph({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 5v14M5 12h14" stroke={color} {...stroke} />
    </Svg>
  );
}

function MicGlyph({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Rect x={9} y={3} width={6} height={11} rx={3} stroke={color} {...stroke} />
      <Path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" stroke={color} {...stroke} />
    </Svg>
  );
}

function WaveGlyph({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path d="M4 10.5v3M8 7v10M12 4v16M16 8v8M20 10.5v3" stroke={color} {...stroke} />
    </Svg>
  );
}

function ArrowUpGlyph({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path d="M12 19V5M6 11l6-6 6 6" stroke={color} {...stroke} strokeWidth={2.1} />
    </Svg>
  );
}

/** A small dial: the model's effort, beside its name in the chip. */
function GaugeGlyph({ color }: { color: string }) {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24">
      <Path d="M19.8 16.5A9 9 0 1 0 4.2 16.5" stroke={color} {...stroke} strokeWidth={2} />
      <Path d="m12 13 3.5-4" stroke={color} {...stroke} strokeWidth={2} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  composer: {
    marginHorizontal: 18,
    marginBottom: COMPOSER_GAP,
    minHeight: 48,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderCurve: 'continuous',
    paddingHorizontal: 6,
    justifyContent: 'center',
  },
  composerGlass: { borderWidth: 0 },
  composerOpen: {
    marginHorizontal: 10,
    borderRadius: 22,
    paddingTop: 4,
    paddingBottom: 6,
  },
  firstRow: { flexDirection: 'row', alignItems: 'center' },
  fieldBox: { flex: 1 },
  field: {
    fontSize: 15,
    lineHeight: 20,
    maxHeight: 132,
    paddingHorizontal: 6,
    paddingTop: 13,
    paddingBottom: 13,
  },
  fieldOpen: { paddingHorizontal: 10, paddingTop: 10, paddingBottom: 10 },
  secondRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ends: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  circleGlass: { borderRadius: 17 },
  circle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 28,
    paddingHorizontal: 11,
    borderRadius: 14,
  },
  chipText: { fontSize: 13, fontWeight: '500' },
  chipGlass: { borderRadius: 14 },
});
