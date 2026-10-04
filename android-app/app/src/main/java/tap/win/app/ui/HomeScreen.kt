package tap.win.app.ui

import android.content.Intent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import tap.win.app.api.ApiClient
import tap.win.app.api.AuthResponse
import tap.win.app.api.User
import tap.win.app.data.SessionStore
import androidx.compose.runtime.rememberCoroutineScope
import kotlinx.coroutines.launch
import tap.win.app.util.Analytics

@Composable
fun HomeScreen(session: SessionStore, user: User, onLogout: () -> Unit) {
    GradientBackground {
        val scope = rememberCoroutineScope()
        androidx.compose.runtime.LaunchedEffect(Unit) { Analytics.screenView("home") }
        var name by remember { mutableStateOf(user.fullName) }
        var phone by remember { mutableStateOf(user.phone ?: "") }
        var tab by remember { mutableStateOf(0) }
        var msg by remember { mutableStateOf<String?>(null) }
        var oldPass by remember { mutableStateOf("") }
        var newPass by remember { mutableStateOf("") }

        Column(modifier = Modifier.fillMaxSize()) {
            // Top bar
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Brush.horizontalGradient(listOf(BrandDark, Brand.copy(alpha = 0.6f))))
                    .padding(20.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon3D(icon = Icons.Filled.Person, colors = listOf(Brand, Color(0xFFB543F5)), size = 56)
                Spacer(Modifier.width(14.dp))
                Column(Modifier.weight(1f)) {
                    Text(name, color = Color.White, fontWeight = FontWeight.Bold,
                        style = MaterialTheme.typography.titleMedium)
                    Text("@${user.username}", color = Color.White.copy(alpha = 0.6f),
                        style = MaterialTheme.typography.bodySmall)
                }
                IconButton(onClick = {
                    scope.launch {
                        runCatching { ApiClient.authApi.logout("Bearer ${session.accessToken}") }
                        session.clear()
                        onLogout()
                    }
                }) {
                    Icon(Icons.Filled.ExitToApp, contentDescription = "خروج", tint = Color(0xFFFF8FA3))
                }
            }

            msg?.let {
                ErrorMessage(it)
                Spacer(Modifier.height(8.dp))
            }

            Box(modifier = Modifier.weight(1f).padding(20.dp)) {
                when (tab) {
                    0 -> OverviewTab(user)
                    1 -> ProfileTab(name, phone, { name = it }, { phone = it }) { newName, newPhone ->
                        scope.launch {
                            val res = ApiClient.authApi.updateMe(
                                "Bearer ${session.accessToken}",
                                mapOf("full_name" to newName, "phone" to newPhone),
                            )
                            msg = if (res.isSuccessful) "تم حفظ البيانات بنجاح" else errorMessage(res)
                        }
                    }
                    2 -> SecurityTab(oldPass, newPass,
                        onOld = { oldPass = it }, onNew = { newPass = it }) {
                        scope.launch {
                            val res = ApiClient.authApi.changePassword(
                                "Bearer ${session.accessToken}",
                                mapOf("current_password" to oldPass, "new_password" to newPass),
                            )
                            msg = if (res.isSuccessful) "تم تغيير كلمة السر بنجاح" else errorMessage(res)
                        }
                    }
                }
            }

            // Bottom navigation with 3D icons
            NavigationBar(
                containerColor = Color(0xFF160F35),
                tonalElevation = 0.dp,
            ) {
                NavigationBarItem(
                    selected = tab == 0, onClick = { tab = 0 },
                    icon = { Icon3D(icon = Icons.Filled.Home, colors = listOf(Brand, Accent), size = 34) },
                    label = { Text("الرئيسية", color = Color.White.copy(alpha = 0.7f)) },
                    colors = NavigationBarItemDefaults.colors(indicatorColor = Brand.copy(alpha = 0.2f)),
                )
                NavigationBarItem(
                    selected = tab == 1, onClick = { tab = 1 },
                    icon = { Icon3D(icon = Icons.Filled.Person, colors = listOf(Color(0xFFF5A623), Color(0xFFF55B42)), size = 34) },
                    label = { Text("الملف", color = Color.White.copy(alpha = 0.7f)) },
                    colors = NavigationBarItemDefaults.colors(indicatorColor = Brand.copy(alpha = 0.2f)),
                )
                NavigationBarItem(
                    selected = tab == 2, onClick = { tab = 2 },
                    icon = { Icon3D(icon = Icons.Filled.Lock, colors = listOf(Color(0xFF2BC0E4), Brand), size = 34) },
                    label = { Text("الأمان", color = Color.White.copy(alpha = 0.7f)) },
                    colors = NavigationBarItemDefaults.colors(indicatorColor = Brand.copy(alpha = 0.2f)),
                )
            }
        }
    }
}

@Composable
private fun Card3D(content: @Composable ColumnScope.() -> Unit) {
    Surface(
        shape = RoundedCornerShape(18.dp),
        color = Color(0xFF1D1445),
        modifier = Modifier.fillMaxWidth(),
    ) { Column(Modifier.padding(18.dp), content = content) }
}

@Composable
private fun StatTile(title: String, value: String, icon: androidx.compose.ui.graphics.vector.ImageVector, colors: List<Color>) {
    Card3D {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon3D(icon = icon, colors = colors, size = 48)
            Spacer(Modifier.width(14.dp))
            Column {
                Text(value, color = Color.White, fontWeight = FontWeight.ExtraBold,
                    style = MaterialTheme.typography.titleLarge)
                Text(title, color = Color.White.copy(alpha = 0.55f),
                    style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}

@Composable
private fun OverviewTab(user: User) {
    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        StatTile("البريد الإلكتروني", user.email, Icons.Filled.MailOutline, listOf(Brand, Color(0xFFB543F5)))
        StatTile("اسم المستخدم", "@${user.username}", Icons.Filled.AccountCircle, listOf(Accent, Color(0xFF00A3FF)))
        StatTile("حالة الاتصال", "نشط — إرسال نبضات دورية", Icons.Filled.SettingsRemote, listOf(Color(0xFFF5A623), Color(0xFFF55B42)))
        StatTile("تاريخ الانضمام", user.lastLoginAt?.take(10) ?: "-", Icons.Filled.DateRange, listOf(Color(0xFF2BC0E4), Brand))
    }
}

@Composable
private fun ProfileTab(
    name: String, phone: String,
    onName: (String) -> Unit, onPhone: (String) -> Unit, onSave: (String, String) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Card3D {
            Text("تعديل الملف الشخصي", color = Color.White, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(12.dp))
            AuthTextField(name, onName, "الاسم الكامل", Icons.Filled.Person)
            Spacer(Modifier.height(10.dp))
            AuthTextField(phone, onPhone, "رقم الهاتف", Icons.Filled.Phone,
                keyboardType = androidx.compose.ui.text.input.KeyboardType.Phone)
            Spacer(Modifier.height(14.dp))
            GradientButton("حفظ التغييرات", onClick = { onSave(name, phone) })
        }
    }
}

@Composable
private fun SecurityTab(
    oldPass: String, newPass: String,
    onOld: (String) -> Unit, onNew: (String) -> Unit, onChange: () -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Card3D {
            Text("تغيير كلمة السر", color = Color.White, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(12.dp))
            AuthTextField(oldPass, onOld, "كلمة السر الحالية", Icons.Filled.Lock, isPassword = true)
            Spacer(Modifier.height(10.dp))
            AuthTextField(newPass, onNew, "كلمة السر الجديدة", Icons.Filled.Lock, isPassword = true)
            Spacer(Modifier.height(14.dp))
            GradientButton(text = "تحديث كلمة السر", onClick = onChange)
        }
    }
}
