/**
 * Seek's catalogue. The films, people and numbers are made up; the photos are Unsplash photos
 * (assets/SOURCES.md).
 */
/** A bundled image: what `require()` of an image file returns. */
type Asset = number;

export interface Person {
  name: string;
  photo: Asset;
}

export interface Film {
  id: string;
  title: string;
  year: number;
  runtime: string;
  rating: string;
  genre: string;
  synopsis: string;
  poster: Asset;
  hero: Asset;
  director: Person;
  cast: Person[];
  /** How many more cast members the film page counts after the faces it shows. */
  castMore: number;
}

const people = {
  ana: { name: 'Ana Reyes', photo: require('../../assets/people/a.jpg') },
  mei: { name: 'Mei Tanaka', photo: require('../../assets/people/b.jpg') },
  lena: { name: 'Lena Brandt', photo: require('../../assets/people/c.jpg') },
  nia: { name: 'Nia Okafor', photo: require('../../assets/people/d.jpg') },
  sofia: { name: 'Sofia Varga', photo: require('../../assets/people/e.jpg') },
  jonas: { name: 'Jonas Hale', photo: require('../../assets/people/f.jpg') },
  iris: { name: 'Iris Moreau', photo: require('../../assets/people/g.jpg') },
} satisfies Record<string, Person>;

export const ME = require('../../assets/people/me.jpg');
export const STILL = require('../../assets/films/still.jpg');

export const FILMS: Film[] = [
  {
    id: 'dust-meridian',
    title: 'Dust Meridian',
    year: 2017,
    runtime: '2h 31m',
    rating: 'PG-13',
    genre: 'Sci-fi',
    synopsis:
      'A surveyor crossing a city swallowed by dust finds a signal that has been repeating for forty years, and follows it out past the last road.',
    poster: require('../../assets/films/dust-meridian.jpg'),
    hero: require('../../assets/films/dust-meridian-hero.jpg'),
    director: people.jonas,
    cast: [people.ana, people.nia, people.sofia, people.iris],
    castMore: 24,
  },
  {
    id: 'red-orbit',
    title: 'Red Orbit',
    year: 2015,
    runtime: '2h 4m',
    rating: 'PG-13',
    genre: 'Adventure',
    synopsis:
      'Stranded on a supply station at the edge of a dying star, a mechanic has nine days to build a way home out of what the last crew left behind.',
    poster: require('../../assets/films/red-orbit.jpg'),
    hero: require('../../assets/films/red-orbit-hero.jpg'),
    director: people.mei,
    cast: [people.lena, people.jonas, people.ana, people.nia],
    castMore: 18,
  },
  {
    id: 'glass-harbour',
    title: 'Glass Harbour',
    year: 2014,
    runtime: '1h 52m',
    rating: 'PG',
    genre: 'Drama',
    synopsis:
      'Two sisters run their late father’s ferry for one last winter, and learn what he carried across the river every night.',
    poster: require('../../assets/films/glass-harbour.jpg'),
    hero: require('../../assets/films/glass-harbour-hero.jpg'),
    director: people.iris,
    cast: [people.sofia, people.mei, people.lena, people.jonas],
    castMore: 12,
  },
  {
    id: 'night-ferry',
    title: 'Night Ferry',
    year: 2019,
    runtime: '1h 58m',
    rating: 'R',
    genre: 'Thriller',
    synopsis:
      'On the last crossing before a storm closes the bridge, a deckhand realises one of the passengers boarded twice.',
    poster: require('../../assets/films/night-ferry.jpg'),
    hero: require('../../assets/films/night-ferry-hero.jpg'),
    director: people.nia,
    cast: [people.jonas, people.iris, people.ana, people.mei],
    castMore: 9,
  },
  {
    id: 'low-tide',
    title: 'Low Tide',
    year: 2021,
    runtime: '1h 41m',
    rating: 'G',
    genre: 'Nature',
    synopsis:
      'A year under the surface of one small bay, from the first warm current of spring to the jellyfish bloom of late summer.',
    poster: require('../../assets/films/low-tide.jpg'),
    hero: require('../../assets/films/low-tide-hero.jpg'),
    director: people.ana,
    cast: [people.mei, people.sofia, people.lena, people.nia],
    castMore: 4,
  },
  {
    id: 'paper-sun',
    title: 'Paper Sun',
    year: 2018,
    runtime: '2h 9m',
    rating: 'PG-13',
    genre: 'Romance',
    synopsis:
      'An architect and a window cleaner meet on the 88th floor every Tuesday for a year, and never once on the ground.',
    poster: require('../../assets/films/paper-sun.jpg'),
    hero: require('../../assets/films/paper-sun-hero.jpg'),
    director: people.lena,
    cast: [people.iris, people.jonas, people.sofia, people.ana],
    castMore: 15,
  },
  {
    id: 'long-field',
    title: 'The Long Field',
    year: 2016,
    runtime: '2h 17m',
    rating: 'PG-13',
    genre: 'Mystery',
    synopsis:
      'Fog settles on a valley town for a week, and when it lifts, the forest has moved closer.',
    poster: require('../../assets/films/long-field.jpg'),
    hero: require('../../assets/films/long-field-hero.jpg'),
    director: people.sofia,
    cast: [people.nia, people.mei, people.jonas, people.iris],
    castMore: 21,
  },
];

export function film(id: string | undefined): Film {
  return FILMS.find((f) => f.id === id) ?? (FILMS[0] as Film);
}

/** The matches a search of the still returns, best first, with how close each looked. */
export const MATCHES = [
  { id: 'dust-meridian', match: 72 },
  { id: 'red-orbit', match: 64 },
  { id: 'glass-harbour', match: 9 },
];
