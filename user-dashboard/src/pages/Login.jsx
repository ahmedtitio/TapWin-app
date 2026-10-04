import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as api from '../lib/api.js';
import { track } from '../main.jsx';
import { Alert, PasswordField } from '../components/ui.jsx';
import { IconLock } from '../components/icons.jsx';

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      const res = await api.login(email.trim(), password);
      if (res.user && res.user.role === 'admin') {
        throw new Error('هذا حساب أدمن، استخدم لوحة تحكم الأدمن للدخول.');
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
