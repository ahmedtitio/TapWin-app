import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as api from '../lib/api.js';
import { track } from '../main.jsx';
import { Alert, OtpInput, PasswordField } from '../components/ui.jsx';
import { IconUser, IconMail } from '../components/icons.jsx';

export default function Register() {
  const nav = useNavigate();
  const [step, setStep] = useState('form'); // form | verify
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [pending, setPending] = useState(null); // { access_token, dev_code? }
  const [code, setCode] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); 
    if (password.length < 8) return setErr('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
    if (password !== confirm) return setErr('كلمتا المرور غير متطابقتين');
    setBusy(true);
    try {
      const res = await api.register({ full_name: fullName.trim(), email: email.trim(), password });
      track('web_register', {});
      const tok = res.tokens?.accessToken || res.access_token;
      setPending({ access_token: tok, dev_code: res.dev_code });
      if (res.dev_code) setInfo(`وضع التطوير: رمز التحقق هو ${res.dev_code}`);
      else setInfo(res.message || 'أرسلنا رمز تحقق مكوّن من 6 أرقام إلى بريدك الإلكتروني');
      setStep('verify');
    } catch (ex) {
      setErr(ex.message || 'تعذر إنشاء الحساب');
    } finally {
      setBusy(false);
    }
  };

  const verify = async (theCode) => {
    setErr(''); setBusy(true);
    try {
      await api.verifyEmail(pending.access_token, theCode);
      // Verification succeeded — establish a normal session.
      const res = await api.login(email.trim(), password);
      api.setSession(res.tokens.accessToken, res.tokens.refreshToken, res.user);
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
      // The endpoint requires the access token issued right after registration.
      const r = await fetch(`${api.API_URL}/api/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pending.access_token}` },
      });
      const res = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(res.message || 'تعذر إعادة الإرسال');
      if (res?.dev_code) setInfo(`وضع التطوير: الرمز الجديد هو ${res.dev_code}`);
      else setInfo('تم إرسال رمز تحقق جديد إلى بريدك');
    } catch (ex) {
      setErr(ex.message || 'تعذر إعادة الإرسال، حاول بعد قليل');
    } finally {
      setBusy(false);
    }
  };

  if (step === 'verify') {
    return (
      <div className="auth-shell">
        <div className="card auth-card">
          <div className="icon-tile icon-tile-lg" style={{ '--tile': 'linear-gradient(135deg,#f59e0b,#d97706)' }}><IconMail /></div>
          <h1 className="auth-title">تأكيد البريد الإلكتروني</h1>
          <p className="auth-sub">
            أدخل رمز التحقق المرسل إلى<br />
            <b dir="ltr">{email}</b>
          </p>

          <Alert kind={info ? 'info' : 'error'}>{err || info}</Alert>

          <OtpInput value={code} onChange={setCode} onDone={verify} />

          <button className="btn btn-block" disabled={busy || code.length !== 6} onClick={() => verify(code)}>
            {busy ? 'جارٍ التحقق…' : 'تأكيد الرمز والمتابعة'}
          </button>
          <div className="auth-links" style={{ justifyContent: 'center', gap: 18 }}>
            <button type="button" onClick={resend}>إعادة إرسال الرمز</button>
            <Link to="/login">العودة لتسجيل الدخول</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-shell">
      <form className="card auth-card" onSubmit={submit}>
        <div className="icon-tile icon-tile-lg" style={{ '--tile': 'linear-gradient(135deg,#22d3ee,#0891b2)' }}><IconUser /></div>
        <h1 className="auth-title">إنشاء حساب جديد</h1>
        <p className="auth-sub">سجّل بياناتك وسيصلك رمز تأكيد على البريد قبل الدخول للوحة</p>

        <Alert>{err}</Alert>

        <div className="field">
          <label>الاسم الكامل</label>
          <input className="input" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="مثال: أحمد خالد" />
        </div>
        <div className="field">
          <label>البريد الإلكتروني</label>
          <input className="input" type="email" dir="ltr" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </div>
        <PasswordField label="كلمة المرور (8 أحرف على الأقل)" value={password} onChange={setPassword} autoComplete="new-password" />
        <PasswordField label="تأكيد كلمة المرور" value={confirm} onChange={setConfirm} autoComplete="new-password" />

        <button className="btn btn-block" disabled={busy}>
          {busy ? 'جارٍ الإنشاء…' : 'إنشاء الحساب'}
        </button>

        <div className="auth-links" style={{ justifyContent: 'center' }}>
          <span>لديك حساب بالفعل؟ <Link to="/login">تسجيل الدخول</Link></span>
        </div>
      </form>
    </div>
  );
}
