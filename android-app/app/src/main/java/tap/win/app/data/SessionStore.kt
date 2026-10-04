package tap.win.app.data

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

/**
 * Secure storage for JWT tokens and the current user id.
 */
class SessionStore(context: Context) {

    private val prefs = runCatching {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
        EncryptedSharedPreferences.create(
            context,
            "secure_session",
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
        )
    }.getOrElse { e ->
        // EncryptedSharedPreferences can fail on some devices (AndroidKeyStore
        // glitches, corrupted keystore entries). Falling back to plain prefs
        // keeps the app usable instead of crashing on launch. The session store
        // is rebuilt automatically once secure storage works again.
        android.util.Log.e("TapWin", "EncryptedSharedPreferences init failed, using fallback", e)
        context.getSharedPreferences("session_fallback", Context.MODE_PRIVATE)
    }

    var accessToken: String?
        get() = prefs.getString(KEY_ACCESS, null)
        set(value) { prefs.edit().putString(KEY_ACCESS, value).apply() }

    var refreshToken: String?
        get() = prefs.getString(KEY_REFRESH, null)
        set(value) { prefs.edit().putString(KEY_REFRESH, value).apply() }

    var userId: String?
        get() = prefs.getString(KEY_USER_ID, null)
        set(value) { prefs.edit().putString(KEY_USER_ID, value).apply() }

    val isLoggedIn: Boolean
        get() = accessToken != null && refreshToken != null

    fun save(access: String, refresh: String, id: String?) {
        accessToken = access
        refreshToken = refresh
        userId = id
    }

    fun clear() {
        prefs.edit().clear().apply()
    }

    companion object {
        private const val KEY_ACCESS = "access_token"
        private const val KEY_REFRESH = "refresh_token"
        private const val KEY_USER_ID = "user_id"
    }
}
