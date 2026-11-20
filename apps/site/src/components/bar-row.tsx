'use client';

import { useRef } from 'react';
import { type BarItem, BarTile, type PlayPolicy } from './bar-tile';

/** Slots drawn either side of the middle one: enough to cover the widest row mid-slide. */
const REACH = 4;

const mod = (n: number, m: number) => ((n % m) + m) % m;

// One row of the board: a track of tiles that slides one place per step. The track never jumps
// back: slot n stays slot n (same key, same video) for as long as it is near the middle, and new
// slots are added at the far edge, under the fade. CSS does the slide (see .bar-track).
export function BarRow({
  seq,
  start,
  offset,
  dir,
  row,
  size,
  focusSlot,
  playPolicy,
  live,
  manualPlay,
  onStep,
  onBlocked,
  onUnblocked,
}: {
  /** Every bar, in board order. */
  seq: BarItem[];
  /** Where in `seq` this row begins, so rows show different bars. */
  start: number;
  /** Steps taken so far; the slot at `offset` sits in the middle. */
  offset: number;
  /** 1 slides left, -1 slides right. */
  dir: 1 | -1;
  /** 0 for the top row; staggers automatic steps. */
  row: number;
  /** The lead row shows bars at actual size; the chorus rows below are smaller. */
  size: 'lead' | 'chorus';
  /** The slot in focus (only the lead row has one). */
  focusSlot?: number;
  playPolicy: PlayPolicy;
  live: boolean;
  manualPlay: boolean;
  /** Lead row only: steps the board by this many bars when a tile beside the focus is clicked. */
  onStep?: (by: number) => void;
  onBlocked: () => void;
  onUnblocked: () => void;
}) {
  const mask = useRef<HTMLDivElement>(null);
  const slots: number[] = [];
  for (let i = offset - REACH; i <= offset + REACH; i++) slots.push(i);

  return (
    <div
      className="bar-row"
      data-size={size}
      style={{ '--offset': offset, '--dir': dir, '--row': row } as React.CSSProperties}
    >
      <div ref={mask} className="bar-mask">
        <div className="bar-track">
          {slots.map((i) => {
            const item = seq[mod(start + i, seq.length)];
            if (!item) return null;
            return (
              <BarTile
                key={i}
                item={item}
                slot={i}
                focus={i === focusSlot}
                policy={playPolicy}
                live={live}
                eager={Math.abs(i - offset) <= 2}
                manualPlay={manualPlay}
                rowRef={mask}
                onStep={onStep && i !== offset ? () => onStep(i - offset) : undefined}
                onBlocked={onBlocked}
                onUnblocked={onUnblocked}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
