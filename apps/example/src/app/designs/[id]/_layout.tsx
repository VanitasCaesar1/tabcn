import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { Alert, type ColorValue, StyleSheet, Text, View } from 'react-native';
import { tabBar } from 'tabcn/expo-router';

import { findDesign, LAYOUT_LABELS } from '@/catalog';
import { designs } from '@/designs';
import { useColors } from '@/use-colors';

type IconName = keyof typeof Ionicons.glyphMap;

function icon(outline: IconName, filled: IconName) {
  return ({ focused, color, size }: { focused: boolean; color: ColorValue; size: number }) => (
    <Ionicons name={focused ? filled : outline} color={color as string} size={size} />
  );
}

export default function DesignLayout() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const design = findDesign(id);
  const render = designs[id];
  const colors = useColors();

  if (!design || !render) {
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

  const bar = render({
    onActionPress: () => Alert.alert('Action', 'The action button ran its callback.'),
  });

  return (
    <>
      <Stack.Screen options={{ title: design.title }} />
      <Tabs tabBar={tabBar(bar)} screenOptions={{ headerShown: false }}>
        <Tabs.Screen
          name="index"
          options={{ title: 'Home', tabBarIcon: icon('home-outline', 'home') }}
        />
        <Tabs.Screen
          name="explore"
          options={{ title: 'Explore', tabBarIcon: icon('compass-outline', 'compass') }}
        />
        <Tabs.Screen
          name="inbox"
          options={{
            title: 'Inbox',
            tabBarIcon: icon('chatbubble-outline', 'chatbubble'),
            tabBarBadge: 3,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{ title: 'Profile', tabBarIcon: icon('person-outline', 'person') }}
        />
      </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  layout: { fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 },
  summary: { fontSize: 17, textAlign: 'center', lineHeight: 24 },
  status: { fontSize: 13 },
});
