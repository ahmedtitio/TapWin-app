import { useEffect, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import Icon from '../components/Icons3D';
import { getAnalytics } from '../lib/api';
import { gaEnabled, trackEvent } from '../lib/analytics';

const CARDS = [
  { key: 'events_24h', label: 'أحداث آخر ٢٤ ساعة', icon: 'bolt', tile: '#101010', c1: '#fef3c7', c2: '#fcd34d' },
  { key: 'dau', label: 'مستخدمون نشطون يوميًا (DAU)', icon: 'activity', tile: '#101010', c1: '#d1fae5', c2: '#6ee7b7' },
  { key: 'wau', label: 'مستخدمون نشطون أسبوعيًا (WAU)', icon: 'users', tile: '#101010', c1: '#e9e4ff', c2: '#c4b5fd' },
  { key: 'events_total', label: 'إجمالي الأحداث', icon: 'chart', tile: '#101010', c1: '#cffafe', c2: '#67e8f9' },
];

const chartTooltipStyle = {
  background: '#141a2e', border: '1px solid rgba(255,255,255,.15)', borderRadius: 12,
  fontFamily: 'Cairo', direction: 'rtl',
};

const EVENT_LABELS = {
  app_open: 'فتح التطبيق', screen_view: 'عرض شاشة', login_success: 'دخول ناجح',
  register_success: 'تسجيل جديد', logout: 'تسجيل خروج', profile_update: 'تحديث الملف',
  google_sign_in: 'دخول Google',
};

export default function Analytics() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    trackEvent('analytics', 'open_page', 'admin analytics');
    getAnalytics().then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="card" style={{ color: 'var(--danger)' }}>تعذر تحميل الإحصائيات: {error}</div>;
  if (!data) return <div className="spinner" />;

  const { totals, daily, top_events: topEvents, platforms, recent } = data;
  const days = fillDays(daily);

  return (
    <div>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Icon name="globe" size={28} c1="#a5b4fc" c2="#ffffff" />
          إحصائيات التطبيق
        </h1>
        <p style={{ color: 'var(--muted)', marginTop: 6 }}>
          تحليلات أولية من أحداث التطبيق + Google Analytics (GA4) {gaEnabled ? '— متصل ✓' : '— غير مُفعّل (أضف VITE_GA_MEASUREMENT_ID)'}
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16, marginBottom: 24 }}>
        {CARDS.map((card) => (
          <div className="card" key={card.key} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div className="icon-tile" style={{ '--tile': card.tile }}>
              <Icon name={card.icon} size={24} c1={card.c1} c2={card.c2} />
            </div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 900 }}>{totals[card.key] ?? 0}</div>
              <div style={{ color: 'var(--muted)', fontSize: 13 }}>{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="card">
          <h3 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, fontSize: 16 }}>
            <Icon name="chart" size={20} c1="#a5f3fc" c2="#ffffff" />
            الأحداث اليومية — آخر ١٤ يومًا
          </h3>
          <div dir="ltr" style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <AreaChart data={days} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradEv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.07)" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: '#9aa7c7', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: '#9aa7c7', fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Area type="monotone" dataKey="events" name="أحداث" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#gradEv)" />
                <Area type="monotone" dataKey="users" name="مستخدمون" stroke="#ffffff" strokeWidth={2.5} fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, fontSize: 16 }}>
            <Icon name="bolt" size={20} c1="#fde68a" c2="#f59e0b" />
            أكثر الأحداث — آخر ٧ أيام
          </h3>
          <div dir="ltr" style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={topEvents.map((e) => ({ name: EVENT_LABELS[e.event] || e.event, n: e.n }))}
                layout="vertical" margin={{ top: 4, right: 12, left: 40, bottom: 4 }}>
                <XAxis type="number" allowDecimals={false} tick={{ fill: '#9aa7c7', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fill: '#c7d2fe', fontSize: 11, fontFamily: 'Cairo' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: 'rgba(255,255,255,.05)' }} />
                <Bar dataKey="n" name="عدد" radius={[0, 8, 8, 0]} fill="#8b5cf6" barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        <div className="card">
          <h3 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, fontSize: 16 }}>
            <Icon name="device" size={20} c1="#bbf7d0" c2="#10b981" />
            الأجهزة حسب المنصة
          </h3>
          {platforms.length === 0 && <p style={{ color: 'var(--muted)' }}>لا توجد بيانات بعد</p>}
          {platforms.map((p) => (
            <div key={p.platform} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ textTransform: 'capitalize' }}>{p.platform}</span>
              <strong>{p.devices} جهاز</strong>
            </div>
          ))}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, fontSize: 16 }}>
            <Icon name="clock" size={20} c1="#fecdd3" c2="#f43f5e" />
            أحدث الأحداث
          </h3>
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {recent.length === 0 && <p style={{ color: 'var(--muted)' }}>لا توجد بيانات بعد</p>}
            {recent.map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '9px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                <div>
                  <span className="badge">{EVENT_LABELS[r.event] || r.event}</span>
                  <div style={{ color: 'var(--muted)', marginTop: 4 }}>{r.full_name || 'زائر'} · {r.platform}</div>
                </div>
                <time style={{ color: 'var(--muted)', whiteSpace: 'nowrap', fontSize: 12 }}>
                  {new Date(r.created_at).toLocaleString('ar-EG')}
                </time>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function fillDays(daily = []) {
  const map = new Map();
  const today = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    map.set(d.toISOString().slice(0, 10), { day: d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' }), events: 0, users: 0 });
  }
  daily.forEach((s) => { const e = map.get(s.day); if (e) { e.events = s.events; e.users = s.users; } });
  return [...map.values()];
}
