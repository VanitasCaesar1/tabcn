/**
 * The parts of the example app's demos that need hooks: panel demos (Mini Player, Context
 * Tray, Quick Create) and the scrolling list that shows Split Search minimizing. Kept out of
 * demos.tsx, whose top-level object keys are read as design ids by scripts/check-registry.ts.
 *
 * A panel demo renders its paired bar as the tab bar, declares the panel once in the design
 * layout (under its TabBarProvider, beside <Tabs>), and puts its controls on the demo screen.
 *
 * These run under both demos: Expo Router's (src/app/designs/[id]/) and plain React
 * Navigation's (src/app/react-navigation.tsx). Anything that depends on the navigator (the
 * bar's height, going to the first tab, the override hook's entry) comes in through
 * `DemoExtraProps`, so nothing here reads one navigator's context under the other.
 */

import { ContextTray } from '@registry/context-tray/context-tray';
import { LabeledPlus } from '@registry/labeled-plus/labeled-plus';
import { MiniPlayer } from '@registry/mini-player/mini-player';
import * as QuickCreateIcons from '@registry/quick-create/icons';
import { QuickCreate, useQuickCreate } from '@registry/quick-create/quick-create';
import { type ReactNode, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useMinimizeOnScroll, useTabPanel } from 'tabcn';
import { useTabBarOverride as useExpoRouterOverride } from 'tabcn/expo-router';
import { useTabBarOverride as useReactNavigationOverride } from 'tabcn/react-navigation';

/** What a demo screen passes to its extra content. */
export interface DemoExtraProps {
  /** Index of the tab showing it. */
  index: number;
  /** Text colour and button fill that suit the demo's background. */
  text: string;
  chip: string;
  /** The navigator the demo runs under: picks the matching 'tabcn/<adapter>' entry. */
  adapter: 'expo-router' | 'react-navigation';
  /** The navigator's `useBottomTabBarHeight()`: what the bar covers at the bottom. */
  barHeight: number;
  /** Navigates to the tab navigator's first tab. */
  goToFirstTab: () => void;
}

/** `useTabBarOverride` from the entry that matches the demo's navigator. */
function ExpoRouterOverride({ element }: { element: ReactNode }) {
  useExpoRouterOverride(element);
  return null;
}

function ReactNavigationOverride({ element }: { element: ReactNode }) {
  useReactNavigationOverride(element);
  return null;
}

function DemoButton({
  label,
  onPress,
  chip,
  text,
}: {
  label: string;
  onPress: () => void;
  chip: string;
  text: string;
}) {
  return (
    <Pressable
      role="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: chip, opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <Text style={[styles.buttonText, { color: text }]}>{label}</Text>
    </Pressable>
  );
}

function Note({ text, message }: { text: string; message: string }) {
  return <Text style={[styles.note, { color: text }]}>{message}</Text>;
}

// Mini Player (paired with Soft Pill) --------------------------------------------------------

const PLAYER = 'player';

const TRACKS = [
  { title: 'Slow Tide', artist: 'Harbor Lights', duration: 214 },
  { title: 'Paper Planes', artist: 'Juniper Fields', duration: 187 },
  { title: 'Night Bus', artist: 'The Quiet Hours', duration: 242 },
];

/** The panel, with local playback so it moves: progress ticks while playing. */
export function MiniPlayerPanel() {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [elapsed, setElapsed] = useState(48);
  const track = TRACKS[index % TRACKS.length] ?? TRACKS[0];
  const duration = track?.duration ?? 1;
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => setElapsed((s) => (s + 1) % duration), 1000);
    return () => clearInterval(timer);
  }, [playing, duration]);
  if (!track) return null;
  const go = (step: number) => {
    setIndex((i) => (i + step + TRACKS.length) % TRACKS.length);
    setElapsed(0);
  };
  return (
    <MiniPlayer
      id={PLAYER}
      track={track}
      playing={playing}
      progress={elapsed / duration}
      onPlayPause={() => setPlaying((p) => !p)}
      onNext={() => go(1)}
      onPrevious={() => go(-1)}
      initialState="peek"
    />
  );
}

/** Peek / Open / Hide, on every tab. */
export function MiniPlayerControls({ text, chip }: DemoExtraProps) {
  const player = useTabPanel(PLAYER);
  return (
    <View style={styles.block}>
      <Note text={text} message={`Player: ${player.state}. Drag or tap the strip to open it.`} />
      <View style={styles.row}>
        <DemoButton label="Peek" onPress={player.peek} text={text} chip={chip} />
        <DemoButton label="Open" onPress={player.open} text={text} chip={chip} />
        <DemoButton label="Hide" onPress={player.hide} text={text} chip={chip} />
      </View>
    </View>
  );
}

// Context Tray (paired with Glass Expand) ----------------------------------------------------

/** The tab whose screen puts the tray in the bar's place (Plan). */
const TRAY_TAB = 2;

/** On the Plan tab the tray replaces the tabs; elsewhere, a hint. */
export function ContextTrayExtra(props: DemoExtraProps) {
  if (props.index === TRAY_TAB) return <ContextTrayScreen {...props} />;
  return (
    <View style={styles.block}>
      <Note text={props.text} message="Open Plan: its screen puts a tray in the bar’s place." />
    </View>
  );
}

function ContextTrayScreen({ text, chip, adapter, goToFirstTab }: DemoExtraProps) {
  const [progress, setProgress] = useState(0.42);
  const done = progress >= 1;
  const tray = (
    <ContextTray
      label={done ? 'Plan complete' : 'Today’s plan'}
      progress={progress}
      // Close returns to the first tab; the tabs crossfade back as this screen blurs.
      onClose={goToFirstTab}
    />
  );
  return (
    <View style={styles.block}>
      {adapter === 'expo-router' ? (
        <ExpoRouterOverride element={tray} />
      ) : (
        <ReactNavigationOverride element={tray} />
      )}
      <Note
        text={text}
        message="The tray stays while this tab is focused. Close returns to the first tab."
      />
      <View style={styles.row}>
        <DemoButton
          label="+10%"
          onPress={() => setProgress((p) => Math.min(1, Math.round((p + 0.1) * 100) / 100))}
          text={text}
          chip={chip}
        />
        <DemoButton label="Finish" onPress={() => setProgress(1)} text={text} chip={chip} />
        <DemoButton label="Reset" onPress={() => setProgress(0)} text={text} chip={chip} />
      </View>
    </View>
  );
}

// Quick Create (paired with Labeled + Plus) --------------------------------------------------

const CREATE = 'create';

/** Labeled + Plus whose + button toggles the menu. */
export function QuickCreateBar() {
  const toggle = useQuickCreate(CREATE);
  return <LabeledPlus onActionPress={toggle} />;
}

export function QuickCreatePanel() {
  return (
    <QuickCreate
      id={CREATE}
      actions={[
        {
          label: 'Voice',
          icon: QuickCreateIcons.MicIcon,
          onPress: () => Alert.alert('Voice', 'Start a recording.'),
        },
        {
          label: 'Text',
          icon: QuickCreateIcons.TextIcon,
          onPress: () => Alert.alert('Text', 'Start a script.'),
        },
        {
          label: 'Upload',
          icon: QuickCreateIcons.UploadIcon,
          onPress: () => Alert.alert('Upload', 'Pick a file.'),
        },
      ]}
    />
  );
}

/** The + button is the main control; these do the same from the screen. */
export function QuickCreateControls({ text, chip }: DemoExtraProps) {
  const menu = useTabPanel(CREATE);
  return (
    <View style={styles.block}>
      <Note
        text={text}
        message="Tap + to open the create menu; tap it again or pick an action to close it."
      />
      <View style={styles.row}>
        <DemoButton label="Open menu" onPress={menu.open} text={text} chip={chip} />
        <DemoButton label="Close menu" onPress={menu.hide} text={text} chip={chip} />
      </View>
    </View>
  );
}

// Split Search: a list to scroll ------------------------------------------------------------

const ROWS = Array.from({ length: 40 }, (_, i) => `Row ${i + 1}`);

/**
 * A long list whose scroll minimizes the bar (`useMinimizeOnScroll`). Tap the minimized bar,
 * scroll up, or reach the top to bring it back.
 */
export function MinimizeList({ text, chip, barHeight }: DemoExtraProps) {
  const onScroll = useMinimizeOnScroll();
  return (
    <Animated.FlatList
      data={ROWS}
      keyExtractor={(row) => row}
      onScroll={onScroll}
      scrollEventThrottle={16}
      style={styles.list}
      contentContainerStyle={[styles.listContent, { paddingBottom: barHeight + 16 }]}
      ListHeaderComponent={
        <View style={styles.listHeader}>
          <Note text={text} message="Scroll down to minimize the bar; tap it to expand." />
        </View>
      }
      renderItem={({ item }) => (
        <View style={[styles.listRow, { backgroundColor: chip }]}>
          <Text style={{ color: text }}>{item}</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  block: { gap: 12, paddingHorizontal: 20, paddingTop: 20 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  button: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999 },
  buttonText: { fontSize: 15, fontWeight: '600' },
  note: { fontSize: 15, lineHeight: 21 },
  list: { flex: 1 },
  listContent: { gap: 8, paddingHorizontal: 20 },
  listHeader: { paddingTop: 20, paddingBottom: 4 },
  listRow: { padding: 16, borderRadius: 14 },
});
