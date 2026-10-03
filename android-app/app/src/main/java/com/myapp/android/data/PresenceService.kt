package com.myapp.android.data

import android.app.Service
import android.content.Intent
import android.os.IBinder
import com.myapp.android.api.ApiClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

/**
 * Sends a heartbeat to the backend every 60 seconds while the user is logged in,
 * so the admin dashboard can show whether the account connection is active.
 */
class PresenceService : Service() {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val sessionStore by lazy { SessionStore(applicationContext) }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        scope.launch {
            while (isActive) {
                val token = sessionStore.accessToken
                if (token != null) {
                    runCatching {
                        ApiClient.authApi.heartbeat(
                            auth = "Bearer $token",
                            body = com.myapp.android.api.HeartbeatRequest(
                                deviceId = ApiClient.deviceId,
                                deviceName = ApiClient.deviceName,
                            ),
                        )
                    }
                }
                delay(60_000L)
            }
        }
        return START_STICKY
    }

    override fun onDestroy() {
        scope.cancel()
        super.onDestroy()
    }
}
