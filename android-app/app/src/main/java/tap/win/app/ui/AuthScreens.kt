package tap.win.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.MailOutline
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.foundation.Image
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.window.Dialog
import tap.win.app.R
import tap.win.app.api.ApiError
import tap.win.app.api.ApiClient
import tap.win.app.api.AuthResponse
import tap.win.app.api.ForgotRequest
import tap.win.app.api.LoginRequest
import tap.win.app.api.RegisterRequest
import tap.win.app.api.ResetRequest
import tap.win.app.api.VerifyEmailRequest
import tap.win.app.notifications.TapWinMessagingService
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import android.app.Activity
import android.content.ContextWrapper
import androidx.compose.runtime.rememberCoroutineScope
import kotlinx.coroutines.launch
import tap.win.app.util.Analytics
import tap.win.app.util.GoogleSignInHelper
import retrofit2.Response

val Brand = Color.White
val BrandDark = Color(0xFF1A1A1A)
val Accent = Color.White
// Monochrome theme tokens: pure black background, white text, glass surfaces.
val GlassSurface = Color(0xFF141414)          // card / sheet fill
val GlassBorder = Color(0x33FFFFFF)           // 20% white hairline
val GlassFill = Color(0x14FFFFFF)             // 8% white frosted fill

@Composable
fun GradientBackground(content: @Composable () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            // Solid black background — no gradients anywhere in the app.
            .background(Color.Black),
    ) { content() }
}

@Composable
fun ErrorMessage(text: String) {
    Surface(
        color = GlassFill,
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Text(
            text = text,
            color = Color.White,
            style = MaterialTheme.typography.bodyMedium,
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
        )
    }
}

@Composable
fun AuthTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    isPassword: Boolean = false,
    keyboardType: androidx.compose.ui.text.input.KeyboardType =
        androidx.compose.ui.text.input.KeyboardType.Text,
) {
    var visible by remember { mutableStateOf(false) }
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label) },
        leadingIcon = { Icon(icon, contentDescription = null, tint = Brand.copy(alpha = 0.9f)) },
        trailingIcon = {
            if (isPassword) {
                IconButton(onClick = { visible = !visible }) {
                    Icon(
                        if (visible) Icons.Filled.VisibilityOff else Icons.Filled.Visibility,
                        contentDescription = null,
                    )
                }
            }
        },
        visualTransformation = when {
            !isPassword -> androidx.compose.ui.text.input.VisualTransformation.None
            visible -> androidx.compose.ui.text.input.VisualTransformation.None
            else -> androidx.compose.ui.text.input.PasswordVisualTransformation()
        },
        keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(
            keyboardType = keyboardType,
        ),
        singleLine = true,
        shape = RoundedCornerShape(14.dp),
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = Brand,
            unfocusedBorderColor = Color.White.copy(alpha = 0.15f),
            focusedLabelColor = Brand,
            cursorColor = Brand,
        ),
        modifier = Modifier.fillMaxWidth(),
    )
}

/**
 * UNIFIED SOLID-COLOR PRIMARY BUTTON.
 * Single flat brand color — no gradients, no stacked/overlapping layers.
 * Every primary action in the app routes through this one component so all
 * buttons share identical size (52dp), corner radius (16dp) and typography.
 */
@Composable
fun GradientButton(
    text: String,
    enabled: Boolean = true,
    loading: Boolean = false,
    onClick: () -> Unit,
) {
    Button(
        onClick = onClick,
        enabled = enabled && !loading,
        shape = RoundedCornerShape(16.dp),
        contentPadding = PaddingValues(vertical = 14.dp),
        elevation = ButtonDefaults.buttonElevation(
            defaultElevation = 2.dp, pressedElevation = 4.dp, disabledElevation = 0.dp,
        ),
        colors = ButtonDefaults.buttonColors(
            containerColor = Color.White,
            contentColor = Color.Black,
            disabledContainerColor = Color.White.copy(alpha = 0.12f),
            disabledContentColor = Color.White.copy(alpha = 0.45f),
        ),
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 52.dp),
    ) {
        if (loading) {
            CircularProgressIndicator(color = Color.Black, modifier = Modifier.size(22.dp))
        } else {
            Text(text = text, fontWeight = FontWeight.Bold, fontSize = 16.sp)
        }
    }
}

/** Unified SECONDARY button: flat outline style, same size/shape as primary. */
@Composable
fun OutlineButton(
    text: String,
    enabled: Boolean = true,
    loading: Boolean = false,
    onClick: () -> Unit,
) {
    OutlinedButton(
        onClick = onClick,
        enabled = enabled && !loading,
        shape = RoundedCornerShape(16.dp),
        border = androidx.compose.foundation.BorderStroke(1.5.dp, Brand),
        contentPadding = PaddingValues(vertical = 14.dp),
        colors = ButtonDefaults.outlinedButtonColors(contentColor = Brand),
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 52.dp),
    ) {
        if (loading) {
            CircularProgressIndicator(color = Brand, modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
        } else {
            Text(text = text, fontWeight = FontWeight.Bold, fontSize = 15.sp)
        }
    }
}

/** White "Continue with Google" button with the official multi-color G mark. */
@Composable
fun GoogleGradientButton(
    enabled: Boolean = true,
    loading: Boolean = false,
    onClick: () -> Unit,
) {
    val shape = RoundedCornerShape(16.dp)
    Surface(
        onClick = onClick,
        enabled = enabled && !loading,
        shape = shape,
        color = Color.White,
        tonalElevation = 2.dp,
        shadowElevation = 10.dp,
        border = androidx.compose.foundation.BorderStroke(
            1.dp, Color.White.copy(alpha = 0.85f),
        ),
        modifier = Modifier
            .fillMaxWidth()
            .height(52.dp)
            .alpha(if (enabled && !loading) 1f else 0.55f),
    ) {
        Row(
            modifier = Modifier.fillMaxSize(),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (loading) {
                CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp, color = Brand)
            } else {
                Image(
                    painter = painterResource(id = R.drawable.ic_google_logo),
                    contentDescription = "Google",
                    modifier = Modifier.size(22.dp),
                )
            }
            Spacer(Modifier.width(12.dp))
            Text(
                tap.win.app.ui.S.continueGoogle(),
                fontWeight = FontWeight.Bold,
                fontSize = 15.sp,
                color = Color(0xFF1F1F1F),
            )
        }
    }
}

/**
 * Real multi-color Google "G" logo — NOT an emoji.
 *
 * FINAL STABLE IMPLEMENTATION: a genuine Android VectorDrawable XML resource
 * (res/drawable/ic_google_logo.xml, official brand path data) rendered via
 * painterResource(). This avoids ALL Compose vector DSL APIs entirely
 * (ImageVector.Builder / PathParser / Canvas math), which have proven
 * version-fragile in this project's build pipeline.
 */
@Composable
fun GoogleGLogo(size: androidx.compose.ui.unit.Dp = 24.dp) {
    Image(
        painter = painterResource(id = R.drawable.ic_google_logo),
        contentDescription = "Google",
        modifier = Modifier.size(size),
    )
}

/** Extracts the Arabic error message from an API error response. */
fun errorMessage(raw: Response<*>): String {
    return runCatching {
        raw.errorBody()?.let { body ->
            val gson = com.google.gson.Gson()
            val err = gson.fromJson(body.charStream(), ApiError::class.java)
            err.message ?: tap.win.app.ui.S.genericError()
        } ?: tap.win.app.ui.S.serverUnreachable()
    }.getOrDefault(tap.win.app.ui.S.serverUnreachable())
}

sealed class AuthMode { object Login : AuthMode(); object Register : AuthMode(); object Forgot : AuthMode(); object Verify : AuthMode() }

/** Floating language toggle (عربي/English) shown on every auth screen. */
@Composable
fun LanguageToggle(modifier: Modifier = Modifier) {
    val ctx = LocalContext.current
    OutlinedButton(
        onClick = {
            val next = if (tap.win.app.util.I18n.english()) tap.win.app.util.I18n.LANG_AR else tap.win.app.util.I18n.LANG_EN
            tap.win.app.util.I18n.set(ctx, next)
            (ctx as? android.app.Activity)?.recreate()
        },
        shape = RoundedCornerShape(14.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, GlassBorder),
        colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White),
        modifier = modifier,
    ) {
        Text(if (tap.win.app.util.I18n.english()) "العربية" else "English", fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
fun AuthScreen(
    mode: AuthMode,
    onModeChange: (AuthMode) -> Unit,
    onAuthenticated: (AuthResponse) -> Unit,
) {
    val activity = LocalContext.current
    val appCtx = activity.applicationContext
    val onAuthed: (AuthResponse) -> Unit = { resp ->
        // Now that a session exists, upload the FCM push token for this device.
        TapWinMessagingService.register(appCtx)
        if (resp.isNewUser) {
            android.widget.Toast.makeText(activity, S.googleWelcome(),
                android.widget.Toast.LENGTH_LONG).show()
        }
        onAuthenticated(resp)
    }
    GradientBackground {
        Box(Modifier.fillMaxSize()) {
        // Language toggle pinned to the top-end corner of every auth screen.
        LanguageToggle(
            modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(top = 18.dp, end = 18.dp),
        )
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(androidx.compose.foundation.rememberScrollState())
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Spacer(Modifier.height(48.dp))
            Image(
                painter = painterResource(id = R.drawable.ic_app_logo),
                contentDescription = S.appName(),
                modifier = Modifier.size(96.dp),
            )
            Spacer(Modifier.height(16.dp))
            Text(
                S.appName(),
                style = MaterialTheme.typography.headlineMedium,
                color = Color.White,
                fontWeight = FontWeight.ExtraBold,
            )
            Text(
                when (mode) {
                    AuthMode.Login -> S.loginTitle()
                    AuthMode.Register -> S.registerTitle()
                    AuthMode.Forgot -> S.forgotTitle()
                    AuthMode.Verify -> S.verifyTitle()
                },
                color = Color.White.copy(alpha = 0.6f),
            )
            Spacer(Modifier.height(28.dp))

            when (mode) {
                AuthMode.Login -> LoginForm(onModeChange, onAuthed)
                AuthMode.Register -> RegisterForm(onModeChange, onAuthed)
                AuthMode.Forgot -> ForgotForm(onModeChange)
                AuthMode.Verify -> VerifyForm(onModeChange, onAuthed)
            }
        }
    }
    }
}

@Composable
private fun LoginForm(onModeChange: (AuthMode) -> Unit, onAuthenticated: (AuthResponse) -> Unit) {
    val ctx = LocalContext.current
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(false) }

    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        error?.let { ErrorMessage(it); Spacer(Modifier.height(2.dp)) }
        AuthTextField(email, { email = it }, S.email(), Icons.Filled.MailOutline,
            keyboardType = androidx.compose.ui.text.input.KeyboardType.Email)
        AuthTextField(password, { password = it }, S.password(), Icons.Filled.Lock, isPassword = true)

        TextButton(onClick = { onModeChange(AuthMode.Forgot) }) {
            Text(S.forgotPassword(), color = Accent)
        }

        GradientButton(text = S.signIn(), loading = loading, onClick = {
            loading = true; error = null
            kotlinx.coroutines.MainScope().launch {
                val res = ApiClient.authApi.login(
                    LoginRequest(email.trim(), password, deviceId = ApiClient.deviceId, deviceName = ApiClient.deviceName),
                )
                loading = false
                if (res.isSuccessful && res.body() != null) {
                    Analytics.login("password")
                    val body = res.body()!!
                    // Unverified account -> route through the OTP screen first.
                    if (!body.emailVerified) {
                        pendingVerify = body
                        onModeChange(AuthMode.Verify)
                    } else {
                        android.widget.Toast.makeText(ctx,
                            S.welcomeBack(), android.widget.Toast.LENGTH_SHORT).show()
                        onAuthenticated(body)
                    }
                } else error = errorMessage(res)
            }
        })
        GoogleSignInButton(onAuthenticated = onAuthenticated, onError = { error = it })
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) {
            Text(S.noAccount(), color = Color.White.copy(alpha = 0.6f))
            TextButton(onClick = { onModeChange(AuthMode.Register) }) {
                Text(S.createAccount(), color = Brand, fontWeight = FontWeight.Bold)
            }
        }
    }
}

/** Holds the freshly-created account's session until email verification passes. */
private var pendingVerify: AuthResponse? = null

@Composable
private fun RegisterForm(onModeChange: (AuthMode) -> Unit, onAuthenticated: (AuthResponse) -> Unit) {
    val ctx = LocalContext.current
    var name by remember { mutableStateOf("") }
    var username by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var confirm by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(false) }

    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        error?.let { ErrorMessage(it) }
        AuthTextField(name, { name = it }, S.fullName(), Icons.Filled.Person)
        AuthTextField(username, { username = it }, S.username(), Icons.Filled.Person)
        AuthTextField(email, { email = it }, S.email(), Icons.Filled.MailOutline,
            keyboardType = androidx.compose.ui.text.input.KeyboardType.Email)
        AuthTextField(phone, { phone = it }, S.phoneOptional(), Icons.Filled.Phone,
            keyboardType = androidx.compose.ui.text.input.KeyboardType.Phone)
        AuthTextField(password, { password = it }, S.password(), Icons.Filled.Lock, isPassword = true)
        AuthTextField(confirm, { confirm = it }, S.confirmPassword(), Icons.Filled.Lock, isPassword = true)

        GradientButton(text = S.signUp(), loading = loading, onClick = {
            if (password == confirm) {
            loading = true; error = null
            kotlinx.coroutines.MainScope().launch {
                val res = ApiClient.authApi.register(
                    RegisterRequest(
                        fullName = name.trim(),
                        username = username.trim(),
                        email = email.trim(),
                        phone = phone.trim().ifBlank { null },
                        password = password,
                        deviceId = ApiClient.deviceId,
                        deviceName = ApiClient.deviceName,
                    ),
                )
                loading = false
                if (res.isSuccessful && res.body() != null) {
                    Analytics.register()
                    android.widget.Toast.makeText(ctx, S.accountCreated(),
                        android.widget.Toast.LENGTH_SHORT).show()
                    // New accounts must confirm the emailed code before entering the dashboard.
                    pendingVerify = res.body()!!
                    onModeChange(AuthMode.Verify)
                } else error = errorMessage(res)
            }
            } else error = S.passwordMismatch()
        })
        GoogleSignInButton(onAuthenticated = onAuthenticated, onError = { error = it })
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) {
            Text(S.haveAccount(), color = Color.White.copy(alpha = 0.6f))
            TextButton(onClick = { onModeChange(AuthMode.Login) }) {
                Text(S.signIn(), color = Brand, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
private fun ForgotForm(onModeChange: (AuthMode) -> Unit) {
    var step by remember { mutableStateOf(0) } // 0: request code, 1: enter code + new password
    var email by remember { mutableStateOf("") }
    var code by remember { mutableStateOf("") }
    var newPass by remember { mutableStateOf("") }
    var confirm by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var info by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(false) }

    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        error?.let { ErrorMessage(it) }
        info?.let {
            Surface(color = Accent.copy(alpha = 0.12f), shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth()) {
                Text(it, color = Accent, modifier = Modifier.padding(14.dp), textAlign = TextAlign.Start)
            }
        }
        if (step == 0) {
            AuthTextField(email, { email = it }, S.email(), Icons.Filled.MailOutline,
                keyboardType = androidx.compose.ui.text.input.KeyboardType.Email)
            GradientButton(text = S.sendCode(), loading = loading, onClick = {
                loading = true; error = null; info = null
                kotlinx.coroutines.MainScope().launch {
                    val res = ApiClient.authApi.forgotPassword(ForgotRequest(email.trim()))
                    loading = false
                    if (res.isSuccessful && res.body() != null) {
                        Analytics.passwordResetRequested()
                        step = 1
                        info = res.body()!!.message
                            ?: S.sentCodeTo("")
                    } else error = errorMessage(res)
                }
            })
        } else {
            AuthTextField(code, { code = it }, S.otpCode(), Icons.Filled.Lock,
                keyboardType = androidx.compose.ui.text.input.KeyboardType.NumberPassword)
            AuthTextField(newPass, { newPass = it }, S.newPassword(), Icons.Filled.Lock, isPassword = true)
            AuthTextField(confirm, { confirm = it }, S.confirmPassword(), Icons.Filled.Lock, isPassword = true)
            GradientButton(text = S.setPassword(), loading = loading, onClick = {
                if (code.isBlank()) { error = S.enterOtp(); return@GradientButton }
                if (newPass != confirm) { error = S.passwordMismatch(); return@GradientButton }
                loading = true; error = null
                kotlinx.coroutines.MainScope().launch {
                    val res = ApiClient.authApi.resetPassword(ResetRequest(code.trim(), newPass))
                    loading = false
                    if (res.isSuccessful) {
                        info = S.resetDone()
                        step = 0
                        code = ""; newPass = ""; confirm = ""
                    } else error = errorMessage(res)
                }
            })
            TextButton(onClick = { step = 0; info = null; error = null }) {
                Text(S.resendChangeEmail(), color = Accent)
            }
        }
        TextButton(onClick = { onModeChange(AuthMode.Login) }) {
            Text(S.backToLogin(), color = Accent)
        }
    }
}

@Composable
private fun VerifyForm(onModeChange: (AuthMode) -> Unit, onAuthenticated: (AuthResponse) -> Unit) {
    val pending = pendingVerify
    if (pending == null) { onModeChange(AuthMode.Register); return }
    var code by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var info by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(false) }

    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        error?.let { ErrorMessage(it) }
        info?.let {
            Surface(color = Accent.copy(alpha = 0.12f), shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth()) {
                Text(it, color = Accent, modifier = Modifier.padding(14.dp), textAlign = TextAlign.Start)
            }
        }
        Text(
            S.sentCodeTo(pending.user.email),
            color = Color.White.copy(alpha = 0.85f),
            fontSize = 14.sp,
            textAlign = TextAlign.Start,
            modifier = Modifier.fillMaxWidth(),
        )
        // When no email provider (RESEND_API_KEY) is configured, the backend returns the code
        // directly for testing — surface it here so verification can be completed.
        pending.dev_code?.let {
            info = "${S.devModeCode()} $it"
        }
        AuthTextField(code, { code = it }, S.otpCode(), Icons.Filled.Lock,
            keyboardType = androidx.compose.ui.text.input.KeyboardType.NumberPassword)
        GradientButton(text = S.confirmAccount(), loading = loading, onClick = {
            if (code.length != 6) { error = S.enterOtp6(); return@GradientButton }
            loading = true; error = null
            kotlinx.coroutines.MainScope().launch {
                val res = ApiClient.authApi.verifyEmail(
                    VerifyEmailRequest(pending.tokens.accessToken, code.trim()),
                )
                loading = false
                if (res.isSuccessful) {
                    pendingVerify = null
                    Analytics.verifyEmail()
                    onAuthenticated(pending)
                } else error = errorMessage(res)
            }
        })
        OutlineButton(text = S.resendCode(), enabled = !loading, onClick = {
            kotlinx.coroutines.MainScope().launch {
                runCatching {
                    ApiClient.authApi.resendVerification("Bearer ${'$'}{pending.tokens.accessToken}")
                }
                info = S.sentNewCode()
            }
        })
        TextButton(onClick = {
            pendingVerify = null
            onModeChange(AuthMode.Login)
        }) {
            Text(S.backToLogin(), color = Accent)
        }
    }
}


/** "Continue with Google" button backed by Firebase Auth + our backend exchange. */
private fun android.content.Context.findActivity(): Activity? {
    var ctx: android.content.Context = this
    while (ctx is ContextWrapper) {
        if (ctx is Activity) return ctx
        ctx = ctx.baseContext
    }
    return null
}

@Composable
fun GoogleSignInButton(
    onAuthenticated: (AuthResponse) -> Unit,
    onError: (String) -> Unit,
) {
    if (!GoogleSignInHelper.isEnabled) return // hidden until GOOGLE_WEB_CLIENT_ID is provided
    val activity = LocalContext.current.findActivity() ?: return
    var loading by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    // Shared handler for both launchers (IntentSender flow + classic account-picker flow).
    fun handleGoogleResult(data: android.content.Intent?) {
        scope.launch {
            loading = false
            GoogleSignInHelper.finishSignIn(activity, data).fold(
                onSuccess = { onAuthenticated(it) },
                onFailure = { onError(it.message ?: tap.win.app.ui.S.googleFail()) },
            )
        }
    }

    // Registry launcher: receives the Google picker result and finishes sign-in.
    val launcher = rememberLauncherForActivityResult(
        ActivityResultContracts.StartIntentSenderForResult(),
    ) { result -> handleGoogleResult(result.data) }

    // Classic GoogleSignIn account-picker fallback returns a plain activity result Intent.
    val accountLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.StartActivityForResult(),
    ) { result -> handleGoogleResult(result.data) }

    OutlinedButton(
        onClick = {
            loading = true
            scope.launch {
                val launched = GoogleSignInHelper.launchPicker(activity, launcher, accountLauncher)
                if (!launched) loading = false
            }
        },
        shape = RoundedCornerShape(16.dp),
        colors = ButtonDefaults.outlinedButtonColors(
            containerColor = Color.White,
            contentColor = Color(0xFF1F1F1F),
        ),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(alpha = 0.85f)),
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 52.dp)
            .alpha(if (loading) 0.7f else 1f),
    ) {
        if (loading) {
            CircularProgressIndicator(color = Brand, modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
        } else {
            Image(
                painter = painterResource(id = R.drawable.ic_google_logo),
                contentDescription = "Google",
                modifier = Modifier.size(20.dp),
            )
            Spacer(Modifier.width(10.dp))
            Text(tap.win.app.ui.S.continueGoogle(), fontWeight = FontWeight.Bold, fontSize = 15.sp)
        }
    }
}
