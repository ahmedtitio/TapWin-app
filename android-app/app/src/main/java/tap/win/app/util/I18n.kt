package tap.win.app.util

import android.content.Context
import java.util.Locale

/**
 * Minimal in-app localization: Arabic (default) + English.
 * The selected language is persisted in SharedPreferences and applied via
 * LocaleList at the Activity level (see MainActivity.attachBaseContext).
 */
object I18n {
    const val LANG_AR = "ar"
    const val LANG_EN = "en"

    private const val PREFS = "tapwin_settings"
    private const val KEY_LANG = "app_language"

    var lang: String = LANG_AR
        private set

    fun load(ctx: Context) {
        lang = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString(KEY_LANG, LANG_AR) ?: LANG_AR
    }

    fun set(ctx: Context, value: String) {
        lang = if (value == LANG_EN) LANG_EN else LANG_AR
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit().putString(KEY_LANG, lang).apply()
    }

    fun locale(): Locale = if (lang == LANG_EN) Locale.ENGLISH else Locale("ar")
    fun isRtl(): Boolean = lang != LANG_EN
    fun english(): Boolean = lang == LANG_EN

    /** t(arabic, english) — picks the string for the active language. */
    fun t(ar: String, en: String): String = if (lang == LANG_EN) en else ar
}
