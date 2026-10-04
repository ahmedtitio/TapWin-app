package tap.win.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.graphics.Color
import tap.win.app.api.ApiClient
import tap.win.app.api.AuthResponse
import tap.win.app.data.SessionStore
import tap.win.app.ui.AuthMode
import tap.win.app.ui.AuthScreen
import tap.win.app.ui.HomeScreen
import androidx.compose.runtime.rememberCoroutineScope
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {

    private lateinit var session: SessionStore

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Global crash guard: any uncaught exception (e.g. a failed secure-storage
        // init or a presence-service start issue) is reported as a readable toast
        // instead of silently force-closing the app.
        val defaultHandler = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { t, e ->
            runCatching {
                android.util.Log.e("TapWin", "Uncaught in ${t.name}", e)
                android.os.Handler(android.os.Looper.getMainLooper()).post {
                    android.widget.Toast.makeText(
                        this,
                        "حدث خطأ غير متوقع: ${e.message ?: e.javaClass.simpleName}",
                        android.widget.Toast.LENGTH_LONG,
                    ).show()
                }
            }
            defaultHandler?.uncaughtException(t, e)
        }

        // EncryptedSharedPreferences can occasionally fail to initialize on some
        // devices; if it does we must not crash — fall back gracefully.
        session = try {
            SessionStore(applicationContext)
        } catch (e: Throwable) {
            android.util.Log.e("TapWin", "SessionStore init failed", e)
            runCatching { SessionStore(applicationContext) }.getOrNull()
                ?: return finish().also {
                    android.widget.Toast.makeText(
                        this, "تعذر تجهيز التخزين الآمن على هذا الجهاز",
                        android.widget.Toast.LENGTH_LONG,
                    ).show()
                }
        }

        setContent {
            MaterialTheme(
                colorScheme = darkColorScheme(
                    primary = Color(0xFF6C4DF6),
                    secondary = Color(0xFF00D4AA),
                    background = Color(0xFF120B33),
                    surface = Color(0xFF1D1445),
                    onBackground = Color.White,
                    onSurface = Color.White,
                ),
                typography = Typography(),
            ) {
                AppNav(session = session, activity = this@MainActivity)
            }
        }
    }
}

@androidx.compose.runtime.Composable
private fun AppNav(session: SessionStore, activity: ComponentActivity) {
    var auth by remember { mutableStateOf<AuthResponse?>(null) }
    var checked by remember { mutableStateOf(false) }
    var mode by remember { mutableStateOf<AuthMode>(AuthMode.Login) }
    val scope = rememberCoroutineScope()

    // Restore session on cold start via refresh token
    if (!checked) {
        checked = true
        if (session.refreshToken != null) {
            scope.launch {
                val res = runCatching {
                    ApiClient.authApi.refresh(
                        tap.win.app.api.RefreshRequest(session.refreshToken!!),
                    )
                }.getOrNull()
                if (res?.isSuccessful == true && res.body() != null) {
                    val body = res.body()!!
                    try {
                        session.save(body.tokens.accessToken, body.tokens.refreshToken, body.user.id.toString())
                        runCatching { MyApp.startPresence(activity.application) }
                        auth = body
                    } catch (e: Throwable) {
                        android.util.Log.e("TapWin", "session restore failed", e)
                        session.clear()
                    }
                } else {
                    // Refresh failed (expired/revoked) -> start clean at the login screen.
                    session.clear()
                }
            }
        }
    }

    val current = auth
    if (current != null) {
        HomeScreen(
            session = session,
            user = current.user,
            onLogout = {
                runCatching { MyApp.stopPresence(activity.application) }
                auth = null
                mode = AuthMode.Login
            },
        )
    } else {
        AuthScreen(
            mode = mode,
            onModeChange = { mode = it },
            onAuthenticated = { resp ->
                // Guard the whole transition: a storage/persistence failure here must
                // show an error instead of force-closing the app right after login.
                try {
                    session.save(resp.tokens.accessToken, resp.tokens.refreshToken, resp.user.id.toString())
                    auth = resp
                    runCatching { MyApp.startPresence(activity.application) }
                } catch (e: Throwable) {
                    android.util.Log.e("TapWin", "post-login transition failed", e)
                    android.widget.Toast.makeText(
                        activity,
                        "تعذر حفظ الجلسة: ${e.message ?: e.javaClass.simpleName}",
                        android.widget.Toast.LENGTH_LONG,
                    ).show()
                }
            },
        )
    }
}
