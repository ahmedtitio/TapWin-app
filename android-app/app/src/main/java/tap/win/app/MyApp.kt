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
        AppContextHolder.context = applicationContext
        Analytics.init(applicationContext)
        // Upload the FCM push token (if Firebase is configured) so the backend
        // can send notifications to this device.
        TapWinMessagingService.register(applicationContext)
    }

    companion object {
        fun startPresence(app: Application) {
            app.startService(Intent(app, PresenceService::class.java))
        }

        fun stopPresence(app: Application) {
            app.stopService(Intent(app, PresenceService::class.java))
        }
    }
}
