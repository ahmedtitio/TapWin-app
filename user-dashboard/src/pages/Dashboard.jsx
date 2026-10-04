import React, { useEffect, useState } from 'react';
import * as api from '../lib/api.js';
import { track } from '../main.jsx';
import { Alert, PasswordField, useToast } from '../components/ui.jsx';
import {
  IconHome, IconUser, IconDevices, IconShield, IconActivity, IconKey, IconLogout, IconBolt,
} from '../components/icons.jsx';

const ago = (d) => {
  if (!d) return '—';
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'الآن';
  if (s < 3600) return `منذ ${Math.floor(s / 60)} دقيقة`;
  if (s < 86400) return `منذ ${Math.floor(s / 3600)} ساعة`;
  return `منذ ${Math.floor(s / 86400)} يوم`;
};

/* ----------------------------- Overview ----------------------------- */
function Overview({ user, me, devices, activity }) {
  const activeDevice = devices.find((dv) => dv.is_active || dv.active);
  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">مرحباً، {user.full_name || user.email} 👋</div>
          <div className="page-desc">نظرة سريعة على حسابك وأجهزتك</div>
        </div>
        <span className={`badge ${user.email_verified ? 'badge-online' : 'badge-warn'}`}>
          <span className={`dot ${user.email_verified ? 'dot-online' : ''}`} />
          {user.email_verified ? 'البريد موثّق' : 'بانتظار تأكيد البريد'}
        </span>
      </div>

      <div className="grid grid-3" style={{ marginBottom: 20 }}>
        <div className="card stat-card">
          <div className="icon-tile" style={{ '--tile': 'linear-gradient(135deg,#34d399,#059669)' }}><IconShield /></div>
          <div>
            <div className="stat-value">{devices.length}</div>
            <div className="stat-label">جهاز مرتبط بالحساب</div>
          </div>
        </div>
        <div className="card stat-card">
          <div className="icon-tile" style={{ '--tile': 'linear-gradient(135deg,#a78bfa,#6d28d9)' }}><IconActivity /></div>
          <div>
            <div className="stat-value">{activity.length}</div>
            <div className="stat-label">آخر أحداث النشاط</div>
          </div>
        </div>
        <div className="card stat-card">
          <div className="icon-tile" style={{ '--tile': 'linear-gradient(135deg,#fbbf24,#d97706)' }}><IconBolt /></div>
          <div>
            <div className="stat-value">{activeDevice ? 'نشط' : 'غير متصل'}</div>
            <div className="stat-label">حالة التطبيق الآن</div>
          </div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="list-item">
            <div className="icon-tile" style={{ '--tile': 'linear-gradient(135deg,#67e8f9,#0891b2)' }}><IconDevices /></div>
            <div>
              <div className="list-title">الجهاز الحالي</div>
              <div className="list-sub">
                {activeDevice
                  ? `${activeDevice.device_name || 'جهاز'} — آخر ظهور ${ago(activeDevice.last_seen_at || activeDevice.last_seen)}`
                  : 'لا يوجد جهاز نشط حالياً'}
              </div>
            </div>
          </div>
          <div className="list-item">
            <div className="icon-tile" style={{ '--tile': 'linear-gradient(135deg,#86efac,#16a34a)' }}><IconUser /></div>
            <div>
              <div className="list-title">عضو منذ</div>
              <div className="list-sub">{new Date(user.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 8 }}>آخر النشاطات</h3>
          {activity.length === 0 && <div className="list-sub">لا يوجد نشاط بعد</div>}
          {activity.slice(0, 6).map((a, i) => (
            <div className="list-item" key={i}>
              <div className="icon-tile" style={{ width: 40, height: 40, borderRadius: 12, '--tile': 'linear-gradient(135deg,#a5b4fc,#4f46e5)' }}><IconActivity size={18} /></div>
              <div>
                <div className="list-title">{a.action || a.event || a.type || 'حدث'}</div>
                <div className="list-sub">{ago(a.created_at)}{a.platform ? ` · ${a.platform}` : ''}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* ----------------------------- Profile ----------------------------- */
function Profile({ user, setUser, toast }) {
  const [fullName, setFullName] = useState(user.full_name || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const save = async () => {
    setErr(''); setBusy(true);
    try {
      const res = await api.updateMe({ full_name: fullName.trim() });
      const u = res.user || { ...user, full_name: fullName.trim() };
      setUser(u);
      localStorage.setItem('user_account', JSON.stringify(u));
      toast('success', 'تم حفظ بياناتك بنجاح');
    } catch (ex) {
      setErr(ex.message || 'تعذر الحفظ');
    } finally { setBusy(false); }
  };

  return (
    <>
      <div className="page-head"><div><div className="page-title">الملف الشخصي</div><div className="page-desc">عدّل اسمك وغيّر كلمة المرور</div></div></div>
      <div className="grid grid-2">
        <div className="card">
          <Alert>{err}</Alert>
          <div className="field">
            <label>الاسم الكامل</label>
            <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="field">
            <label>البريد الإلكتروني</label>
            <input className="input" dir="ltr" value={user.email} disabled />
          </div>
          <button className="btn" disabled={busy} onClick={save}>{busy ? 'جارٍ الحفظ…' : 'حفظ التغييرات'}</button>
        </div>
        <ChangePasswordCard toast={toast} />
      </div>
    </>
  );
}

function ChangePasswordCard({ toast }) {
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    setErr('');
    if (next.length < 8) return setErr('كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل');
    if (next !== confirm) return setErr('كلمتا المرور غير متطابقتين');
    setBusy(true);
    try {
      await api.changePassword(cur, next);
      toast('success', 'تم تغيير كلمة المرور');
      setCur(''); setNext(''); setConfirm('');
    } catch (ex) {
      setErr(ex.message || 'تعذر تغيير كلمة المرور');
    } finally { setBusy(false); }
  };

  return (
    <div className="card">
      <h3 style={{ marginBottom: 14 }}>تغيير كلمة المرور</h3>
      <Alert>{err}</Alert>
      <PasswordField label="كلمة المرور الحالية" value={cur} onChange={setCur} />
      <PasswordField label="كلمة المرور الجديدة" value={next} onChange={setNext} autoComplete="new-password" />
      <PasswordField label="تأكيد كلمة المرور الجديدة" value={confirm} onChange={setConfirm} autoComplete="new-password" />
      <button className="btn btn-danger" disabled={busy} onClick={submit}>{busy ? 'جارٍ التغيير…' : 'تغيير كلمة المرور'}</button>
    </div>
  );
}

/* ----------------------------- Devices ----------------------------- */
function Devices({ devices }) {
  return (
    <>
      <div className="page-head"><div><div className="page-title">أجهزتي</div><div className="page-desc">الأجهزة التي سجّلت الدخول بحسابك عبر تطبيق Tap Win أو الويب</div></div></div>
      <div className="card">
        {devices.length === 0 && <div className="list-sub">لا توجد أجهزة مرتبطة بعد</div>}
        {devices.map((dv, i) => {
          const isOn = dv.is_active || dv.active;
          return (
            <div className="list-item" key={i}>
              <div className="icon-tile" style={{ '--tile': isOn ? 'linear-gradient(135deg,#86efac,#16a34a)' : 'linear-gradient(135deg,#94a3b8,#475569)' }}>
                <IconDevices />
              </div>
              <div style={{ flex: 1 }}>
                <div className="list-title">{dv.device_name || dv.name || 'جهاز'}</div>
                <div className="list-sub">{dv.platform || 'غير معروف'} · آخر ظهور {ago(dv.last_seen_at || dv.last_seen)}</div>
              </div>
              <span className={`badge ${isOn ? 'badge-online' : 'badge-offline'}`}>
                <span className={`dot ${isOn ? 'dot-online' : ''}`} />{isOn ? 'نشط' : 'غير متصل'}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ----------------------------- Activity ----------------------------- */
function Activity({ activity }) {
  return (
    <>
      <div className="page-head"><div><div className="page-title">سجل النشاط</div><div className="page-desc">أحدث عمليات الدخول والأحداث على حسابك</div></div></div>
      <div className="card">
        {activity.length === 0 && <div className="list-sub">لا يوجد نشاط بعد</div>}
        {activity.map((a, i) => (
          <div className="list-item" key={i}>
            <div className="icon-tile" style={{ width: 40, height: 40, borderRadius: 12, '--tile': 'linear-gradient(135deg,#5eead4,#0d9488)' }}><IconActivity size={18} /></div>
            <div style={{ flex: 1 }}>
              <div className="list-title">{a.action || a.event || a.type || 'حدث'}</div>
              <div className="list-sub">{ago(a.created_at)}{a.ip ? ` · ${a.ip}` : ''}{a.platform ? ` · ${a.platform}` : ''}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ----------------------------- Shell ------------------------------- */
const NAV = [
  { to: '/dashboard', label: 'الرئيسية', icon: <IconHome size={19} /> },
  { to: '/profile', label: 'الملف الشخصي', icon: <IconUser size={19} /> },
  { to: '/devices', label: 'أجهزتي', icon: <IconDevices size={19} /> },
  { to: '/activity', label: 'سجل النشاط', icon: <IconActivity size={19} /> },
];

export default function Dashboard() {
  const [path, setPath] = useState(window.location.pathname);
  const [user, setUser] = useState(api.getUser() || {});
  const [devices, setDevices] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const { setToast, node: toastNode } = useToast();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const me = await api.getMe();
        if (!alive) return;
        const u = me.user || me;
        setUser(u);
        localStorage.setItem('user_account', JSON.stringify(u));
        setDevices(me.devices || []);
        setActivity(me.activity || me.login_logs || []);
      } catch { /* handled by api layer */ }
      finally { if (alive) setLoading(false); }
    })();
    track('web_screen_view', { screen: 'dashboard' });
    const onNav = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onNav);
    return () => { alive = false; window.removeEventListener('popstate', onNav); };
  }, []);

  const navigate = (to) => { window.history.pushState({}, '', to); setPath(to); };

  const doLogout = async () => {
    await api.logout();
    api.clearSession();
    window.location.href = '/login';
  };

  if (loading) return <div className="spinner" />;

  const page =
    path.startsWith('/profile') ? <Profile user={user} setUser={setUser} toast={setToast} />
    : path.startsWith('/devices') ? <Devices devices={devices} />
    : path.startsWith('/activity') ? <Activity activity={activity} />
    : <Overview user={user} me={null} devices={devices} activity={activity} />;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="avatar3d">TW</div>
          <div>
            <div className="brand-name">Tap Win</div>
            <div className="brand-sub">لوحة المستخدم</div>
          </div>
        </div>
        {NAV.map((n) => (
          <button key={n.to} className={`nav-item${path.startsWith(n.to) ? ' active' : ''}`} onClick={() => navigate(n.to)}>
            {n.icon}{n.label}
          </button>
        ))}
        <div className="sidebar-foot">
          <button className="nav-item" onClick={doLogout}><IconLogout size={19} />تسجيل الخروج</button>
        </div>
      </aside>
      <main className="main">{page}</main>
      {toastNode}
    </div>
  );
}
