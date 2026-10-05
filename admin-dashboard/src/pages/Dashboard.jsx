import { useEffect, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import Icon from '../components/Icons3D';
import { getStats } from '../lib/api';

const CARDS = [
  { key: 'total_users', label: 'إجمالي المستخدمين', icon: 'users', tile: '#101010', c1: '#e9e4ff', c2: '#c4b5fd' },
  { key: 'online_now', label: 'متصل الآن', icon: 'activity', tile: '#101010', c1: '#d1fae5', c2: '#6ee7b7' },
  { key: 'active_users', label: 'حسابات مفعّلة', icon: 'check', tile: '#101010', c1: '#cffafe', c2: '#67e8f9' },
  { key: 'disabled_users', label: 'حسابات معطّلة', icon: 'power', tile: '#101010', c1: '#fee2e2', c2: '#fca5a5' },
  { key: 'new_this_week', label: 'تسجيلات هذا الأسبوع', icon: 'plus', tile: '#101010', c1: '#fef3c7', c2: '#fcd34d' },
];

const chartTooltipStyle = {
  background: '#141a2e', border: '1px solid rgba(255,255,255,.15)', borderRadius: 12,
  fontFamily: 'Cairo', direction: 'rtl',
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getStats().then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="card" style={{ color: 'var(--danger)' }}>تعذر تحميل الإحصائيات: {error}</div>;
  if (!data) return <div className="spinner" />;

  const { stats, charts } = data;
  const days = mergeSeries(charts.signups, charts.logins);

  return (
    <div>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Icon name="dashboard" size={28} c1="#a5b4fc" c2="#ffffff" />
          نظرة عامة
        </h1>
        <p style={{ color: 'var(--muted)', marginTop: 6 }}>إحصائيات التطبيق وحالة الاتصال اللحظية</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16, marginBottom: 24 }}>
        {CARDS.map((card) => (
          <div className="card" key={card.key} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div className="icon-tile" style={{ '--tile': card.tile }}>
              <Icon name={card.icon} size={24} c1={card.c1} c2={card.c2} />
            </div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 900 }}>{stats[card.key] ?? 0}</div>
              <div style={{ color: 'var(--muted)', fontSize: 13 }}>{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, fontSize: 16 }}>
          <Icon name="chart" size={20} c1="#a5f3fc" c2="#ffffff" />
          النشاط خلال آخر ١٤ يومًا
        </h3>
        <div dir="ltr" style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer>
            <AreaChart data={days} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="gradSign" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.03} />
                </linearGradient>
                <linearGradient id="gradLog" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.07)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: '#9aa7c7', fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: '#9aa7c7', fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Area type="monotone" dataKey="signups" name="تسجيلات جديدة" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#gradSign)" />
              <Area type="monotone" dataKey="logins" name="عمليات دخول" stroke="#ffffff" strokeWidth={2.5} fill="url(#gradLog)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function mergeSeries(signups = [], logins = []) {
  const map = new Map();
  const today = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    map.set(d.toISOString().slice(0, 10), { day: d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' }), signups: 0, logins: 0 });
  }
  signups.forEach((s) => { const e = map.get(s.day); if (e) e.signups = s.n; });
  logins.forEach((l) => { const e = map.get(l.day); if (e) e.logins = l.n; });
  return [...map.values()];
}
