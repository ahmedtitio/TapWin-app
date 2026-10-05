import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/Icons3D';
import { PasswordInput } from '../components/ui';
import { useToast } from '../components/Toast';
import { forgotPassword, resetPassword } from '../lib/api';

export default function ForgotPassword() {
  const [step, setStep] = useState(1); // 1 = request link, 2 = reset with token
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  const sendLink = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const data = await forgotPassword(email);
      toast('تم إنشاء رابط إعادة التعيين');
      // In dev (no SMTP configured) the API returns the raw reset URL — prefill the token.
      if (data.reset_url) {
        const m = data.reset_url.match(/token=([^&]+)/);
        if (m) setToken(decodeURIComponent(m[1]));
      }
      setStep(2);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const doReset = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await resetPassword(token, password);
      toast('تم تعيين كلمة سر جديدة، يمكنك تسجيل الدخول الآن');
      navigate('/login');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 20 }}>
      <div className="card" style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <div className="icon-tile" style={{ '--tile': '#101010', margin: '0 auto 14px' }}>
            <Icon name="lock" size={24} c1="#fef3c7" c2="#fecaca" />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 900 }}>استعادة كلمة السر</h1>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 6 }}>
            {step === 1 ? 'أدخل بريدك الإلكتروني لإنشاء رابط إعادة التعيين' : 'أدخل الرمز وكلمة السر الجديدة'}
          </p>
        </div>

        {step === 1 ? (
          <form onSubmit={sendLink}>
            <div className="field">
              <label>البريد الإلكتروني</label>
              <input className="input" type="email" dir="ltr" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <button className="btn" style={{ width: '100%' }} disabled={busy}>
              <Icon name="mail" size={16} c1="#e9e4ff" c2="#c4b5fd" />
              {busy ? 'جارٍ الإرسال…' : 'إرسال رابط إعادة التعيين'}
            </button>
          </form>
        ) : (
          <form onSubmit={doReset}>
            <div className="field">
              <label>رمز إعادة التعيين</label>
              <input className="input" dir="ltr" required value={token} onChange={(e) => setToken(e.target.value)} placeholder="reset token" />
            </div>
            <PasswordInput label="كلمة السر الجديدة" value={password} onChange={setPassword} placeholder="8 أحرف على الأقل مع أرقام" autoComplete="new-password" />
            <button className="btn btn-success" style={{ width: '100%' }} disabled={busy}>
              <Icon name="check" size={16} c1="#d1fae5" c2="#6ee7b7" />
              {busy ? 'جارٍ الحفظ…' : 'تعيين كلمة السر'}
            </button>
          </form>
        )}

        <button className="btn btn-ghost" style={{ width: '100%', marginTop: 12 }} onClick={() => navigate('/login')}>
          <Icon name="logout" size={15} c1="#cbd5e1" c2="#94a3b8" />
          العودة لتسجيل الدخول
        </button>
      </div>
    </div>
  );
}
