import { router } from 'expo-router';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { catalog } from '@/catalog';
import { demos, useCurrentDemo } from '@/demos';
import { Pattern } from '@/pattern';

/**
 * A tab screen showing the design the way the reference does: the bar on the
 * reference's background colour and pattern, with a title and a Next button.
 */
export function DemoScreen({ index }: { index: number }) {
  // Read from context, not route params: Expo Router creates the non-initial tab
  // routes of a dynamic [id] layout without params.
  const demo = useCurrentDemo();
  const id = Object.keys(demos).find((key) => demos[key] === demo);
  const barHeight = useBottomTabBarHeight();
  const { height } = useWindowDimensions();
  const built = catalog.filter((d) => demos[d.id]);
  const next = built[(built.findIndex((d) => d.id === id) + 1) % built.length];
  const title = demo?.tabs[index]?.label ?? '';
  const text = demo?.dark ? '#ffffff' : '#111114';
  const chip = demo?.dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.06)';

  return (
    <View style={[styles.screen, { backgroundColor: demo?.background }]}>
      {demo?.pattern ? <Pattern spec={demo.pattern} centerY={height - barHeight / 2 - 60} /> : null}
      <View style={styles.header}>
        <Text style={[styles.title, { color: text }]}>{title}</Text>
        {next ? (
          <Pressable
            role="button"
            accessibilityLabel={`Next design: ${next.title}`}
            hitSlop={10}
            onPress={() => {
              // Keep one design screen on the stack: Expo Router's tab navigation
              // resolves a tab's params against the first matching [id] screen.
              router.dismissTo('/');
              router.push({ pathname: '/designs/[id]', params: { id: next.id } });
            }}
            style={[styles.next, { backgroundColor: chip }]}
          >
            <Text style={{ color: text, fontWeight: '600' }}>Next: {next.title}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  title: { fontSize: 30, fontWeight: '700' },
  next: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
});
