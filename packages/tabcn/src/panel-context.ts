/**
 * The panel a piece of content is drawn in. The panel layer wraps each panel's content in it,
 * so `PanelDragArea` and `PanelScrollView` (tabcn/gestures) can leave out the panel's id and
 * know how much of a sheet sits behind the bar. Internal.
 */
import { createContext, use } from 'react';

export interface PanelContextValue {
  /** The panel's id. */
  id: string;
  /** True when the panel has snap points. */
  sheet: boolean;
  /**
   * Points of the content's bottom that never show, even at the highest snap point: the part
   * behind the bar and below the screen's edge. 0 for a plain panel.
   */
  hiddenBottom: number;
}

export const PanelContext = createContext<PanelContextValue | null>(null);

/** The enclosing panel, or null outside one. */
export function usePanelContext(): PanelContextValue | null {
  return use(PanelContext);
}
