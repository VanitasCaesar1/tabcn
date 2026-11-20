'use client';

import { useSyncExternalStore } from 'react';

// Which catalogue loops may play. One small registry for the whole page (no React context), so
// at most one video decodes at a time:
// - a fine pointer plays the card under it, or the card with keyboard focus inside it;
// - touch plays the card nearest the middle of the screen once scrolling settles;
// - nothing starts on its own under reduced motion, with data saver on, while the tab is
//   hidden or while the catalogue swaps its results.

/** True also plays the visible cards on desktop at rest, up to AMBIENT_CAP at once. */
export const AMBIENT_DESKTOP = false;
const AMBIENT_CAP = 6;

/** How long scrolling has to stop before touch hands the slot on. */
const SETTLE_MS = 150;

/** A card counts as on screen from this much of it showing. */
const VISIBLE = 0.6;

const FINE = '(hover: hover) and (pointer: fine)';
const REDUCED = '(prefers-reduced-motion: reduce)';

let playing: readonly string[] = [];
let suspended = false;
let hidden = false;
let hovered: string | null = null;
const blocked = new Set<string>();
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function set(next: readonly string[]) {
  if (next.length === playing.length && next.every((id, i) => playing[i] === id)) return;
  playing = next;
  emit();
}

export const finePointer = () => matchMedia(FINE).matches;

/** Data saver, where the browser reports it (Chromium's navigator.connection). */
export function saveData() {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return connection?.saveData === true;
}

function ambientAllowed() {
  if (matchMedia(REDUCED).matches || saveData()) return false;
  return finePointer() ? AMBIENT_DESKTOP : true;
}

// Cards that may start on their own, and how much of each is on screen.
const hosts = new Map<Element, string>();
const ratios = new Map<Element, number>();
let observer: IntersectionObserver | null = null;
let settle = 0;
let wired = false;

function schedulePick() {
  window.clearTimeout(settle);
  settle = window.setTimeout(pick, SETTLE_MS);
}

function pick() {
  if (suspended || hidden || hovered || !ambientAllowed()) return;
  const middle = innerHeight / 2;
  const nearest = [...ratios]
    .filter(([el, ratio]) => ratio >= VISIBLE - 0.01 && !blocked.has(hosts.get(el) ?? ''))
    .map(([el]) => {
      const box = el.getBoundingClientRect();
      return { id: hosts.get(el) ?? '', distance: Math.abs(box.top + box.height / 2 - middle) };
    })
    .sort((a, b) => a.distance - b.distance);
  set(nearest.slice(0, finePointer() ? AMBIENT_CAP : 1).map((c) => c.id));
}

function wire() {
  if (wired) return;
  wired = true;
  hidden = document.hidden;
  document.addEventListener('visibilitychange', () => {
    hidden = document.hidden;
    emit();
    if (!hidden) schedulePick();
  });
  window.addEventListener('scroll', () => hosts.size > 0 && schedulePick(), { passive: true });
}

function subscribe(listener: () => void) {
  wire();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const isPlaying = (id: string) => !suspended && !hidden && playing.includes(id);

/** Whether this card's loop should be playing now. False on the server. */
export function useLoopPlaying(id: string) {
  return useSyncExternalStore(
    subscribe,
    () => isPlaying(id),
    () => false,
  );
}

/** Hover, keyboard focus or a press: this card plays, and only this one. */
export function claim(id: string, viaHover = false) {
  if (viaHover) hovered = id;
  set([id]);
}

export function release(id: string) {
  if (hovered === id) hovered = null;
  if (playing.includes(id)) set(playing.filter((p) => p !== id));
  if (!hovered && hosts.size > 0) schedulePick();
}

/** The browser refused to play this card (NotAllowedError): it isn't tried again on its own. */
export function markBlocked(id: string) {
  blocked.add(id);
  release(id);
}

/** Stops every loop while the catalogue swaps its results, and lets them go again after. */
export function suspendLoops(on: boolean) {
  if (suspended === on) return;
  suspended = on;
  emit();
  if (!on) schedulePick();
}

/** Lets a card take the slot on its own when it's the one in view (touch, or AMBIENT_DESKTOP). */
export function watch(host: Element, id: string) {
  wire();
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) ratios.set(entry.target, entry.intersectionRatio);
      schedulePick();
    },
    { threshold: [0, VISIBLE, 1] },
  );
  hosts.set(host, id);
  observer.observe(host);
  return () => {
    observer?.unobserve(host);
    hosts.delete(host);
    ratios.delete(host);
    release(id);
  };
}
