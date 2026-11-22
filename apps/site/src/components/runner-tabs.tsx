'use client';

import { PillRadio } from './pill-radio';
import { RUNNER_NAMES, saveRunner, useRunner } from './use-runner';

const OPTIONS = RUNNER_NAMES.map((name) => ({ value: name, label: name }));

// The package-manager switch over an install command. Every install box shares the saved choice.
export function RunnerTabs({ className }: { className?: string }) {
  const runner = useRunner();
  return (
    <PillRadio
      label="Package manager"
      options={OPTIONS}
      value={runner}
      onChange={saveRunner}
      className={className}
      pillClassName="font-mono"
    />
  );
}
