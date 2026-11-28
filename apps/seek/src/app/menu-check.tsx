/**
 * A plain page for the weekly menu check (`maestro/menu.yaml`, run by
 * `.github/workflows/menu-weekly.yml`), opened with `seek://menu-check`. It shows which renderer
 * react-native-tabcn-menu chose and the last row chosen, so the flow can assert both.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Menu, useMenuRenderer } from 'react-native-tabcn-menu';

export default function MenuCheck() {
  const { renderer } = useMenuRenderer();
  const [last, setLast] = useState('none');
  const [pinned, setPinned] = useState(false);

  return (
    <View style={styles.page}>
      <Text style={styles.text}>renderer: {renderer}</Text>
      <Text style={styles.text}>last: {last}</Text>
      <Text style={styles.text}>pinned: {pinned ? 'yes' : 'no'}</Text>
      <Menu>
        <Menu.Trigger>
          <Pressable accessibilityRole="button" style={styles.button}>
            <Text style={styles.text}>Open menu</Text>
          </Pressable>
        </Menu.Trigger>
        <Menu.Content>
          <Menu.Item systemImage="a.circle" onSelect={() => setLast('Alpha')}>
            Alpha
          </Menu.Item>
          <Menu.CheckboxItem
            checked={pinned}
            onCheckedChange={setPinned}
            closeOnSelect
            systemImage="pin"
          >
            Pinned
          </Menu.CheckboxItem>
          <Menu.Separator />
          <Menu.Item variant="destructive" systemImage="trash" onSelect={() => setLast('Delete')}>
            Delete
          </Menu.Item>
        </Menu.Content>
      </Menu>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: 32, paddingTop: 120, gap: 16, backgroundColor: '#02040f' },
  text: { color: '#ffffff', fontSize: 17 },
  button: {
    alignSelf: 'flex-start',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
});
