/**
 * Seek's state: the search on Discover, the films saved to the collection, and past searches.
 * A small store outside React, so the tab bar and the screens read the same values. The search
 * is simulated: three status lines over about four and a half seconds, then the matches.
 */
import { toast } from 'expo-hot-toast';
import * as Haptics from 'expo-haptics';
import { useSyncExternalStore } from 'react';

export type Phase = 'idle' | 'searching' | 'results' | 'found';
export type Attachment = 'still' | 'clip';

export interface Past {
  query: string;
  when: string;
  filmId: string;
}

interface State {
  phase: Phase;
  /** The status pill's line while a search runs, else null. */
  status: string | null;
  attachment: Attachment | null;
  query: string;
  /** The match the viewer said was the one. */
  picked: string | null;
  saved: readonly string[];
  history: readonly Past[];
}

let state: State = {
  phase: 'idle',
  status: null,
  attachment: null,
  query: '',
  picked: null,
  saved: ['red-orbit', 'night-ferry', 'low-tide', 'paper-sun', 'long-field'],
  history: [
    { query: 'Ring of sparks over dark water', when: 'Yesterday', filmId: 'red-orbit' },
    { query: 'Bridge lights in a storm', when: 'Mon', filmId: 'night-ferry' },
    { query: 'Orange jellyfish, deep blue', when: 'Sun', filmId: 'low-tide' },
    { query: 'Fog rolling over pine trees', when: '12 Nov', filmId: 'long-field' },
  ],
};

const listeners = new Set<() => void>();
function set(next: Partial<State>) {
  state = { ...state, ...next };
  for (const listener of listeners) listener();
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useSeek() {
  return useSyncExternalStore(subscribe, () => state);
}

let timers: ReturnType<typeof setTimeout>[] = [];
function clearTimers() {
  for (const timer of timers) clearTimeout(timer);
  timers = [];
}
function after(ms: number, next: Partial<State>) {
  timers.push(setTimeout(() => set(next), ms));
}

export function attach(kind: Attachment | null) {
  set({ attachment: kind });
}

/**
 * Starts a search. The bar folds into the status pill at once; the screen changes a moment
 * later, and the matches show a moment after the bar unfolds, so each motion has the frame to
 * itself.
 */
export function search(text: string) {
  clearTimers();
  const what = state.attachment === 'clip' ? 'clip' : 'still';
  set({
    query: text || `What film is this ${what} from?`,
    status: `Looking at your ${what}…`,
    picked: null,
  });
  after(450, { phase: 'searching' });
  after(1700, { status: 'Taking a closer look…' });
  after(3100, { status: 'Matching 1,204 scenes…' });
  after(4500, { status: null, attachment: null });
  after(4950, { phase: 'results' });
  // A tick as the matches arrive.
  timers.push(
    setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 4950),
  );
}


export function cancel() {
  clearTimers();
  set({ phase: 'idle', status: null });
  toast('Search cancelled', { duration: 1600 });
}

/** "That's the one": the match the viewer picked. It goes into the history too. */
export function pick(filmId: string) {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  set({
    phase: 'found',
    picked: filmId,
    attachment: null,
    history: [
      { query: state.query, when: 'Just now', filmId },
      ...state.history.filter((p) => p.query !== state.query),
    ],
  });
}

export function newSearch() {
  clearTimers();
  set({ phase: 'idle', status: null, query: '', picked: null, attachment: null });
}

export function isSaved(filmId: string) {
  return state.saved.includes(filmId);
}

export function toggleSaved(filmId: string) {
  set({
    saved: isSaved(filmId)
      ? state.saved.filter((id) => id !== filmId)
      : [filmId, ...state.saved],
  });
}

/** Takes a past search out of the history, with Undo on a countdown. */
export function forget(past: Past) {
  const at = state.history.indexOf(past);
  if (at < 0) return;
  set({ history: state.history.filter((p) => p !== past) });
  toast('Search removed', {
    action: {
      label: 'Undo',
      countdown: true,
      onPress: () => {
        const history = [...state.history];
        history.splice(at, 0, past);
        set({ history });
      },
    },
  });
}
