package tap.win.app

import android.app.Application
import android.content.Intent
import tap.win.app.api.AppContextHolder
import tap.win.app.data.PresenceService
import tap.win.app.notifications.TapWinMessagingService
import tap.win.app.util.Analytics

class MyApp : Application() {
    override fun onCreate() {
        super.onCreate()
        // Every init step below is optional/best-effort: a failure here (bad
        // google-services config, keystore glitch, …) used to kill the process
        // before MainActivity ever ran — i.e. "app stops working on open".
        runCatching { AppContextHolder.context = applicationContext }
        runCatching { Analytics.init(applicationContext) }
            .onFailure { android.util.Log.e("TapWin", "Analytics init failed", it) }
        // Upload the FCM push token (if Firebase is configured) so the backend
        // can send notifications to this device.
        runCatching { TapWinMessagingService.register(applicationContext) }
            .onFailure { android.util.Log.e("TapWin", "FCM register failed", it) }
    }

    companion object {
        fun startPresence(app: Application) {
            // Regular background service — no special permissions needed and it
            // must never crash the app if starting it fails.
            runCatching { app.startService(Intent(app, PresenceService::class.java)) }
                .onFailure { android.util.Log.e("TapWin", "startPresence failed", it) }
        }

        fun stopPresence(app: Application) {
            runCatching { app.stopService(Intent(app, PresenceService::class.java)) }
        }
    }
}
