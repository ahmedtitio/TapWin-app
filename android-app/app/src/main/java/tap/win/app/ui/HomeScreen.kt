package tap.win.app.ui

import androidx.compose.foundation.Image
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import tap.win.app.BuildConfig
import tap.win.app.R
import tap.win.app.api.ApiClient
import tap.win.app.api.User
import tap.win.app.data.SessionStore
import tap.win.app.util.I18n

/** Frosted-glass card: solid dark fill + 20% white hairline. No gradients. */
@Composable
fun GlassCard(
    modifier: Modifier = Modifier,
    content: @Composable ColumnScope.() -> Unit,
) {
    Surface(
        shape = RoundedCornerShape(18.dp),
        color = GlassSurface,
        border = BorderStroke(1.dp, GlassBorder),
        tonalElevation = 0.dp,
        shadowElevation = 0.dp,
        modifier = modifier.fillMaxWidth(),
    ) {
        Column(Modifier.padding(18.dp), content = content)
    }
}

private data class NavItem(val id: Int, val title: String, val icon: androidx.compose.ui.graphics.vector.ImageVector)

/**
 * User home with a top bar, a slide-out side menu and bottom navigation —
 * pure black background, white text, glass surfaces, monochrome icons only.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(session: SessionStore, user: User, onLogout: () -> Unit) {
    GradientBackground {
        val scope = rememberCoroutineScope()
        LaunchedEffect(Unit) { tap.win.app.util.Analytics.screenView("home") }
        var name by remember { mutableStateOf(user.fullName) }
        var phone by remember { mutableStateOf(user.phone ?: "") }
        var tab by remember { mutableStateOf(0) }
        var msg by remember { mutableStateOf<String?>(null) }
        var oldPass by remember { mutableStateOf("") }
        var newPass by remember { mutableStateOf("") }

        val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)

        

        Scaffold(
            topBar = {
                TopAppBar(
                    title = {
                        Text(tap.win.app.ui.S.appName(), color = Color.White, fontWeight = FontWeight.Bold)
                    },
                    navigationIcon = {
                        IconButton(onClick = { scope.launch { drawerState.open() } }) {
                            Icon(Icons.Filled.Menu, contentDescription = tap.win.app.ui.S.menu(), tint = Color.White)
                        }
                    },
                    actions = {
                        // Language toggle in the top bar.
                        TextButton(onClick = {
                            val next = if (I18n.english()) I18n.LANG_AR else I18n.LANG_EN
                            I18n.set(LocalContext.current, next)
                            (LocalContext.current as? android.app.Activity)?.recreate()
                        }) {
                            Text(if (I18n.english()) tap.win.app.ui.S.arabic else tap.win.app.ui.S.english,
                                color = Color.White, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                        }
                        IconButton(onClick = {
                            scope.launch {
                                runCatching { ApiClient.authApi.logout("Bearer ${session.accessToken}") }
                                session.clear()
                                onLogout()
                            }
                        }) {
                            Icon(Icons.Filled.ExitToApp, contentDescription = tap.win.app.ui.S.logout(), tint = Color.White)
                        }
                    },
                )
            },
            bottomBar = {
                NavigationBar(
                    containerColor = GlassSurface,
                    tonalElevation = 0.dp,
                ) {
                    NavigationBarItem(
                        selected = tab == 0, onClick = { tab = 0 },
                        icon = { Icon(Icons.Filled.Home, contentDescription = null, tint = Color.White) },
                        label = { Text(tap.win.app.ui.S.home(), color = Color.White.copy(alpha = 0.7f)) },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = Color.White,
                            selectedTextColor = Color.White,
                            indicatorColor = GlassFill,
                        ),
                    )
                    NavigationBarItem(
                        selected = tab == 1, onClick = { tab = 1 },
                        icon = { Icon(Icons.Filled.Person, contentDescription = null, tint = Color.White) },
                        label = { Text(tap.win.app.ui.S.profile(), color = Color.White.copy(alpha = 0.7f)) },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = Color.White,
                            selectedTextColor = Color.White,
                            indicatorColor = GlassFill,
                        ),
                    )
                    NavigationBarItem(
                        selected = tab == 2, onClick = { tab = 2 },
                        icon = { Icon(Icons.Filled.Lock, contentDescription = null, tint = Color.White) },
                        label = { Text(tap.win.app.ui.S.security(), color = Color.White.copy(alpha = 0.7f)) },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = Color.White,
                            selectedTextColor = Color.White,
                            indicatorColor = GlassFill,
                        ),
                    )
                    NavigationBarItem(
                        selected = tab == 3, onClick = { tab = 3 },
                        icon = { Icon(Icons.Filled.Settings, contentDescription = null, tint = Color.White) },
                        label = { Text(tap.win.app.ui.S.settings(), color = Color.White.copy(alpha = 0.7f)) },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = Color.White,
                            selectedTextColor = Color.White,
                            indicatorColor = GlassFill,
                        ),
                    )
                }
            },
        ) { padding ->
            ModalNavigationDrawer(
                drawerState = drawerState,
                gesturesEnabled = true,
                drawerContent = {
                    ModalDrawerSheet(
                        drawerContainerColor = GlassSurface,
                        modifier = Modifier.width(280.dp),
                    ) {
                        Column(Modifier.fillMaxHeight().padding(20.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Image(
                                    painter = painterResource(id = R.drawable.ic_app_logo),
                                    contentDescription = tap.win.app.ui.S.appName(),
                                    modifier = Modifier.size(44.dp),
                                )
                                Spacer(Modifier.width(12.dp))
                                Column {
                                    Text(tap.win.app.ui.S.appName(), color = Color.White, fontWeight = FontWeight.ExtraBold, fontSize = 18.sp)
                                    Text("@${user.username}", color = Color.White.copy(alpha = 0.6f), fontSize = 13.sp)
                                }
                            }
                            Spacer(Modifier.height(24.dp))
                            listOf(
                                NavItem(0, tap.win.app.ui.S.home(), Icons.Filled.Home),
                                NavItem(1, tap.win.app.ui.S.profile(), Icons.Filled.Person),
                                NavItem(2, tap.win.app.ui.S.security(), Icons.Filled.Lock),
                                NavItem(3, tap.win.app.ui.S.settings(), Icons.Filled.Settings),
                            ).forEach { item ->
                                NavigationDrawerItem(
                                    label = { Text(item.title, color = Color.White) },
                                    selected = tab == item.id,
                                    onClick = { scope.launch { drawerState.close() }; tab = item.id },
                                    icon = { Icon(item.icon, contentDescription = null, tint = Color.White) },
                                    colors = NavigationDrawerItemDefaults.colors(
                                        selectedContainerColor = GlassFill,
                                        unselectedContainerColor = Color.Transparent,
                                    ),
                                    shape = RoundedCornerShape(14.dp),
                                )
                            }
                            Spacer(Modifier.weight(1f))
                            HorizontalDivider(color = GlassBorder)
                            TextButton(onClick = {
                                scope.launch {
                                    runCatching { ApiClient.authApi.logout("Bearer ${session.accessToken}") }
                                    session.clear()
                                    onLogout()
                                }
                            }) {
                                Icon(Icons.Filled.ExitToApp, contentDescription = null, tint = Color.White)
                                Spacer(Modifier.width(8.dp))
                                Text(tap.win.app.ui.S.logout(), color = Color.White)
                            }
                        }
                    }
                },
            ) {
                Box(modifier = Modifier.padding(padding).fillMaxSize()) {
                    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp)) {
                        msg?.let {
                            ErrorMessage(it)
                            Spacer(Modifier.height(8.dp))
                        }
                        when (tab) {
                            0 -> OverviewTab(user)
                            1 -> ProfileTab(name, phone, { name = it }, { phone = it }) { newName, newPhone ->
                                scope.launch {
                                    val res = ApiClient.authApi.updateMe(
                                        "Bearer ${session.accessToken}",
                                        mapOf("full_name" to newName, "phone" to newPhone),
                                    )
                                    msg = if (res.isSuccessful) tap.win.app.ui.S.savedOk() else errorMessage(res)
                                }
                            }
                            2 -> SecurityTab(oldPass, newPass,
                                onOld = { oldPass = it }, onNew = { newPass = it }) {
                                scope.launch {
                                    val res = ApiClient.authApi.changePassword(
                                        "Bearer ${session.accessToken}",
                                        mapOf("current_password" to oldPass, "new_password" to newPass),
                                    )
                                    msg = if (res.isSuccessful) tap.win.app.ui.S.passwordChanged() else errorMessage(res)
                                }
                            }
                            3 -> SettingsTab()
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun StatTile(title: String, value: String, icon: androidx.compose.ui.graphics.vector.ImageVector) {
    GlassCard {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .size(44.dp)
                    .background(GlassFill, CircleShape),
            ) {
                Icon(icon, contentDescription = null, tint = Color.White)
            }
            Spacer(Modifier.width(14.dp))
            Column {
                Text(value, color = Color.White, fontWeight = FontWeight.ExtraBold,
                    style = MaterialTheme.typography.titleMedium)
                Text(title, color = Color.White.copy(alpha = 0.55f),
                    style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}

@Composable
private fun OverviewTab(user: User) {
    
    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        StatTile(tap.win.app.ui.S.statusEmail(), user.email, Icons.Filled.MailOutline)
        StatTile(tap.win.app.ui.S.statusUsername(), "@${user.username}", Icons.Filled.AccountCircle)
        StatTile(tap.win.app.ui.S.statusConnection(), tap.win.app.ui.S.statusActive(), Icons.Filled.SettingsRemote)
        StatTile(tap.win.app.ui.S.statusJoined(), user.lastLoginAt?.take(10) ?: "-", Icons.Filled.DateRange)
    }
}

@Composable
private fun ProfileTab(
    name: String, phone: String,
    onName: (String) -> Unit, onPhone: (String) -> Unit, onSave: (String, String) -> Unit,
) {
    
    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        GlassCard {
            Text(tap.win.app.ui.S.editProfile(), color = Color.White, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(12.dp))
            AuthTextField(name, onName, tap.win.app.ui.S.fullName(), Icons.Filled.Person)
            Spacer(Modifier.height(10.dp))
            AuthTextField(phone, onPhone, tap.win.app.ui.S.phone(), Icons.Filled.Phone,
                keyboardType = androidx.compose.ui.text.input.KeyboardType.Phone)
            Spacer(Modifier.height(14.dp))
            GradientButton(tap.win.app.ui.S.save(), onClick = { onSave(name, phone) })
        }
    }
}

@Composable
private fun SecurityTab(
    oldPass: String, newPass: String,
    onOld: (String) -> Unit, onNew: (String) -> Unit, onChange: () -> Unit,
) {
    
    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        GlassCard {
            Text(tap.win.app.ui.S.changePassword(), color = Color.White, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(12.dp))
            AuthTextField(oldPass, onOld, tap.win.app.ui.S.currentPassword(), Icons.Filled.Lock, isPassword = true)
            Spacer(Modifier.height(10.dp))
            AuthTextField(newPass, onNew, tap.win.app.ui.S.newPassword(), Icons.Filled.Lock, isPassword = true)
            Spacer(Modifier.height(14.dp))
            GradientButton(tap.win.app.ui.S.updatePassword(), onClick = onChange)
        }
    }
}

/** App settings: version info, language switcher, appearance note. */
@Composable
private fun SettingsTab() {
    
    val ctx = LocalContext.current
    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        GlassCard {
            Text(tap.win.app.ui.S.settingsGeneral(), color = Color.White, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(12.dp))
            SettingRow(Icons.Filled.Info, tap.win.app.ui.S.appVersion(), tap.win.app.ui.S.versionValue())
            SettingRow(Icons.Filled.Info, tap.win.app.ui.S.t("حزمة التطبيق", "Package"), tap.win.app.ui.S.packageId())
            SettingRow(Icons.Filled.Cloud, tap.win.app.ui.S.backendUrl(), BuildConfig.API_BASE_URL)
        }
        GlassCard {
            Text(tap.win.app.ui.S.language(), color = Color.White, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(6.dp))
            Text(tap.win.app.ui.S.switchLangNote(), color = Color.White.copy(alpha = 0.6f), fontSize = 13.sp)
            Spacer(Modifier.height(12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                LangChip(tap.win.app.ui.S.arabic, !I18n.english()) {
                    I18n.set(ctx, I18n.LANG_AR)
                    (ctx as? android.app.Activity)?.recreate()
                }
                LangChip(tap.win.app.ui.S.english, I18n.english()) {
                    I18n.set(ctx, I18n.LANG_EN)
                    (ctx as? android.app.Activity)?.recreate()
                }
            }
        }
        GlassCard {
            Text(tap.win.app.ui.S.settingsAppearance(), color = Color.White, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(8.dp))
            Text(tap.win.app.ui.S.themeNote(), color = Color.White.copy(alpha = 0.7f), fontSize = 13.sp)
        }
    }
}

@Composable
private fun SettingRow(icon: androidx.compose.ui.graphics.vector.ImageVector, title: String, value: String) {
    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(vertical = 6.dp)) {
        Icon(icon, contentDescription = null, tint = Color.White.copy(alpha = 0.8f), modifier = Modifier.size(20.dp))
        Spacer(Modifier.width(10.dp))
        Column(Modifier.weight(1f)) {
            Text(title, color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
            Text(value, color = Color.White.copy(alpha = 0.55f), fontSize = 12.sp)
        }
    }
}

@Composable
private fun LangChip(label: String, selected: Boolean, onClick: () -> Unit) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(14.dp),
        color = if (selected) Color.White else Color.Transparent,
        contentColor = if (selected) Color.Black else Color.White,
        border = BorderStroke(1.dp, if (selected) Color.White else GlassBorder),
        modifier = Modifier.height(44.dp),
    ) {
        Box(Modifier.padding(horizontal = 22.dp), contentAlignment = Alignment.Center) {
            Text(label, fontWeight = FontWeight.Bold, fontSize = 14.sp)
        }
    }
}
