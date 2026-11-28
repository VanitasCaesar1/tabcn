package expo.modules.tabcnmenu

import android.app.ActivityManager
import android.content.Context
import android.graphics.RuntimeShader
import android.os.Build
import android.util.Log
import expo.modules.tabcnmenu.render.GlassMaterialShader
import expo.modules.tabcnmenu.render.GlassPortalShader
import expo.modules.tabcnmenu.render.GlassShadowShader

/**
 * Whether this device can draw the glass, decided once per process.
 *
 * JS reads [supported] through the module's `supportsGlass` constant and picks
 * PanelUI's menu when it is false. [broken] is set when glass drawing throws at
 * run time. From then on every anchor stops drawing glass, and JS remounts its
 * menus as PanelUI's after `onGlassUnavailable`.
 */
internal object GlassCapability {
  /** Bumped when the props or events the JS side relies on change. */
  const val ApiVersion = 1

  private const val Tag = "TabcnGlassMenu"

  @Volatile
  var broken = false
    private set

  private var checked: Boolean? = null

  fun supported(context: Context?): Boolean {
    checked?.let { return it && !broken }
    val result = check(context)
    checked = result
    return result && !broken
  }

  /** API level only: what the drawing code needs before [supported] has run. */
  val apiSupportsGlass: Boolean
    get() = Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && !broken

  fun markBroken(error: Throwable) {
    if (broken) return
    broken = true
    Log.e(Tag, "Glass drawing failed; menus fall back to PanelUI for this session.", error)
  }

  private fun check(context: Context?): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return false
    val activityManager = context?.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager
    if (activityManager?.isLowRamDevice == true) return false
    return compilesShaders()
  }

  /** A shader that fails to compile on this GPU driver would otherwise crash in `onDraw`. */
  private fun compilesShaders(): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return false
    return try {
      RuntimeShader(GlassMaterialShader)
      RuntimeShader(GlassPortalShader)
      RuntimeShader(GlassShadowShader)
      true
    } catch (error: Throwable) {
      Log.w(Tag, "Glass shaders do not compile on this device; using PanelUI's menu.", error)
      false
    }
  }
}
