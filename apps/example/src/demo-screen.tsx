import { router, useNavigation } from 'expo-router';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { catalog } from '@/catalog';
import { DemoFeed } from '@/demo-feed';
import { demos, designHref, isDarkScreen, screenBackground, useCurrentDemo } from '@/demos';
import { embed } from '@/embed';
import { PANEL_FAMILIES, useDemoScreenColors, usePanelFamily } from '@/panel-theme';
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
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // useBottomTabBarHeight() covers the bar plus the gap below it; the bar's centre sits half a bar above that gap.
  const barCenterY = height - barHeight + (demo?.barHeight ?? 58) / 2;
  const built = catalog.filter((d) => demos[d.id]);
  const next = built[(built.findIndex((d) => d.id === id) + 1) % built.length];
  const title = demo?.tabs[index]?.label ?? '';
  // Under a PanelUI theme the screen takes the theme's colours and drops the reference's pattern.
  const themed = useDemoScreenColors();
  const { family, setFamily } = usePanelFamily();
  // Light ink on a dark screen: per tab, so a demo can mix light and dark screens (Offset Plus).
  const darkScreen = demo ? isDarkScreen(demo, index) : false;
  const text = themed?.text ?? (darkScreen ? '#ffffff' : '#111114');
  const chip = themed?.chip ?? (darkScreen ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.06)');
  const Extra = demo?.extra;
  const navigation = useNavigation();

  // A design that comes with its own page draws it instead.
  if (demo?.screen) {
    const Screen = demo.screen;
    return <Screen index={index} />;
  }

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: themed?.background ?? (demo ? screenBackground(demo, index) : undefined),
        },
      ]}
    >
      {demo?.pattern && !themed ? <Pattern spec={demo.pattern} centerY={barCenterY} /> : null}
      {demo?.blobs?.map((b) => (
        <View
          key={`${b.dx},${b.dy}`}
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: width / 2 + b.dx - b.r,
            top: barCenterY + b.dy - b.r,
            width: b.r * 2,
            height: b.r * 2,
            borderRadius: b.r,
            backgroundColor: b.color,
          }}
        />
      ))}
      {/* A demo with a sheet hides the stack header (see Demo.fullScreen), so it offers its own
          way back. */}
      {demo?.fullScreen && !embed ? (
        <Pressable
          role="button"
          accessibilityLabel="Back"
          hitSlop={10}
          onPress={() => router.back()}
          style={[styles.next, styles.back, { top: insets.top + 12, backgroundColor: chip }]}
        >
          <Text style={{ color: text, fontWeight: '600' }}>Back</Text>
        </Pressable>
      ) : null}
      {/* The stack header is transparent on iOS 26, so clear it by hand. */}
      <View style={[styles.header, { paddingTop: insets.top + 64 }]}>
        <Text style={[styles.title, { color: text }]}>{title}</Text>
        {next && !embed ? (
          <Pressable
            role="button"
            accessibilityLabel={`Next design: ${next.title}`}
            hitSlop={10}
            onPress={() => {
              // Keep one design screen on the stack: Expo Router's tab navigation
              // resolves a tab's params against the first matching [id] screen.
              router.dismissTo('/');
              router.push(designHref(next.id));
            }}
            style={[styles.next, { backgroundColor: chip }]}
          >
            <Text style={{ color: text, fontWeight: '600' }}>Next: {next.title}</Text>
          </Pressable>
        ) : null}
      </View>
      {/* PanelUI's themes, through the bridge an app installs (registry/themes/panelui-colors.ts). */}
      {/* In the site's live preview the page around it has these. */}
      {embed ? null : (
        <View style={styles.themes} role="radiogroup" accessibilityLabel="Theme">
          {PANEL_FAMILIES.map((option) => {
            const selected = option.id === family;
            return (
              <Pressable
                key={option.id}
                role="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={
                  option.id === 'tabcn' ? 'Design colours' : `PanelUI ${option.label}`
                }
                hitSlop={6}
                onPress={() => setFamily(option.id)}
                style={[styles.theme, { backgroundColor: selected ? text : chip }]}
              >
                <Text
                  style={[
                    styles.themeLabel,
                    {
                      color: selected
                        ? (themed?.background ?? (darkScreen ? '#000000' : '#ffffff'))
                        : text,
                    },
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
      {/* A panel demo's controls, or a list to scroll. */}
      {Extra ? (
        <Extra
          index={index}
          text={text}
          chip={chip}
          adapter="expo-router"
          barHeight={barHeight}
          goToFirstTab={() => navigation.navigate('index' as never)}
        />
      ) : (
        // App-like content for the bar to sit over, unless the demo brings its own.
        <DemoFeed index={index} text={text} barHeight={barHeight} />
      )}
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
  },
  title: { fontSize: 30, fontWeight: '700' },
  next: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  back: { position: 'absolute', left: 20 },
  themes: { flexDirection: 'row', gap: 6, paddingHorizontal: 20, paddingTop: 12 },
  theme: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    borderCurve: 'continuous',
  },
  themeLabel: { fontSize: 13, fontWeight: '600' },
});
