import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as api from '../lib/api.js';
import { track } from '../main.jsx';
import { Alert, OtpInput, PasswordField } from '../components/ui.jsx';
import { IconLock, IconMail } from '../components/icons.jsx';

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  // Verification step state (unverified accounts must confirm via emailed code).
  const [verify, setVerify] = useState(null); // { access_token, dev_code? }
  const [info, setInfo] = useState('');
  const [code, setCode] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      const res = await api.login(email.trim(), password);
      if (res.user && res.user.role === 'admin') {
        throw new Error('هذا حساب أدمن، استخدم لوحة تحكم الأدمن للدخول.');
      }
      // Account exists but email not confirmed yet -> show OTP step.
      if (res.email_verified === false) {
        api.setSession(res.tokens.accessToken, res.tokens.refreshToken, res.user);
        setVerify({ access_token: res.tokens.accessToken });
        setInfo(res.dev_code ? `وضع التطوير: رمز التحقق هو ${res.dev_code}` : (res.message || 'أدخل رمز التحقق المرسل إلى بريدك'));
        return;
      }
      api.setSession(res.tokens.accessToken, res.tokens.refreshToken, res.user);
      track('web_login', { method: 'password' });
      nav('/dashboard', { replace: true });
    } catch (ex) {
      setErr(ex.message || 'فشل تسجيل الدخول');
    } finally {
      setBusy(false);
    }
  };

  const doVerify = async (theCode) => {
    setErr(''); setBusy(true);
    try {
      await api.verifyEmail(verify.access_token, theCode);
      track('web_verify_email', {});
      nav('/dashboard', { replace: true });
    } catch (ex) {
      setErr(ex.message || 'رمز التحقق غير صحيح أو منتهي الصلاحية');
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setErr(''); setBusy(true);
    try {
      const r = await api.resendVerification();
      setInfo(r?.dev_code ? `وضع التطوير: الرمز الجديد هو ${r.dev_code}` : 'تم إرسال رمز تحقق جديد إلى بريدك');
    } catch (ex) {
      setErr(ex.message || 'تعذر إعادة الإرسال');
    } finally {
      setBusy(false);
    }
  };

  if (verify) {
    return (
      <div className="auth-shell">
        <div className="card auth-card">
          <div className="icon-tile icon-tile-lg" style={{ '--tile': 'linear-gradient(135deg,#f59e0b,#d97706)' }}><IconMail /></div>
          <h1 className="auth-title">تأكيد البريد الإلكتروني</h1>
          <p className="auth-sub">حسابك موجود لكن لم يتم تفعيله بعد.<br />أدخل الرمز المرسل إلى <b dir="ltr">{email}</b></p>
          <Alert kind={info ? 'info' : 'error'}>{err || info}</Alert>
          <OtpInput value={code} onChange={setCode} onDone={doVerify} />
          <button className="btn btn-block" disabled={busy || code.length !== 6} onClick={() => doVerify(code)}>
            {busy ? 'جارٍ التحقق…' : 'تأكيد الرمز والدخول'}
          </button>
          <div className="auth-links" style={{ justifyContent: 'center', gap: 18 }}>
            <button type="button" onClick={resend}>إعادة إرسال الرمز</button>
            <Link to="/forgot">نسيت كلمة السر؟</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-shell">
      <form className="card auth-card" onSubmit={submit}>
        <div className="icon-tile icon-tile-lg"><IconLock /></div>
        <h1 className="auth-title">تسجيل الدخول</h1>
        <p className="auth-sub">لوحة حساب Tap Win — أدخل بياناتك للوصول إلى لوحتك الخاصة</p>

        <Alert>{err}</Alert>

        <div className="field">
          <label>البريد الإلكتروني</label>
          <input className="input" type="email" dir="ltr" required value={email}
                 onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </div>

        <PasswordField label="كلمة المرور" value={password} onChange={setPassword} />

        <button className="btn btn-block" disabled={busy}>
          {busy ? 'جارٍ التحقق…' : 'دخول'}
        </button>

        <div className="auth-links">
          <Link to="/forgot">نسيت كلمة السر؟</Link>
          <span>ليس لديك حساب؟ <Link to="/register">إنشاء حساب جديد</Link></span>
        </div>
      </form>
    </div>
  );
}
