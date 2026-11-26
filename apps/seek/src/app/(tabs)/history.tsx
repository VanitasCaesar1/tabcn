/**
 * History: past searches, newest first, in Today and Earlier. Each row opens the film it found;
 * swipe it away to remove it, with Undo on a countdown.
 */
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { EmptyState, Item, Swipe, Typography } from 'panelui-native';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { LinearTransition, ReduceMotion } from 'react-native-reanimated';
import { AppHeader, EdgeFade, Sky, useDockTop } from '@/components/chrome';
import { Display } from '@/components/display';
import { ChevronIcon, CloseIcon } from '@/components/icons';
import { film } from '@/lib/films';
import { forget, type Past, useSeek } from '@/lib/search';

const RECENT = new Set(['Just now', 'Today']);

export default function History() {
  const { history } = useSeek();
  const bottom = useDockTop(false);
  const sections = [
    { title: 'Today', items: history.filter((p) => RECENT.has(p.when)) },
    { title: 'Earlier', items: history.filter((p) => !RECENT.has(p.when)) },
  ].filter((s) => s.items.length > 0);
  return (
    <View className="flex-1">
      <Sky />
      <AppHeader />
      <EdgeFade bottom={bottom}>
        <ScrollView
          contentContainerStyle={{
            gap: 10,
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom: bottom + 56,
          }}
        >
          <Display size={44} className="mb-1">
            History
          </Display>
          {sections.length === 0 ? (
            <EmptyState className="mt-16">
              <EmptyState.Title>No searches yet</EmptyState.Title>
              <EmptyState.Description>
                Films you find on Discover show up here.
              </EmptyState.Description>
            </EmptyState>
          ) : null}
          <Swipe.Group className="gap-2.5">
            {sections.map((section) => (
              <View key={section.title} className="gap-2.5">
                <Typography type="small" muted className="mt-2 uppercase tracking-wider">
                  {section.title}
                </Typography>
                {section.items.map((past) => (
                  <Row key={`${past.query}-${past.when}`} past={past} />
                ))}
              </View>
            ))}
          </Swipe.Group>
        </ScrollView>
      </EdgeFade>
    </View>
  );
}

function Row({ past }: { past: Past }) {
  const f = film(past.filmId);
  return (
    <Animated.View layout={LinearTransition.duration(240).reduceMotion(ReduceMotion.System)}>
      <Swipe className="overflow-hidden rounded-[20px]" haptics>
        <Item
          onPress={() => router.push(`/film/${f.id}`)}
          accessibilityLabel={`${past.query}. Found ${f.title}, ${past.when}`}
          className="rounded-[20px] border-white/10 bg-[#0d1536] p-2.5"
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
        <Swipe.End>
          <Swipe.Action
            label="Remove"
            color="destructive"
            icon={<CloseIcon />}
            onPress={() => forget(past)}
          />
        </Swipe.End>
      </Swipe>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  thumb: { width: 56, height: 56, borderRadius: 14 },
});
