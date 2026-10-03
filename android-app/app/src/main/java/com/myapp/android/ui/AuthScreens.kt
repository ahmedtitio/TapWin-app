package com.myapp.android.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import com.myapp.android.api.ApiError
import com.myapp.android.api.ApiClient
import com.myapp.android.api.AuthResponse
import com.myapp.android.api.ForgotRequest
import com.myapp.android.api.LoginRequest
import com.myapp.android.api.RegisterRequest
import com.myapp.android.api.ResetRequest
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
    onClick: () -> Unit,
    enabled: Boolean = true,
    loading: Boolean = false,
) {
    Button(
        onClick = onClick,
        enabled = enabled && !loading,
        shape = RoundedCornerShape(14.dp),
        contentPadding = Modifier.height(0.dp).let { PaddingValues(vertical = 14.dp) },
        colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent),
        modifier = Modifier
            .fillMaxWidth()
            .height(52.dp),
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Brush.horizontalGradient(listOf(Brand, Accent))),
            contentAlignment = Alignment.Center,
        ) {
            if (loading) {
                CircularProgressIndicator(color = Color.White, modifier = Modifier.size(22.dp))
            } else {
                Text(text, fontWeight = FontWeight.Bold, color = Color.White)
            }
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

sealed class AuthMode { object Login : AuthMode(); object Register : AuthMode(); object Forgot : AuthMode() }

@Composable
fun AuthScreen(
    mode: AuthMode,
    onModeChange: (AuthMode) -> Unit,
    onAuthenticated: (AuthResponse) -> Unit,
) {
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
                "تطبيقي",
                style = MaterialTheme.typography.headlineMedium,
                color = Color.White,
                fontWeight = FontWeight.ExtraBold,
            )
            Text(
                when (mode) {
                    AuthMode.Login -> "سجّل الدخول للمتابعة"
                    AuthMode.Register -> "أنشئ حسابًا جديدًا"
                    AuthMode.Forgot -> "استعادة كلمة السر"
                },
                color = Color.White.copy(alpha = 0.6f),
            )
            Spacer(Modifier.height(28.dp))

            when (mode) {
                AuthMode.Login -> LoginForm(onModeChange, onAuthenticated)
                AuthMode.Register -> RegisterForm(onModeChange, onAuthenticated)
                AuthMode.Forgot -> ForgotForm(onModeChange)
            }
        }
    }
}

private fun android.content.Context? /* not used */ placeholder() {}

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

        GradientButton(text = "تسجيل الدخول", loading = loading) {
            loading = true; error = null
            kotlinx.coroutines.MainScope().launch {
                val res = ApiClient.authApi.login(
                    LoginRequest(email.trim(), password, deviceId = ApiClient.deviceId, deviceName = ApiClient.deviceName),
                )
                loading = false
                if (res.isSuccessful && res.body() != null) onAuthenticated(res.body()!!)
                else error = errorMessage(res)
            }
        }
        Row(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
            Text("ليس لديك حساب؟ ", color = Color.White.copy(alpha = 0.6f))
            TextButton(onClick = { onModeChange(AuthMode.Register) }) {
                Text("إنشاء حساب", color = Brand, fontWeight = FontWeight.Bold)
            }
        }
    }
}

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

        GradientButton(text = "إنشاء الحساب", loading = loading) {
            if (password != confirm) { error = "كلمتا السر غير متطابقتين"; return@GradientButton }
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
                if (res.isSuccessful && res.body() != null) onAuthenticated(res.body()!!)
                else error = errorMessage(res)
            }
        }
        Row(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
            Text("لديك حساب بالفعل؟ ", color = Color.White.copy(alpha = 0.6f))
            TextButton(onClick = { onModeChange(AuthMode.Login) }) {
                Text("تسجيل الدخول", color = Brand, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
private fun ForgotForm(onModeChange: (AuthMode) -> Unit) {
    var step by remember { mutableStateOf(0) } // 0: request code, 1: reset
    var email by remember { mutableStateOf("") }
    var code by remember { mutableStateOf("") }
    var newPass by remember { mutableStateOf("") }
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
            GradientButton(text = "إرسال رمز الاستعادة", loading = loading) {
                loading = true; error = null; info = null
                kotlinx.coroutines.MainScope().launch {
                    val res = ApiClient.authApi.forgotPassword(ForgotRequest(email.trim()))
                    loading = false
                    if (res.isSuccessful) {
                        val body = runCatching {
                            com.google.gson.Gson().fromJson(
                                res.errorBody()?.charStream(),
                                Map::class.java,
                            )
                        }.getOrNull()
                        // On success the backend returns 200 with optional dev reset token
                        step = 1
                        info = "تم إنشاء رمز استعادة. إن كان الخادم في وضع التطوير سيظهر الرمز هنا."
                        @Suppress("UNCHECKED_CAST")
                        val token = (res as? Response<AuthResponse>)?.body()?.tokens?.accessToken
                    } else error = errorMessage(res)
                }
            }
        } else {
            AuthTextField(code, { code = it }, "رمز الاستعادة", Icons.Filled.Lock)
            AuthTextField(newPass, { newPass = it }, "كلمة السر الجديدة", Icons.Filled.Lock, isPassword = true)
            GradientButton(text = "تعيين كلمة السر", loading = loading) {
                loading = true; error = null
                kotlinx.coroutines.MainScope().launch {
                    val res = ApiClient.authApi.resetPassword(ResetRequest(code.trim(), newPass))
                    loading = false
                    if (res.isSuccessful) {
                        info = "تم تغيير كلمة السر بنجاح، يمكنك تسجيل الدخول الآن."
                        step = 0
                    } else error = errorMessage(res)
                }
            }
        }
        TextButton(onClick = { onModeChange(AuthMode.Login) }) {
            Text("العودة لتسجيل الدخول", color = Accent)
        }
    }
}
