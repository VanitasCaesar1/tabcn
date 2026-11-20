import { Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { findDesign, LAYOUT_LABELS } from '@/catalog';
import { useColors } from '@/use-colors';

/**
 * Placeholder until the design is built. Each design will replace this with a
 * nested tab navigator that renders the registry tab bar.
 */
export default function DesignScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const design = findDesign(id);
  const colors = useColors();

  if (!design) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.text }}>Unknown design: {id}</Text>
      </View>
    );
  }

  return (
    <View style={styles.center}>
      <Stack.Screen options={{ title: design.title }} />
      <Text style={[styles.layout, { color: colors.muted }]}>{LAYOUT_LABELS[design.layout]}</Text>
      <Text style={[styles.summary, { color: colors.text }]}>{design.summary}</Text>
      <Text style={[styles.status, { color: colors.muted }]}>Not built yet</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  layout: { fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 },
  summary: { fontSize: 17, textAlign: 'center', lineHeight: 24 },
  status: { fontSize: 13 },
});
