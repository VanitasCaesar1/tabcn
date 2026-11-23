/**
 * A music app: a new release, recently played, a top-songs chart and playlists made for you.
 * Artists, albums and songs are invented.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  Glyph,
  ICONS,
  num,
  type Palette,
  Photo,
  RoundButton,
  rotate,
  type SceneProps,
  SceneScroll,
  SectionHeader,
  scenePalette,
  turnOf,
} from './kit';
import { COVERS, MUSIC_HEROES } from './photos';

// `cover` is the album's index in COVERS.
const ALBUMS = [
  { title: 'Floodlights', artist: 'The Quiet Hours' },
  { title: 'Side B', artist: 'Juniper Fields' },
  { title: 'Late Practice', artist: 'Ada Wren' },
  { title: 'Six Strings, No Map', artist: 'Harbor Lights' },
  { title: 'Fog Season', artist: 'Low Pines' },
  { title: 'Rooftops', artist: 'Mara Sol' },
  { title: 'Encore', artist: 'Night Bus' },
  { title: 'Northbound', artist: 'Ilse Varga' },
  { title: 'Orbit', artist: 'Kessel Drive' },
  { title: 'Long Exposure', artist: 'Hollow Coast' },
  { title: 'After Hours', artist: 'Mina Okafor' },
  { title: 'City Lights', artist: 'The Amber Line' },
  { title: 'Sparks', artist: 'June Calloway' },
  { title: 'Last Train', artist: 'Platform Nine' },
  { title: 'Live at Rosie’s', artist: 'The Lanterns' },
  { title: 'Broadway Nights', artist: 'Theo Vance' },
  { title: 'Stage Door', artist: 'Ada Wren' },
  { title: 'Northern Lights', artist: 'Skerry' },
  { title: 'Milky Way', artist: 'Low Pines' },
  { title: 'Back Alley', artist: 'Brick & Mortar' },
].map((album, cover) => ({ ...album, cover }));

const SONGS = [
  { title: 'Paper Lanterns', artist: 'Mara Sol', cover: 5, length: '3:24' },
  { title: 'Static Bloom', artist: 'The Quiet Hours', cover: 0, length: '4:02' },
  { title: 'Undertow', artist: 'Low Pines', cover: 4, length: '3:51' },
  { title: 'Small Hours', artist: 'Ada Wren', cover: 2, length: '2:58' },
  { title: 'Coastline', artist: 'Harbor Lights', cover: 3, length: '3:37' },
  { title: 'Northern Line', artist: 'Ilse Varga', cover: 7, length: '4:15' },
  { title: 'Ring of Fire Escape', artist: 'Kessel Drive', cover: 8, length: '3:09' },
  { title: 'Headlights', artist: 'Hollow Coast', cover: 9, length: '4:41' },
  { title: 'Neon Rain', artist: 'The Amber Line', cover: 11, length: '3:18' },
  { title: 'Platform Song', artist: 'Platform Nine', cover: 13, length: '2:47' },
  { title: 'Last Orders', artist: 'The Lanterns', cover: 14, length: '3:55' },
  { title: 'Aurora', artist: 'Skerry', cover: 17, length: '5:02' },
];

const MIXES = [
  { title: 'Morning Focus', note: '42 songs · 2 h 38 min', cover: 2 },
  { title: 'Slow Sundays', note: '28 songs · 1 h 51 min', cover: 4 },
  { title: 'Live and Loud', note: '35 songs · 2 h 12 min', cover: 6 },
  { title: 'Late Train Home', note: '19 songs · 1 h 06 min', cover: 13 },
  { title: 'Night Drive', note: '31 songs · 1 h 58 min', cover: 9 },
  { title: 'Stargazing', note: '24 songs · 1 h 40 min', cover: 18 },
  { title: 'Bar Room Sessions', note: '26 songs · 1 h 32 min', cover: 14 },
  { title: 'Small Fires', note: '22 songs · 1 h 17 min', cover: 12 },
];

const HEROES = [
  { title: 'Low Light Hours', artist: 'Halden Ray', songs: 11 },
  { title: 'Record Store Days', artist: 'Juno Park', songs: 9 },
  { title: 'Keys and Rooms', artist: 'Ilse Varga', songs: 14 },
];

export function MusicScene(props: SceneProps) {
  const palette = scenePalette('music', props.scheme, props.themed);
  const turn = turnOf(props);
  return (
    <SceneScroll
      scene={props}
      palette={palette}
      accessory={<RoundButton icon={ICONS.search} palette={palette} />}
      sections={[
        <Hero key="hero" palette={palette} at={turn % HEROES.length} />,
        <Recent key="recent" palette={palette} albums={rotate(ALBUMS, turn * 3)} />,
        <TopSongs key="songs" palette={palette} songs={rotate(SONGS, turn * 2).slice(0, 6)} />,
        <MadeForYou key="mix" palette={palette} mixes={rotate(MIXES, turn).slice(0, 4)} />,
      ]}
    />
  );
}

function Hero({ palette, at }: { palette: Palette; at: number }) {
  const hero = HEROES[at] ?? HEROES[0];
  return (
    <View style={styles.pad}>
      <Photo source={MUSIC_HEROES[at]} palette={palette} style={styles.hero} />
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.72)']}
        style={styles.heroShade}
      />
      <View style={styles.heroText}>
        <Text style={styles.heroTitle}>{hero?.title}</Text>
        <Text style={styles.heroArtist}>
          {hero?.artist} · {hero?.songs} songs
        </Text>
      </View>
      <View style={styles.heroPlay}>
        <Glyph d={ICONS.play} color="#000000" fill="#000000" size={18} />
      </View>
    </View>
  );
}

function Recent({ palette, albums }: { palette: Palette; albums: typeof ALBUMS }) {
  return (
    <View>
      <SectionHeader title="Recently played" palette={palette} action="See all" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {albums.map((album) => (
          <View key={album.title} style={styles.album}>
            <Photo source={COVERS[album.cover]} palette={palette} style={styles.cover} />
            <Text numberOfLines={1} style={[styles.albumTitle, { color: palette.text }]}>
              {album.title}
            </Text>
            <Text numberOfLines={1} style={[styles.small, { color: palette.subtle }]}>
              {album.artist}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function TopSongs({ palette, songs }: { palette: Palette; songs: typeof SONGS }) {
  return (
    <View>
      <SectionHeader title="Top songs this week" palette={palette} action="Play all" />
      {songs.map((song, i) => (
        <View key={song.title} style={styles.song}>
          <Text style={[styles.rank, num, { color: palette.subtle }]}>{i + 1}</Text>
          <Photo source={COVERS[song.cover]} palette={palette} style={styles.songCover} />
          <View style={styles.flex}>
            <Text numberOfLines={1} style={[styles.songTitle, { color: palette.text }]}>
              {song.title}
            </Text>
            <Text numberOfLines={1} style={[styles.small, { color: palette.subtle }]}>
              {song.artist}
            </Text>
          </View>
          <Text style={[styles.small, num, { color: palette.subtle }]}>{song.length}</Text>
          <Glyph d={ICONS.more} color={palette.subtle} strokeWidth={2.6} />
        </View>
      ))}
    </View>
  );
}

function MadeForYou({ palette, mixes }: { palette: Palette; mixes: typeof MIXES }) {
  return (
    <View>
      <SectionHeader title="Made for you" palette={palette} />
      <View style={styles.grid}>
        {mixes.map((mix) => (
          <View key={mix.title} style={[styles.mix, { backgroundColor: palette.surface }]}>
            <Photo source={COVERS[mix.cover]} palette={palette} style={styles.mixCover} />
            <View style={styles.mixText}>
              <Text numberOfLines={1} style={[styles.songTitle, { color: palette.text }]}>
                {mix.title}
              </Text>
              <Text numberOfLines={1} style={[styles.small, num, { color: palette.subtle }]}>
                {mix.note}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pad: { paddingHorizontal: 16 },
  hero: { width: '100%', aspectRatio: 3 / 2, borderRadius: 16 },
  heroShade: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 0,
    height: '55%',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  heroText: { position: 'absolute', left: 32, bottom: 18, gap: 2 },
  heroTitle: { color: '#ffffff', fontSize: 24, fontWeight: '700' },
  heroArtist: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  heroPlay: {
    position: 'absolute',
    right: 32,
    bottom: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  row: { gap: 14, paddingHorizontal: 16 },
  album: { width: 140, gap: 2 },
  cover: { width: 140, height: 140, borderRadius: 10, marginBottom: 6 },
  albumTitle: { fontSize: 14, fontWeight: '600' },
  small: { fontSize: 13 },
  song: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  rank: { width: 16, fontSize: 15, fontWeight: '600', textAlign: 'center' },
  songCover: { width: 48, height: 48, borderRadius: 6 },
  songTitle: { fontSize: 15, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16 },
  mix: {
    width: '48.5%',
    flexGrow: 1,
    borderRadius: 12,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  mixCover: { width: '100%', aspectRatio: 1 },
  mixText: { padding: 10, gap: 2 },
});
