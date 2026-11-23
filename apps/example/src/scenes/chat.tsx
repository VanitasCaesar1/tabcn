/**
 * A messaging app: who's online, then three conversations with bubbles, avatars, times, a
 * shared photo and reactions. Each tab opens on another conversation. People are invented.
 */
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  Avatar,
  ICONS,
  num,
  type Palette,
  Photo,
  RoundButton,
  type SceneProps,
  SceneScroll,
  scenePalette,
} from './kit';
import { AVATARS, CHAT_PHOTO } from './photos';

/** Exported for Composer Dock's demo, which shows these people too. */
export const PEOPLE = ['Mira', 'Tomás', 'Aiko', 'June', 'Rafa', 'Noor', 'Eliot', 'Sasha'];

type Message =
  | { from: number; text: string; reaction?: string }
  | { from: 'me'; text: string; reaction?: string }
  | { from: number; photo: true; text?: string }
  | { time: string };

interface Thread {
  title: string;
  note: string;
  avatar: number;
  messages: Message[];
}

const THREADS: Thread[] = [
  {
    title: 'Weekend in the hills',
    note: '5 people',
    avatar: 0,
    messages: [
      { time: 'Today 9:12' },
      { from: 0, text: 'Cabin is booked for Friday and Saturday 🎉' },
      { from: 2, text: 'Amazing. Who’s driving?' },
      { from: 'me', text: 'I can take four in the car. Leaving around 5?' },
      { from: 0, text: 'Perfect. I’ll bring the camp stove and coffee.', reaction: '❤️ 3' },
      { from: 3, photo: true, text: 'The view from the porch last year' },
      { from: 'me', text: 'Okay that settles it.' },
    ],
  },
  {
    title: 'June Park',
    note: 'Active now',
    avatar: 3,
    messages: [
      { time: 'Yesterday 18:40' },
      { from: 3, text: 'Did you see the new layout for the reading app?' },
      { from: 'me', text: 'Just now. The tab bar finally feels calm.' },
      { from: 3, text: 'Right? Shipping it to testers on Monday.' },
      { from: 'me', text: 'Send me the build, I’ll try it on the train.', reaction: '👍' },
    ],
  },
  {
    title: 'Studio',
    note: '12 people',
    avatar: 5,
    messages: [
      { time: 'Monday 11:05' },
      { from: 5, text: 'Reminder: client review moved to 3 pm.' },
      { from: 6, text: 'I’ll update the deck with the new photos.' },
      { from: 'me', text: 'Thanks both. I’ll book the big room.' },
      { from: 1, text: 'Lunch after? The noodle place reopened.', reaction: '🍜 4' },
    ],
  },
];

export function ChatScene(props: SceneProps) {
  const palette = scenePalette('chat', props.scheme, props.themed);
  return (
    <SceneScroll
      scene={props}
      palette={palette}
      gap={30}
      accessory={<RoundButton icon={ICONS.plus} palette={palette} />}
      lead={<Online palette={palette} />}
      sections={THREADS.map((thread) => (
        <Conversation key={thread.title} thread={thread} palette={palette} />
      ))}
    />
  );
}

function Online({ palette }: { palette: Palette }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.online}
    >
      {PEOPLE.map((name, i) => (
        <View key={name} style={styles.person}>
          <Avatar source={AVATARS[i]} size={54} palette={palette} />
          {i % 3 !== 2 ? <View style={[styles.dot, { borderColor: palette.background }]} /> : null}
          <Text numberOfLines={1} style={[styles.personName, { color: palette.text }]}>
            {name}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

function Conversation({ thread, palette }: { thread: Thread; palette: Palette }) {
  return (
    <View>
      <View style={styles.threadHeader}>
        <Avatar source={AVATARS[thread.avatar]} size={38} palette={palette} />
        <View style={styles.flex}>
          <Text style={[styles.threadTitle, { color: palette.text }]}>{thread.title}</Text>
          <Text style={[styles.small, { color: palette.subtle }]}>{thread.note}</Text>
        </View>
        <RoundButton icon={ICONS.phone} palette={palette} />
      </View>
      <View style={styles.messages}>
        {thread.messages.map((m, i) => (
          // Messages never reorder, so their place is their identity.
          // biome-ignore lint/suspicious/noArrayIndexKey: static list
          <Bubble key={i} message={m} palette={palette} previous={thread.messages[i - 1]} />
        ))}
      </View>
    </View>
  );
}

function Bubble({
  message,
  palette,
  previous,
}: {
  message: Message;
  palette: Palette;
  previous?: Message;
}) {
  if ('time' in message) {
    return <Text style={[styles.time, num, { color: palette.subtle }]}>{message.time}</Text>;
  }
  if (message.from === 'me') {
    return (
      <View style={styles.mineRow}>
        <View style={[styles.bubble, styles.mine, { backgroundColor: palette.accent }]}>
          <Text style={[styles.text, { color: '#ffffff' }]}>{message.text}</Text>
        </View>
        {message.reaction ? <Reaction text={message.reaction} palette={palette} mine /> : null}
      </View>
    );
  }
  const sameAuthor = previous && 'from' in previous && previous.from === message.from;
  return (
    <View style={styles.theirsRow}>
      <View style={styles.avatarSlot}>
        {sameAuthor ? null : <Avatar source={AVATARS[message.from]} size={28} palette={palette} />}
      </View>
      <View style={styles.theirsColumn}>
        {sameAuthor ? null : (
          <Text style={[styles.author, { color: palette.subtle }]}>{PEOPLE[message.from]}</Text>
        )}
        {'photo' in message ? (
          <View style={[styles.photoBubble, { backgroundColor: palette.surface }]}>
            <Photo source={CHAT_PHOTO} palette={palette} style={styles.photo} />
            {message.text ? (
              <Text style={[styles.text, styles.photoCaption, { color: palette.text }]}>
                {message.text}
              </Text>
            ) : null}
          </View>
        ) : (
          <View style={[styles.bubble, styles.theirs, { backgroundColor: palette.surface }]}>
            <Text style={[styles.text, { color: palette.text }]}>{message.text}</Text>
          </View>
        )}
        {'reaction' in message && message.reaction ? (
          <Reaction text={message.reaction} palette={palette} />
        ) : null}
      </View>
    </View>
  );
}

function Reaction({ text, palette, mine }: { text: string; palette: Palette; mine?: boolean }) {
  return (
    <View
      style={[
        styles.reaction,
        mine ? styles.reactionMine : null,
        { backgroundColor: palette.surface, borderColor: palette.background },
      ]}
    >
      <Text style={[styles.reactionText, num, { color: palette.text }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  online: { gap: 14, paddingHorizontal: 16 },
  person: { width: 58, alignItems: 'center', gap: 6 },
  dot: {
    position: 'absolute',
    top: 40,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.5,
    backgroundColor: '#34c759',
  },
  personName: { fontSize: 12 },
  threadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  threadTitle: { fontSize: 16, fontWeight: '600' },
  small: { fontSize: 13 },
  messages: { gap: 4, paddingHorizontal: 12 },
  time: { alignSelf: 'center', fontSize: 12, fontWeight: '500', marginVertical: 8 },
  mineRow: { alignItems: 'flex-end', marginTop: 4 },
  theirsRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginTop: 4 },
  avatarSlot: { width: 28 },
  theirsColumn: { flexShrink: 1, alignItems: 'flex-start', maxWidth: '78%' },
  author: { fontSize: 12, marginLeft: 12, marginBottom: 2 },
  bubble: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 19,
    borderCurve: 'continuous',
  },
  mine: { maxWidth: '78%', borderBottomRightRadius: 6 },
  theirs: { borderBottomLeftRadius: 6 },
  text: { fontSize: 16, lineHeight: 21 },
  photoBubble: { borderRadius: 18, borderCurve: 'continuous', overflow: 'hidden', width: 240 },
  photo: { width: 240, height: 180 },
  photoCaption: { paddingHorizontal: 12, paddingVertical: 8 },
  reaction: {
    marginTop: -6,
    marginLeft: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 2,
  },
  reactionMine: { marginLeft: 0, marginRight: 10 },
  reactionText: { fontSize: 12 },
});
