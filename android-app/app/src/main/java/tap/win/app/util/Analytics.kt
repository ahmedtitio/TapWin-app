package tap.win.app.util

import android.content.Context
import com.google.firebase.analytics.FirebaseAnalytics
import com.google.firebase.analytics.ktx.analytics
import com.google.firebase.ktx.Firebase
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.launch
import org.json.JSONObject
import tap.win.app.api.ApiClient
import tap.win.app.api.EventRequest

/**
 * Google Analytics (GA4 via Firebase) + first-party event ingestion into our
 * Cloudflare Worker backend (shown in the admin dashboard "Analytics" page).
 *
 * The GA4 measurement id is injected through the manifest placeholder
 * `google_analytics_measurement_id` (see AndroidManifest.xml / codemagic.yaml).
 */
object Analytics {

    private var analytics: FirebaseAnalytics? = null

    fun init(context: Context) {
        runCatching {
            analytics = Firebase.analytics.apply {
                setSessionTimeoutDuration(30 * 60 * 1000)
                // Debug logging: adb shell setprop debug.firebase.analytics.app tap.win.app
            }
        }
    }

    /** Track an event both in GA4 and in our own backend (best effort). */
    fun logEvent(name: String, params: Map<String, String> = emptyMap()) {
        val bundle = android.os.Bundle().apply {
            params.forEach { (k, v) -> putString(k, v) }
        }
        runCatching { analytics?.logEvent(name, bundle) }
        // First-party copy for the admin dashboard.
        MainScope().launch {
            runCatching {
                ApiClient.authApi.trackEvent(
                    EventRequest(event = name, props = JSONObject(params)),
                )
            }
        }
    }

    // ---- Convenience helpers used across the app ----
    fun screenView(screenName: String) = logEvent("screen_view", mapOf("screen_name" to screenName))
    fun login(method: String) = logEvent("login", mapOf("method" to method))
    fun register() = logEvent("sign_up", mapOf("method" to "form"))
    fun verifyEmail() = logEvent("verify_email")
    fun logout() = logEvent("logout")
    fun profileUpdated() = logEvent("profile_updated")
    fun passwordResetRequested() = logEvent("forgot_password")