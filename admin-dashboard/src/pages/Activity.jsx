import { useEffect, useState } from 'react';
import Icon from '../components/Icons3D';
import { fmtDate } from '../components/ui';
import { getActivity } from '../lib/api';

export default function Activity() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getActivity().then((d) => setRows(d.activity)).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="card" style={{ color: 'var(--danger)' }}>{error}</div>;
  if (!rows) return <div className="spinner" />;

  return (
    <div>
      <header style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Icon name="activity" size={28} c1="#6ee7b7" c2="#10b981" />
          سجل النشاط
        </h1>
        <p style={{ color: 'var(--muted)', marginTop: 6 }}>آخر ٥٠ محاولة دخول على التطبيق ولوحة الأدمن</p>
      </header>

      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        <table>
          <thead>
            <tr><th>المستخدم</th><th>البريد</th><th>النتيجة</th><th>عنوان IP</th><th>الوقت</th></tr>
          </thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.id}>
                <td style={{ fontWeight: 700 }}>{l.full_name || 'غير معروف'}</td>
                <td dir="ltr" style={{ color: 'var(--muted)' }}>{l.email}</td>
                <td>
                  <span className={`badge ${l.success ? 'badge-online' : 'badge-disabled'}`}>
                    <Icon name={l.success ? 'check' : 'x'} size={12} c1={l.success ? '#a7f3d0' : '#fecaca'} c2={l.success ? '#34d399' : '#ef4444'} />
                    {l.success ? 'دخول ناجح' : 'محاولة فاشلة'}
                  </span>
                </td>
                <td dir="ltr" style={{ color: 'var(--muted)' }}>{l.ip || '—'}</td>
                <td style={{ color: 'var(--muted)', fontSize: 13 }}>{fmtDate(l.created_at)}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)', padding: 30 }}>لا يوجد نشاط بعد</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
