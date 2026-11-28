// Forked from rit3zh/expo-glass-custom-menu at 0021efd (MIT). See packages/menu/NOTICE.
package expo.modules.tabcnmenu.records

import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

class GlassShrinkRecord : Record {
  @Field val duration: Float? = null
  @Field val damping: Float? = null
  @Field val scale: Float? = null
}
