# خطوات تفعيل إرسال البريد الإلكتروني عبر Resend

## 1. إنشاء مفتاح API صحيح من Resend

1. اذهب إلى https://resend.com/api-keys
2. اضغط "Create API Key"
3. سمّه باسم: `TapWin-Backend`
4. الصلاحيات: Sending access = Can send
5. انسخ المفتاح الجديد (يبدأ بـ `re_`)

## 2. إضافة المفتاح إلى Cloudflare Worker

بعد الحصول على المفتاح، نفّذ هذا الأمر في مجلد backend/:

```bash
cd /workspace/backend
echo "re_YOUR_NEW_KEY_HERE" | CLOUDFLARE_API_TOKEN=$CLOUDFLARE_API_TOKEN npx wrangler secret put RESEND_API_KEY --name app-backend-api
```

أو أخبرني بالمفتاح وسأضيفه مباشرة.

## 3. إعداد نطاق البريد (اختياري لكن موصى به)

إذا أردت إرسال البريد من دومينك الخاص بدلاً من `onboarding@resend.dev`:

1. أضف دومينك في Resend → Domains
2. عدّل DNS records حسب تعليمات Resend
3. بعد التحقق، غيّر MAIL_FROM في الكود أو أضف secret:

```bash
echo "noreply@yourdomain.com" | CLOUDFLARE_API_TOKEN=$CLOUDFLARE_API_TOKEN npx wrangler secret put MAIL_FROM --name app-backend-api
```

## 4. اختبار الإرسال

بعد إضافة المفتاح، جرّب تسجيل مستخدم جديد في التطبيق وسترسل رسالة تحقق فعلية.

---

⚠️ **ملاحظة أمنية:** المفتاح الذي أرسلته سابقاً ليس مفتاح Resend — يبدو أنه توكن JWT من خدمة أخرى. يجب إبطال أي توكن تم مشاركته نصاً صريحاً وإنشاء بدائل جديدة.
