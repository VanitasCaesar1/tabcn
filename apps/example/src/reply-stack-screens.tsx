/**
 * Reply Stack's five screens, drawn like a microblogging app's dark Android client: Home is an open
 * post with its replies (the reply row floats over it), then Search, Explore, Alerts and Chat.
 * Light when the Customize panel's scene is light. People, places and words are invented.
 */
import { Image, type ImageSource, type ImageStyle } from 'expo-image';
import { router } from 'expo-router';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { useIsFocused } from 'expo-router/react-navigation';
import { StatusBar } from 'expo-status-bar';
import { createContext, type ReactNode, use } from 'react';
import {
  Pressable,
  ScrollView,
  type StyleProp,
  StyleSheet,
  Text,
  type TextStyle,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useMinimizeOnScroll } from 'react-native-tabcn';

import { embed, usePreviewSettings, useRecording } from '@/embed';
import { Glyph, Hidden, ICONS, num, useSceneTop } from '@/scenes/kit';
import { AVATARS, POSTS } from '@/scenes/photos';

const DARK = {
  dark: true,
  bg: '#000000',
  text: '#e7e9ea',
  subtle: '#71767b',
  line: '#2f3336',
  field: '#202327',
  blue: '#1d9bf0',
  pink: '#f91880',
  green: '#00ba7c',
};
const LIGHT: Theme = {
  ...DARK,
  dark: false,
  bg: '#ffffff',
  text: '#0f1419',
  subtle: '#536471',
  line: '#eff3f4',
  field: '#eff3f4',
};
type Theme = typeof DARK;
/** Dense rows grow with the reader's text size, up to a point. */
const DENSE = 1.4;
const ThemeContext = createContext<Theme>(DARK);
const useTheme = () => use(ThemeContext);

const I = {
  reply: ICONS.comment,
  repost:
    'M7 4.5 4 7.5l3 3M4.5 7.5H15a3 3 0 0 1 3 3v1M17 19.5l3-3-3-3M19.5 16.5H9a3 3 0 0 1-3-3v-1',
  heart: ICONS.heart,
  views: 'M5 19.5v-6M10 19.5V5M15 19.5v-10M20 19.5v-4',
  bookmark: ICONS.bookmark,
  share: 'M12 15V4M7.5 8.5 12 4l4.5 4.5M5 13.5v5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5v-5',
  person:
    'M12 11.5a3.8 3.8 0 1 0 0-7.6 3.8 3.8 0 0 0 0 7.6ZM5 20c.7-3.7 3.4-5.8 7-5.8s6.3 2.1 7 5.8Z',
  gear: 'M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4ZM12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M6 18l1.6-1.6M16.4 7.6 18 6',
  compose:
    'M19.5 12.5V18a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 18V6A1.5 1.5 0 0 1 6 4.5h5.5M18 3.5v6M15 6.5h6',
};

/** Display name and handle. Aiko (2) is the viewer: the reply row shows her photo. */
const PEOPLE: readonly (readonly [string, string])[] = [
  ['Mira Lens', 'mira.lens'],
  ['Tomas Berg', 'tomas'],
  ['Aiko Kato', 'aiko.k'],
  ['June Park', 'june'],
  ['Rafa Moreno', 'rafa.m'],
  ['Noor Haddad', 'noor'],
  ['Eliot Shaw', 'eliot'],
  ['Sasha Imre', 'sasha'],
  ['Ines Varga', 'ines.v'],
  ['Ben Okafor', 'benok'],
  ['Lea Fontaine', 'lea.f'],
  ['Omar Said', 'omarsaid'],
  ['Priya Nair', 'priya.n'],
  ['Kofi Mensah', 'kofi'],
  ['Hana Ito', 'hana.ito'],
  ['Dario Russo', 'dario.r'],
];
const person = (who: number) => PEOPLE[who] ?? ['', ''];

/** Steady made-up counts for a row (replies, reposts, likes, views), from its text. */
function counts(post: Post) {
  const seed = post.text.length + post.who * 7;
  const likes = 4 + ((seed * 37) % 140);
  return [seed % 6, (seed * 3) % 5, likes, `${((likes * 31) / 1000).toFixed(1)}K`].map(String);
}

interface Post {
  who: number;
  time: string;
  text: string;
  photo?: number;
}

const MAIN_TEXT =
  'Four hours up, ten minutes of standing very still at the edge. We left the car park at five to beat the crowds and had the ridge to ourselves until about eight.\n\nBring more water than you think.';

const REPLIES: Post[] = [
  { who: 3, time: '2h', text: 'Been waiting for this one. Steep path or the long way round?' },
  { who: 0, time: '2h', text: 'Steep one up, long one down. My knees voted for that plan.' },
  {
    who: 1,
    time: '1h',
    text: 'Went in October and the cloud never lifted. This was the whole view. Going back in spring.',
    photo: 5,
  },
  { who: 8, time: '1h', text: 'How full was the car park when you got back down?' },
  { who: 5, time: '58m', text: 'Saving this for summer. Anywhere to fill up water on the way?' },
  { who: 9, time: '52m', text: 'The light at that hour is unreal. What were you shooting on?' },
  { who: 0, time: '47m', text: 'Just a phone and a lot of patience. No edits but a straighten.' },
  {
    who: 4,
    time: '40m',
    text: 'We did a lake trail last year with the dog in charge. Slowest walk of my life, best day of the summer.',
    photo: 9,
  },
  { who: 10, time: '33m', text: 'Adding it to the list. The list is getting long.' },
  { who: 6, time: '25m', text: '“Bring more water than you think” is the best advice going.' },
  { who: 11, time: '18m', text: 'Ten minutes is the right amount. Any longer and the wind wins.' },
  { who: 7, time: '9m', text: 'If you ever sell prints, this one is going in my hallway.' },
  { who: 12, time: '3m', text: 'Five in the morning is a choice. A good one, clearly.' },
];

/** Category, topic and post count. */
const TRENDS: readonly (readonly [string, string, string])[] = [
  ['Trending in Technology', 'Pocket cameras', '12.4K'],
  ['Food · Trending', 'Night markets', '8,912'],
  ['Sports · Trending', 'Harbor Cup final', '41.7K'],
  ['Trending in Travel', 'Sleeper trains', '6,204'],
  ['Entertainment · Trending', 'Season finale', '88.1K'],
  ['News · Trending', 'Ferry timetable', '3,580'],
  ['Trending', '#SundayBake', '15.2K'],
  ['Science · Trending', 'Comet tonight', '27.9K'],
  ['Music · Trending', 'Vinyl swap', '2,317'],
  ['Trending in Weather', 'First snow', '19.6K'],
  ['Trending in Outdoors', 'River swim', '4,480'],
  ['Design · Trending', 'Moss walls', '1,962'],
  ['Sports · Trending', 'Northfield', '22.3K'],
  ['Trending in Technology', 'Heat pump grant', '9,071'],
  ['Food · Trending', 'Sourdough starter', '5,388'],
  ['Entertainment · Trending', 'Rooftop cinema', '7,745'],
  ['Trending', 'Late trains', '11.0K'],
  ['Books · Trending', 'Library card day', '3,126'],
  ['Trending in Travel', 'Fold-up bikes', '2,684'],
  ['News · Trending', 'Bridge reopening', '14.8K'],
  ['Art · Trending', 'Open studio week', '1,503'],
  ['Trending', 'Lantern festival', '31.4K'],
];

const FOLLOW: readonly (readonly [number, string])[] = [
  [9, 'Shoots ferries, bridges and the people waiting for them.'],
  [13, 'Bakes on weekends. Writes about bread the rest of the week.'],
  [14, 'Trail runner. Slow on the way up, fast on the way down.'],
];

/** Photo, category and title. */
const CARDS: readonly (readonly [number, string, string])[] = [
  [1, 'City', 'The bridge park at blue hour'],
  [2, 'Food', 'Ten stalls worth the queue'],
  [3, 'Cafés', 'Same table every Sunday'],
  [4, 'Books', 'Story time on the corner'],
  [6, 'Pets', 'Too cold for the walk'],
  [7, 'Travel', 'Canal houses that lean a little'],
  [8, 'City', 'Rooftops you can still get onto'],
  [0, 'Outdoors', 'Fjord ridges before sunrise'],
  [9, 'Outdoors', 'Lake trails with a dog in charge'],
  [2, 'Food', 'Grilled corn and getting lost'],
];

/** Line, headline and post count. */
const NEWS: readonly (readonly [string, string, string])[] = [
  ['News · 2 hours ago', 'Harbor ferry adds a late crossing on Fridays from next month', '3.6K'],
  ['Outdoors · Live', 'Trail crews reopen the north ridge path after the rockfall', '1.2K'],
  ['Food · 5 hours ago', 'The night market moves two streets over for the summer', '8.9K'],
  ['Science · Trending now', 'A comet passes close enough tonight to see by eye', '27.9K'],
  ['Travel · Yesterday', 'Sleeper trains add a second weekly route across the mountains', '6.2K'],
];

type Alert =
  | { kind: 'like' | 'repost' | 'follow'; who: number[]; others?: number; text?: string }
  | ({ kind: 'mention' } & Post);

const ALERTS: Alert[] = [
  { kind: 'like', who: [0, 6, 9], others: 2, text: 'Sleeper train out tonight, back Sunday.' },
  { kind: 'follow', who: [13] },
  { kind: 'mention', who: 3, time: '1h', text: 'Try the corn stall at the far end. Trust me.' },
  { kind: 'repost', who: [4, 1], text: 'Open studios are free all weekend.' },
  { kind: 'like', who: [5], text: 'Fixed the bike. It now makes a new noise.' },
  { kind: 'follow', who: [10, 14, 7], others: 4 },
  { kind: 'like', who: [7, 3, 11], others: 18, text: 'Three loaves in, the starter behaves.' },
  {
    kind: 'mention',
    who: 9,
    time: '4h',
    text: 'Found the rooftop you were talking about. No booking, just a very tired lift.',
    photo: 8,
  },
  { kind: 'repost', who: [6], text: 'Ridge packing list: water, more water, one apple.' },
  { kind: 'like', who: [1, 12], text: 'The ferry was late and nobody minded.' },
  { kind: 'follow', who: [15] },
  { kind: 'mention', who: 0, time: '9h', text: 'Still on for Saturday? I’ll bring coffee.' },
  { kind: 'like', who: [8, 4, 5], others: 9, text: 'Swapped two records, came home with five.' },
  { kind: 'repost', who: [11, 0, 3], others: 3, text: 'The library is open late on Thursdays.' },
  { kind: 'follow', who: [12, 9] },
  { kind: 'mention', who: 6, time: '2d', text: 'Still thinking about that canal walk.' },
  { kind: 'like', who: [3, 7], text: 'The moss wall in the hallway is growing.' },
  { kind: 'follow', who: [11] },
  { kind: 'repost', who: [10, 13], text: 'Night market opens an hour early this week.' },
];

interface Chat {
  who: number | readonly [number, number];
  name?: string;
  time: string;
  text: string;
  unread?: boolean;
}

const CHATS: Chat[] = [
  { who: 3, time: '2m', text: 'Did the photos from Saturday come through?', unread: true },
  {
    who: [0, 6],
    name: 'Trail crew',
    time: '14m',
    text: 'Mira: Five sharp, no excuses',
    unread: true,
  },
  { who: 4, time: '38m', text: 'Ha, that is exactly what I said' },
  { who: 8, time: '1h', text: 'You: I can bring the spare tent' },
  { who: 5, time: '1h', text: 'Biscuit says hello', unread: true },
  { who: 13, time: '2h', text: 'The starter is alive. Barely, but alive.' },
  { who: [1, 4], name: 'Sunday café', time: '3h', text: 'Tomas: Same table?' },
  { who: 9, time: '5h', text: 'Sent you the map for the ferry walk' },
  { who: 0, time: '8h', text: 'You: That ridge photo is unreal' },
  { who: 14, time: '10h', text: 'Are you still selling the pocket camera?', unread: true },
  { who: 6, time: 'Nov 26', text: 'You: Same route next month, deal' },
  { who: [7, 12], name: 'Book club', time: 'Nov 26', text: 'Priya: Chapter nine is a lot' },
  { who: 10, time: 'Nov 25', text: 'Thanks again for the lift home' },
  { who: 11, time: 'Nov 25', text: 'You: Let me know when you land' },
  { who: 7, time: 'Nov 24', text: 'The prints arrived and they look great' },
  { who: 15, time: 'Nov 23', text: 'Is the bike still for sale?' },
  { who: [3, 5], name: 'Flat 4B', time: 'Nov 22', text: 'June: Who has the spare key?' },
  { who: 12, time: 'Nov 21', text: 'You: See you at the market' },
  { who: 1, time: 'Nov 20', text: 'Cloud again. Third time lucky.' },
  { who: [9, 14], name: 'Photo walk', time: 'Nov 19', text: 'Hana: Meet at the bridge at seven' },
  { who: 13, time: 'Nov 18', text: 'You: Two loaves please' },
  { who: 4, time: 'Nov 17', text: 'Sending the trail map now' },
  { who: 8, time: 'Nov 15', text: 'Happy birthday! Cake soon?' },
  { who: [0, 11], name: 'Lisbon trip', time: 'Nov 12', text: 'Omar: Flights are booked' },
];

/** Reply Stack's tab screens: Home, Search, Explore, Alerts and Chat. */
export function ReplyStackScreen({ index }: { index: number }) {
  const theme = usePreviewSettings().scheme === 'light' ? LIGHT : DARK;
  const Body = [HomeScreen, SearchScreen, ExploreScreen, AlertsScreen, ChatScreen][index];
  return (
    <ThemeContext value={theme}>
      <Scroll>{Body ? <Body /> : null}</Scroll>
    </ThemeContext>
  );
}

function Scroll({ children }: { children: ReactNode }) {
  const t = useTheme();
  const top = useSceneTop();
  const bar = useBottomTabBarHeight();
  const onScroll = useMinimizeOnScroll();
  const focused = useIsFocused();
  return (
    <View style={[styles.flex, { backgroundColor: t.bg }]}>
      {focused ? <StatusBar style={t.dark ? 'light' : 'dark'} /> : null}
      <Animated.ScrollView
        style={styles.flex}
        // The reply row and the floating bar never cover the last row.
        contentContainerStyle={{ paddingTop: top, paddingBottom: bar + 120 }}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {children}
      </Animated.ScrollView>
    </View>
  );
}

// ---- Home: an open post and its replies ----

function HomeScreen() {
  const t = useTheme();
  const recording = useRecording();
  const back = <Glyph d={ICONS.back} color={t.text} size={24} strokeWidth={2.2} />;
  return (
    <>
      <View style={styles.header}>
        {embed || recording ? (
          back
        ) : (
          <Pressable
            role="button"
            accessibilityLabel="Back to designs"
            hitSlop={10}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
          >
            {back}
          </Pressable>
        )}
        <Label text="Post" style={[styles.headerTitle, { color: t.text }]} />
      </View>
      <Hidden>
        <View style={styles.main}>
          <View style={styles.author}>
            <Face who={0} size={44} />
            <View style={styles.flex}>
              <Label text="Mira Lens" lines={1} style={[styles.name, { color: t.text }]} />
              <Label text="@mira.lens" lines={1} style={[styles.meta, { color: t.subtle }]} />
            </View>
            <More />
          </View>
          <Text style={[styles.mainText, { color: t.text }]}>{MAIN_TEXT}</Text>
          <Pic source={POSTS[0]} style={styles.mainPhoto} />
          <Text maxFontSizeMultiplier={DENSE} style={[styles.meta, num, { color: t.subtle }]}>
            7:42 AM · Nov 26, 2026 · <Text style={[styles.strong, { color: t.text }]}>48.2K</Text>{' '}
            Views
          </Text>
        </View>
        <Line />
        <Stats n={['214', '1.1K', '8.6K', '392']} main />
        <Line />
        {REPLIES.map((post) => (
          <PostRow key={post.text} post={post} />
        ))}
      </Hidden>
    </>
  );
}

function PostRow({ post, mention }: { post: Post; mention?: boolean }) {
  const t = useTheme();
  const [name, handle] = person(post.who);
  return (
    <View style={[styles.row, { borderBottomColor: t.line }]}>
      <Face who={post.who} />
      <View style={styles.flex}>
        <View style={styles.nameRow}>
          <View style={styles.flex}>
            <Lead name={name} rest={` @${handle} · ${post.time}`} />
          </View>
          <More />
        </View>
        {mention ? (
          <Text maxFontSizeMultiplier={DENSE} style={[styles.meta, { color: t.subtle }]}>
            Replying to <Text style={{ color: t.blue }}>@aiko.k</Text>
          </Text>
        ) : null}
        <Label text={post.text} style={[styles.body, { color: t.text }]} />
        {post.photo !== undefined ? (
          <Pic source={POSTS[post.photo]} style={styles.rowPhoto} />
        ) : null}
        <Stats n={counts(post)} />
      </View>
    </View>
  );
}

/** Replies, reposts, likes and views (or bookmarks on the open post), with counts. */
function Stats({ n, main }: { n: readonly string[]; main?: boolean }) {
  const t = useTheme();
  const icons = [I.reply, I.repost, I.heart, main ? I.bookmark : I.views];
  const size = main ? 21 : 17;
  return (
    <View style={[styles.stats, main && styles.mainStats]}>
      {icons.map((d, i) => (
        <View key={d} style={styles.stat}>
          <Glyph d={d} color={t.subtle} size={size} />
          <Label
            text={n[i]}
            style={[main ? styles.meta : styles.small, num, { color: t.subtle }]}
          />
        </View>
      ))}
      <View style={styles.statEnd}>
        {main ? null : <Glyph d={I.bookmark} color={t.subtle} size={size} />}
        <Glyph d={I.share} color={t.subtle} size={size} />
      </View>
    </View>
  );
}

// ---- Search ----

function SearchScreen() {
  const t = useTheme();
  const trend = ([category, topic, posts]: readonly [string, string, string]) => (
    <View key={topic} style={styles.trend}>
      <View style={styles.flex}>
        <Label text={category} lines={1} style={[styles.small, { color: t.subtle }]} />
        <Label text={topic} lines={1} style={[styles.topic, { color: t.text }]} />
        <Label text={`${posts} posts`} style={[styles.small, num, { color: t.subtle }]} />
      </View>
      <More />
    </View>
  );
  return (
    <Hidden>
      <View style={styles.topBar}>
        <Face who={2} size={32} />
        <Field label="Search" />
        <Glyph d={I.gear} color={t.text} size={22} />
      </View>
      <Chips items={['For you', 'Trending', 'News', 'Sports', 'Entertainment']} />
      <View>
        <Pic source={POSTS[7]} style={styles.hero} />
        <View style={styles.heroText}>
          <Text style={styles.heroMeta}>Travel · Trending now</Text>
          <Text numberOfLines={2} style={styles.heroTitle}>
            Canal towns get a quiet season as the late trains return
          </Text>
        </View>
      </View>
      {TRENDS.slice(0, 10).map(trend)}
      <Line />
      <Label text="Who to follow" style={[styles.section, { color: t.text }]} />
      {FOLLOW.map(([who, bio]) => (
        <View key={who} style={styles.follow}>
          <Face who={who} />
          <View style={styles.flex}>
            <Label text={person(who)[0]} lines={1} style={[styles.name, { color: t.text }]} />
            <Label
              text={`@${person(who)[1]}`}
              lines={1}
              style={[styles.meta, { color: t.subtle }]}
            />
            <Label text={bio} lines={2} style={[styles.body, { color: t.text }]} />
          </View>
          <View style={[styles.pill, { backgroundColor: t.text }]}>
            <Label text="Follow" style={[styles.pillText, { color: t.bg }]} />
          </View>
        </View>
      ))}
      <Label text="Show more" style={[styles.showMore, { color: t.blue }]} />
      <Line />
      {TRENDS.slice(10).map(trend)}
    </Hidden>
  );
}

// ---- Explore ----

function ExploreScreen() {
  const t = useTheme();
  return (
    <Hidden>
      <Text style={[styles.largeTitle, { color: t.text }]}>Explore</Text>
      <Chips items={['For you', 'Food', 'Travel', 'Outdoors', 'Design', 'Science']} />
      <View style={styles.feature}>
        <Pic source={POSTS[5]} style={styles.featurePhoto} />
        <Label text="Outdoors · Trending now" style={[styles.small, { color: t.subtle }]} />
        <Label
          text="First snow closes the high pass for the season"
          lines={2}
          style={[styles.featureTitle, { color: t.text }]}
        />
        <Label text="48.3K posts" style={[styles.small, num, { color: t.subtle }]} />
      </View>
      <Grid cards={CARDS.slice(0, 6)} />
      <Label text="Today’s news" style={[styles.section, { color: t.text }]} />
      {NEWS.map(([meta, title, posts], i) => (
        <View key={title} style={styles.news}>
          <View style={styles.flex}>
            <Label text={meta} lines={1} style={[styles.small, num, { color: t.subtle }]} />
            <Label text={title} lines={3} style={[styles.newsTitle, { color: t.text }]} />
            <Label text={`${posts} posts`} style={[styles.small, num, { color: t.subtle }]} />
          </View>
          {i % 2 === 0 ? (
            <Pic source={POSTS[(i * 3 + 1) % POSTS.length]} style={styles.thumb} />
          ) : null}
        </View>
      ))}
      <Grid cards={CARDS.slice(6)} />
    </Hidden>
  );
}

function Grid({ cards }: { cards: readonly (readonly [number, string, string])[] }) {
  const t = useTheme();
  const width = (useWindowDimensions().width - 32 - 12) / 2;
  return (
    <View style={styles.grid}>
      {cards.map(([photo, category, title]) => (
        <View key={title} style={{ width }}>
          <Pic source={POSTS[photo]} style={styles.cardPhoto} />
          <Label text={title} lines={2} style={[styles.cardTitle, { color: t.text }]} />
          <Label text={category} lines={1} style={[styles.small, { color: t.subtle }]} />
        </View>
      ))}
    </View>
  );
}

// ---- Alerts ----

const VERBS = { like: 'liked your post', repost: 'reposted your post', follow: 'followed you' };

function AlertsScreen() {
  const t = useTheme();
  return (
    <Hidden>
      <TitleBar title="Notifications" icons={[I.gear]} />
      <View style={[styles.segment, { borderBottomColor: t.line }]}>
        {['All', 'Mentions'].map((label, i) => (
          <View key={label} style={styles.segmentItem}>
            <Label
              text={label}
              style={[styles.segmentText, { color: i === 0 ? t.text : t.subtle }]}
            />
            {i === 0 ? <View style={[styles.underline, { backgroundColor: t.blue }]} /> : null}
          </View>
        ))}
      </View>
      {ALERTS.map((alert) =>
        alert.kind === 'mention' ? (
          <PostRow key={alert.text} post={alert} mention />
        ) : (
          <AlertRow key={`${alert.kind}-${alert.who.join()}`} alert={alert} />
        ),
      )}
    </Hidden>
  );
}

function AlertRow({ alert }: { alert: Exclude<Alert, { kind: 'mention' }> }) {
  const t = useTheme();
  const [first, second] = alert.who;
  const rest = alert.others
    ? ` and ${alert.others} others`
    : second !== undefined
      ? ` and ${person(second)[0]}`
      : '';
  const icon =
    alert.kind === 'like' ? (
      <Glyph d={I.heart} color={t.pink} fill={t.pink} size={26} />
    ) : alert.kind === 'repost' ? (
      <Glyph d={I.repost} color={t.green} size={26} strokeWidth={2.2} />
    ) : (
      <Glyph d={I.person} color={t.blue} fill={t.blue} size={26} />
    );
  return (
    <View style={[styles.row, { borderBottomColor: t.line }]}>
      <View style={styles.alertIcon}>{icon}</View>
      <View style={[styles.flex, styles.alertBody]}>
        <View style={styles.faces}>
          {alert.who.map((who) => (
            <Face key={who} who={who} size={32} />
          ))}
        </View>
        <Lead name={person(first ?? 0)[0]} rest={`${rest} ${VERBS[alert.kind]}`} lines={2} />
        {alert.text ? (
          <Label text={alert.text} lines={3} style={[styles.body, { color: t.subtle }]} />
        ) : null}
      </View>
    </View>
  );
}

// ---- Chat ----

function ChatScreen() {
  const t = useTheme();
  return (
    <Hidden>
      <TitleBar title="Messages" icons={[I.gear, I.compose]} />
      <View style={styles.fieldRow}>
        <Field label="Search Direct Messages" />
      </View>
      {CHATS.map((chat) => {
        const group = typeof chat.who !== 'number';
        const [name, handle] = typeof chat.who === 'number' ? person(chat.who) : [chat.name, ''];
        return (
          <View key={`${name}-${chat.time}`} style={styles.chat}>
            {typeof chat.who === 'number' ? (
              <Face who={chat.who} size={48} />
            ) : (
              <View style={styles.groupFace}>
                <Face who={chat.who[0]} size={34} />
                <View style={[styles.groupBack, { borderColor: t.bg }]}>
                  <Face who={chat.who[1]} size={34} />
                </View>
              </View>
            )}
            <View style={styles.flex}>
              <Lead name={name} rest={group ? ` · ${chat.time}` : ` @${handle} · ${chat.time}`} />
              <Text
                maxFontSizeMultiplier={DENSE}
                numberOfLines={1}
                style={[
                  styles.body,
                  chat.unread && styles.strong,
                  { color: chat.unread ? t.text : t.subtle },
                ]}
              >
                {chat.text}
              </Text>
            </View>
            {chat.unread ? <View style={[styles.dot, { backgroundColor: t.blue }]} /> : null}
          </View>
        );
      })}
    </Hidden>
  );
}

// ---- Shared pieces ----

interface LabelProps {
  text: ReactNode;
  lines?: number;
  style: StyleProp<TextStyle>;
}

/** Dense text, cut at `lines`: it grows with the reader's text size, up to a point. */
function Label({ text, lines, style }: LabelProps) {
  return (
    <Text maxFontSizeMultiplier={DENSE} numberOfLines={lines} style={style}>
      {text}
    </Text>
  );
}

/** A bold name, then the rest of the line in the row's quieter colour. */
function Lead({ name, rest, lines = 1 }: { name: ReactNode; rest: string; lines?: number }) {
  const t = useTheme();
  const quiet = lines === 1 ? t.subtle : t.text;
  return (
    <Label
      lines={lines}
      style={[styles.body, num, { color: quiet }]}
      text={[
        <Text key="name" style={[styles.strong, { color: t.text }]}>
          {name}
        </Text>,
        rest,
      ]}
    />
  );
}

function Pic({ source, style }: { source: ImageSource | number; style: StyleProp<ImageStyle> }) {
  const t = useTheme();
  return (
    <Image
      source={source}
      style={[{ backgroundColor: t.field }, style]}
      contentFit="cover"
      transition={150}
    />
  );
}

/** A person's photo, or their initial on grey for people the scenes have no photo of. */
function Face({ who, size = 40 }: { who: number; size?: number }) {
  const t = useTheme();
  const round = { width: size, height: size, borderRadius: size / 2 };
  // Everyone has a photo: there are fewer photos than people, so they repeat.
  const photo = AVATARS[who % AVATARS.length];
  if (photo) return <Pic source={photo} style={round} />;
  return (
    <View style={[round, styles.center, { backgroundColor: t.field }]}>
      <Text
        maxFontSizeMultiplier={1}
        style={[styles.initial, { color: t.subtle, fontSize: size * 0.42 }]}
      >
        {person(who)[0].charAt(0)}
      </Text>
    </View>
  );
}

function More() {
  return <Glyph d={ICONS.more} color={useTheme().subtle} size={18} strokeWidth={2.6} />;
}

function Line() {
  return <View style={[styles.line, { backgroundColor: useTheme().line }]} />;
}

function Field({ label }: { label: string }) {
  const t = useTheme();
  return (
    <View style={[styles.field, { backgroundColor: t.field }]}>
      <Glyph d={ICONS.search} color={t.subtle} size={17} />
      <Label text={label} lines={1} style={[styles.fieldText, { color: t.subtle }]} />
    </View>
  );
}

/** The viewer's photo, a centred title and icons at the end. */
function TitleBar({ title, icons }: { title: string; icons: string[] }) {
  const t = useTheme();
  return (
    <View style={styles.topBar}>
      <View style={styles.barSide}>
        <Face who={2} size={32} />
      </View>
      <Label text={title} lines={1} style={[styles.barTitle, { color: t.text }]} />
      <View style={[styles.barSide, styles.barEnd]}>
        {icons.map((d) => (
          <Glyph key={d} d={d} color={t.text} size={22} />
        ))}
      </View>
    </View>
  );
}

function Chips({ items }: { items: string[] }) {
  const t = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chips}
    >
      {items.map((label, i) => (
        <View
          key={label}
          style={[
            styles.chip,
            i === 0 ? { backgroundColor: t.text, borderColor: t.text } : { borderColor: t.line },
          ]}
        >
          <Label text={label} style={[styles.chipText, { color: i === 0 ? t.bg : t.text }]} />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  initial: { fontWeight: '600' },
  strong: { fontWeight: '700' },
  line: { height: StyleSheet.hairlineWidth },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    height: 52,
    paddingHorizontal: 14,
  },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  main: { gap: 12, paddingHorizontal: 16, paddingBottom: 14 },
  author: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mainText: { fontSize: 17, lineHeight: 23 },
  mainPhoto: { width: '100%', aspectRatio: 4 / 5, borderRadius: 16 },
  mainStats: { height: 48, marginTop: 0, paddingHorizontal: 16 },
  name: { fontSize: 15, fontWeight: '700' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  meta: { fontSize: 15 },
  small: { fontSize: 13 },
  body: { fontSize: 15, lineHeight: 20 },
  row: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowPhoto: { width: '100%', aspectRatio: 4 / 3, marginTop: 10, borderRadius: 16 },
  stats: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  stat: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  statEnd: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    height: 54,
    paddingHorizontal: 16,
  },
  barSide: { width: 64, flexDirection: 'row', alignItems: 'center' },
  barEnd: { justifyContent: 'flex-end', gap: 18 },
  barTitle: { flex: 1, fontSize: 20, fontWeight: '700', textAlign: 'center' },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  fieldRow: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 8 },
  fieldText: { flex: 1, fontSize: 15 },
  chips: { gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  chip: {
    height: 34,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 17,
    borderWidth: 1,
  },
  chipText: { fontSize: 14, fontWeight: '600' },
  hero: { width: '100%', aspectRatio: 16 / 10 },
  heroText: { position: 'absolute', left: 16, right: 16, bottom: 14, gap: 2 },
  heroMeta: { color: '#ffffff', fontSize: 13, textShadowColor: '#000000', textShadowRadius: 6 },
  heroTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 27,
    textShadowColor: '#000000',
    textShadowRadius: 8,
  },
  trend: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  topic: { fontSize: 15, fontWeight: '700', marginVertical: 2 },
  section: {
    fontSize: 20,
    fontWeight: '800',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  follow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 10 },
  pill: { height: 32, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 16 },
  pillText: { fontSize: 14, fontWeight: '700' },
  showMore: { fontSize: 15, paddingHorizontal: 16, paddingVertical: 14 },
  largeTitle: { fontSize: 28, fontWeight: '800', paddingHorizontal: 16, paddingTop: 8 },
  feature: { gap: 4, paddingHorizontal: 16, paddingTop: 6, paddingBottom: 20 },
  featurePhoto: { width: '100%', aspectRatio: 4 / 3, marginBottom: 8, borderRadius: 16 },
  featureTitle: { fontSize: 20, fontWeight: '800', lineHeight: 25 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    rowGap: 18,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  cardPhoto: { width: '100%', aspectRatio: 4 / 5, marginBottom: 8, borderRadius: 16 },
  cardTitle: { fontSize: 15, fontWeight: '700', lineHeight: 19 },
  news: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  newsTitle: { fontSize: 15, fontWeight: '700', lineHeight: 20, marginVertical: 2 },
  thumb: { width: 76, height: 76, borderRadius: 12 },
  segment: { flexDirection: 'row', height: 50, borderBottomWidth: StyleSheet.hairlineWidth },
  segmentItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  segmentText: { fontSize: 15, fontWeight: '700' },
  underline: { position: 'absolute', bottom: 0, width: 56, height: 4, borderRadius: 2 },
  alertIcon: { width: 40, alignItems: 'flex-end' },
  alertBody: { gap: 8 },
  faces: { flexDirection: 'row', gap: 6 },
  chat: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 76, paddingHorizontal: 16 },
  groupFace: { width: 48, height: 48 },
  groupBack: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    borderWidth: 2,
    borderRadius: 19,
    overflow: 'hidden',
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
