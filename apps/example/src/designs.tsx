import { DarkCapsule } from '@registry/dark-capsule/dark-capsule';
import { LabeledPlus } from '@registry/labeled-plus/labeled-plus';
import { LightIcons } from '@registry/light-icons/light-icons';
import { MonoType } from '@registry/mono-type/mono-type';
import { OutlineDark } from '@registry/outline-dark/outline-dark';
import { PlayfulTiles } from '@registry/playful-tiles/playful-tiles';
import { SlidingCapsule } from '@registry/sliding-capsule/sliding-capsule';
import { SolidDark } from '@registry/solid-dark/solid-dark';
import { TopNotch } from '@registry/top-notch/top-notch';
import type { ReactElement } from 'react';

export interface DemoContext {
  onActionPress: () => void;
}

/** Built designs, keyed by catalog id. Each renders the exact file users copy from registry/. */
export const designs: Record<string, (ctx: DemoContext) => ReactElement> = {
  'sliding-capsule': () => <SlidingCapsule />,
  'labeled-plus': ({ onActionPress }) => <LabeledPlus onActionPress={onActionPress} />,
  'solid-dark': () => <SolidDark />,
  'top-notch': () => <TopNotch />,
  'outline-dark': () => <OutlineDark />,
  'dark-capsule': () => <DarkCapsule />,
  'light-icons': () => <LightIcons />,
  'playful-tiles': () => <PlayfulTiles />,
  'mono-type': () => <MonoType />,
};
