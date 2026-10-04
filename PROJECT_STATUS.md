# 📋 Tap Win — ملف متابعة المشروع (داخلي — غير مخصص للقراءة العامة)

> آخر تحديث: 2026-10-04 — هذا الملف هو مرجع المتابعة الداخلي للتغييرات والمشاكل والحالة الحالية.

---

## 1. ملخص المشروع والروابط الحية

| المكوّن | التقنية | الرابط / الموقع | الحالة |
|---|---|---|---|
| الباك-إند API | Cloudflare Workers + Neon PostgreSQL | `https://app-backend-api.tapwin.workers.dev` | ✅ منشور ويعمل |
| لوحة تحكم الأدمن | React + Vite + Cloudflare Pages | `https://admin-dashboard-6yx.pages.dev` | ✅ منشورة وتعمل |
| واجهة المستخدم الويب | React + Vite (user-dashboard/) | لم تُنشر بعد على Pages | ⏳ جاهزة محلياً — بانتظار النشر |
| تطبيق أندرويد | Kotlin + Jetpack Compose (حزمة `tap.win.app`) | يُبنى عبر Codemagic | ⚠️ آخر بناء فشل — راجع قسم المشاكل |
| المستودع | GitHub | `github.com/ahmedtitio/TapWin-app` (فرع main) | ✅ مربوط ويُدفع عليه |
| Firebase | مشروع `tapwin-app` | Google Sign-In + FCM + GA4 | ✅ البيانات مضبوطة |

### معرّفات ثابتة
- حزمة التطبيق: `tap.win.app` — اسم التطبيق: **Tap Win**
- GA Measurement ID: `G-9HBP87R04M`
- GOOGLE_WEB_CLIENT_ID: `777921904281-9udm9ghsbn7r2f5dpu9h8a1sem2rq73u.apps.googleusercontent.com`
- Keystore: `android-app/tapwin-release.jks` (alias: `tapwin-key`)
  - SHA1: `0B:23:22:C0:44:74:2D:2C:4B:8A:89:FE:CF:88:B5:ED:DD:21:91:60`
  - SHA256: `EC:A1:7A:E6:A2:6C:66:89:56:A3:B0:57:72:3E:42:AD:5E:CC:3D:8C:07:1F:F5:B7:21:FF:07:1F:B6:75:B9:5C`

---

## 2. سجل التغييرات (الأحدث أولاً)

| Commit | التاريخ | الوصف |
|---|---|---|
| `e0f29ac` (HEAD على GitHub ✅) | 2026-10-04 | Codemagic: نسخ الـ keystore إلى مجلد clone + حل مسار التوقيع بين الخطوات؛ Android: عرض dev_code في شاشة Verify؛ تحديث هذا الملف |
| `fa7eb2a` | 2026-10-04 | User web dashboard: OTP verification step on login for unverified accounts |
| `cd87c64` | 2026-10-04 | ملف PROJECT_STATUS.md + إصلاحات auth المعلّقة (SessionStore userId String، شاشة Verify، OTP forgot/reset) |
| `decf865` | 2026-10-04 | Backend: قبول `name` كمرادف لـ `full_name` في register (إصلاح VALIDATION crash) + إصلاح استيراد Analytics |
| `7a68472` | 2026-10-04 | إصلاح أخطاء Kotlin: استيراد VerifyEmailRequest + إغلاق قوس Analytics |
| `8b113d5` | 2026-10-04 | Backend: رموز تحقق البريد (جدول email_codes، verify-email/resend، OTP forgot/reset، دعم Resend API) |
| `06b71c8` | 2026-10-04 | تدفق التحقق في Android + واجهة user-dashboard الويب الكاملة (login/register/verify/forgot/reset/dashboard) |
| `702cbd0` | 2026-10-04 | GoogleSignInHelper: تحويل launchClassicFallback لجسم كتلي |
| `04b76a4` | 2026-10-04 | Reflection لحل intentSender |
| `4dc1035` | 2026-10-04 | extractIdToken متعددة المسارات |
| `34c058e` | 2026-10-04 | Identity.getCredentialClient |
| Earlier… | 2026-10-03 | نشر Worker/Pages، إصلاح JWT await، GA4 في الأدمن، codemagic.yaml، keystore، FCM، google-services.json جديد |

### الملفات المعدلة حالياً في مساحة العمل (بانتظار commit & push)
- `android-app/.../MainActivity.kt` — إصلاح userId String + clear session عند فشل refresh
- `android-app/.../api/AuthApi.kt` — أنواع الطلبات/الردسات + نقاط verify/resend
- `android-app/.../ui/AuthScreens.kt` — شاشة Verify + تدفق Forgot بخطوتين OTP
- `backend/src/auth-routes.js` — إصلاحات التحقق والـ OTP

---

## 3. المشاكل المرصودة وحالتها

| # | المشكلة | السبب الجذري | الحل | الحالة |
|---|---|---|---|---|
| 1 | التطبيق يتوقف عند تسجيل الدخول ولا تظهر لوحة المستخدم | `SessionStore` يخزّن userId كـ Int بينما الخادم يرجع UUID نصياً → ClassCastException | تحويل userId إلى String في SessionStore وتمرير `.toString()` في MainActivity | ✅ مُصلح محلياً — يحتاج بناء جديد |
| 2 | إنشاء حساب يخرج من التطبيق بدون طلب رمز التحقق | RegisterForm كان يدخل مباشرة بعد التسجيل | شاشة `AuthMode.Verify` تطلب الرمز 6 أرقام + resend، والدخول للوحة فقط بعد التأكيد | ✅ مُصلح محلياً — يحتاج بناء جديد |
| 3 | "تعذر الحصول على رمز google" عند Google Sign-In | extractIdToken لم تكن تقرأ النتيجة من `data.extras` في بعض الإصدارات | مسار ثالث يقرأ id_token من extras مع فحص صيغة JWT (`eyJ`) + مسارات reflection وكلاسيكية؛ والباك-إند `/firebase` يفعّل الحساب تلقائياً | ✅ مُصلح محلياً — يحتاج بناء + اختبار فعلي |
| 4 | آخر بناء Codemagic فشل (`Returns not allowed`, ثم `intentSender`) | إصدار play-services-auth ودواله | `702cbd0` ثم `04b76a4` | ⚠️ البناء التالي يجب أن يبدأ من أحدث كوميت بعد دفع التعديلات الجارية |
| 5 | رموز التحقق لا تصل للبريد فعلياً | لا يوجد مزوّد بريد مرتبط بالـ Worker | ضبط Secret `RESEND_API_KEY` (resend.com) — وبدونه يرجع `dev_code` في الرد للاختبار | ⏳ مطلوب منك |
| 6 | تعديلات سابقة لم تصل GitHub أكثر من مرة | دفع ناقص/فشل بصمت | سياسة إلزامية: بعد كل push يتم التحقق عبر GitHub API من HEAD الفعلي | ✅ مطبقة |

---

## 4. قاعدة البيانات (Neon) — المخطط الحالي

الجداول: `users` (+ `email_verified boolean`) · `sessions` · `refresh_tokens` · `password_resets` · `email_codes` (code_hash/purpose/expires_at) · `login_logs` · `devices` (heartbeat/fcm_token) · `app_events` (GA mirror) · `files` · `revoked_jtis`.

- الإنشاء التلقائي عند أول تشغيل للـ Worker (migration آمنة).
- إذا ظهر `DB_NOT_READY` مجدداً: احذف الجداول القديمة بـ `DROP TABLE ... CASCADE` من Neon SQL Editor ثم أعد النشر.

### نقاط API الرئيسية
```
POST /api/auth/register          → يرسل رمز تحقق 6 أرقام (أو dev_code بدون RESEND)
POST /api/auth/verify-email      → يفعّل الحساب ويرجع جلسة كاملة
POST /api/auth/resend-verification
POST /api/auth/login             → يرفض غير المفعّل برسالة عربية واضحة
POST /api/auth/firebase          → دخول Google (يتفعّل تلقائياً — بريد Google موثق)
POST /api/auth/forgot-password   → يرسل OTP
POST /api/auth/reset-password    → يقبل OTP أو رابط قديم
POST /api/admin/login            → audience=admin
GET  /api/admin/users | stats | devices
POST /api/devices/heartbeat      → حالة النشط/غير النشط
POST /api/events                 → مرآة إحصائيات GA4
```

---

## 5. حسابات الدخول المعروفة

| النوع | البريد | كلمة المرور |
|---|---|---|
| أدمن (Web) | `ahmedtitio@gmail.com` | `TapWin@Admin2026!Secure` (يُغيَّر فوراً من صفحة الإعدادات) |
| مستخدمون تجريبيون | مسجّلون في جدول users — يُعرضون من `/api/admin/users` أو Neon SQL: `SELECT email, email_verified, created_at FROM users;` |

⚠️ المستخدم الجديد لا يستطيع الدخول قبل تأكيد البريد (شاشة Verify في التطبيق وواجهة الويب).

---

## 6. واجهة ويب المستخدم (user-dashboard/)

المجلد مكتمل محلياً: `src/pages/{Login,Register,ForgotPassword,Dashboard}.jsx` + `App.jsx` + `lib/api.js` (تجديد جلسة تلقائي، مفاتيح تخزين منفصلة عن الأدمن).

**للنشر على Cloudflare Pages:**
```bash
cd user-dashboard
npm install && npm run build
npx wrangler pages deploy dist --project-name user-dashboard
```
أو ربط المستودع في Pages مع: Build command `cd user-dashboard && npm install && npm run build`، Output `user-dashboard/dist`، والمتغيرات `VITE_API_URL=https://app-backend-api.tapwin.workers.dev`.

---

## 7. Codemagic — الحالة والإعدادات

- Workflow: `tap-win-android` (Mac mini M2) — بيانات التوقيع مدمجة حالياً في `codemagic.yaml` (حل مؤقت).
- Artifacts الناتجة المتوقعة: `TapWin-latest.apk` + `TapWin-latest.aab`.
- **قبل أي بناء:** تأكد أن Commit المعروض هو الأحدث المدفوع (وليس كوميتاً قديماً مثل `0052bda`).

---

## 8. المهام القادمة (To-Do)

- [ ] عمل commit & push للتعديلات الجارية (قسم 2) والتحقق من HEAD عبر GitHub API.
- [ ] إعادة نشر الـ Worker: `cd backend && npx wrangler deploy` (لتفعيل email_codes + إصلاح name alias).
- [ ] بدء بناء Codemagic جديد والتأكد من نجاح assembleRelease وظهور APK/AAB.
- [ ] اختبار حي: register → وصول رمز → verify → دخول اللوحة / login عادي / Google sign-in.
- [ ] نشر user-dashboard على Cloudflare Pages.
- [ ] ربط Resend API لإرسال بريد فعلي.
- [ ] إضافة بصمتي SHA1/SHA256 في Firebase Console لتطبيق `tap.win.app` (إذا لم تُضف بعد).

---

## 9. تنبيهات أمنية (عاجل)

1. توكن GitHub `ghp_...` ظهر علناً عدة مرات → **أبطِله** وأنشئ واحداً جديداً بصلاحيations repo فقط.
2. توكن Cloudflare ومفاتيح R2 ورابط Neon وكلمات مرور keystore والأدمن ظهرت في المحادثة → أبطل/استبدلها جميعاً.
3. بيانات التوقيع مضمّنة حالياً في `codemagic.yaml` بالمستودع → انقلها إلى Codemagic Secrets وأزلها من الملف بعد نجاح أول بناء مستقر.
