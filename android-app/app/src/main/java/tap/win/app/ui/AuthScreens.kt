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
            containerColor = Brand,
            contentColor = Color.White,
            disabledContainerColor = Color.White.copy(alpha = 0.12f),
            disabledContentColor = Color.White.copy(alpha = 0.45f),
        ),
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 52.dp),
    ) {
        if (loading) {
            CircularProgressIndicator(color = Color.White, modifier = Modifier.size(22.dp))
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
                "المتابعة باستخدام حساب Google",
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
        Text(
            "أرسلنا رمز تحقق مكوّنًا من 6 أرقام إلى بريدك الإلكتروني (${pending.user.email})، صالح لمدة 15 دقيقة.",
            color = Color.White.copy(alpha = 0.85f),
            fontSize = 14.sp,
            textAlign = TextAlign.Start,
            modifier = Modifier.fillMaxWidth(),
        )
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
        OutlineButton(text = "إعادة إرسال الرمز", enabled = !loading, onClick = {
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
        shape = RoundedCornerShape(16.dp),
        colors = ButtonDefaults.outlinedButtonColors(
            containerColor = Color.White,
            contentColor = Color(0xFF1F1F1F),
        ),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(alpha = 0.85f)),
        elevation = ButtonDefaults.outlinedButtonElevation(defaultElevation = 2.dp),
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
            Text("المتابعة باستخدام حساب Google", fontWeight = FontWeight.Bold, fontSize = 15.sp)
        }
    }
}
