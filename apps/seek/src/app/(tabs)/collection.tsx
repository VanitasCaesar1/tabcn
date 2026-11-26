/** Collection: the saved films as a poster grid, filtered by genre with PanelUI chips. */
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { Chip, Typography } from 'panelui-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, LinearTransition, ReduceMotion } from 'react-native-reanimated';
import { AppHeader, Sky } from '@/components/chrome';
import { film } from '@/lib/films';
import { useSeek } from '@/lib/search';

export default function Collection() {
  const { saved } = useSeek();
  const bottom = useBottomTabBarHeight();
  const films = saved.map(film);
  const genres = ['All', ...new Set(films.map((f) => f.genre))];
  const [genre, setGenre] = useState('All');
  const shown = genre === 'All' ? films : films.filter((f) => f.genre === genre);
  return (
    <View className="flex-1">
      <Sky />
      <AppHeader />
      <ScrollView contentContainerStyle={{ gap: 16, paddingTop: 8, paddingBottom: bottom + 16 }}>
        <View className="flex-row items-baseline justify-between px-5">
          <Typography type="h2" weight="bold" className="tracking-tighter">
            Collection
          </Typography>
          <Typography type="body-sm" muted className="tabular-nums">
            {`${films.length} films`}
          </Typography>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}
        >
          {genres.map((g) => (
            <Chip
              key={g}
              size="lg"
              selected={genre === g}
              onPress={() => setGenre(g)}
              className={genre === g ? 'border-white bg-white' : 'border-white/10 bg-white/10'}
            >
              <Chip.Label className={genre === g ? 'text-[#0b0f1e]' : 'text-white'}>{g}</Chip.Label>
            </Chip>
          ))}
        </ScrollView>
        <View className="flex-row flex-wrap justify-between gap-y-5 px-5">
          {shown.map((f) => (
            <Animated.View
              key={f.id}
              entering={FadeIn.duration(220).reduceMotion(ReduceMotion.System)}
              layout={LinearTransition.duration(260).reduceMotion(ReduceMotion.System)}
              className="w-[48%]"
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={f.title}
                onPress={() => router.push(`/film/${f.id}`)}
                className="gap-2 active:opacity-80"
              >
                <Image
                  source={f.poster}
                  style={styles.poster}
                  contentFit="cover"
                  transition={150}
                />
                <View className="gap-0.5">
                  <Typography type="body" weight="semibold" numberOfLines={1}>
                    {f.title}
                  </Typography>
                  <Typography type="body-sm" muted>
                    {`${f.year} · ${f.genre}`}
                  </Typography>
                </View>
              </Pressable>
            </Animated.View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  poster: { width: '100%', aspectRatio: 0.7, borderRadius: 20, borderCurve: 'continuous' },
});
