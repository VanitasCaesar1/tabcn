// Composer Dock's demo: a chat app under the dock, as in the reference video. Four screens
// (Chat, Projects, Code, Artifacts); the scrub preview (the screen fades to a large faint icon
// of the tab under the finger); hold menus and the attachment menu; a drawer of chats from the
// menu button; and the model sheet: an inset card with a wheel of models and an effort slider
// that floats over it. Sending a message adds it to the chat with a short reply.

import type { TrueSheet as TrueSheetType } from '@lodev09/react-native-true-sheet';
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
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { type ReactNode, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  Alert,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TurboModuleRegistry,
  useWindowDimensions,
  View,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  interpolate,
  ReduceMotion,
  runOnJS,
  type SharedValue,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { type TabItem, tabcnTiming } from 'react-native-tabcn';

export const COMPOSER_BACKGROUND = '#f8f8f6';
const INK = '#1f1e1d';
const SOFT = '#8a8984';
const FAINT = '#dcdbd6';
const CHIP = 'rgba(0, 0, 0, 0.05)';
const fade = { ...tabcnTiming, reduceMotion: ReduceMotion.System };
// Round buttons and the search field are Liquid Glass on iOS 26, as in the app.
const GLASS = isLiquidGlassAvailable();

function GlassFill({ radius }: { radius: number }) {
  if (!GLASS) return null;
  return (
    <GlassView
      glassEffectStyle="regular"
      isInteractive
      style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
    />
  );
}
const glide = {
  duration: 320,
  easing: Easing.out(Easing.cubic),
  reduceMotion: ReduceMotion.System,
};

// ---- A tiny store the dock, the screens and the sheets share. ----

interface Message {
  id: number;
  from: 'me' | 'assistant';
  text: string;
}

const MODELS = [
  { name: 'Atlas 5.2', note: 'Our most capable, for the hardest problems' },
  { name: 'Folio 5.5', note: 'For complex work and everyday tasks' },
  { name: 'Verse 5.5', note: 'Balanced speed and depth' },
  { name: 'Brief 5.5', note: 'Fastest for quick answers' },
];
const EFFORTS = ['Low', 'Medium', 'High', 'Very high', 'Max'];
const RECOMMENDED = 1;

interface DemoState {
  scrubbing: string | null;
  messages: Message[];
  model: number;
  effort: number;
  pickingModel: boolean;
  drawer: boolean;
}

let state: DemoState = {
  scrubbing: null,
  messages: [],
  model: 1,
  effort: RECOMMENDED,
  pickingModel: false,
  drawer: false,
};
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

const say = (what: string) => () => Alert.alert(what, 'The row ran its callback.');

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
      model={MODELS[model]?.name}
      onModelPress={() => {
        Keyboard.dismiss();
        set({ pickingModel: true });
      }}
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

/** Shows a modal's content while `open`, and keeps it for its closing animation. */
function usePresence(open: boolean, duration = 320) {
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);
  useEffect(() => {
    if (open) return;
    const t = setTimeout(() => setMounted(false), duration);
    return () => clearTimeout(t);
  }, [open, duration]);
  return mounted;
}

// ---- The model sheet: an inset card with a wheel of models and the effort slider. ----

const ROW = 54;
const SHEET_INSET = 6;

// TrueSheet draws the native sheet (iOS 26's inset Liquid Glass card, as in the video). It
// needs the app's own native build; Expo Go doesn't include it, so there the demo draws an
// inset card of its own with the same contents.
const NATIVE_SHEET = TurboModuleRegistry.get('TrueSheetModule') != null;
// Loaded only when it's linked: the package throws on import otherwise.
const TrueSheet: typeof TrueSheetType | null = NATIVE_SHEET
  ? require('@lodev09/react-native-true-sheet').TrueSheet
  : null;
const SHEET_CONTENT_HEIGHT = 462;

export function ModelSheet() {
  return TrueSheet ? <NativeModelSheet sheet={TrueSheet} /> : <FallbackModelSheet />;
}

function NativeModelSheet({ sheet: Sheet }: { sheet: typeof TrueSheetType }) {
  const { pickingModel } = useDemo();
  const ref = useRef<TrueSheetType>(null);
  useEffect(() => {
    if (pickingModel) ref.current?.present().catch(() => {});
    else ref.current?.dismiss().catch(() => {});
  }, [pickingModel]);
  return (
    <Sheet
      ref={ref}
      detents={['auto']}
      grabber
      dimmed
      dimOpacity={0.16}
      onDidDismiss={() => set({ pickingModel: false })}
    >
      <GestureHandlerRootView style={{ height: SHEET_CONTENT_HEIGHT }}>
        <ModelSheetContent close={() => set({ pickingModel: false })} />
      </GestureHandlerRootView>
    </Sheet>
  );
}

function FallbackModelSheet() {
  const { pickingModel } = useDemo();
  const mounted = usePresence(pickingModel);
  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={() => set({ pickingModel: false })}
    >
      <GestureHandlerRootView style={styles.flex}>
        <FallbackSheetBody open={pickingModel} />
      </GestureHandlerRootView>
    </Modal>
  );
}

function FallbackSheetBody({ open }: { open: boolean }) {
  const { height } = useWindowDimensions();
  const sheetHeight = Math.round(height * 0.52);
  const shown = useSharedValue(0);
  const drag = useSharedValue(0);
  useEffect(() => {
    shown.value = withTiming(open ? 1 : 0, glide);
    if (open) drag.value = 0;
  }, [open, shown, drag]);

  const close = () => set({ pickingModel: false });
  // Drag the header down to put the sheet away.
  const pan = Gesture.Pan()
    .activeOffsetY(8)
    .onUpdate((e) => {
      drag.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > 110 || e.velocityY > 900) runOnJS(close)();
      else drag.value = withTiming(0, glide);
    });

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: shown.value * (1 - Math.min(1, drag.value / sheetHeight)),
  }));
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - shown.value) * (sheetHeight + 40) + drag.value }],
  }));

  return (
    <View style={styles.flex}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.sheetScrim, scrimStyle]}>
        <Pressable accessibilityLabel="Close" style={styles.flex} onPress={close} />
      </Animated.View>
      <Animated.View
        accessibilityViewIsModal
        style={[
          styles.sheet,
          { height: sheetHeight, left: SHEET_INSET, right: SHEET_INSET, bottom: SHEET_INSET },
          sheetStyle,
        ]}
      >
        <ModelSheetContent close={close} headerGesture={pan} card />
      </Animated.View>
    </View>
  );
}

/**
 * The sheet's contents, in either sheet: the header (close, title, More), the wheel of models
 * with the chosen one's description, and the effort slider that floats over them, faded back.
 */
function ModelSheetContent({
  close,
  headerGesture,
  card,
}: {
  close: () => void;
  headerGesture?: ReturnType<typeof Gesture.Pan>;
  /** Draws the card and grabber (the fallback sheet), so they fade with the contents. */
  card?: boolean;
}) {
  const { model, effort } = useDemo();
  const { width } = useWindowDimensions();
  const [effortOpen, setEffortOpen] = useState(false);
  const effortShown = useSharedValue(0);
  useEffect(() => {
    effortShown.value = withTiming(effortOpen ? 1 : 0, fade);
  }, [effortOpen, effortShown]);
  const contentStyle = useAnimatedStyle(() => ({ opacity: 1 - effortShown.value * 0.9 }));
  const effortStyle = useAnimatedStyle(() => ({ opacity: effortShown.value }));

  const header = (
    <View style={[styles.sheetHeader, NATIVE_SHEET ? styles.sheetHeaderNative : null]}>
      <Pressable
        role="button"
        accessibilityLabel="Close"
        onPress={close}
        style={GLASS ? styles.roundGlass : styles.roundButton}
      >
        <GlassFill radius={19} />
        <Glyph d="M7 7l10 10M17 7 7 17" color={INK} size={18} />
      </Pressable>
      <Text style={styles.sheetTitle}>Model</Text>
      <Pressable
        role="button"
        onPress={say('More models')}
        style={GLASS ? styles.moreGlass : styles.morePill}
      >
        <GlassFill radius={19} />
        <Text style={styles.moreText}>More</Text>
      </Pressable>
    </View>
  );

  return (
    <View style={styles.flex}>
      <Animated.View
        style={[styles.flex, contentStyle]}
        pointerEvents={effortOpen ? 'none' : 'auto'}
      >
        {card ? <View style={[StyleSheet.absoluteFill, styles.card]} /> : null}
        {card ? <View style={styles.grabber} /> : null}
        {headerGesture ? (
          <GestureDetector gesture={headerGesture}>{header}</GestureDetector>
        ) : (
          header
        )}
        <Wheel model={model} effort={effort} onEffortPress={() => setEffortOpen(true)} />
        <Text style={styles.modelNote}>{MODELS[model]?.note}</Text>
      </Animated.View>
      <Animated.View
        pointerEvents={effortOpen ? 'auto' : 'none'}
        style={[StyleSheet.absoluteFill, effortStyle]}
      >
        <Pressable
          accessibilityLabel="Done"
          style={StyleSheet.absoluteFill}
          onPress={() => setEffortOpen(false)}
        />
        <EffortSlider
          width={width - SHEET_INSET * 2}
          effort={effort}
          onDone={() => setEffortOpen(false)}
        />
      </Animated.View>
    </View>
  );
}

/** The models as a wheel: the chosen one in the grey row, its neighbours fading out. */
function Wheel({
  model,
  effort,
  onEffortPress,
}: {
  model: number;
  effort: number;
  onEffortPress: () => void;
}) {
  const ref = useAnimatedRef<Animated.ScrollView>();
  const offset = useSharedValue(model * ROW);
  const height = ROW * 3.4;
  const onScroll = useAnimatedScrollHandler((e) => {
    offset.value = e.contentOffset.y;
  });
  const settle = (y: number) => {
    const i = Math.max(0, Math.min(MODELS.length - 1, Math.round(y / ROW)));
    if (i !== state.model) {
      Haptics.selectionAsync();
      set({ model: i });
    }
  };
  return (
    <View style={[styles.wheel, { height }]}>
      <View pointerEvents="none" style={[styles.wheelChosen, { top: ROW }]} />
      <Animated.ScrollView
        ref={ref}
        onScroll={onScroll}
        scrollEventThrottle={16}
        snapToInterval={ROW}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        contentOffset={{ x: 0, y: model * ROW }}
        // contentOffset isn't applied when the wheel mounts inside a sheet: place it by hand.
        onLayout={() => ref.current?.scrollTo({ y: model * ROW, animated: false })}
        contentContainerStyle={{ paddingTop: ROW, paddingBottom: height - ROW * 2 }}
        onMomentumScrollEnd={(e) => settle(e.nativeEvent.contentOffset.y)}
        onScrollEndDrag={(e) => {
          if (!e.nativeEvent.velocity?.y) settle(e.nativeEvent.contentOffset.y);
        }}
      >
        {MODELS.map((m, i) => (
          <WheelRow
            key={m.name}
            index={i}
            offset={offset}
            name={m.name}
            chosen={i === model}
            effort={effort}
            onPress={() => {
              if (i === model) onEffortPress();
              else ref.current?.scrollTo({ y: i * ROW, animated: true });
            }}
            onEffortPress={onEffortPress}
          />
        ))}
      </Animated.ScrollView>
    </View>
  );
}

function WheelRow({
  index,
  offset,
  name,
  chosen,
  effort,
  onPress,
  onEffortPress,
}: {
  index: number;
  offset: SharedValue<number>;
  name: string;
  chosen: boolean;
  effort: number;
  onPress: () => void;
  onEffortPress: () => void;
}) {
  const nameStyle = useAnimatedStyle(() => {
    const d = Math.abs(index * ROW - offset.value) / ROW;
    return { opacity: interpolate(d, [0, 1, 2], [1, 0.32, 0.12], 'clamp') };
  });
  const extraStyle = useAnimatedStyle(() => {
    const d = Math.abs(index * ROW - offset.value) / ROW;
    return { opacity: interpolate(d, [0, 0.45], [1, 0], 'clamp') };
  });
  return (
    <Pressable
      role="radio"
      aria-checked={chosen}
      accessibilityLabel={chosen ? `${name}, ${EFFORTS[effort]} effort` : name}
      onPress={onPress}
      style={styles.wheelRow}
    >
      <Animated.Text style={[styles.modelName, nameStyle]}>{name}</Animated.Text>
      <Animated.View
        pointerEvents={chosen ? 'auto' : 'none'}
        style={[styles.wheelExtra, extraStyle]}
      >
        <EffortMarks level={effort} />
        <Pressable
          role="button"
          accessibilityLabel="Effort"
          hitSlop={8}
          onPress={onEffortPress}
          style={styles.effortLink}
        >
          <Text style={styles.effortText}>{EFFORTS[effort]}</Text>
          <Glyph d="m9 6 6 6-6 6" color={SOFT} size={13} />
        </Pressable>
      </Animated.View>
    </Pressable>
  );
}

/** Five marks; the chosen effort is a short bar. */
function EffortMarks({ level }: { level: number }) {
  return (
    <View style={styles.marks}>
      {EFFORTS.map((e, i) => (
        <View key={e} style={i === level ? styles.markOn : styles.mark} />
      ))}
    </View>
  );
}

/** The effort slider that floats over the faded sheet: a dark capsule over five stops. */
function EffortSlider({
  width,
  effort,
  onDone,
}: {
  width: number;
  effort: number;
  onDone: () => void;
}) {
  const track = width - 36;
  const pad = 49;
  const pitch = (track - pad * 2) / (EFFORTS.length - 1);
  const fillFor = (i: number) => pad + i * pitch + 26;
  const fill = useSharedValue(fillFor(effort));
  const done = useRef<ReturnType<typeof setTimeout> | null>(null);
  const target = fillFor(effort);
  useEffect(() => {
    fill.value = withTiming(target, {
      duration: 180,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    });
  }, [target, fill]);
  useEffect(
    () => () => {
      if (done.current) clearTimeout(done.current);
    },
    [],
  );

  const choose = (x: number) => {
    const i = Math.max(0, Math.min(EFFORTS.length - 1, Math.round((x - pad) / pitch)));
    if (i !== state.effort) {
      Haptics.selectionAsync();
      set({ effort: i });
    }
  };
  const finish = () => {
    if (done.current) clearTimeout(done.current);
    done.current = setTimeout(onDone, 650);
  };
  const gesture = Gesture.Exclusive(
    Gesture.Pan()
      .activeOffsetX([-4, 4])
      .onUpdate((e) => runOnJS(choose)(e.x))
      .onEnd(() => runOnJS(finish)()),
    Gesture.Tap().onEnd((e) => {
      runOnJS(choose)(e.x);
      runOnJS(finish)();
    }),
  );
  const fillStyle = useAnimatedStyle(() => ({ width: fill.value }));
  const label = EFFORTS[effort] ?? '';

  return (
    <View pointerEvents="box-none" style={styles.effort}>
      {effort === EFFORTS.length - 1 ? (
        <View style={styles.warn}>
          <Text style={styles.warnText}>⚠ 4× or more usage</Text>
        </View>
      ) : (
        <Text style={styles.recommended}>{effort === RECOMMENDED ? 'Recommended' : ' '}</Text>
      )}
      <Text style={styles.effortTitle}>{label}</Text>
      <GestureDetector gesture={gesture}>
        <View
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel="Effort"
          accessibilityValue={{ text: label }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(e) => {
            const next = effort + (e.nativeEvent.actionName === 'increment' ? 1 : -1);
            if (next >= 0 && next < EFFORTS.length) set({ effort: next });
          }}
          style={[styles.track, { width: track }]}
        >
          <Animated.View style={[styles.fill, fillStyle]} />
          {EFFORTS.map((e, i) =>
            i === effort ? (
              <View key={e} style={[styles.knob, { left: pad + i * pitch - 7 }]}>
                <View style={styles.knobDot} />
              </View>
            ) : (
              <View
                key={e}
                style={[
                  styles.stop,
                  {
                    left: pad + i * pitch - 2,
                    backgroundColor: i < effort ? '#6b6a66' : '#b4b3af',
                  },
                ]}
              />
            ),
          )}
        </View>
      </GestureDetector>
      <Text style={styles.effortNote}>
        Higher effort means more thorough responses, but takes longer and uses your limits faster.
      </Text>
    </View>
  );
}

// ---- The drawer of chats, from the menu button. ----

const PINNED = [
  { label: 'Executive assistant', icon: HomeItemIcon, unread: true },
  { label: 'Games', icon: ThumbItemIcon },
  { label: 'Renovation receipts', icon: CodeItemIcon },
  { label: 'Photo filter tool with film effects', icon: CodeItemIcon },
  { label: 'Screenshot mockup', icon: ChatOutlineIcon },
];
const RECENTS = [
  { label: 'Holiday shopping list', unread: true },
  { label: 'Email to Sam about Friday' },
  { label: 'Review request' },
  { label: 'Clinic bill and insurance' },
  { label: 'Water heater options' },
  { label: 'Kitchen floor plan layout' },
  { label: 'Moon phases' },
];

export function ChatDrawer() {
  const { drawer } = useDemo();
  const mounted = usePresence(drawer, 300);
  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={() => set({ drawer: false })}
    >
      <GestureHandlerRootView style={styles.flex}>
        <DrawerBody open={drawer} />
      </GestureHandlerRootView>
    </Modal>
  );
}

function DrawerBody({ open }: { open: boolean }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const panelWidth = width - 44;
  const shown = useSharedValue(0);
  const drag = useSharedValue(0);
  useEffect(() => {
    shown.value = withTiming(open ? 1 : 0, { ...glide, duration: 300 });
    if (open) drag.value = 0;
  }, [open, shown, drag]);
  const close = () => set({ drawer: false });
  const pan = Gesture.Pan()
    .activeOffsetX(-10)
    .onUpdate((e) => {
      drag.value = Math.min(0, e.translationX);
    })
    .onEnd((e) => {
      if (e.translationX < -80 || e.velocityX < -700) runOnJS(close)();
      else drag.value = withTiming(0, glide);
    });
  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (shown.value - 1) * (panelWidth + 20) + drag.value }],
  }));
  const scrimStyle = useAnimatedStyle(() => ({ opacity: shown.value * 0.16 }));
  const choose = (what: string) => () => {
    close();
    setTimeout(say(what), 320);
  };

  return (
    <View style={styles.flex}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.drawerScrim, scrimStyle]} />
      <Pressable accessibilityLabel="Close chats" style={StyleSheet.absoluteFill} onPress={close} />
      <GestureDetector gesture={pan}>
        <Animated.View
          accessibilityViewIsModal
          style={[
            styles.drawer,
            { width: panelWidth, paddingTop: insets.top + 6, paddingBottom: insets.bottom + 6 },
            panelStyle,
          ]}
        >
          <View style={styles.drawerHeader}>
            <Text style={styles.drawerTitle}>Chats</Text>
            <Pressable
              role="button"
              accessibilityLabel="Gifts"
              onPress={say('Gifts')}
              style={GLASS ? styles.roundGlass : styles.roundButton}
            >
              <GlassFill radius={19} />
              <GiftGlyph />
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={styles.drawerList}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.sectionRow}>
              <Text style={styles.section}>Pinned</Text>
              <Glyph d="m6 15 6-6 6 6" color={SOFT} size={14} />
            </View>
            {PINNED.map((p) => (
              <Pressable
                key={p.label}
                role="button"
                onPress={choose(p.label)}
                style={styles.drawerRow}
              >
                <p.icon color="#57564f" size={18} />
                <Text numberOfLines={1} style={styles.drawerRowText}>
                  {p.label}
                </Text>
                {p.unread ? <View style={styles.unread} /> : null}
              </Pressable>
            ))}
            <Text style={styles.showMore}>Show more</Text>
            <Text style={[styles.section, styles.sectionGap]}>Recents</Text>
            {RECENTS.map((r) => (
              <Pressable
                key={r.label}
                role="button"
                onPress={choose(r.label)}
                style={styles.drawerRow}
              >
                <Text numberOfLines={1} style={[styles.drawerRowText, styles.recentText]}>
                  {r.label}
                </Text>
                {r.unread ? <View style={styles.unread} /> : null}
              </Pressable>
            ))}
          </ScrollView>
          <View style={styles.drawerFooter}>
            <Pressable
              role="button"
              accessibilityLabel="Back to the gallery"
              onPress={() => {
                close();
                setTimeout(() => router.back(), 320);
              }}
              style={GLASS ? styles.roundGlass : styles.roundButton}
            >
              <GlassFill radius={19} />
              <GearGlyph />
            </Pressable>
            <View style={GLASS ? styles.searchGlass : styles.search}>
              <GlassFill radius={21} />
              <Glyph
                d="M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13ZM20 20l-4.5-4.5"
                color={SOFT}
                size={16}
              />
              <Text style={styles.searchText}>Search</Text>
            </View>
            <Pressable
              role="button"
              accessibilityLabel="New chat"
              onPress={() => {
                set({ messages: [] });
                close();
              }}
              style={styles.compose}
            >
              <Glyph
                d="M12 20h8M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"
                color="#fff"
                size={18}
              />
            </Pressable>
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
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
    <View style={styles.flex}>
      <Animated.View style={[styles.flex, contentStyle]}>{children}</Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.center, iconStyle]}
      >
        {Icon ? <Icon color={FAINT} size={52} /> : null}
      </Animated.View>
    </View>
  );
}

function Header({ title }: { title?: string }) {
  return (
    <View style={styles.header}>
      <Pressable
        role="button"
        accessibilityLabel="Chats"
        hitSlop={8}
        onPress={() => {
          Keyboard.dismiss();
          set({ drawer: true });
        }}
        style={GLASS ? styles.roundGlass : styles.roundButton}
      >
        <GlassFill radius={19} />
        <Glyph d="M5 9h14M5 15h9" color={INK} size={20} />
      </Pressable>
      {title ? <Text style={styles.headerTitle}>{title}</Text> : <View />}
      <Pressable
        role="button"
        accessibilityLabel="Incognito chat"
        hitSlop={8}
        onPress={say('Incognito chat')}
        style={GLASS ? styles.roundGlass : styles.roundButton}
      >
        <GlassFill radius={19} />
        <GhostGlyph />
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
        <Svg width={30} height={30} viewBox="0 0 24 24">
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
      style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
    >
      {icon}
      <View style={styles.flex}>
        <Text style={styles.rowTitle}>{title}</Text>
        {note ? <Text style={styles.rowNote}>{note}</Text> : null}
      </View>
    </Pressable>
  );
}

function Glyph({ d, color, size = 22 }: { d: string; color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
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

const line = {
  stroke: INK,
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  fill: 'none',
} as const;

function GhostGlyph() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path d="M5 20V11a7 7 0 0 1 14 0v9l-2.3-1.6L14.3 20 12 18.4 9.7 20l-2.4-1.6Z" {...line} />
      <Circle cx={9.5} cy={11} r={1} fill={INK} />
      <Circle cx={14.5} cy={11} r={1} fill={INK} />
    </Svg>
  );
}

function GiftGlyph() {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24">
      <Rect x={3.5} y={8} width={17} height={4.5} rx={1} {...line} />
      <Path
        d="M5 12.5V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-6.5M12 8v12.5M12 8c-1.5-3-5-3.6-5-1.2C7 8 9.5 8 12 8Zm0 0c1.5-3 5-3.6 5-1.2C17 8 14.5 8 12 8Z"
        {...line}
      />
    </Svg>
  );
}

function GearGlyph() {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={3} {...line} />
      <Path
        d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"
        {...line}
      />
    </Svg>
  );
}

function ChatOutlineIcon({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 4c4.7 0 8.5 3.1 8.5 7s-3.8 7-8.5 7c-1 0-2-.1-2.9-.4L5 19.5l1-3.3C4.5 14.9 3.5 13 3.5 11c0-3.9 3.8-7 8.5-7Z"
        stroke={color}
        strokeWidth={1.6}
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
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
  },
  roundButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.035)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  roundGlass: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreGlass: { height: 38, paddingHorizontal: 16, borderRadius: 19, justifyContent: 'center' },
  searchGlass: {
    flex: 1,
    height: 42,
    borderRadius: 21,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  headerTitle: { fontSize: 17, fontWeight: '600', color: INK },
  greeting: { marginTop: 8, fontSize: 21, color: INK, fontFamily: 'Charter' },
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
  reply: { fontSize: 16, lineHeight: 24, color: INK, fontFamily: 'Charter' },
  list: { paddingHorizontal: 8, paddingTop: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
  },
  rowPressed: { backgroundColor: 'rgba(0, 0, 0, 0.04)' },
  rowTitle: { fontSize: 16, color: INK },
  rowNote: { marginTop: 2, fontSize: 13, color: SOFT },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, padding: 16 },
  thumb: { borderRadius: 14, borderCurve: 'continuous' },
  cardTitle: { marginTop: 8, fontSize: 14, color: INK },
  // Model sheet
  sheetScrim: { backgroundColor: 'rgba(0, 0, 0, 0.16)' },
  card: { backgroundColor: '#f9f9f8' },
  sheet: {
    position: 'absolute',
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  grabber: {
    alignSelf: 'center',
    marginTop: 7,
    width: 36,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(0, 0, 0, 0.14)',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 18,
  },
  sheetHeaderNative: { paddingTop: 22, paddingBottom: 34 },
  sheetTitle: { fontSize: 16, fontWeight: '600', color: INK },
  morePill: {
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 19,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.035)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  moreText: { fontSize: 15, color: INK },
  wheel: { overflow: 'hidden' },
  wheelRow: {
    height: ROW,
    marginHorizontal: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  wheelChosen: {
    position: 'absolute',
    left: 18,
    right: 18,
    height: ROW,
    borderRadius: ROW / 2,
    backgroundColor: CHIP,
  },
  modelName: { fontSize: 16, color: INK, width: 110 },
  wheelExtra: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  marks: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 6 },
  mark: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#b4b3af' },
  markOn: { width: 1.6, height: 11, borderRadius: 1, backgroundColor: INK },
  effortLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  effortText: { fontSize: 14, color: SOFT },
  modelNote: { marginTop: 14, marginHorizontal: 38, fontSize: 14, color: SOFT },
  // Effort slider
  effort: { position: 'absolute', left: 0, right: 0, top: 96, alignItems: 'center' },
  recommended: { fontSize: 11, color: SOFT, marginBottom: 4 },
  warn: {
    marginBottom: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#fbe7d2',
  },
  warnText: { fontSize: 11, fontWeight: '600', color: '#c2560f' },
  effortTitle: { fontSize: 18, color: INK, marginBottom: 12 },
  track: {
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    justifyContent: 'center',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 26,
    backgroundColor: INK,
  },
  stop: { position: 'absolute', top: 24, width: 4, height: 4, borderRadius: 2 },
  knob: {
    position: 'absolute',
    top: 19,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.6,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  knobDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#ffffff' },
  effortNote: {
    marginTop: 14,
    maxWidth: 300,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
    color: SOFT,
  },
  // Drawer
  drawerScrim: { backgroundColor: '#000000' },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: COMPOSER_BACKGROUND,
    borderTopRightRadius: 28,
    borderBottomRightRadius: 28,
    borderCurve: 'continuous',
    boxShadow: '4px 0 24px rgba(0, 0, 0, 0.08)',
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  drawerTitle: { fontSize: 26, color: INK, fontFamily: 'Charter' },
  drawerList: { paddingHorizontal: 20, paddingTop: 70, paddingBottom: 20 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  section: { fontSize: 13, color: SOFT, marginBottom: 6 },
  sectionGap: { marginTop: 30 },
  drawerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, height: 46 },
  drawerRowText: { flex: 1, fontSize: 15.5, color: INK },
  recentText: { fontSize: 15 },
  unread: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#2f7df6' },
  showMore: { fontSize: 14, color: SOFT, marginTop: 6 },
  drawerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  search: {
    flex: 1,
    height: 42,
    borderRadius: 21,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.035)',
  },
  searchText: { fontSize: 15, color: SOFT },
  compose: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: INK,
  },
});
