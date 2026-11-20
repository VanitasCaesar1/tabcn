'use client';

import type { BoardGroup } from '@/lib/board';
import { cn } from '@/lib/cn';
import { LayoutIcon } from './layout-icons';

// The board's dock, which is itself a tab bar: one tab per layout group, a capsule behind the
// group in focus, and a round button to pause the board. The capsule's place is pure CSS (its
// index times its own width), so the server HTML and the hydrated page always agree.
export function BoardDock({
  groups,
  active,
  onJump,
  paused,
  onTogglePause,
  showPause,
  onKeyboardIn,
}: {
  groups: BoardGroup[];
  /** Index of the group the bar in focus belongs to. */
  active: number;
  onJump: (group: number) => void;
  paused: boolean;
  onTogglePause: () => void;
  /** False under reduced motion, where nothing moves on its own. */
  showPause: boolean;
  /** Keyboard focus came into the dock (true) or left it (false). */
  onKeyboardIn: (on: boolean) => void;
}) {
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: only listens for keyboard focus coming in, to pause the board.
    <div
      className="dock"
      onFocus={(e) => onKeyboardIn(e.target.matches(':focus-visible'))}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) onKeyboardIn(false);
      }}
    >
      {/* biome-ignore lint/a11y/useSemanticElements: a tab bar's pill, as in the bars themselves; a fieldset brings form styling and layout quirks. */}
      <div
        role="group"
        aria-label="Jump to a layout"
        className="dock-pill"
        style={{ '--g': active, '--n': groups.length } as React.CSSProperties}
      >
        <span aria-hidden className="dock-capsule" />
        {groups.map((g, i) => {
          const on = i === active;
          return (
            <button
              key={g.id}
              type="button"
              aria-label={`${g.label}, ${g.count} ${g.count === 1 ? 'bar' : 'bars'}`}
              aria-current={on ? 'true' : undefined}
              onClick={() => onJump(i)}
              className={cn(
                'dock-tab relative flex min-w-0 touch-manipulation flex-col items-center justify-center gap-0.5 rounded-full outline-hidden focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid focus-visible:-outline-offset-2',
                on ? 'text-foreground' : 'text-muted hover:text-foreground',
              )}
            >
              <LayoutIcon group={g.id} className="size-[18px] shrink-0" />
              <span className="max-w-full truncate font-medium text-[11px] leading-none">
                {g.label}
              </span>
            </button>
          );
        })}
      </div>
      {showPause && (
        <button
          type="button"
          aria-label={paused ? 'Play the bars' : 'Pause the bars'}
          onClick={onTogglePause}
          className="grid size-11 shrink-0 touch-manipulation place-items-center rounded-full bg-surface text-foreground shadow-raised outline-hidden transition-[background-color] duration-150 ease-out hover:bg-background focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid focus-visible:outline-offset-2"
        >
          <svg viewBox="0 0 16 16" className="size-3.5" fill="currentColor" aria-hidden>
            {paused ? (
              <path d="M5 3.2v9.6a.5.5 0 0 0 .76.43l7.7-4.8a.5.5 0 0 0 0-.86l-7.7-4.8A.5.5 0 0 0 5 3.2Z" />
            ) : (
              <path d="M4.5 3h2.5v10H4.5zM9 3h2.5v10H9z" />
            )}
          </svg>
        </button>
      )}
    </div>
  );
}
