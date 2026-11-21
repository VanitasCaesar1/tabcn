// Composer Dock's demo: a chat app's four screens (Chat, Projects, Code, Artifacts) under the
// dock, the scrub preview (the screen fades to a large faint icon of the tab under the finger),
// hold menus of recent items, the attachment menu and a model picker. Sending a message adds
// it to the chat with a short reply.

import { ComposerDock, type ComposerDockMenu } from '@registry/composer-dock/composer-dock';
import {
  ArtifactItemIcon,
  ArtifactsIcon,
  CameraIcon,
  ChatIcon,
  CodeIcon,
  CodeItemIcon,
  ConnectorsIcon,
  FileIcon,
  HomeItemIcon,
  MoreIcon,
  PhotoIcon,
  ProjectItemIcon,
  ProjectsIcon,
  SkillsIcon,
  ThumbItemIcon,
} from '@registry/composer-dock/composer-dock-icons';
import { router } from 'expo-router';
import { type ReactNode, useEffect, useState, useSyncExternalStore } from 'react';
import {
  Alert,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { type TabItem, tabcnTiming } from 'react-native-tabcn';

export const COMPOSER_BACKGROUND = '#f8f8f6';
const INK = '#1f1e1d';
const SOFT = '#8a8984';
const FAINT = '#dcdbd6';
const fade = { ...tabcnTiming, reduceMotion: ReduceMotion.System };

// ---- A tiny store the dock, the screens and the model sheet share. ----

interface Message {
  id: number;
  from: 'me' | 'assistant';
  text: string;
}

interface DemoState {
  scrubbing: string | null;
  messages: Message[];
  model: string;
  pickingModel: boolean;
}

let state: DemoState = { scrubbing: null, messages: [], model: 'Large 5', pickingModel: false };
const listeners = new Set<() => void>();
function set(patch: Partial<DemoState>) {
  state = { ...state, ...patch };
  for (const l of listeners) l();
}
function useDemo(): DemoState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}

let nextId = 1;
function send(text: string) {
  set({ messages: [...state.messages, { id: nextId++, from: 'me', text }] });
  setTimeout(() => {
    set({
      messages: [
        ...state.messages,
        {
          id: nextId++,
          from: 'assistant',
          text: 'Here’s a first pass. Tell me what to change and I’ll take it from there.',
        },
      ],
    });
  }, 700);
}

const say = (what: string) => () => Alert.alert(what, 'The menu row ran its callback.');

// ---- The dock, as the demo passes it to `tabBar()`. ----

export function ComposerDockDemoBar({ routes }: { routes: readonly string[] }) {
  const { model } = useDemo();
  const menus: Record<string, ComposerDockMenu> = {
    [routes[1] ?? 't2']: {
      items: [
        {
          key: 'fpl',
          label: 'Fantasy league',
          icon: ProjectItemIcon,
          onPress: say('Fantasy league'),
        },
        { key: 'meal', label: 'Meal prep', icon: ProjectItemIcon, onPress: say('Meal prep') },
        { key: 'games', label: 'Games', icon: ThumbItemIcon, onPress: say('Games') },
        {
          key: 'assistant',
          label: 'Executive assistant',
          icon: HomeItemIcon,
          unread: true,
          onPress: say('Executive assistant'),
        },
      ],
      create: { label: 'New project', onPress: say('New project') },
    },
    [routes[2] ?? 't3']: {
      items: [
        {
          key: 'hvac',
          label: 'Water heater options',
          icon: CodeItemIcon,
          onPress: say('Water heater options'),
        },
        {
          key: 'review',
          label: 'Review request',
          icon: CodeItemIcon,
          onPress: say('Review request'),
        },
        {
          key: 'receipts',
          label: 'Renovation receipts',
          icon: CodeItemIcon,
          onPress: say('Renovation receipts'),
        },
        {
          key: 'shopping',
          label: 'Holiday shopping list',
          icon: CodeItemIcon,
          unread: true,
          onPress: say('Holiday shopping list'),
        },
      ],
      create: { label: 'New code session', onPress: say('New code session') },
    },
    [routes[3] ?? 't4']: {
      items: [
        { key: 'take', label: 'One Take', icon: ArtifactItemIcon, onPress: say('One Take') },
        { key: 'overdub', label: 'Overdub', icon: ArtifactItemIcon, onPress: say('Overdub') },
        {
          key: 'sinks',
          label: 'Kitchen sinks',
          icon: ArtifactItemIcon,
          onPress: say('Kitchen sinks'),
        },
        { key: 'zone', label: 'Zone One', icon: ArtifactItemIcon, onPress: say('Zone One') },
        {
          key: 'trailer',
          label: 'Zone One trailer',
          icon: ArtifactItemIcon,
          onPress: say('Zone One trailer'),
        },
      ],
    },
  };
  return (
    <ComposerDock
      onSend={send}
      model={model}
      onModelPress={() => set({ pickingModel: true })}
      onVoicePress={say('Voice mode')}
      onDictatePress={say('Dictate')}
      attachments={[
        [
          { key: 'camera', label: 'Camera', icon: CameraIcon, onPress: say('Camera') },
          { key: 'photos', label: 'Photos', icon: PhotoIcon, onPress: say('Photos') },
          { key: 'files', label: 'Files', icon: FileIcon, onPress: say('Files') },
          { key: 'project', label: 'Project', icon: ProjectItemIcon, onPress: say('Project') },
        ],
        [
          {
            key: 'connectors',
            label: 'Connectors',
            icon: ConnectorsIcon,
            onPress: say('Connectors'),
          },
          { key: 'skills', label: 'Skills', icon: SkillsIcon, onPress: say('Skills') },
          { key: 'more', label: 'More', icon: MoreIcon, onPress: say('More') },
        ],
      ]}
      menus={menus}
      onScrubTab={(tab: TabItem | null) => set({ scrubbing: tab?.label ?? null })}
    />
  );
}

export const COMPOSER_TABS = [
  { label: 'Chat', icon: ChatIcon },
  { label: 'Projects', icon: ProjectsIcon },
  { label: 'Code', icon: CodeIcon },
  { label: 'Artifacts', icon: ArtifactsIcon },
];

// ---- The model picker, declared beside the navigator. ----

const MODELS = [
  { name: 'Max 5', note: 'For the hardest problems' },
  { name: 'Large 5', note: 'For complex work and everyday tasks' },
  { name: 'Quick 5', note: 'Fastest for quick answers' },
];

export function ModelSheet() {
  const { pickingModel, model } = useDemo();
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={pickingModel}
      transparent
      animationType="slide"
      onRequestClose={() => set({ pickingModel: false })}
    >
      <Pressable
        accessibilityLabel="Close"
        style={styles.sheetScrim}
        onPress={() => set({ pickingModel: false })}
      />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.sheetHeader}>
          <Pressable
            role="button"
            accessibilityLabel="Close"
            hitSlop={10}
            onPress={() => set({ pickingModel: false })}
          >
            <Glyph d="M6 6l12 12M18 6 6 18" color={INK} />
          </Pressable>
          <Text style={styles.sheetTitle}>Model</Text>
          <View style={{ width: 22 }} />
        </View>
        {MODELS.map((m) => {
          const chosen = m.name === model;
          return (
            <Pressable
              key={m.name}
              role="radio"
              aria-checked={chosen}
              onPress={() => set({ model: m.name, pickingModel: false })}
              style={[styles.modelRow, chosen ? styles.modelChosen : null]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.modelName, { color: chosen ? INK : SOFT }]}>{m.name}</Text>
                <Text style={styles.modelNote}>{m.note}</Text>
              </View>
              {chosen ? <Glyph d="m5 12.5 4.5 4.5L19 7.5" color={INK} /> : null}
            </Pressable>
          );
        })}
      </View>
    </Modal>
  );
}

// ---- The screens. ----

export function ComposerDockScreen({ index }: { index: number }) {
  const { scrubbing } = useDemo();
  const insets = useSafeAreaInsets();
  const content =
    index === 0 ? (
      <ChatScreen />
    ) : index === 1 ? (
      <ProjectsScreen />
    ) : index === 2 ? (
      <CodeScreen />
    ) : (
      <ArtifactsScreen />
    );
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <Header title={index === 0 ? undefined : COMPOSER_TABS[index]?.label} />
      <Preview scrubbing={scrubbing}>{content}</Preview>
    </View>
  );
}

/** While scrubbing, the screen fades to a large faint icon of the tab under the finger. */
function Preview({ scrubbing, children }: { scrubbing: string | null; children: ReactNode }) {
  const shown = useSharedValue(0);
  const [label, setLabel] = useState(scrubbing);
  if (scrubbing && scrubbing !== label) setLabel(scrubbing);
  useEffect(() => {
    shown.value = withTiming(scrubbing ? 1 : 0, fade);
  }, [scrubbing, shown]);
  const contentStyle = useAnimatedStyle(() => ({ opacity: 1 - shown.value }));
  const iconStyle = useAnimatedStyle(() => ({ opacity: shown.value }));
  const Icon = COMPOSER_TABS.find((t) => t.label === label)?.icon;
  return (
    <View style={{ flex: 1 }}>
      <Animated.View style={[{ flex: 1 }, contentStyle]}>{children}</Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.center, iconStyle]}
      >
        {Icon ? <Icon color={FAINT} size={56} /> : null}
      </Animated.View>
    </View>
  );
}

function Header({ title }: { title?: string }) {
  return (
    <View style={styles.header}>
      <Pressable
        role="button"
        accessibilityLabel="Back to the gallery"
        hitSlop={10}
        onPress={() => router.back()}
        style={styles.headerButton}
      >
        <Glyph d="M4 7h16M4 12h10M4 17h16" color={INK} />
      </Pressable>
      {title ? <Text style={styles.headerTitle}>{title}</Text> : <View />}
      <Pressable
        role="button"
        accessibilityLabel="New chat"
        hitSlop={10}
        onPress={() => set({ messages: [] })}
        style={styles.headerButton}
      >
        <Glyph d="M12 20h8M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" color={INK} />
      </Pressable>
    </View>
  );
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Morning' : h < 18 ? 'Afternoon' : 'Evening';
}

function ChatScreen() {
  const { messages } = useDemo();
  if (messages.length === 0) {
    return (
      // Tapping the empty chat puts the keyboard away.
      <Pressable accessible={false} onPress={Keyboard.dismiss} style={[styles.flex, styles.center]}>
        <Svg width={26} height={26} viewBox="0 0 24 24">
          <Path
            d="M12 2.5 13.6 10.4 21.5 12 13.6 13.6 12 21.5 10.4 13.6 2.5 12 10.4 10.4Z"
            fill="#d97757"
          />
        </Svg>
        <Text style={styles.greeting}>{greeting()}, Robin</Text>
      </Pressable>
    );
  }
  return (
    <ScrollView
      contentContainerStyle={styles.chat}
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="handled"
    >
      {messages.map((m) =>
        m.from === 'me' ? (
          <View key={m.id} style={styles.mine}>
            <Text style={styles.mineText}>{m.text}</Text>
          </View>
        ) : (
          <Text key={m.id} style={styles.reply}>
            {m.text}
          </Text>
        ),
      )}
    </ScrollView>
  );
}

function ProjectsScreen() {
  const rows = [
    ['Executive assistant', 'Updated today'],
    ['Games', 'Updated yesterday'],
    ['Meal prep', 'Updated 3 days ago'],
    ['Fantasy league', 'Updated last week'],
    ['Renovation receipts', 'Updated 2 weeks ago'],
  ];
  return (
    <ScrollView contentContainerStyle={styles.list}>
      {rows.map(([name, note]) => (
        <Row
          key={name}
          icon={<ProjectItemIcon color={SOFT} size={18} />}
          title={name ?? ''}
          note={note}
        />
      ))}
    </ScrollView>
  );
}

function CodeScreen() {
  const rows = [
    ['Holiday shopping list', 'main · 2 files changed'],
    ['Renovation receipts', 'main · 5 files changed'],
    ['Review request', 'review/ui · ready'],
    ['Water heater options', 'research · draft'],
  ];
  return (
    <ScrollView contentContainerStyle={styles.list}>
      {rows.map(([name, note]) => (
        <Row
          key={name}
          icon={<CodeItemIcon color={SOFT} size={18} />}
          title={name ?? ''}
          note={note}
        />
      ))}
    </ScrollView>
  );
}

function ArtifactsScreen() {
  const { width } = useWindowDimensions();
  const card = (width - 16 * 2 - 12) / 2;
  const items = [
    'Zone One trailer',
    'Zone One',
    'Kitchen sinks',
    'Overdub',
    'One Take',
    'Moon phases',
  ];
  const tints = ['#e9e4dc', '#dfe5ea', '#e6e1ea', '#e2e8df', '#ece2dc', '#dde2ec'];
  return (
    <ScrollView contentContainerStyle={styles.grid}>
      {items.map((name, i) => (
        <View key={name} style={{ width: card }}>
          <View style={[styles.thumb, { height: card * 0.78, backgroundColor: tints[i] }]} />
          <Text numberOfLines={1} style={styles.cardTitle}>
            {name}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

function Row({ icon, title, note }: { icon: ReactNode; title: string; note?: string }) {
  return (
    <Pressable
      role="button"
      onPress={say(title)}
      style={({ pressed }) => [
        styles.row,
        pressed ? { backgroundColor: 'rgba(0,0,0,0.04)' } : null,
      ]}
    >
      {icon}
      <View style={styles.flex}>
        <Text style={styles.rowTitle}>{title}</Text>
        {note ? <Text style={styles.rowNote}>{note}</Text> : null}
      </View>
    </Pressable>
  );
}

function Glyph({ d, color }: { d: string; color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Path
        d={d}
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COMPOSER_BACKGROUND },
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  headerButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '600', color: INK },
  greeting: { marginTop: 10, fontSize: 23, color: INK, fontFamily: 'Georgia' },
  chat: { padding: 20, gap: 18 },
  mine: {
    alignSelf: 'flex-end',
    maxWidth: '80%',
    backgroundColor: '#ecebe6',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  mineText: { fontSize: 16, lineHeight: 22, color: INK },
  reply: { fontSize: 16, lineHeight: 24, color: INK, fontFamily: 'Georgia' },
  list: { paddingHorizontal: 8, paddingTop: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
  },
  rowTitle: { fontSize: 16, color: INK },
  rowNote: { marginTop: 2, fontSize: 13, color: SOFT },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, padding: 16 },
  thumb: { borderRadius: 14, borderCurve: 'continuous' },
  cardTitle: { marginTop: 8, fontSize: 14, color: INK },
  sheetScrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.18)' },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderCurve: 'continuous',
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sheetTitle: { fontSize: 16, fontWeight: '600', color: INK },
  modelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
  },
  modelChosen: { backgroundColor: '#f2f1ed' },
  modelName: { fontSize: 16, fontWeight: '500' },
  modelNote: { marginTop: 2, fontSize: 13, color: SOFT },
});
