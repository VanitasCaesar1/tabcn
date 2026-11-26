/** Discover, Collection and History under Ask Dock. */
import { CollectionIcon, DiscoverIcon, HistoryIcon } from '@registry/ask-dock/ask-dock-icons';
import { Tabs } from 'expo-router/js-tabs';
import type { ComponentType } from 'react';
import type { TabIconProps } from 'react-native-tabcn';
import { tabBar } from 'react-native-tabcn/expo-router';
import { SeekDock } from '@/components/dock';

/** A tab glyph as React Navigation's `tabBarIcon`, which passes the colour as a ColorValue. */
const icon =
  (Glyph: ComponentType<TabIconProps>) =>
  ({ focused, color, size }: { focused: boolean; color: unknown; size: number }) => (
    <Glyph focused={focused} color={String(color)} size={size} />
  );

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={tabBar(<SeekDock />)}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: '#02040f' } }}
    >
      <Tabs.Screen name="index" options={{ title: 'Discover', tabBarIcon: icon(DiscoverIcon) }} />
      <Tabs.Screen
        name="collection"
        options={{ title: 'Collection', tabBarIcon: icon(CollectionIcon) }}
      />
      <Tabs.Screen name="history" options={{ title: 'History', tabBarIcon: icon(HistoryIcon) }} />
    </Tabs>
  );
}
