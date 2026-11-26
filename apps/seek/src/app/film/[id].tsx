/**
 * A film's page: its still filling the top and fading into the night, the title, its facts as
 * chips, Save to Collection and Watch on, the synopsis, director and cast, and more like it.
 * Saving says so in a toast with Undo, rather than asking first.
 */
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Avatar, Button, Chip, Typography, toast } from 'panelui-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RoundButton, Sky } from '@/components/chrome';
import {
  ArrowRightIcon,
  BackIcon,
  ChevronIcon,
  FilmFrameIcon,
  ShareIcon,
} from '@/components/icons';
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
  // The still drifts up at half the scroll's speed and grows when pulled down past the top.
  const hero = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(scrollY.value, [-200, 0, HERO], [-100, 0, HERO * 0.5]) },
      { scale: interpolate(scrollY.value, [-200, 0], [1.4, 1], Extrapolation.CLAMP) },
    ],
  }));

  const save = () => {
    toggleSaved(f.id);
    toast.show({
      variant: inCollection ? 'default' : 'success',
      label: inCollection ? `Removed ${f.title}` : `Saved ${f.title} to Collection`,
      actionLabel: 'Undo',
      onActionPress: (handle) => {
        toggleSaved(f.id);
        handle.hide();
      },
      placement: 'top',
    });
  };

  const more = FILMS.filter((m) => m.id !== f.id);
  return (
    <View className="flex-1">
      <Sky />
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      >
        <Animated.View style={[styles.hero, hero]}>
          <Image
            source={f.hero}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={200}
          />
          <LinearGradient
            colors={['rgba(2,4,15,0.35)', 'rgba(2,4,15,0)', 'rgba(2,4,15,0.6)', '#02040f']}
            locations={[0, 0.25, 0.72, 1]}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <View className="-mt-24 gap-5 px-5">
          <Typography
            type="h1"
            align="center"
            className="text-[40px] leading-[46px] tracking-tighter"
          >
            {f.title}
          </Typography>
          <View className="flex-row flex-wrap justify-center gap-1.5">
            {[String(f.year), f.runtime, f.rating, f.genre].map((tag) => (
              <Chip key={tag} size="lg" className="border-white/10 bg-white/10">
                <Chip.Label className="text-[15px] text-white">{tag}</Chip.Label>
              </Chip>
            ))}
          </View>
          <View className="flex-row gap-3">
            <Button
              variant="primary"
              size="lg"
              onPress={save}
              className="flex-1 rounded-full border-[#1f5bff] bg-[#1f5bff] px-4"
              labelClassName="text-[15px] text-white"
              endContent={<FilmFrameIcon />}
            >
              {inCollection ? 'In Collection' : 'Save to Collection'}
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onPress={() => toast.show({ label: 'Opens your streaming app', placement: 'top' })}
              className="flex-1 rounded-full border-white/10 bg-white/10 px-4"
              labelClassName="text-[15px]"
              endContent={<ArrowRightIcon />}
            >
              Watch on
            </Button>
          </View>
          <Typography type="body" className="text-[16px] leading-[23px] text-white/80">
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
              <Pressable
                accessibilityRole="button"
                className="flex-row items-center gap-1 active:opacity-60"
              >
                <Typography type="body" weight="medium">
                  {`+${f.castMore} more`}
                </Typography>
                <ChevronIcon size={16} />
              </Pressable>
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
            <Pressable
              key={m.id}
              accessibilityRole="button"
              accessibilityLabel={m.title}
              onPress={() => router.push(`/film/${m.id}`)}
              className="w-[132px] gap-2 active:opacity-80"
            >
              <Image source={m.poster} style={styles.more} contentFit="cover" />
              <Typography type="body-sm" weight="medium" numberOfLines={1}>
                {m.title}
              </Typography>
            </Pressable>
          ))}
        </ScrollView>
      </Animated.ScrollView>
      <View style={[styles.top, { paddingTop: insets.top + 10 }]} pointerEvents="box-none">
        <RoundButton label="Back" onPress={() => router.back()}>
          <BackIcon />
        </RoundButton>
        <RoundButton
          label="Share"
          onPress={() => toast.show({ label: 'Link copied', placement: 'top' })}
        >
          <ShareIcon />
        </RoundButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { height: HERO, overflow: 'hidden' },
  more: { width: 132, height: 188, borderRadius: 18, borderCurve: 'continuous' },
  top: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
});
