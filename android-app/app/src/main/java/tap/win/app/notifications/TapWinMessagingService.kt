package tap.win.app.notifications

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.RingtoneManager
import android.os.Build
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessaging
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import tap.win.app.MainActivity
import tap.win.app.R
import tap.win.app.api.ApiClient
import tap.win.app.api.FcmTokenRequest
import tap.win.app.data.SessionStore

/**
 * FCM service for Tap Win.
 * - Registers the device push token with the backend (POST api/auth/fcm-token).
 * - Displays incoming notifications on the "tapwin_default" channel.
 */
class TapWinMessagingService : FirebaseMessagingService() {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onCreate() {
        super.onCreate()
        createChannel(this)
    }

    /** Called when a new FCM registration token is generated or refreshed. */
    override fun onNewToken(token: String) {
        super.onNewToken(token)
        uploadToken(this, token)
    }

    /** Called when a message is received while the app is in foreground/background. */
    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)

        val title = message.notification?.title
            ?: message.data["title"]
            ?: getString(R.string.app_name)
        val body = message.notification?.body
            ?: message.data["body"]
            ?: message.data["message"]
            ?: ""

        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setSmallIcon(R.drawable.ic_notification)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent)

        if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.O) {
            builder.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION))
        }

        val manager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        // Android 13+ requires POST_NOTIFICATIONS runtime permission; without it
        // notify() is silently dropped, which is acceptable here.
        manager.notify(System.currentTimeMillis().toInt(), builder.build())
    }

    companion object {
        const val CHANNEL_ID = "tapwin_default"

        /**
         * Fetch the current FCM token and upload it to the backend.
         * Safe to call even when Firebase is not configured — failures are ignored.
         */
        fun register(context: Context) {
            try {
                FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
                    if (!task.isSuccessful) return@addOnCompleteListener
                    uploadToken(context, task.result)
                }
            } catch (_: Throwable) {
                // Firebase not available on this build — ignore silently.
            }
        }

        private fun uploadToken(context: Context, token: String) {
            val access = SessionStore(context).accessToken ?: return
            CoroutineScope(Dispatchers.IO).launch {
                runCatching {
                    ApiClient.authApi.uploadFcmToken(
                        auth = "Bearer $access",
                        body = FcmTokenRequest(
                            deviceId = ApiClient.deviceId,
                            pushToken = token,
                        ),
                    )
                }
            }
        }

        private fun createChannel(context: Context) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val manager = context.getSystemService(NOTIFICATION_SERVICE) as NotificationManager
                if (manager.getNotificationChannel(CHANNEL_ID) == null) {
                    val channel = NotificationChannel(
                        CHANNEL_ID,
                        "Tap Win Notifications",
                        NotificationManager.IMPORTANCE_HIGH,
                    ).apply {
                        description = "Push notifications from Tap Win"
                    }
                    manager.createNotificationChannel(channel)
                }
            }
        }
    }
}
