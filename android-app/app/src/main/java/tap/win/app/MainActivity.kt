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
import androidx.compose.ui.text.font.FontWeight
import tap.win.app.api.ApiClient
import tap.win.app.api.AuthResponse
import tap.win.app.data.SessionStore
import tap.win.app.ui.AuthMode
import tap.win.app.ui.AuthScreen
import tap.win.app.ui.HomeScreen
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
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

        // Wrap the entire UI attach in a guard: if anything throws during the
        // first composition (e.g. missing resource), show an Arabic error and
        // exit cleanly instead of the system "app keeps stopping" dialog.
        try {
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
        } catch (e: Throwable) {
            android.util.Log.e("TapWin", "UI init failed", e)
            android.widget.Toast.makeText(
                this,
                "تعذر تشغيل الواجهة: ${e.message ?: e.javaClass.simpleName}",
                android.widget.Toast.LENGTH_LONG,
            ).show()
            finish()
        }
    }
}

/** Branded splash shown while a saved session is being restored. */
@androidx.compose.runtime.Composable
private fun SessionSplash() {
    // Gentle pulse for the logo while refresh runs. Uses only APIs that exist
    // in every Compose release: animateFloatAsState + remember/LaunchedEffect
    // state flip (rememberAnimatable is NOT available in this project's version).
    var pulseTarget by remember { mutableStateOf(false) }
    androidx.compose.runtime.LaunchedEffect(Unit) {
        while (true) {
            kotlinx.coroutines.delay(1100L)
            pulseTarget = !pulseTarget
        }
    }
    val pulseValue = androidx.compose.animation.core.animateFloatAsState(
        targetValue = if (pulseTarget) 1f else 0f,
        animationSpec = androidx.compose.animation.core.tween(durationMillis = 1100),
    )
    val scale = 0.92f + 0.08f * pulseValue.value

    Surface(
        color = Color(0xFF120B33),
        modifier = Modifier.fillMaxSize(),
    ) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center,
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                // App logo: plain vector drawable (never a mipmap painter — those
                // threw Resources$NotFoundException on some devices).
                Image(
                    painter = painterResource(id = tap.win.app.R.drawable.ic_app_logo),
                    contentDescription = "Tap Win",
                    modifier = Modifier
                        .size(96.dp)
                        .graphicsLayer {
                            scaleX = scale
                            scaleY = scale
                        },
                )
                Spacer(Modifier.height(14.dp))
                Text(
                    "Tap Win",
                    color = Color.White,
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 26.sp,
                )
                Spacer(Modifier.height(24.dp))
                CircularProgressIndicator(
                    color = Color(0xFF6C4DF6),
                    trackColor = Color.White.copy(alpha = 0.15f),
                    strokeWidth = 3.dp,
                    modifier = Modifier.size(30.dp),
                )
                Spacer(Modifier.height(14.dp))
                Text(
                    "جارٍ استعادة جلستك…",
                    color = Color.White.copy(alpha = 0.75f),
                    fontSize = 14.sp,
                )
            }
        }
    }
}

@androidx.compose.runtime.Composable
private fun AppNav(session: SessionStore, activity: ComponentActivity) {
    var auth by remember { mutableStateOf<AuthResponse?>(null) }
    var checked by remember { mutableStateOf(false) }
    var restoring by remember { mutableStateOf(session.refreshToken != null) }
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
                    // Network hiccup: keep the stored refresh token so the NEXT launch
                    // can still restore the session directly instead of bouncing the
                    // user through the login screen. Only clear on an explicit auth
                    // rejection (401/403 = expired/revoked refresh token).
                    val code = res?.code()
                    if (code == 401 || code == 403) session.clear()
                }
                restoring = false
            }
        }
    }

    val current = auth
    when {
        current != null -> HomeScreen(
            session = session,
            user = current.user,
            onLogout = {
                runCatching { MyApp.stopPresence(activity.application) }
                auth = null
                mode = AuthMode.Login
            },
        )
        // A saved session exists and is being validated: show a neutral splash
        // instead of flashing the login screen first.
        restoring -> SessionSplash()
        else -> AuthScreen(
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
