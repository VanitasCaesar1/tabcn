/**
 * What every Seek screen shares: the night sky behind it, and the header on top (the app's
 * mark and the viewer's photo, or a back button and a title). Built from PanelUI's Avatar,
 * Button and Typography.
 */
import MaskedViewClass from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { Avatar, Button, Typography } from 'panelui-native';
import { type ComponentType, type ReactElement, type ReactNode, useEffect } from 'react';
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ME } from '@/lib/films';
import { Display } from './display';
import { BackIcon, Mark } from './icons';

/**
 * The night sky: black at the top, deepening to blue and lightening towards the bar, with fixed
 * stars. `bright` lifts the lower half while a search runs, as the reference's analysing screen.
 */
export function Sky({ bright = false }: { bright?: boolean }) {
  const lift = useSharedValue(bright ? 1 : 0);
  useEffect(() => {
    lift.value = withTiming(bright ? 1 : 0, {
      duration: bright ? 420 : 300,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    });
  }, [bright, lift]);
  const glow = useAnimatedStyle(() => ({ opacity: lift.value }));
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={['#000000', '#02040f', '#071346', '#1a46b4', '#7fa6dc']}
        locations={[0, 0.42, 0.68, 0.88, 1]}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={[StyleSheet.absoluteFill, glow]}>
        <LinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(20,70,190,0.55)', 'rgba(170,200,235,0.85)']}
          locations={[0.35, 0.62, 1]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
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

// The package's class typings predate React 19's JSX types; this is the same component.
const MaskedView = MaskedViewClass as unknown as ComponentType<{
  style?: StyleProp<ViewStyle>;
  maskElement: ReactElement;
  children: ReactNode;
}>;

/** The top of a screen, under the status bar: 64 pt tall, 20 pt in from the sides. */
export function HeaderBar({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top }}>
      <View className="h-16 flex-row items-center justify-between px-5">{children}</View>
    </View>
  );
}

/** The app's mark and name, and the viewer's photo in a white ring. */
export function AppHeader() {
  return (
    <HeaderBar>
      <View className="flex-row items-center gap-2.5">
        <Mark />
        <Display size={34}>Seek</Display>
      </View>
      <View className="rounded-full bg-white p-0.5">
        <Avatar source={ME} size="md" accessibilityLabel="Your profile" />
      </View>
    </HeaderBar>
  );
}

/** A round back button and a title; anything passed as `end` sits at the far side. */
export function BackHeader({
  title,
  onBack,
  backLabel = 'Back',
  end,
}: {
  title?: string;
  onBack: () => void;
  backLabel?: string;
  end?: ReactNode;
}) {
  return (
    <HeaderBar>
      <View className="flex-row items-center gap-3">
        <RoundButton label={backLabel} onPress={onBack}>
          <BackIcon />
        </RoundButton>
        {title ? (
          <Typography type="h4" className="tracking-tight">
            {title}
          </Typography>
        ) : null}
      </View>
      {end}
    </HeaderBar>
  );
}

/** A 44 pt round glassy button: PanelUI's icon button on a translucent fill. */
export function RoundButton({
  label,
  onPress,
  children,
  tone = 'glass',
}: {
  label: string;
  onPress: () => void;
  children: ReactNode;
  tone?: 'glass' | 'light';
}) {
  return (
    <Button
      variant="secondary"
      size="icon"
      accessibilityLabel={label}
      onPress={onPress}
      className={
        tone === 'light'
          ? 'rounded-full border-white bg-white'
          : 'rounded-full border-white/15 bg-white/10'
      }
    >
      {children}
    </Button>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  solid: { flex: 1, backgroundColor: '#000000' },
  star: { position: 'absolute', borderRadius: 2, backgroundColor: '#ffffff' },
});

/**
 * Fades scrolling content out at its edges with an alpha mask, so it never shows where it
 * shouldn't: it is gone `bottom` points above the screen's bottom edge (the top of the dock),
 * fading over the 56 pt above that, and it softens into the header over the top 18 pt. A mask,
 * not a colour overlay, because the sky behind it is a gradient no flat colour could match.
 */
export function EdgeFade({ bottom, children }: { bottom: number; children: ReactNode }) {
  return (
    <MaskedView
      style={styles.fill}
      maskElement={
        <View style={styles.fill}>
          <LinearGradient colors={['transparent', '#000000']} style={{ height: 18 }} />
          <View style={styles.solid} />
          <LinearGradient colors={['#000000', 'transparent']} style={{ height: 56 }} />
          <View style={{ height: bottom }} />
        </View>
      }
    >
      {children}
    </MaskedView>
  );
}

/**
 * How far above the screen's bottom edge Ask Dock reaches: its capsule (65 pt, 2 pt above the
 * safe area) and, on Discover, the prompt card over it (96 pt, 24 pt up). Screens end their
 * content here; `useBottomTabBarHeight` reports the capsule's box only.
 */
export function useDockTop(withPrompt: boolean) {
  const insets = useSafeAreaInsets();
  return insets.bottom + 2 + 65 + (withPrompt ? 24 + 96 : 0) + 12;
}
