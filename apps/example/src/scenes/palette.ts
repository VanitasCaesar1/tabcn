/**
 * The colours of the seven app scenes behind the demos (docs/designs/site-redesign.md, Part 2).
 * Neutral light and dark sets with one muted accent per scene, so the design on top is the
 * strongest colour on screen. Plain data with no React Native imports: the site's build reads it.
 */
import type { SceneName, SceneScheme } from '../design-tags';

export type { SceneName, SceneScheme };

export interface ScenePalette {
  /** The screen behind everything. */
  background: string;
  /** Cards, fields and grouped rows on the background. */
  surface: string;
  /** Titles and body text. */
  text: string;
  /** Secondary text: times, counts, captions. */
  subtle: string;
  /** One muted colour for the scene's own highlights (a chart line, a selected pin). */
  accent: string;
}

export const SCENES: Record<SceneName, Record<SceneScheme, ScenePalette>> = {
  social: {
    light: {
      background: '#ffffff',
      surface: '#f2f2f2',
      text: '#0a0a0a',
      subtle: '#737373',
      accent: '#4a5d70',
    },
    dark: {
      background: '#000000',
      surface: '#161616',
      text: '#f5f5f5',
      subtle: '#8c8c8c',
      accent: '#8fa1b3',
    },
  },
  music: {
    light: {
      background: '#fafafa',
      surface: '#eeeeee',
      text: '#0b0b0b',
      subtle: '#6f6f6f',
      accent: '#7d5f4d',
    },
    dark: {
      background: '#0b0b0b',
      surface: '#1a1a1a',
      text: '#f4f4f4',
      subtle: '#8a8a8a',
      accent: '#b8a08a',
    },
  },
  shop: {
    light: {
      background: '#f4f4f2',
      surface: '#ffffff',
      text: '#111111',
      subtle: '#6e6e6a',
      accent: '#5c5a52',
    },
    dark: {
      background: '#0c0c0c',
      surface: '#1a1a1a',
      text: '#f3f3f1',
      subtle: '#8d8d88',
      accent: '#c9c4b8',
    },
  },
  maps: {
    light: {
      background: '#eceae4',
      surface: '#ffffff',
      text: '#121212',
      subtle: '#6d6c68',
      accent: '#4f6b84',
    },
    dark: {
      background: '#1a1b1d',
      surface: '#26272a',
      text: '#f2f2f2',
      subtle: '#8e8f93',
      accent: '#86a0b8',
    },
  },
  finance: {
    light: {
      background: '#ffffff',
      surface: '#f3f3f3',
      text: '#0a0a0a',
      subtle: '#707070',
      accent: '#3d7a5c',
    },
    dark: {
      background: '#000000',
      surface: '#141414',
      text: '#ffffff',
      subtle: '#8a8a8a',
      accent: '#5fae86',
    },
  },
  chat: {
    light: {
      background: '#ffffff',
      surface: '#f0f0f0',
      text: '#0b0b0b',
      subtle: '#767676',
      accent: '#46607a',
    },
    dark: {
      background: '#000000',
      surface: '#1c1c1e',
      text: '#f5f5f5',
      subtle: '#8e8e93',
      accent: '#4e6680',
    },
  },
  files: {
    light: {
      background: '#f6f6f7',
      surface: '#ffffff',
      text: '#111113',
      subtle: '#6c6c72',
      accent: '#56627a',
    },
    dark: {
      background: '#0b0b0c',
      surface: '#18181a',
      text: '#f2f2f3',
      subtle: '#8b8b91',
      accent: '#8b97ad',
    },
  },
};

/** The screen colour of a scene: the site's cards and the demo's scene style use it. */
export function sceneBackground(name: SceneName, scheme: SceneScheme) {
  return SCENES[name][scheme].background;
}
