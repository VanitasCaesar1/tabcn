'use client';

import { useId, useState } from 'react';
import { cn } from '@/lib/cn';
import type { UsageSettings } from '@/lib/usage';
import { PillRadio } from './pill-radio';

export type Theme = 'tabcn' | 'panel' | 'moon' | 'grass';
const THEMES: readonly { value: Theme; label: string; ariaLabel?: string }[] = [
  { value: 'tabcn', label: 'tabcn', ariaLabel: 'Design colours' },
  { value: 'panel', label: 'Panel', ariaLabel: 'PanelUI Panel' },
  { value: 'moon', label: 'Moon', ariaLabel: 'PanelUI Moon' },
  { value: 'grass', label: 'Grass', ariaLabel: 'PanelUI Grass' },
];

/** Accent colours to start from; the hex field takes any other. */
const SWATCHES = ['#0a84ff', '#30d158', '#ff9f0a', '#ff375f', '#bf5af2', '#ffffff'];

const HEX = /^#[0-9a-f]{6}$/i;

const cell =
  'flex min-h-12 min-w-0 items-center justify-between gap-3 rounded-[10px] bg-cell py-1.5 pr-2 pl-3.5';
const cellLabel = 'min-w-0 truncate text-[13px] text-muted';

// The design page's Customize panel: a grid of controls under the preview. Tab count, light or
// dark screen and right to left for every design; the PanelUI theme for designs the preview can
// recolour; accent and labels only for designs that list them. Each control is labelled and works
// from the keyboard.
export function CustomizePanel({
  settings,
  rtl,
  minTabs,
  maxTabs,
  themed,
  accent,
  labels,
  onChange,
  onRtl,
  onReset,
}: {
  settings: UsageSettings;
  rtl: boolean;
  minTabs: number;
  maxTabs: number;
  themed: boolean;
  accent: boolean;
  labels: boolean;
  onChange: (next: UsageSettings) => void;
  onRtl: (on: boolean) => void;
  onReset: () => void;
}) {
  const id = useId();
  const tabs = settings.tabs ?? maxTabs;
  const set = (patch: UsageSettings) => onChange({ ...settings, ...patch });

  return (
    <section
      aria-labelledby={`${id}-title`}
      className="rounded-2xl border border-card-border bg-card p-2"
    >
      <div className="flex h-11 items-center justify-between pr-1 pl-2.5">
        <h2 id={`${id}-title`} className="font-medium text-[15px]">
          Customize
        </h2>
        <button
          type="button"
          onClick={onReset}
          className="h-8 rounded-lg px-2.5 text-[13px] text-muted outline-hidden transition-[color,background-color] duration-150 ease-out hover:bg-cell hover:text-foreground focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid motion-reduce:transition-none"
        >
          Reset
        </button>
      </div>
      <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
        <div className={cell}>
          <span id={`${id}-tabs`} className={cellLabel}>
            Tabs
          </span>
          <Stepper
            labelledBy={`${id}-tabs`}
            value={tabs}
            min={minTabs}
            max={maxTabs}
            onChange={(n) => set({ tabs: n })}
          />
        </div>
        <div className={cell}>
          <span id={`${id}-scheme`} className={cellLabel}>
            Screen
          </span>
          <Segmented
            labelledBy={`${id}-scheme`}
            options={[
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
            value={settings.scheme ?? 'light'}
            onChange={(scheme) => set({ scheme })}
          />
        </div>
        <div className={cell}>
          <span id={`${id}-rtl`} className={cellLabel}>
            Right to left
          </span>
          <Switch labelledBy={`${id}-rtl`} on={rtl} onChange={onRtl} />
        </div>
        {labels && (
          <div className={cell}>
            <span id={`${id}-labels`} className={cellLabel}>
              Labels
            </span>
            <Switch
              labelledBy={`${id}-labels`}
              on={settings.labels ?? true}
              onChange={(on) => set({ labels: on })}
            />
          </div>
        )}
        {themed && (
          <div className={cn(cell, 'sm:col-span-2 lg:col-span-3')}>
            <span className={cellLabel}>Theme</span>
            <PillRadio
              label="Theme"
              options={THEMES}
              value={(settings.theme as Theme | undefined) ?? 'tabcn'}
              onChange={(theme) => set({ theme })}
            />
          </div>
        )}
        {accent && (
          <AccentCell
            value={settings.accent}
            onChange={(value) => set({ accent: value })}
            className="sm:col-span-2"
          />
        )}
      </div>
    </section>
  );
}

function Stepper({
  labelledBy,
  value,
  min,
  max,
  onChange,
}: {
  labelledBy: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  const button =
    'grid size-8 touch-manipulation place-items-center rounded-lg text-foreground outline-hidden transition-[background-color,opacity] duration-150 ease-out hover:bg-cell-hover focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid disabled:opacity-35 disabled:hover:bg-transparent motion-reduce:transition-none';
  return (
    // biome-ignore lint/a11y/useSemanticElements: a group of two buttons and the value they change.
    <div role="group" aria-labelledby={labelledBy} className="flex items-center gap-1">
      <button
        type="button"
        aria-label="Fewer tabs"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className={button}
      >
        <svg viewBox="0 0 16 16" aria-hidden className="size-3.5" fill="none" stroke="currentColor">
          <path d="M3.5 8h9" strokeWidth={1.5} strokeLinecap="round" />
        </svg>
      </button>
      <output aria-live="polite" className="w-6 text-center font-medium text-[14px] tabular-nums">
        {value}
      </output>
      <button
        type="button"
        aria-label="More tabs"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className={button}
      >
        <svg viewBox="0 0 16 16" aria-hidden className="size-3.5" fill="none" stroke="currentColor">
          <path d="M3.5 8h9M8 3.5v9" strokeWidth={1.5} strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

/** Two or three options with a capsule that glides to the one picked (no overshoot). */
function Segmented<T extends string>({
  labelledBy,
  options,
  value,
  onChange,
}: {
  labelledBy: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const name = useId();
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      className="relative grid h-8 shrink-0 rounded-lg p-0.5"
      style={
        {
          gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
          '--g': index,
          '--n': options.length,
          '--pad': '2px',
          '--capsule-r': '6px',
        } as React.CSSProperties
      }
    >
      <span aria-hidden className="dock-capsule" />
      {options.map((o) => (
        <label
          key={o.value}
          className={cn(
            'seg relative flex cursor-pointer touch-manipulation select-none items-center justify-center rounded-md px-3 text-[13px] has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-foreground has-[input:focus-visible]:outline-solid',
            o.value === value ? 'font-medium text-foreground' : 'text-muted hover:text-foreground',
          )}
        >
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={o.value === value}
            onChange={() => onChange(o.value)}
            className="sr-only"
          />
          {o.label}
        </label>
      ))}
    </div>
  );
}

function Switch({
  labelledBy,
  on,
  onChange,
}: {
  labelledBy: string;
  on: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-labelledby={labelledBy}
      onClick={() => onChange(!on)}
      className={cn(
        'switch-track relative mr-1.5 h-[22px] w-[38px] shrink-0 touch-manipulation rounded-full outline-hidden focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid focus-visible:outline-offset-2',
        on ? 'bg-accent' : 'bg-[var(--switch-off)]',
      )}
    >
      <span
        aria-hidden
        className="switch-knob absolute top-[3px] left-[3px] size-4 rounded-full bg-white shadow-[0_1px_2px_oklch(0_0_0/0.3)]"
        style={{ translate: on ? '16px 0' : '0 0' }}
      />
    </button>
  );
}

function AccentCell({
  value,
  onChange,
  className,
}: {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  className?: string;
}) {
  const id = useId();
  const [draft, setDraft] = useState(value ?? '');
  const [lastValue, setLastValue] = useState(value);
  // A swatch or Reset changes the value from outside: the field follows.
  if (value !== lastValue) {
    setLastValue(value);
    setDraft(value ?? '');
  }
  return (
    <div className={cn(cell, className)}>
      <span id={`${id}-label`} className={cellLabel}>
        Accent
      </span>
      <div className="flex min-w-0 items-center gap-2">
        <div role="radiogroup" aria-labelledby={`${id}-label`} className="flex items-center gap-1">
          {SWATCHES.map((hex) => {
            const on = value?.toLowerCase() === hex;
            return (
              // biome-ignore lint/a11y/useSemanticElements: colour swatches drawn as round buttons.
              <button
                key={hex}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={hex}
                onClick={() => onChange(on ? undefined : hex)}
                className={cn(
                  'size-6 shrink-0 touch-manipulation rounded-full outline-hidden focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid focus-visible:outline-offset-2',
                  on
                    ? 'shadow-[0_0_0_2px_var(--cell),0_0_0_3.5px_var(--foreground)]'
                    : 'shadow-[inset_0_0_0_1px_oklch(0_0_0/0.15)]',
                )}
                style={{ backgroundColor: hex }}
              />
            );
          })}
        </div>
        <input
          aria-label="Accent colour, hex"
          value={draft}
          placeholder="#rrggbb"
          spellCheck={false}
          autoComplete="off"
          maxLength={7}
          onChange={(e) => {
            const next = e.target.value.trim();
            setDraft(next);
            if (HEX.test(next)) onChange(next.toLowerCase());
          }}
          className="h-8 w-[84px] min-w-0 rounded-lg bg-card px-2 font-mono text-[12px] text-foreground shadow-[inset_0_0_0_1px_var(--card-border)] outline-hidden placeholder:text-muted focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid"
        />
      </div>
    </div>
  );
}
