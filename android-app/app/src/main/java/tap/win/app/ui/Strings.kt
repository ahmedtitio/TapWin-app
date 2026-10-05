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
    fun appName() = t("تاب وين", "Tap Win")
    fun home() = t("الرئيسية", "Home")
    fun profile() = t("الملف الشخصي", "Profile")
    fun security() = t("الأمان", "Security")
    fun settings() = t("الإعدادات", "Settings")
    fun logout() = t("تسجيل الخروج", "Log out")
    fun menu() = t("القائمة", "Menu")
    fun save() = t("حفظ التغييرات", "Save changes")
    fun back() = t("رجوع", "Back")
    fun language() = t("اللغة", "Language")
    val arabic = "العربية"
    val english = "English"
    fun appVersion() = t("إصدار التطبيق", "App version")
    fun versionValue() = "v${BuildConfig.VERSION_NAME} (${BuildConfig.VERSION_CODE})"
    fun backendUrl() = t("عنوان الخادم", "Backend URL")
    fun packageId() = "tap.win.app"

    // Auth
    fun loginTitle() = t("سجّل الدخول للمتابعة", "Sign in to continue")
    fun registerTitle() = t("أنشئ حسابًا جديدًا", "Create a new account")
    fun forgotTitle() = t("استعادة كلمة السر", "Reset your password")
    fun verifyTitle() = t("تأكيد البريد الإلكتروني", "Verify your email")
    fun email() = t("البريد الإلكتروني", "Email")
    fun password() = t("كلمة السر", "Password")
    fun confirmPassword() = t("تأكيد كلمة السر", "Confirm password")
    fun fullName() = t("الاسم الكامل", "Full name")
    fun username() = t("اسم المستخدم", "Username")
    fun phoneOptional() = t("رقم الهاتف (اختياري)", "Phone number (optional)")
    fun phone() = t("رقم الهاتف", "Phone")
    fun signIn() = t("تسجيل الدخول", "Sign in")
    fun signUp() = t("إنشاء الحساب", "Create account")
    fun forgotPassword() = t("نسيت كلمة السر؟", "Forgot password?")
    fun noAccount() = t("ليس لديك حساب؟ ", "No account yet? ")
    fun haveAccount() = t("لديك حساب بالفعل؟ ", "Already have an account? ")
    fun createAccount() = t("إنشاء حساب", "Create account")
    fun continueGoogle() = t("المتابعة باستخدام حساب Google", "Continue with Google")
    fun sendCode() = t("إرسال رمز التحقق", "Send verification code")
    fun otpCode() = t("رمز التحقق (6 أرقام)", "Verification code (6 digits)")
    fun newPassword() = t("كلمة السر الجديدة", "New password")
    fun setPassword() = t("تعيين كلمة السر", "Set new password")
    fun confirmAccount() = t("تأكيد الحساب والدخول", "Confirm account & sign in")
    fun resendCode() = t("إعادة إرسال الرمز", "Resend code")
    fun backToLogin() = t("العودة لتسجيل الدخول", "Back to sign in")
    fun resendChangeEmail() = t("إعادة إرسال الرمز / تغيير البريد", "Resend code / change email")
    fun passwordMismatch() = t("كلمتا السر غير متطابقتين", "Passwords do not match")
    fun enterOtp() = t("أدخل رمز التحقق الذي وصلك بالبريد", "Enter the code sent to your email")
    fun enterOtp6() = t("أدخل الرمز المكون من 6 أرقام", "Enter the 6-digit code")
    fun resetDone() = t("تم تغيير كلمة السر بنجاح، يمكنك تسجيل الدخول الآن.", "Password reset successfully, you can sign in now.")
    fun sentNewCode() = t("تم إرسال رمز جديد إلى بريدك الإلكتروني.", "A new code has been sent to your email.")
    fun devModeCode() = t("وضع الاختبار: رمز التحقق الخاص بك هو", "Test mode: your verification code is")
    fun welcomeBack() = t("تم تسجيل الدخول بنجاح", "Signed in successfully")
    fun accountCreated() = t("تم إنشاء الحساب بنجاح", "Account created successfully")
    fun googleWelcome() = t("مرحبًا! تم تسجيل دخولك عبر Google، أكمل بياناتك الناقصة من الملف الشخصي.", "Welcome! You signed in with Google, please complete your missing details in your profile.")
    fun genericError() = t("حدث خطأ، حاول مرة أخرى", "Something went wrong, try again")
    fun serverUnreachable() = t("تعذر الاتصال بالخادم", "Cannot reach the server")

    fun sentCodeTo(addr: String): String =
        t("أرسلنا رمز تحقق مكوّنًا من 6 أرقام إلى بريدك الإلكتروني ($addr)، صالح لمدة 15 دقيقة.",
          "We sent a 6-digit verification code to $addr, valid for 15 minutes.")

    fun serverFail(code: Int): String =
        t("فشل تسجيل الدخول عبر الخادم ($code)", "Server sign-in failed ($code)")
    fun googleFail() = t("فشل تسجيل الدخول بحساب Google", "Google sign-in failed")
    fun firebaseShaHint() = t("فشل تسجيل الدخول عبر Firebase: راجع SHA-1 للتوقيع في مشروع Firebase", "Firebase sign-in failed: check the signing SHA-1 in the Firebase project")

    // Home / tabs
    fun editProfile() = t("تعديل الملف الشخصي", "Edit profile")
    fun changePassword() = t("تغيير كلمة السر", "Change password")
    fun currentPassword() = t("كلمة السر الحالية", "Current password")
    fun updatePassword() = t("تحديث كلمة السر", "Update password")
    fun savedOk() = t("تم حفظ البيانات بنجاح", "Saved successfully")
    fun passwordChanged() = t("تم تغيير كلمة السر بنجاح", "Password changed successfully")
    fun statusEmail() = t("البريد الإلكتروني", "Email")
    fun statusUsername() = t("اسم المستخدم", "Username")
    fun statusConnection() = t("حالة الاتصال", "Connection status")
    fun statusActive() = t("نشط — إرسال نبضات دورية", "Active — periodic heartbeats")
    fun statusJoined() = t("تاريخ الانضمام", "Joined date")
    fun settingsGeneral() = t("عام", "General")
    fun settingsAbout() = t("حول التطبيق", "About the app")
    fun settingsAppearance() = t("المظهر", "Appearance")
    fun themeNote() = t("الخلفية سوداء والنص أبيض بأسلوب زجاجي موحد على كامل التطبيق.", "Black background, white text and unified glass surfaces across the app.")
    fun switchLangNote() = t("تغيير لغة الواجهة فورًا", "Switch the interface language instantly")

    // Session splash
    fun restoringSession() = t("جارٍ استعادة جلستك…", "Restoring your session…")
}
