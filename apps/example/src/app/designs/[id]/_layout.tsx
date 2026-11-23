import { router, Stack, useLocalSearchParams, usePathname } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { type ReactNode, use, useEffect } from 'react';
import { Alert, Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaFrameContext } from 'react-native-safe-area-context';
import { TabBarProvider } from 'react-native-tabcn';
import { tabBar } from 'react-native-tabcn/expo-router';

import { findDesign, LAYOUT_LABELS } from '@/catalog';
import {
  CurrentDemoProvider,
  demoScene,
  demos,
  RAIL_MIN_WIDTH,
  TAB_ROUTES,
  visibleTabCount,
  withControls,
} from '@/demos';
import { notifyParent, usePreviewSettings } from '@/embed';
import { useDemoScreenColors } from '@/panel-theme';
import { sceneBackground } from '@/scenes';
import { useColors } from '@/use-colors';

export default function DesignLayout() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const design = findDesign(id);
  const demo = demos[id];
  const colors = useColors();
  const { width } = useWindowDimensions();
  // Under a PanelUI theme every screen takes the theme's background.
  const themedScreen = useDemoScreenColors();
  // The site's Customize panel: tab count, light or dark, accent.
  const settings = usePreviewSettings();
  const count = demo ? visibleTabCount(id, demo, settings) : 0;
  const pathname = usePathname();
  useEffect(() => notifyParent({ type: 'tabcn:ready' }), []);
  // Fewer tabs than the one on screen: go to the first.
  useEffect(() => {
    const route = pathname.split('/').at(-1) ?? '';
    const at = TAB_ROUTES.indexOf(route as (typeof TAB_ROUTES)[number]);
    if (at >= count && count > 0) router.replace(`/designs/${id}` as never);
  }, [pathname, count, id]);

  if (!design || !demo) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: design?.title ?? id }} />
        {design ? (
          <>
            <Text style={[styles.layout, { color: colors.muted }]}>
              {LAYOUT_LABELS[design.layout]}
            </Text>
            <Text style={[styles.summary, { color: colors.text }]}>{design.summary}</Text>
            <Text style={[styles.status, { color: colors.muted }]}>Not built yet</Text>
          </>
        ) : (
          <Text style={{ color: colors.text }}>Unknown design: {id}</Text>
        )}
      </View>
    );
  }

  const ctx = {
    onActionPress: () => Alert.alert('Action', 'The action button ran its callback.'),
    routes: TAB_ROUTES,
  };
  const bar = withControls(id, demo.render(ctx), settings);
  // Each tab's screen colour, under the scene drawn on it: the scene's background, a flooded
  // tab's colour, or the PanelUI theme's background.
  const screenColor = (i: number) => {
    const scene = demoScene(id, demo, i, settings.scheme);
    return themedScreen?.background ?? scene.flood ?? sceneBackground(scene.name, scene.scheme);
  };
  // Side Rail: a rail on the left on wide windows (iPad, landscape), a bottom bar otherwise.
  const tabBarPosition = demo.railWhenWide && width >= RAIL_MIN_WIDTH ? 'left' : 'bottom';

  return (
    <CurrentDemoProvider value={demo}>
      {/* The scene draws its own back control, so no stack header. */}
      <Stack.Screen options={{ title: design.title, headerShown: false }} />
      {/* Lets screens drive the bar: panels, the override slot, minimize on scroll. */}
      <TabBarProvider>
        <WebFrame>
          <Tabs
            // A new tab count re-creates the navigator with that many tabs.
            key={count}
            tabBar={tabBar(bar)}
            screenOptions={{
              headerShown: false,
              tabBarPosition,
              tabBarHideOnKeyboard: demo.hideOnKeyboard,
              // Designs whose bar takes each screen's colour fade the screens with it.
              animation: demo.fadeScreens ? 'fade' : undefined,
              sceneStyle: { backgroundColor: screenColor(0) },
            }}
          >
            {TAB_ROUTES.map((name, i) => {
              const tab = i < count ? demo.tabs[i] : undefined;
              return (
                <Tabs.Screen
                  key={name}
                  name={name}
                  options={
                    tab
                      ? {
                          title: tab.label,
                          sceneStyle: {
                            backgroundColor: screenColor(i),
                          },
                          tabBarBadge: tab.badge,
                          tabBarIcon: ({ focused, color, size }) =>
                            tab.icon({ focused, color: String(color), size }),
                        }
                      : { href: null }
                  }
                />
              );
            })}
          </Tabs>
        </WebFrame>
        {/* A panel demo's panel, declared once here so it stays across tabs. */}
        {demo.panel?.(ctx)}
      </TabBarProvider>
    </CurrentDemoProvider>
  );
}

/**
 * On the web the safe-area frame stays 0 x 0, and tabcn sizes sheets from it (the screen's
 * height above the bar), so Section Sheet and Bar Sheet sat below the bottom edge. Give the
 * navigator the window's frame there instead.
 */
function WebFrame({ children }: { children: ReactNode }) {
  const frame = use(SafeAreaFrameContext);
  const { width, height } = useWindowDimensions();
  if (Platform.OS !== 'web' || (frame && frame.height > 0)) return children;
  return (
    <SafeAreaFrameContext value={{ x: 0, y: 0, width, height }}>{children}</SafeAreaFrameContext>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  layout: { fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 },
  summary: { fontSize: 17, textAlign: 'center', lineHeight: 24 },
  status: { fontSize: 13 },
});
