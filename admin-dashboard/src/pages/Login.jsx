import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/Icons3D';
import { PasswordInput } from '../components/ui';
import { useToast } from '../components/Toast';
import { login, setSession } from '../lib/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const data = await login(email, password);
      if (data.user.role !== 'admin') {
        toast('هذا الحساب ليس لديه صلاحيات المشرف', 'error');
        return;
      }
      setSession(data.tokens.accessToken, data.user);
      navigate('/');
    } catch (err) {
      toast(err.message || 'فشل تسجيل الدخول', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 20 }}>
      <div className="card" style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <div className="icon-tile" style={{ '--tile': 'linear-gradient(135deg,#6d5dfc,#22d3ee)', margin: '0 auto 14px', width: 64, height: 64, borderRadius: 20 }}>
            <Icon name="shield" size={32} c1="#eef2ff" c2="#c7f5ff" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 900 }}>لوحة تحكم الأدمن</h1>
          <p style={{ color: 'var(--muted)', fontSize: 13.5, marginTop: 6 }}>سجّل دخولك للوصول إلى إدارة التطبيق</p>
        </div>

        <form onSubmit={submit}>
          <div className="field">
            <label>البريد الإلكتروني</label>
            <input
              className="input" type="email" dir="ltr" required value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="admin@example.com" autoComplete="email"
            />
          </div>

          <PasswordInput label="كلمة السر" value={password} onChange={setPassword} placeholder="••••••••" autoComplete="current-password" />

          <button className="btn" style={{ width: '100%', marginTop: 6 }} disabled={busy}>
            <Icon name="key" size={17} c1="#e9e4ff" c2="#c4b5fd" />
            {busy ? 'جارٍ التحقق…' : 'تسجيل الدخول'}
          </button>

          <button type="button" className="btn btn-ghost" style={{ width: '100%', marginTop: 10 }} onClick={() => navigate('/forgot')}>
            <Icon name="mail" size={16} c1="#a5b4fc" c2="#6d5dfc" />
            نسيت كلمة السر؟
          </button>
        </form>
      </div>
    </div>
  );
}
