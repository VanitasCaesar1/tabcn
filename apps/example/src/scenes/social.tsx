/**
 * A photo-sharing feed: stories, posts with their likes and captions, and people to follow.
 * Names, places and words are invented.
 */
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  ActionIcon,
  Avatar,
  Glyph,
  ICONS,
  num,
  type Palette,
  Photo,
  RoundButton,
  rotate,
  type SceneAction,
  type SceneProps,
  SceneScroll,
  SectionHeader,
  scenePalette,
  turnOf,
  useSceneActions,
} from './kit';
import { AVATARS, POSTS } from './photos';

const PEOPLE = ['mira.lens', 'tomas', 'aiko.k', 'june', 'rafa.m', 'noor', 'eliot', 'sasha'];

const FEED = [
  {
    who: 0,
    place: 'Lysefjord, Norway',
    time: '2h',
    photo: 0,
    likes: 1284,
    caption: 'Four hours up, ten minutes of standing very still at the edge.',
    comments: 46,
  },
  {
    who: 3,
    place: 'Brooklyn Bridge Park',
    time: '5h',
    photo: 1,
    likes: 932,
    caption: 'The city switched on one window at a time.',
    comments: 18,
  },
  {
    who: 2,
    place: 'Night market, Hanoi',
    time: 'Yesterday',
    photo: 2,
    likes: 2410,
    caption: 'Followed the smell of grilled corn and got very lost. No regrets.',
    comments: 73,
  },
  {
    who: 6,
    place: 'Café Arden',
    time: 'Yesterday',
    photo: 3,
    likes: 418,
    caption: 'Same table every Sunday. They know my order before I sit down.',
    comments: 9,
  },
  {
    who: 4,
    place: 'SoHo, New York',
    time: '2d',
    photo: 4,
    likes: 1076,
    caption: 'Story time on the corner of Prince and Greene.',
    comments: 31,
  },
  {
    who: 1,
    place: 'Dolomites',
    time: '3d',
    photo: 5,
    likes: 3302,
    caption: 'First snow on the pass. Camp was a cold one.',
    comments: 120,
  },
  {
    who: 5,
    place: 'Home',
    time: '4h',
    photo: 6,
    likes: 5120,
    caption: 'Biscuit has decided it is too cold for the walk.',
    comments: 212,
  },
  {
    who: 7,
    place: 'Ghent, Belgium',
    time: '6h',
    photo: 7,
    likes: 1488,
    caption: 'Every house on this canal leans a little. So did we, after lunch.',
    comments: 27,
  },
  {
    who: 2,
    place: 'Central Park from above',
    time: '1d',
    photo: 8,
    likes: 2075,
    caption: 'Found the one rooftop that lets you up without a booking.',
    comments: 54,
  },
  {
    who: 6,
    place: 'Lake Bled trail',
    time: '4d',
    photo: 9,
    likes: 1931,
    caption: 'Koda led the whole way and only stopped for snacks.',
    comments: 38,
  },
];

const SECTIONS = ['stories', 'p0', 'p1', 'suggested', 'p2', 'p3'] as const;

export function SocialScene(props: SceneProps) {
  const palette = scenePalette('social', props.scheme, props.themed);
  const turn = turnOf(props);
  // Posts fill the post slots in the order they show, from a starting post that moves with
  // the design and the tab, so neighbouring designs and tabs open on different photos.
  const posts = rotate(FEED, turn * 3);
  const comment = useSceneActions()?.comment;
  const shown = rotate(SECTIONS, turn).filter((key) => key.startsWith('p'));
  const post = (key: (typeof SECTIONS)[number]) => {
    const at = shown.indexOf(key);
    return (
      <Post
        key={key}
        post={posts[at]}
        palette={palette}
        comment={comment}
        // The comment button that carries the action's own label is on the top post.
        first={at === 0}
      />
    );
  };
  return (
    <SceneScroll
      scene={props}
      palette={palette}
      gap={24}
      accessory={
        <View style={styles.actions}>
          <RoundButton icon={ICONS.heart} palette={palette} />
          <RoundButton icon={ICONS.send} palette={palette} />
        </View>
      }
      sections={[
        <Stories key="stories" palette={palette} index={turn} />,
        post('p0'),
        post('p1'),
        <Suggested key="suggested" palette={palette} />,
        post('p2'),
        post('p3'),
      ]}
    />
  );
}

function Stories({ palette, index }: { palette: Palette; index: number }) {
  const order = rotate(
    PEOPLE.map((name, i) => ({ name, i })),
    index,
  );
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.stories}
    >
      {order.map(({ name, i }) => (
        <View key={name} style={styles.story}>
          <View style={[styles.ring, { borderColor: palette.text }]}>
            <Avatar source={AVATARS[i]} size={62} palette={palette} />
          </View>
          <Text numberOfLines={1} style={[styles.storyName, { color: palette.text }]}>
            {name}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

function Post({
  post,
  palette,
  comment,
  first,
}: {
  post?: (typeof FEED)[number];
  palette: Palette;
  comment?: SceneAction;
  first: boolean;
}) {
  if (!post) return null;
  return (
    <View>
      <View style={styles.postHeader}>
        <Avatar source={AVATARS[post.who]} size={34} palette={palette} />
        <View style={styles.flex}>
          <Text style={[styles.author, { color: palette.text }]}>{PEOPLE[post.who]}</Text>
          <Text style={[styles.meta, { color: palette.subtle }]}>{post.place}</Text>
        </View>
        <Glyph d={ICONS.more} color={palette.text} strokeWidth={2.6} />
      </View>
      <Photo source={POSTS[post.photo]} palette={palette} style={styles.postPhoto} />
      <View style={styles.postActions}>
        <Glyph d={ICONS.heart} color={palette.text} size={25} />
        <ActionIcon
          icon={ICONS.comment}
          action={comment}
          label={first ? undefined : `Comments on ${PEOPLE[post.who]}’s post`}
          color={palette.text}
          size={25}
        />
        <Glyph d={ICONS.send} color={palette.text} size={24} />
        <View style={styles.flex} />
        <Glyph d={ICONS.bookmark} color={palette.text} size={24} />
      </View>
      <View style={styles.postBody}>
        <Text style={[styles.likes, num, { color: palette.text }]}>
          {post.likes.toLocaleString('en-US')} likes
        </Text>
        <Text style={[styles.caption, { color: palette.text }]}>
          <Text style={styles.author}>{PEOPLE[post.who]} </Text>
          {post.caption}
        </Text>
        <Text style={[styles.meta, num, { color: palette.subtle }]}>
          View all {post.comments} comments · {post.time}
        </Text>
      </View>
    </View>
  );
}

function Suggested({ palette }: { palette: Palette }) {
  const people = [
    { i: 7, name: 'Sasha Imre', note: 'Followed by june' },
    { i: 5, name: 'Noor Haddad', note: 'New to the app' },
    { i: 4, name: 'Rafa Moreno', note: 'Followed by tomas' },
  ];
  return (
    <View>
      <SectionHeader title="Suggested for you" palette={palette} action="See all" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.suggested}
      >
        {people.map((p) => (
          <View key={p.name} style={[styles.card, { backgroundColor: palette.surface }]}>
            <Avatar source={AVATARS[p.i]} size={72} palette={palette} />
            <Text numberOfLines={1} style={[styles.author, { color: palette.text }]}>
              {p.name}
            </Text>
            <Text numberOfLines={1} style={[styles.meta, { color: palette.subtle }]}>
              {p.note}
            </Text>
            <View style={[styles.follow, { backgroundColor: palette.text }]}>
              <Text style={[styles.followText, { color: palette.background }]}>Follow</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  actions: { flexDirection: 'row', gap: 8 },
  stories: { gap: 14, paddingHorizontal: 16 },
  story: { width: 70, alignItems: 'center', gap: 6 },
  ring: { padding: 2.5, borderRadius: 40, borderWidth: 1.5 },
  storyName: { fontSize: 12 },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  author: { fontSize: 14, fontWeight: '600' },
  meta: { fontSize: 13 },
  postPhoto: { width: '100%', aspectRatio: 4 / 5 },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  postBody: { gap: 4, paddingHorizontal: 16, paddingTop: 10 },
  likes: { fontSize: 14, fontWeight: '600' },
  caption: { fontSize: 14, lineHeight: 19 },
  suggested: { gap: 10, paddingHorizontal: 16 },
  card: {
    width: 150,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 16,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderCurve: 'continuous',
  },
  follow: {
    alignSelf: 'stretch',
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 7,
    borderRadius: 9,
    borderCurve: 'continuous',
  },
  followText: { fontSize: 14, fontWeight: '600' },
});
