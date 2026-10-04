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
import kotlinx.coroutines.launch
import tap.win.app.api.ApiClient
import tap.win.app.api.AuthResponse
import tap.win.app.data.SessionStore
import tap.win.app.ui.AuthMode
import tap.win.app.ui.AuthScreen
import tap.win.app.ui.HomeScreen
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {

    private lateinit var session: SessionStore

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        session = SessionStore(applicationContext)

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
    val scope = remember { MainScope() }

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
                    session.save(body.tokens.accessToken, body.tokens.refreshToken, body.user.id)
                    auth = body
                    MyApp.startPresence(activity.application)
                } else {
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
                MyApp.stopPresence(activity.application)
                auth = null
                mode = AuthMode.Login
            },
        )
    } else {
        AuthScreen(
            mode = mode,
            onModeChange = { mode = it },
            onAuthenticated = { resp ->
                session.save(resp.tokens.accessToken, resp.tokens.refreshToken, resp.user.id)
                auth = resp
                MyApp.startPresence(activity.application)
            },
        )
    }
}
