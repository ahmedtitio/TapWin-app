# تفعيل إرسال البريد الإلكتروني عبر Resend — ✅ مكتمل

## الحالة الحالية (2026-10-04)
- [x] مفتاح Resend API (`re_...`) تم إنشاؤه والتحقق منه
- [x] أُضيف كـ Secret للـ Worker: `npx wrangler secret put RESEND_API_KEY --name app-backend-api`
- [x] أُعيد نشر الـ Worker: https://app-backend-api.tapwin.workers.dev
- [x] اختبار مباشر: رسالة تجريبية وصلت إلى بريد الحساب (id: 01a106fc-a7ee-...)
- [x] اختبار التسجيل: `/api/auth/register` استجاب بدون `dev_code` = الرمز أُرسل فعلياً عبر Resend

## ⚠️ قيد حالي على الخطة المجانية Resend
طالما تُرسل الرسائل من `onboarding@resend.dev`، **يمكن الإرسال فقط إلى بريد صاحب الحساب**
(ah01110692728@gmail.com). أي مستخدم آخر لن تصله الرسالة.

## الحل النهائي: توثيق نطاق بريدك الخاص
1. اذهب إلى https://resend.com/domains → Add Domain (مثلاً `tapwin.app` أو أي دومين تملكه)
2. أضف سجلات DNS المطلوبة (MX/TXT/SPF + DKIM) في Cloudflare DNS للدومين
3. اضغط Verify في Resend (يستغرق دقائق عادة)
4. بعد التوثيق، نفّذ:
```bash
cd backend
echo "Tap Win <noreply@yourdomain.com>" | npx wrangler secret put MAIL_FROM --name app-backend-api
npx wrangler deploy
```
5. عندها ستصل رسائل التحقق لجميع المستخدمين بلا قيود.

## ملاحظة أمنية
مفاتيح Resend وCloudflare وGitHub وNeon شاركت نصاً صريحاً في المحادثة — يُنصح بإبطالها وإنشاء بدائل وحفظها في أسرار فقط.
