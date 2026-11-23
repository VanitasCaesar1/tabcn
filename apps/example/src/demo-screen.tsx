import { router, useNavigation } from 'expo-router';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { useIsFocused } from 'expo-router/react-navigation';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useMinimizeOnScroll } from 'react-native-tabcn';

import { catalog } from '@/catalog';
import { demoScene, demos, designHref, useCurrentDemo } from '@/demos';
import { DESIGN_TAGS } from '@/design-tags';
import { embed, usePreviewSettings } from '@/embed';
import { PANEL_FAMILIES, useDemoScreenColors, usePanelFamily } from '@/panel-theme';
import { SCENE_COMPONENTS, type SceneColors, scenePalette } from '@/scenes';
import { floodColors, Glyph, ICONS, type Palette } from '@/scenes/kit';

/**
 * A tab screen of a design: the design's app scene (DESIGN_TAGS in design-tags.ts) running under
 * the bar, with the tab's name as its title. Outside the site's live preview it also has a quiet
 * row on top: back to the list, the PanelUI theme, and the next design.
 */
export function DemoScreen({ index }: { index: number }) {
  // Read from context, not route params: Expo Router creates the non-initial tab
  // routes of a dynamic [id] layout without params.
  const demo = useCurrentDemo();
  const id = Object.keys(demos).find((key) => demos[key] === demo) ?? '';
  const barHeight = useBottomTabBarHeight();
  const settings = usePreviewSettings();
  const themed = useDemoScreenColors();
  const onScroll = useMinimizeOnScroll();
  const focused = useIsFocused();
  const navigation = useNavigation();

  // A design that comes with its own page draws it instead.
  if (demo?.screen) {
    const Screen = demo.screen;
    return <Screen index={index} />;
  }
  if (!demo) return null;

  const setting = demoScene(id, demo, index, settings.scheme);
  const colors: SceneColors | undefined = setting.flood ? floodColors(setting.flood) : themed;
  const palette = scenePalette(setting.name, setting.scheme, colors);
  const Scene = SCENE_COMPONENTS[setting.name];
  const Extra = demo.extra;

  const scene = (
    <Scene
      index={index}
      barHeight={barHeight}
      scheme={setting.scheme}
      themed={colors}
      title={demo.tabs[index]?.label ?? ''}
      vivid={demo.vivid}
      seed={sceneSeed(id, setting.name)}
      onScroll={onScroll}
      nav={embed ? null : <DemoNav id={id} palette={palette} />}
    />
  );

  return (
    <View style={styles.screen}>
      {focused ? <StatusBar style={palette.dark ? 'light' : 'dark'} /> : null}
      {/* A demo's extra hangs its behaviour on the scene's own controls. */}
      {Extra ? (
        <Extra
          index={index}
          adapter="expo-router"
          barHeight={barHeight}
          goToFirstTab={() => navigation.navigate('index' as never)}
        >
          {scene}
        </Extra>
      ) : (
        scene
      )}
    </View>
  );
}

/**
 * The design's place among the designs shown in the same scene, so neighbours in the list open
 * on different content (another first post, another album).
 */
function sceneSeed(id: string, scene: string) {
  return catalog.filter((d) => DESIGN_TAGS[d.id]?.scene === scene).findIndex((d) => d.id === id);
}

/**
 * Back to the list, the theme, and the next design, drawn the way a navigation bar draws its
 * buttons: plain text in the scene's colours.
 */
function DemoNav({ id, palette }: { id: string; palette: Palette }) {
  const { family, setFamily } = usePanelFamily();
  const built = catalog.filter((d) => demos[d.id]);
  const next = built[(built.findIndex((d) => d.id === id) + 1) % built.length];
  const at = PANEL_FAMILIES.findIndex((f) => f.id === family);
  const theme = PANEL_FAMILIES[at] ?? PANEL_FAMILIES[0];
  const nextTheme = PANEL_FAMILIES[(at + 1) % PANEL_FAMILIES.length];
  return (
    <View style={styles.nav}>
      <Pressable
        role="button"
        accessibilityLabel="Back to designs"
        hitSlop={10}
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        style={({ pressed }) => [styles.navButton, styles.back, { opacity: pressed ? 0.5 : 1 }]}
      >
        <Glyph d={ICONS.back} color={palette.text} size={22} strokeWidth={2.2} />
        <Text style={[styles.navText, { color: palette.text }]}>Designs</Text>
      </Pressable>
      <View style={styles.navEnd}>
        {nextTheme ? (
          <Pressable
            role="button"
            accessibilityLabel={`Theme: ${theme?.label}. Switch to ${nextTheme.label}`}
            hitSlop={8}
            onPress={() => setFamily(nextTheme.id)}
            style={({ pressed }) => [
              styles.theme,
              { borderColor: palette.subtle, opacity: pressed ? 0.5 : 1 },
            ]}
          >
            <Text style={[styles.themeText, { color: palette.subtle }]}>{theme?.label}</Text>
          </Pressable>
        ) : null}
        {next ? (
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
            style={({ pressed }) => [styles.navButton, { opacity: pressed ? 0.5 : 1 }]}
          >
            <Text style={[styles.navText, { color: palette.text }]}>Next</Text>
            <Glyph d={ICONS.chevron} color={palette.text} size={22} strokeWidth={2.2} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
    paddingHorizontal: 8,
  },
  navButton: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 4 },
  back: { marginLeft: -2 },
  navText: { fontSize: 17 },
  navEnd: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  theme: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  themeText: { fontSize: 13, fontWeight: '500' },
});
