import type { MenuModel } from '../model';
import type { MenuElement } from '../parts';

/** What the menu root hands every renderer. */
export interface RenderMenuProps {
  /** The `Menu.Trigger` element. Its single child is the control that opens the menu. */
  trigger: MenuElement;
  /** The `Menu.Content` element. */
  content: MenuElement;
  model: MenuModel;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Called when the glass renderer can't draw on this device after all. */
  onGlassUnavailable?: () => void;
}
