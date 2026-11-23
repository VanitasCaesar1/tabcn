/**
 * A cloud drive: search, recent files with thumbnails, folders, a file list and storage used.
 * File names and people are invented.
 */
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  Avatar,
  Glyph,
  Hairline,
  ICONS,
  num,
  type Palette,
  Photo,
  RoundButton,
  type SceneProps,
  SceneScroll,
  SearchField,
  SectionHeader,
  scenePalette,
} from './kit';
import { AVATARS, FILES, POSTS } from './photos';

const RECENT = [
  { name: 'Reading list.pdf', note: 'Opened 10 min ago', thumb: FILES[0] },
  { name: 'Q4 planning.key', note: 'Edited 1 h ago', thumb: FILES[1] },
  { name: 'Brand sheet.png', note: 'Edited yesterday', thumb: FILES[3] },
  { name: 'Archive scans', note: 'Shared by Aiko', thumb: FILES[2] },
  { name: 'Fjord trip.jpg', note: 'Added Monday', thumb: POSTS[0] },
];

const FOLDERS = [
  { name: 'Projects', count: '24 items', size: '3.1 GB' },
  { name: 'Photos', count: '1,208 items', size: '18.4 GB' },
  { name: 'Invoices', count: '86 items', size: '212 MB' },
  { name: 'Shared with me', count: '31 items', size: '1.7 GB' },
];

const LIST = [
  { name: 'Lease agreement.pdf', kind: 'PDF', meta: 'Edited Nov 12 · 2.4 MB', by: 0 },
  { name: 'Moodboard final.fig', kind: 'FIG', meta: 'Edited Nov 10 · 18.6 MB', by: 2 },
  { name: 'Budget 2027.xlsx', kind: 'XLS', meta: 'Edited Nov 8 · 640 KB', by: 5 },
  { name: 'Interview notes.docx', kind: 'DOC', meta: 'Edited Nov 6 · 88 KB', by: 3 },
  { name: 'Launch film v3.mov', kind: 'MOV', meta: 'Edited Nov 2 · 1.2 GB', by: 6 },
  { name: 'Floor plan.pdf', kind: 'PDF', meta: 'Edited Oct 28 · 5.1 MB', by: 1 },
];

export function FilesScene(props: SceneProps) {
  const palette = scenePalette('files', props.scheme, props.themed);
  return (
    <SceneScroll
      scene={props}
      palette={palette}
      gap={26}
      accessory={<Avatar source={AVATARS[1]} size={36} palette={palette} />}
      lead={<SearchField label="Search in Drive" palette={palette} />}
      sections={[
        <Recent key="recent" palette={palette} />,
        <Folders key="folders" palette={palette} />,
        <Files key="files" palette={palette} />,
      ]}
      trail={<Storage palette={palette} />}
    />
  );
}

function Recent({ palette }: { palette: Palette }) {
  return (
    <View>
      <SectionHeader title="Recent" palette={palette} action="See all" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {RECENT.map((file) => (
          <View key={file.name} style={[styles.recent, { backgroundColor: palette.surface }]}>
            <Photo source={file.thumb} palette={palette} style={styles.thumb} />
            <View style={styles.recentText}>
              <Text numberOfLines={1} style={[styles.name, { color: palette.text }]}>
                {file.name}
              </Text>
              <Text numberOfLines={1} style={[styles.meta, { color: palette.subtle }]}>
                {file.note}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function Folders({ palette }: { palette: Palette }) {
  return (
    <View>
      <SectionHeader title="Folders" palette={palette} />
      <View style={styles.grid}>
        {FOLDERS.map((folder) => (
          <View key={folder.name} style={[styles.folder, { backgroundColor: palette.surface }]}>
            <Glyph d={ICONS.folder} color={palette.accent} size={26} />
            <Text numberOfLines={1} style={[styles.name, { color: palette.text }]}>
              {folder.name}
            </Text>
            <Text style={[styles.meta, num, { color: palette.subtle }]}>
              {folder.count} · {folder.size}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Files({ palette }: { palette: Palette }) {
  return (
    <View>
      <SectionHeader title="All files" palette={palette} action="Name" />
      <View style={[styles.card, { backgroundColor: palette.surface }]}>
        {LIST.map((file, i) => (
          <View key={file.name}>
            <View style={styles.fileRow}>
              <View style={[styles.kind, { borderColor: palette.subtle }]}>
                <Text style={[styles.kindText, { color: palette.subtle }]}>{file.kind}</Text>
              </View>
              <View style={styles.flex}>
                <Text numberOfLines={1} style={[styles.name, { color: palette.text }]}>
                  {file.name}
                </Text>
                <Text style={[styles.meta, num, { color: palette.subtle }]}>{file.meta}</Text>
              </View>
              <Avatar source={AVATARS[file.by]} size={24} palette={palette} />
            </View>
            {i < LIST.length - 1 ? <Hairline palette={palette} inset={64} /> : null}
          </View>
        ))}
      </View>
    </View>
  );
}

function Storage({ palette }: { palette: Palette }) {
  return (
    <View style={[styles.card, styles.storage, { backgroundColor: palette.surface }]}>
      <View style={styles.storageTop}>
        <Text style={[styles.name, { color: palette.text }]}>Storage</Text>
        <Text style={[styles.meta, num, { color: palette.subtle }]}>38.2 GB of 100 GB used</Text>
      </View>
      <View style={[styles.track, { backgroundColor: palette.background }]}>
        <View style={[styles.fill, { backgroundColor: palette.accent }]} />
      </View>
      <View style={styles.storageRow}>
        <RoundButton icon={ICONS.arrowUp} palette={palette} />
        <Text style={[styles.meta, { color: palette.subtle, flex: 1 }]}>
          Photos back up over Wi‑Fi. Last backup 4 minutes ago.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { gap: 10, paddingHorizontal: 16 },
  recent: { width: 150, borderRadius: 14, borderCurve: 'continuous', overflow: 'hidden' },
  thumb: { width: 150, height: 104 },
  recentText: { padding: 10, gap: 2 },
  name: { fontSize: 15, fontWeight: '500' },
  meta: { fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16 },
  folder: {
    width: '47%',
    flexGrow: 1,
    gap: 6,
    padding: 14,
    borderRadius: 14,
    borderCurve: 'continuous',
  },
  card: { marginHorizontal: 16, borderRadius: 14, borderCurve: 'continuous' },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  kind: {
    width: 40,
    height: 40,
    borderRadius: 9,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kindText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },
  storage: { gap: 12, padding: 14 },
  storageTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { width: '38%', height: 6, borderRadius: 3 },
  storageRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
