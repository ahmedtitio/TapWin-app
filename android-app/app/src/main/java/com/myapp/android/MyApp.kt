package com.myapp.android

import android.app.Application
import android.content.Intent
import com.myapp.android.api.AppContextHolder
import com.myapp.android.data.PresenceService

class MyApp : Application() {
    override fun onCreate() {
        super.onCreate()
        AppContextHolder.context = applicationContext
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
