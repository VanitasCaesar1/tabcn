// Forked from rit3zh/expo-glass-custom-menu at 0021efd (MIT). See packages/menu/NOTICE.
package expo.modules.tabcnmenu.content

import android.graphics.RectF
import expo.modules.tabcnmenu.records.GlassMenuItemRecord

internal class GlassRow(val item: GlassMenuItemRecord, val index: Int) {
  val rect = RectF()
  var title: CharSequence = ""
  var subtitle: CharSequence? = null
  val isSeparator get() = item.separator
  val isHeading get() = item.heading
  val selectable get() = !item.separator && !item.heading && !item.disabled
}
