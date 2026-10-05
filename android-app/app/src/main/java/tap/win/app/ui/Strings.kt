package tap.win.app.ui

import tap.win.app.BuildConfig
import tap.win.app.util.I18n

/**
 * Bilingual string table (Arabic default / English).
 * Usage: S.t(S.login) — picks the value for the active language.
 */
object S {
    fun t(ar: String, en: String): String = I18n.t(ar, en)

    // App-wide
    val appName = t("تاب وين", "Tap Win")
    val home = t("الرئيسية", "Home")
    val profile = t("الملف الشخصي", "Profile")
    val security = t("الأمان", "Security")
    val settings = t("الإعدادات", "Settings")
    val logout = t("تسجيل الخروج", "Log out")
    val menu = t("القائمة", "Menu")
    val save = t("حفظ التغييرات", "Save changes")
    val back = t("رجوع", "Back")
    val language = t("اللغة", "Language")
    val arabic = "العربية"
    val english = "English"
    val appVersion = t("إصدار التطبيق", "App version")
    val versionValue = "v${BuildConfig.VERSION_NAME} (${BuildConfig.VERSION_CODE})"
    val backendUrl = t("عنوان الخادم", "Backend URL")
    val packageId = "tap.win.app"

    // Auth
    val loginTitle = t("سجّل الدخول للمتابعة", "Sign in to continue")
    val registerTitle = t("أنشئ حسابًا جديدًا", "Create a new account")
    val forgotTitle = t("استعادة كلمة السر", "Reset your password")
    val verifyTitle = t("تأكيد البريد الإلكتروني", "Verify your email")
    val email = t("البريد الإلكتروني", "Email")
    val password = t("كلمة السر", "Password")
    val confirmPassword = t("تأكيد كلمة السر", "Confirm password")
    val fullName = t("الاسم الكامل", "Full name")
    val username = t("اسم المستخدم", "Username")
    val phoneOptional = t("رقم الهاتف (اختياري)", "Phone number (optional)")
    val phone = t("رقم الهاتف", "Phone")
    val signIn = t("تسجيل الدخول", "Sign in")
    val signUp = t("إنشاء الحساب", "Create account")
    val forgotPassword = t("نسيت كلمة السر؟", "Forgot password?")
    val noAccount = t("ليس لديك حساب؟ ", "No account yet? ")
    val haveAccount = t("لديك حساب بالفعل؟ ", "Already have an account? ")
    val createAccount = t("إنشاء حساب", "Create account")
    val continueGoogle = t("المتابعة باستخدام حساب Google", "Continue with Google")
    val sendCode = t("إرسال رمز التحقق", "Send verification code")
    val otpCode = t("رمز التحقق (6 أرقام)", "Verification code (6 digits)")
    val newPassword = t("كلمة السر الجديدة", "New password")
    val setPassword = t("تعيين كلمة السر", "Set new password")
    val confirmAccount = t("تأكيد الحساب والدخول", "Confirm account & sign in")
    val resendCode = t("إعادة إرسال الرمز", "Resend code")
    val backToLogin = t("العودة لتسجيل الدخول", "Back to sign in")
    val resendChangeEmail = t("إعادة إرسال الرمز / تغيير البريد", "Resend code / change email")
    val passwordMismatch = t("كلمتا السر غير متطابقتين", "Passwords do not match")
    val enterOtp = t("أدخل رمز التحقق الذي وصلك بالبريد", "Enter the code sent to your email")
    val enterOtp6 = t("أدخل الرمز المكون من 6 أرقام", "Enter the 6-digit code")
    val resetDone = t("تم تغيير كلمة السر بنجاح، يمكنك تسجيل الدخول الآن.", "Password reset successfully, you can sign in now.")
    val sentNewCode = t("تم إرسال رمز جديد إلى بريدك الإلكتروني.", "A new code has been sent to your email.")
    val devModeCode = t("وضع الاختبار: رمز التحقق الخاص بك هو", "Test mode: your verification code is")
    val welcomeBack = t("تم تسجيل الدخول بنجاح", "Signed in successfully")
    val accountCreated = t("تم إنشاء الحساب بنجاح", "Account created successfully")
    val googleWelcome = t("مرحبًا! تم تسجيل دخولك عبر Google، أكمل بياناتك الناقصة من الملف الشخصي.", "Welcome! You signed in with Google, please complete your missing details in your profile.")
    val genericError = t("حدث خطأ، حاول مرة أخرى", "Something went wrong, try again")
    val serverUnreachable = t("تعذر الاتصال بالخادم", "Cannot reach the server")

    fun sentCodeTo(addr: String): String =
        t("أرسلنا رمز تحقق مكوّنًا من 6 أرقام إلى بريدك الإلكتروني ($addr)، صالح لمدة 15 دقيقة.",
          "We sent a 6-digit verification code to $addr, valid for 15 minutes.")

    fun serverFail(code: Int): String =
        t("فشل تسجيل الدخول عبر الخادم ($code)", "Server sign-in failed ($code)")
    val googleFail = t("فشل تسجيل الدخول بحساب Google", "Google sign-in failed")
    val firebaseShaHint = t("فشل تسجيل الدخول عبر Firebase: راجع SHA-1 للتوقيع في مشروع Firebase", "Firebase sign-in failed: check the signing SHA-1 in the Firebase project")

    // Home / tabs
    val editProfile = t("تعديل الملف الشخصي", "Edit profile")
    val changePassword = t("تغيير كلمة السر", "Change password")
    val currentPassword = t("كلمة السر الحالية", "Current password")
    val updatePassword = t("تحديث كلمة السر", "Update password")
    val savedOk = t("تم حفظ البيانات بنجاح", "Saved successfully")
    val passwordChanged = t("تم تغيير كلمة السر بنجاح", "Password changed successfully")
    val statusEmail = t("البريد الإلكتروني", "Email")
    val statusUsername = t("اسم المستخدم", "Username")
    val statusConnection = t("حالة الاتصال", "Connection status")
    val statusActive = t("نشط — إرسال نبضات دورية", "Active — periodic heartbeats")
    val statusJoined = t("تاريخ الانضمام", "Joined date")
    val settingsGeneral = t("عام", "General")
    val settingsAbout = t("حول التطبيق", "About the app")
    val settingsAppearance = t("المظهر", "Appearance")
    val themeNote = t("الخلفية سوداء والنص أبيض بأسلوب زجاجي موحد على كامل التطبيق.", "Black background, white text and unified glass surfaces across the app.")
    val switchLangNote = t("تغيير لغة الواجهة فورًا", "Switch the interface language instantly")

    // Session splash
    val restoringSession = t("جارٍ استعادة جلستك…", "Restoring your session…")
}
