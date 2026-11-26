/** History: past searches as PanelUI items, each opening the film it found. */
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { Item, Typography } from 'panelui-native';
import { ScrollView, StyleSheet, View } from 'react-native';
import { AppHeader, Sky } from '@/components/chrome';
import { ChevronIcon } from '@/components/icons';
import { film } from '@/lib/films';
import { useSeek } from '@/lib/search';

export default function History() {
  const { history } = useSeek();
  const bottom = useBottomTabBarHeight();
  return (
    <View className="flex-1">
      <Sky />
      <AppHeader />
      <ScrollView
        contentContainerStyle={{
          gap: 10,
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: bottom + 16,
        }}
      >
        <Typography type="h2" weight="bold" className="mb-2 tracking-tighter">
          History
        </Typography>
        {history.map((past) => {
          const f = film(past.filmId);
          return (
            <Item
              key={`${past.query}-${past.when}`}
              onPress={() => router.push(`/film/${f.id}`)}
              accessibilityLabel={`${past.query}. Found ${f.title}, ${past.when}`}
              className="rounded-[20px] border-white/10 bg-white/[0.06] p-2.5"
            >
              <Item.Media>
                <Image source={f.poster} style={styles.thumb} contentFit="cover" />
              </Item.Media>
              <Item.Content>
                <Item.Title numberOfLines={1}>{past.query}</Item.Title>
                <Item.Description>{`${past.when} · ${f.title}`}</Item.Description>
              </Item.Content>
              <Item.Actions>
                <View className="opacity-60">
                  <ChevronIcon />
                </View>
              </Item.Actions>
            </Item>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  thumb: { width: 56, height: 56, borderRadius: 14 },
});
