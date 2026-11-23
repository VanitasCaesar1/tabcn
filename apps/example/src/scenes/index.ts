/**
 * The eight app scenes the demos are shown in (docs/designs/site-redesign.md, Part 2). Which
 * design uses which, and in which palette: DESIGN_TAGS in src/design-tags.ts.
 */
import type { ComponentType } from 'react';

import { ChatScene } from './chat';
import { FilesScene } from './files';
import { FinanceScene } from './finance';
import { HealthScene } from './health';
import type { SceneProps } from './kit';
import { MapsScene } from './maps';
import { MusicScene } from './music';
import type { SceneName } from './palette';
import { ShopScene } from './shop';
import { SocialScene } from './social';

export type { SceneColors, SceneProps } from './kit';
export { scenePalette } from './kit';
export { SCENES, type SceneName, type SceneScheme, sceneBackground } from './palette';

export const SCENE_COMPONENTS: Record<SceneName, ComponentType<SceneProps>> = {
  social: SocialScene,
  music: MusicScene,
  shop: ShopScene,
  maps: MapsScene,
  finance: FinanceScene,
  chat: ChatScene,
  files: FilesScene,
  health: HealthScene,
};
