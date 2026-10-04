package tap.win.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
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
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.foundation.Canvas
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.window.Dialog
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

val Brand = Color(0xFF6C4DF6)
val BrandDark = Color(0xFF2A1E63)
val Accent = Color(0xFF00D4AA)

@Composable
fun GradientBackground(content: @Composable () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Brush.verticalGradient(listOf(BrandDark, Color(0xFF120B33), Color.Black))),
    ) { content() }
}

@Composable
fun ErrorMessage(text: String) {
    Surface(
        color = Color(0xFFFF5470).copy(alpha = 0.12f),
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Text(
            text = text,
            color = Color(0xFFFF8FA3),
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

@Composable
fun GradientButton(
    text: String,
    enabled: Boolean = true,
    loading: Boolean = false,
    onClick: () -> Unit,
) {
    val shape = RoundedCornerShape(16.dp)
    Box(
        modifier = Modifier
            .fillMaxWidth()
            // Soft colored glow behind the button (3D depth effect)
            .shadow(
                elevation = if (enabled && !loading) 14.dp else 0.dp,
                shape = shape,
                ambientColor = Brand.copy(alpha = 0.5f),
                spotColor = Accent.copy(alpha = 0.6f),
            ),
    ) {
        // Darker offset layer to fake physical depth
        Box(
            modifier = Modifier
                .matchParentSize()
                .offset(y = 3.dp)
                .background(Brush.horizontalGradient(listOf(BrandDark, Color(0xFF0A7E66))), shape),
        )
        Button(
            onClick = onClick,
            enabled = enabled && !loading,
            shape = shape,
            contentPadding = PaddingValues(vertical = 14.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = Color.Transparent,
                disabledContentColor = Color.White.copy(alpha = 0.5f),
            ),
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 52.dp),
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        brush = if (enabled) {
                            Brush.horizontalGradient(listOf(Brand, Color(0xFF9B5CF6), Accent))
                        } else {
                            Brush.horizontalGradient(
                                listOf(Color.Gray.copy(alpha = 0.5f), Color.Gray.copy(alpha = 0.35f)),
                            )
                        },
                    ),
                contentAlignment = Alignment.Center,
            ) {
                if (loading) {
                    CircularProgressIndicator(color = Color.White, modifier = Modifier.size(22.dp))
                } else {
                    Text(
                        text = text,
                        fontWeight = FontWeight.ExtraBold,
                        color = Color.White,
                    )
                }
            }
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
                GoogleGLogo(size = 22.dp)
            }
            Spacer(Modifier.width(12.dp))
            Text(
                "المتابعة باستخدام حساب Google",
                fontWeight = FontWeight.Bold,
                fontSize = 15.sp,
                color = Color(0xFF1F1F1F),
            )
        }
    }
}

/**
 * Real vector Google "G" logo (official brand paths) — not an emoji.
 *
 * Drawn with Canvas + androidx.compose.ui.graphics.Path using ONLY stable APIs
 * (moveTo/lineTo/cubicTo/close). This avoids every API that is unavailable or
 * changed on the project's compose-compiler 1.5.14 / Compose UI 1.7.x:
 * no vector.addPath, no PathParser().nodes (private), no Path.copy().
 * Coordinates are pre-computed absolute values from the official SVG path data
 * (viewBox 0..52 x 0..52).
 */
@Composable
fun GoogleGLogo(size: androidx.compose.ui.unit.Dp = 24.dp) {
    val colorRed = Color(0xFFEA4335)
    val colorBlue = Color(0xFF4285F4)
    val colorYellow = Color(0xFFFBBB04)
    val colorGreen = Color(0xFF34A853)

    Canvas(modifier = Modifier.size(size)) {
        val sx = size.width / 52f
        val sy = size.height / 52f

        fun seg(color: Color, block: androidx.compose.ui.graphics.Path.() -> Unit) {
            val p = androidx.compose.ui.graphics.Path().apply(block)
            drawPath(p, color)
        }

        // Red arc (top)
        seg(colorRed) {
            moveTo(25.99f * sx, 9.46f * sy)
            cubicTo(29.41f * sx, 9.46f * sy, 32.49f * sx, 10.64f * sy, 34.91f * sx, 12.95f * sy)
            lineTo(41.55f * sx, 6.31f * sy)
            cubicTo(37.95f * sx, 2.72f * sy, 32.34f * sx, 0f * sy, 25.99f * sx, 0f * sy)
            cubicTo(15.99f * sx, 0f * sy, 7.29f * sx, 6.32f * sy, 3.79f * sx, 15.36f * sy)
            lineTo(11.53f * sx, 21.36f * sy)
            cubicTo(13.71f * sx, 14.84f * sy, 19.94f * sx, 9.46f * sy, 25.99f * sx, 9.46f * sy)
            close()
        }
        // Blue arc (right bar + crossbar)
        seg(colorBlue) {
            moveTo(50.01f * sx, 25.5f * sy)
            cubicTo(50.01f * sx, 23.78f * sy, 49.86f * sx, 22.12f * sy, 49.58f * sx, 20.52f * sy)
            lineTo(25.99f * sx, 20.52f * sy)
            lineTo(25.99f * sx, 29.96f * sy)
            lineTo(39.5f * sx, 29.96f * sy)
            cubicTo(38.91f * sx, 33.09f * sy, 37.14f * sx, 35.74f * sy, 34.47f * sx, 37.52f * sy)
            lineTo(42.2f * sx, 43.52f * sy)
            cubicTo(46.72f * sx, 39.34f * sy, 50.01f * sx, 33.16f * sy, 50.01f * sx, 25.5f * sy)
            close()
        }
        // Yellow arc (left)
        seg(colorYellow) {
            moveTo(11.53f * sx, 28.64f * sy)
            cubicTo(11.03f * sx, 27.24f * sy, 10.71f * sx, 25.68f * sy, 10.71f * sx, 24.04f * sy)
            cubicTo(10.71f * sx, 22.39f * sy, 11.0f * sx, 20.82f * sy, 11.52f * sx, 19.34f * sy)
            lineTo(3.79f * sx, 13.34f * sy)
            cubicTo(2.35f * sx, 16.52f * sy, 1.5f * sx, 20.34f * sy, 1.5f * sx, 24.31f * sy)
            cubicTo(1.5f * sx, 28.28f * sy, 2.35f * sx, 32.1f * sy, 3.79f * sx, 35.28f * sy)
            lineTo(11.53f * sx, 28.64f * sy)
            close()
        }
        // Green arc (bottom)
        seg(colorGreen) {
            moveTo(25.99f * sx, 47.62f * sy)
            cubicTo(32.34f * sx, 47.62f * sy, 37.69f * sx, 45.53f * sy, 41.6f * sx, 41.94f * sy)
            lineTo(33.87f * sx, 35.94f * sy)
            cubicTo(31.77f * sx, 37.35f * sy, 28.98f * sx, 38.19f * sy, 25.99f * sx, 38.19f * sy)
            cubicTo(19.94f * sx, 38.19f * sy, 14.72f * sx, 34.33f * sy, 12.86f * sx, 28.94f * sy)
            lineTo(5.12f * sx, 34.94f * sy)
            cubicTo(8.61f * sx, 43.98f * sy, 17.31f * sx, 47.62f * sy, 25.99f * sx, 47.62f * sy)
            close()
        }
    }
}

/** Extracts the Arabic error message from an API error response. */
fun errorMessage(raw: Response<*>): String {
    return runCatching {
        raw.errorBody()?.let { body ->
            val gson = com.google.gson.Gson()
            val err = gson.fromJson(body.charStream(), ApiError::class.java)
            err.message ?: "حدث خطأ، حاول مرة أخرى"
        } ?: "تعذر الاتصال بالخادم"
    }.getOrDefault("تعذر الاتصال بالخادم")
}

sealed class AuthMode { object Login : AuthMode(); object Register : AuthMode(); object Forgot : AuthMode(); object Verify : AuthMode() }

@Composable
fun AuthScreen(
    mode: AuthMode,
    onModeChange: (AuthMode) -> Unit,
    onAuthenticated: (AuthResponse) -> Unit,
) {
    val appCtx = LocalContext.current.applicationContext
    val onAuthed: (AuthResponse) -> Unit = { resp ->
        // Now that a session exists, upload the FCM push token for this device.
        TapWinMessagingService.register(appCtx)
        onAuthenticated(resp)
    }
    GradientBackground {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(androidx.compose.foundation.rememberScrollState())
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Spacer(Modifier.height(48.dp))
            Icon3D(
                icon = Icons.Filled.Lock,
                colors = listOf(Brand, Color(0xFFB543F5)),
                size = 96,
                rotation = -6f,
            )
            Spacer(Modifier.height(16.dp))
            Text(
                "Tap Win",
                style = MaterialTheme.typography.headlineMedium,
                color = Color.White,
                fontWeight = FontWeight.ExtraBold,
            )
            Text(
                when (mode) {
                    AuthMode.Login -> "سجّل الدخول للمتابعة"
                    AuthMode.Register -> "أنشئ حسابًا جديدًا"
                    AuthMode.Forgot -> "استعادة كلمة السر"
                    AuthMode.Verify -> "تأكيد البريد الإلكتروني"
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

@Composable
private fun LoginForm(onModeChange: (AuthMode) -> Unit, onAuthenticated: (AuthResponse) -> Unit) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(false) }

    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        error?.let { ErrorMessage(it); Spacer(Modifier.height(2.dp)) }
        AuthTextField(email, { email = it }, "البريد الإلكتروني", Icons.Filled.MailOutline,
            keyboardType = androidx.compose.ui.text.input.KeyboardType.Email)
        AuthTextField(password, { password = it }, "كلمة السر", Icons.Filled.Lock, isPassword = true)

        TextButton(onClick = { onModeChange(AuthMode.Forgot) }) {
            Text("نسيت كلمة السر؟", color = Accent)
        }

        GradientButton(text = "تسجيل الدخول", loading = loading, onClick = {
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
                        onAuthenticated(body)
                    }
                } else error = errorMessage(res)
            }
        })
        GoogleSignInButton(onAuthenticated = onAuthenticated, onError = { error = it })
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) {
            Text("ليس لديك حساب؟ ", color = Color.White.copy(alpha = 0.6f))
            TextButton(onClick = { onModeChange(AuthMode.Register) }) {
                Text("إنشاء حساب", color = Brand, fontWeight = FontWeight.Bold)
            }
        }
    }
}

/** Holds the freshly-created account's session until email verification passes. */
private var pendingVerify: AuthResponse? = null

@Composable
private fun RegisterForm(onModeChange: (AuthMode) -> Unit, onAuthenticated: (AuthResponse) -> Unit) {
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
        AuthTextField(name, { name = it }, "الاسم الكامل", Icons.Filled.Person)
        AuthTextField(username, { username = it }, "اسم المستخدم", Icons.Filled.Person)
        AuthTextField(email, { email = it }, "البريد الإلكتروني", Icons.Filled.MailOutline,
            keyboardType = androidx.compose.ui.text.input.KeyboardType.Email)
        AuthTextField(phone, { phone = it }, "رقم الهاتف (اختياري)", Icons.Filled.Phone,
            keyboardType = androidx.compose.ui.text.input.KeyboardType.Phone)
        AuthTextField(password, { password = it }, "كلمة السر", Icons.Filled.Lock, isPassword = true)
        AuthTextField(confirm, { confirm = it }, "تأكيد كلمة السر", Icons.Filled.Lock, isPassword = true)

        GradientButton(text = "إنشاء الحساب", loading = loading, onClick = {
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
                    // New accounts must confirm the emailed code before entering the dashboard.
                    pendingVerify = res.body()!!
                    onModeChange(AuthMode.Verify)
                } else error = errorMessage(res)
            }
            } else error = "كلمتا السر غير متطابقتين"
        })
        GoogleSignInButton(onAuthenticated = onAuthenticated, onError = { error = it })
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) {
            Text("لديك حساب بالفعل؟ ", color = Color.White.copy(alpha = 0.6f))
            TextButton(onClick = { onModeChange(AuthMode.Login) }) {
                Text("تسجيل الدخول", color = Brand, fontWeight = FontWeight.Bold)
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
            AuthTextField(email, { email = it }, "البريد الإلكتروني", Icons.Filled.MailOutline,
                keyboardType = androidx.compose.ui.text.input.KeyboardType.Email)
            GradientButton(text = "إرسال رمز التحقق", loading = loading, onClick = {
                loading = true; error = null; info = null
                kotlinx.coroutines.MainScope().launch {
                    val res = ApiClient.authApi.forgotPassword(ForgotRequest(email.trim()))
                    loading = false
                    if (res.isSuccessful && res.body() != null) {
                        Analytics.passwordResetRequested()
                        step = 1
                        info = res.body()!!.message
                            ?: "أرسلنا رمز تحقق مكونًا من 6 أرقام إلى بريدك الإلكتروني، صالح لمدة 15 دقيقة."
                    } else error = errorMessage(res)
                }
            })
        } else {
            AuthTextField(code, { code = it }, "رمز التحقق (6 أرقام)", Icons.Filled.Lock,
                keyboardType = androidx.compose.ui.text.input.KeyboardType.NumberPassword)
            AuthTextField(newPass, { newPass = it }, "كلمة السر الجديدة", Icons.Filled.Lock, isPassword = true)
            AuthTextField(confirm, { confirm = it }, "تأكيد كلمة السر", Icons.Filled.Lock, isPassword = true)
            GradientButton(text = "تعيين كلمة السر", loading = loading, onClick = {
                if (code.isBlank()) { error = "أدخل رمز التحقق الذي وصلك بالبريد"; return@GradientButton }
                if (newPass != confirm) { error = "كلمتا السر غير متطابقتين"; return@GradientButton }
                loading = true; error = null
                kotlinx.coroutines.MainScope().launch {
                    val res = ApiClient.authApi.resetPassword(ResetRequest(code.trim(), newPass))
                    loading = false
                    if (res.isSuccessful) {
                        info = "تم تغيير كلمة السر بنجاح، يمكنك تسجيل الدخول الآن."
                        step = 0
                        code = ""; newPass = ""; confirm = ""
                    } else error = errorMessage(res)
                }
            })
            TextButton(onClick = { step = 0; info = null; error = null }) {
                Text("إعادة إرسال الرمز / تغيير البريد", color = Accent)
            }
        }
        TextButton(onClick = { onModeChange(AuthMode.Login) }) {
            Text("العودة لتسجيل الدخول", color = Accent)
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
        Text("أرسلنا رمز تحقق إلى ${'$'}{pending.user.email}", color = Color.White.copy(alpha = 0.75f))
        // When no email provider (RESEND_API_KEY) is configured, the backend returns the code
        // directly for testing — surface it here so verification can be completed.
        pending.dev_code?.let {
            info = "وضع الاختبار: رمز التحقق الخاص بك هو $it"
        }
        AuthTextField(code, { code = it }, "رمز التحقق (6 أرقام)", Icons.Filled.Lock,
            keyboardType = androidx.compose.ui.text.input.KeyboardType.NumberPassword)
        GradientButton(text = "تأكيد الحساب والدخول", loading = loading, onClick = {
            if (code.length != 6) { error = "أدخل الرمز المكون من 6 أرقام"; return@GradientButton }
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
        GradientButton(text = "إعادة إرسال الرمز", enabled = !loading, onClick = {
            kotlinx.coroutines.MainScope().launch {
                runCatching {
                    ApiClient.authApi.resendVerification("Bearer ${'$'}{pending.tokens.accessToken}")
                }
                info = "تم إرسال رمز جديد إلى بريدك الإلكتروني."
            }
        })
        TextButton(onClick = {
            pendingVerify = null
            onModeChange(AuthMode.Login)
        }) {
            Text("العودة لتسجيل الدخول", color = Accent)
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
                onFailure = { onError(it.message ?: "فشل تسجيل الدخول بحساب Google") },
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
        shape = RoundedCornerShape(14.dp),
        colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(alpha = 0.25f)),
        modifier = Modifier
            .fillMaxWidth()
            .height(52.dp),
    ) {
        if (loading) {
            CircularProgressIndicator(color = Brand, modifier = Modifier.size(20.dp))
        } else {
            Icon(Icons.Filled.MailOutline, contentDescription = null, tint = Color(0xFFEA4335))
            Spacer(Modifier.width(10.dp))
            Text("المتابعة باستخدام حساب Google", fontWeight = FontWeight.SemiBold)
        }
    }
}
