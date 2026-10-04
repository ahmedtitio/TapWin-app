import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as api from '../lib/api.js';
import { track } from '../main.jsx';
import { Alert, OtpInput, PasswordField } from '../components/ui.jsx';
import { IconKey } from '../components/icons.jsx';

export default function ForgotPassword() {
  const nav = useNavigate();
  const [step, setStep] = useState('email'); // email | reset
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');

  const sendCode = async (e) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      const res = await api.forgotPassword(email.trim());
      track('web_forgot_password', {});
      if (res.dev_code) setInfo(`وضع التطوير: رمز إعادة التعيين هو ${res.dev_code}`);
      else setInfo(res.message || 'إذا كان البريد مسجلاً فسيصلك رمز مكوّن من 6 أرقام');
      setStep('reset');
    } catch (ex) {
      setErr(ex.message || 'تعذر إرسال الرمز');
    } finally {
      setBusy(false);
    }
  };

  const doReset = async () => {
    setErr('');
    if (password.length < 8) return setErr('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
    if (password !== confirm) return setErr('كلمتا المرور غير متطابقتين');
    setBusy(true);
    try {
      await api.resetPassword(code, password);
      track('web_reset_password', {});
      nav('/login', { replace: true });
    } catch (ex) {
      setErr(ex.message || 'الرمز غير صحيح أو منتهي الصلاحية');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="card auth-card">
        <div className="icon-tile icon-tile-lg" style={{ '--tile': 'linear-gradient(135deg,#fbbf24,#d97706)' }}><IconKey /></div>

        {step === 'email' ? (
          <form onSubmit={sendCode}>
            <h1 className="auth-title">نسيت كلمة السر؟</h1>
            <p className="auth-sub">أدخل بريدك وسنرسل لك رمزاً لإعادة تعيين كلمة المرور</p>
            <Alert>{err}</Alert>
            <div className="field">
              <label>البريد الإلكتروني</label>
              <input className="input" type="email" dir="ltr" required value={email}
                     onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <button className="btn btn-block" disabled={busy}>{busy ? 'جارٍ الإرسال…' : 'إرسال رمز التحقق'}</button>
            <div className="auth-links" style={{ justifyContent: 'center' }}>
              <Link to="/login">العودة لتسجيل الدخول</Link>
            </div>
          </form>
        ) : (
          <div>
            <h1 className="auth-title">إعادة تعيين كلمة المرور</h1>
            <p className="auth-sub">أدخل الرمز المرسل إلى <b dir="ltr">{email}</b> ثم كلمة المرور الجديدة</p>
            <Alert kind={info && !err ? 'info' : 'error'}>{err || info}</Alert>

            <OtpInput value={code} onChange={setCode} />

            <PasswordField label="كلمة المرور الجديدة" value={password} onChange={setPassword} autoComplete="new-password" />
            <PasswordField label="تأكيد كلمة المرور" value={confirm} onChange={setConfirm} autoComplete="new-password" />

            <button className="btn btn-block" disabled={busy || code.length !== 6} onClick={doReset}>
              {busy ? 'جارٍ الحفظ…' : 'تعيين كلمة المرور'}
            </button>
            <div className="auth-links" style={{ justifyContent: 'center', gap: 18 }}>
              <button type="button" onClick={() => setStep('email')}>تغيير البريد</button>
              <Link to="/login">تسجيل الدخول</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
