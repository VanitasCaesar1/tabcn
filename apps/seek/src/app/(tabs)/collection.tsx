/** Collection: the saved films as a poster grid, filtered by genre with PanelUI chips. */
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Chip, Typography } from 'panelui-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, LinearTransition, ReduceMotion } from 'react-native-reanimated';
import { AppHeader, EdgeFade, Sky, useDockTop } from '@/components/chrome';
import { Display } from '@/components/display';
import { Press } from '@/components/press';
import { film } from '@/lib/films';
import { useSeek } from '@/lib/search';

export default function Collection() {
  const { saved } = useSeek();
  const bottom = useDockTop(false);
  const films = saved.map(film);
  const genres = ['All', ...new Set(films.map((f) => f.genre))];
  const [genre, setGenre] = useState('All');
  const shown = genre === 'All' ? films : films.filter((f) => f.genre === genre);
  return (
    <View className="flex-1">
      <Sky />
      <AppHeader />
      <EdgeFade bottom={bottom}>
        <ScrollView contentContainerStyle={{ gap: 16, paddingTop: 8, paddingBottom: bottom + 56 }}>
          <View className="flex-row items-baseline justify-between px-5">
            <Display size={44}>Collection</Display>
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
                <Chip.Label className={genre === g ? 'text-[#0b0f1e]' : 'text-white'}>
                  {g}
                </Chip.Label>
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
                <Link href={`/film/${f.id}`} asChild>
                  <Press accessibilityLabel={f.title} contentStyle={styles.cell}>
                    <Link.AppleZoom>
                      <Image
                        source={f.poster}
                        style={styles.poster}
                        contentFit="cover"
                        transition={150}
                      />
                    </Link.AppleZoom>
                    <View className="gap-0.5">
                      <Typography type="body" weight="semibold" numberOfLines={1}>
                        {f.title}
                      </Typography>
                      <Typography type="body-sm" muted>
                        {`${f.year} · ${f.genre}`}
                      </Typography>
                    </View>
                  </Press>
                </Link>
              </Animated.View>
            ))}
          </View>
        </ScrollView>
      </EdgeFade>
    </View>
  );
}

const styles = StyleSheet.create({
  cell: { gap: 8 },
  poster: { width: '100%', aspectRatio: 0.7, borderRadius: 20, borderCurve: 'continuous' },
});
