import { LabeledPlus } from '@registry/labeled-plus/labeled-plus';
import { SlidingCapsule } from '@registry/sliding-capsule/sliding-capsule';
import { SolidDark } from '@registry/solid-dark/solid-dark';
import type { ReactElement } from 'react';

export interface DemoContext {
  onActionPress: () => void;
}

/** Built designs, keyed by catalog id. Each renders the exact file users copy from registry/. */
export const designs: Record<string, (ctx: DemoContext) => ReactElement> = {
  'sliding-capsule': () => <SlidingCapsule />,
  'labeled-plus': ({ onActionPress }) => <LabeledPlus onActionPress={onActionPress} />,
  'solid-dark': () => <SolidDark />,
};
