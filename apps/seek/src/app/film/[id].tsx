/**
 * A film's page: its still filling the top and fading into the night, the title, its facts as
 * chips, Save to Collection and Watch on, the synopsis, director and cast, and more like it.
 *
 * - On iOS 18 it zooms open from the poster or card it was opened from (Link.AppleZoom).
 * - The still drifts up at half speed as the page scrolls; past the title, a frosted bar with
 *   the title fades in behind the back and share buttons.
 * - Saving says so in a toast with Undo on a countdown, instead of asking first. Share answers
 *   in the Dynamic Island capsule; Watch on in a toast that follows the lookup.
 */
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { toast } from 'expo-hot-toast';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { Avatar, Button, Chip, Typography } from 'panelui-native';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sky } from '@/components/chrome';
import {
  ArrowRightIcon,
  BackIcon,
  ChevronIcon,
  FilmFrameIcon,
  ShareIcon,
} from '@/components/icons';
import { Press } from '@/components/press';
import { FILMS, film } from '@/lib/films';
import { toggleSaved, useSeek } from '@/lib/search';

const HERO = 470;

export default function FilmPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const f = film(id);
  const { saved } = useSeek();
  const inCollection = saved.includes(f.id);
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });
  const hero = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(scrollY.value, [-200, 0, HERO], [-100, 0, HERO * 0.5]) },
      { scale: interpolate(scrollY.value, [-200, 0], [1.4, 1], Extrapolation.CLAMP) },
    ],
  }));
  // The frosted bar arrives as the title scrolls under it.
  const bar = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [HERO - 220, HERO - 140], [0, 1], Extrapolation.CLAMP),
  }));
  const barTitle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [HERO - 150, HERO - 100], [0, 1], Extrapolation.CLAMP),
    transform: [
      {
        translateY: interpolate(
          scrollY.value,
          [HERO - 150, HERO - 100],
          [8, 0],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const save = () => {
    toggleSaved(f.id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const undo = { label: 'Undo', countdown: true, onPress: () => toggleSaved(f.id) };
    if (inCollection) toast(`Removed ${f.title}`, { action: undo });
    else toast.success('Saved to Collection', { description: f.title, action: undo });
  };
  const watch = () => {
    toast.promise(new Promise((done) => setTimeout(done, 1100)), {
      loading: 'Finding where to watch…',
      success: 'Streaming on Lumen',
      error: 'Not streaming anywhere yet',
    });
  };

  const more = FILMS.filter((m) => m.id !== f.id);
  const barHeight = insets.top + 64;
  return (
    <View className="flex-1">
      <Sky />
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      >
        <Animated.View style={[styles.hero, hero]}>
          <Link.AppleZoomTarget>
            <Image
              source={f.hero}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={200}
            />
          </Link.AppleZoomTarget>
          <LinearGradient
            colors={['rgba(2,4,15,0.35)', 'rgba(2,4,15,0)', 'rgba(2,4,15,0.6)', '#02040f']}
            locations={[0, 0.25, 0.72, 1]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
        </Animated.View>
        <View className="-mt-24 gap-5 px-5">
          <Typography
            type="h1"
            align="center"
            className="text-[42px] leading-[46px] tracking-tighter"
          >
            {f.title}
          </Typography>
          <View className="flex-row flex-wrap justify-center gap-1.5">
            {[String(f.year), f.runtime, f.rating, f.genre].map((tag) => (
              <Chip key={tag} size="lg" className="border-white/10 bg-white/10">
                <Chip.Label className="text-[15px] text-white tabular-nums">{tag}</Chip.Label>
              </Chip>
            ))}
          </View>
          <View className="flex-row gap-3">
            <Button
              variant="primary"
              size="lg"
              onPress={save}
              className="flex-[1.3] rounded-full border-[#1f5bff] bg-[#1f5bff] px-3.5"
              labelClassName="text-[15px] text-white"
              endContent={<FilmFrameIcon />}
            >
              {inCollection ? 'In Collection' : 'Save to Collection'}
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onPress={watch}
              className="flex-1 rounded-full border-white/10 bg-white/10 px-4"
              labelClassName="text-[15px]"
              endContent={<ArrowRightIcon />}
            >
              Watch on
            </Button>
          </View>
          <Typography type="body" className="text-[16px] leading-[24px] text-white/80">
            {f.synopsis}
          </Typography>
          <View className="flex-row">
            <View className="flex-1 gap-2.5">
              <Typography type="body-sm" muted>
                Director
              </Typography>
              <Avatar source={f.director.photo} size="lg" accessibilityLabel={f.director.name} />
              <Typography type="body" weight="medium">
                {f.director.name}
              </Typography>
            </View>
            <View className="flex-1 gap-2.5">
              <Typography type="body-sm" muted>
                Cast
              </Typography>
              <Avatar.Group size="lg" overlap={12}>
                {f.cast.map((p) => (
                  <Avatar key={p.name} source={p.photo} accessibilityLabel={p.name} />
                ))}
              </Avatar.Group>
              <View className="flex-row items-center gap-1">
                <Typography type="body" weight="medium">
                  {`+${f.castMore} more`}
                </Typography>
                <ChevronIcon size={16} />
              </View>
            </View>
          </View>
          <Typography type="h4" className="mt-3 tracking-tight">
            More like this
          </Typography>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 12, paddingHorizontal: 20, paddingTop: 12 }}
        >
          {more.map((m) => (
            <Link key={m.id} href={`/film/${m.id}`} asChild>
              <Press accessibilityLabel={m.title} contentStyle={styles.moreCell}>
                <Link.AppleZoom>
                  <Image source={m.poster} style={styles.more} contentFit="cover" />
                </Link.AppleZoom>
                <Typography type="body-sm" weight="medium" numberOfLines={1}>
                  {m.title}
                </Typography>
              </Press>
            </Link>
          ))}
        </ScrollView>
      </Animated.ScrollView>
      {/* The frosted bar, then the buttons over it. */}
      <Animated.View pointerEvents="none" style={[styles.bar, { height: barHeight }, bar]}>
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, styles.barTint]} />
      </Animated.View>
      <View style={[styles.top, { paddingTop: insets.top + 10 }]} pointerEvents="box-none">
        <GlassButton label="Back" onPress={() => router.back()}>
          <BackIcon />
        </GlassButton>
        <Animated.View style={[styles.barTitle, barTitle]} pointerEvents="none">
          <Typography type="large" numberOfLines={1}>
            {f.title}
          </Typography>
        </Animated.View>
        <GlassButton label="Share" onPress={() => toast.island('Link copied', { type: 'success' })}>
          <ShareIcon />
        </GlassButton>
      </View>
    </View>
  );
}

/** A 44 pt round button of frosted glass, for controls over a photo. */
function GlassButton({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <Press accessibilityLabel={label} onPress={onPress} scale={0.9} contentStyle={styles.glass}>
      <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, styles.glassTint]} />
      {children}
    </Press>
  );
}

const styles = StyleSheet.create({
  hero: { height: HERO, overflow: 'hidden' },
  moreCell: { width: 132, gap: 8 },
  more: { width: 132, height: 188, borderRadius: 18, borderCurve: 'continuous' },
  bar: { position: 'absolute', left: 0, right: 0, top: 0 },
  barTint: {
    backgroundColor: 'rgba(2, 4, 15, 0.45)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  top: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  barTitle: { flex: 1, alignItems: 'center', paddingHorizontal: 12 },
  glass: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  glassTint: { backgroundColor: 'rgba(255,255,255,0.08)' },
});
