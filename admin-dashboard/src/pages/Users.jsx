import { useCallback, useEffect, useState } from 'react';
import Icon from '../components/Icons3D';
import { useToast } from '../components/Toast';
import { Avatar, AccountBadge, StatusBadge, ConfirmModal, Modal, PasswordInput, fmtDate } from '../components/ui';
import { getUsers, createUser, updateUser, deleteUser, revokeUser, getUserDetail, deleteDevice } from '../lib/api';

const FILTERS = [
  { value: '', label: 'الكل' },
  { value: 'online', label: 'متصل الآن' },
  { value: 'offline', label: 'غير متصل' },
  { value: 'active', label: 'مفعّل' },
  { value: 'disabled', label: 'معطّل' },
];

const EMPTY_FORM = { full_name: '', username: '', email: '', phone: '', password: '', role: 'user' };

export default function Users() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const limit = 15;

  // modals
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editUser, setEditUser] = useState(null);      // row being edited (basic fields)
  const [pwUser, setPwUser] = useState(null);          // reset-password target
  const [newPw, setNewPw] = useState('');
  const [delUser, setDelUser] = useState(null);
  const [detail, setDetail] = useState(null);          // user detail + devices
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getUsers({ page, search, status });
      setRows(data.users);
      setTotal(data.total);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search, status]); // eslint-disable-line

  useEffect(() => {
    const t = setTimeout(load, search ? 350 : 0);
    return () => clearTimeout(t);
  }, [load]);

  /* ------------------------------ actions ------------------------------ */
  const submitCreate = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await createUser(form);
      toast('تم إنشاء المستخدم بنجاح');
      setCreating(false);
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      toast(err.message, 'error');
    } finally { setBusy(false); }
  };

  const toggleActive = async (u) => {
    try {
      await updateUser(u.id, { is_active: !u.is_active });
      toast(u.is_active ? 'تم تعطيل الحساب وإنهاء جلساته' : 'تم تفعيل الحساب');
      load();
    } catch (err) { toast(err.message, 'error'); }
  };

  const forceLogout = async (u) => {
    try {
      await revokeUser(u.id);
      toast('تم إنهاء جميع جلسات الجهاز للمستخدم');
      load();
    } catch (err) { toast(err.message, 'error'); }
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await updateUser(editUser.id, {
        full_name: editUser.full_name, email: editUser.email, phone: editUser.phone || null,
      });
      toast('تم تحديث بيانات المستخدم');
      setEditUser(null);
      load();
    } catch (err) { toast(err.message, 'error'); }
    finally { setBusy(false); }
  };

  const submitResetPw = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await updateUser(pwUser.id, { password: newPw });
      toast('تم تعيين كلمة سر جديدة');
      setPwUser(null); setNewPw('');
    } catch (err) { toast(err.message, 'error'); }
    finally { setBusy(false); }
  };

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await deleteUser(delUser.id);
      toast('تم حذف المستخدم نهائيًا');
      setDelUser(null);
      load();
    } catch (err) { toast(err.message, 'error'); }
    finally { setBusy(false); }
  };

  const openDetail = async (u) => {
    try { setDetail(await getUserDetail(u.id)); }
    catch (e) { toast(e.message, 'error'); }
  };

  const removeDevice = async (deviceId) => {
    try {
      await deleteDevice(deviceId);
      toast('تم حذف الجهاز');
      setDetail((d) => ({ ...d, devices: d.devices.filter((x) => x.device_id !== deviceId) }));
    } catch (e) { toast(e.message, 'error'); }
  };

  const pages = Math.max(Math.ceil(total / limit), 1);

  /* -------------------------------- view ------------------------------- */
  return (
    <div>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 12 }}>
            <Icon name="users" size={28} c1="#a5b4fc" c2="#6d5dfc" />
            إدارة المستخدمين
          </h1>
          <p style={{ color: 'var(--muted)', marginTop: 6 }}>{total} مستخدم — حالة الاتصال تُحدَّث لحظيًا من التطبيق</p>
        </div>
        <button className="btn" onClick={() => setCreating(true)}>
          <Icon name="plus" size={17} c1="#e9e4ff" c2="#c4b5fd" />
          مستخدم جديد
        </button>
      </header>

      <div className="card" style={{ padding: 16, marginBottom: 18, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 240px' }}>
          <span style={{ position: 'absolute', insetInlineStart: 12, top: '50%', transform: 'translateY(-50%)', opacity: .6 }}>
            <Icon name="search" size={17} c1="#a5b4fc" c2="#6d5dfc" />
          </span>
          <input
            className="input" style={{ paddingInlineStart: 40 }} placeholder="بحث بالاسم أو اسم المستخدم أو البريد…"
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {FILTERS.map((f) => (
            <button
              key={f.value}
              className={`btn btn-sm ${status === f.value ? '' : 'btn-ghost'}`}
              onClick={() => { setStatus(f.value); setPage(1); }}
            >{f.label}</button>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        {loading ? <div className="spinner" /> : (
          <table>
            <thead>
              <tr>
                <th>المستخدم</th><th>الحالة</th><th>الاتصال بالتطبيق</th><th>الأجهزة</th>
                <th>آخر ظهور</th><th>تاريخ التسجيل</th><th style={{ width: 170 }}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Avatar name={u.full_name} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 800 }}>{u.full_name}</div>
                        <div style={{ color: 'var(--muted)', fontSize: 12.5 }} dir="ltr">@{u.username} · {u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td><AccountBadge isActive={u.is_active} role={u.role} /></td>
                  <td><StatusBadge online={u.online} /></td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: 'var(--muted)' }}>
                      <Icon name="device" size={16} c1="#93c5fd" c2="#3b82f6" /> {u.devices_count}
                    </span>
                  </td>
                  <td style={{ color: 'var(--muted)', fontSize: 13 }}>{fmtDate(u.last_seen)}</td>
                  <td style={{ color: 'var(--muted)', fontSize: 13 }}>{fmtDate(u.created_at)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" title="عرض التفاصيل" onClick={() => openDetail(u)}>
                        <Icon name="eye" size={14} c1="#a5f3fc" c2="#22d3ee" />
                      </button>
                      <button className="btn btn-ghost btn-sm" title={u.is_active ? 'تعطيل الحساب' : 'تفعيل الحساب'} onClick={() => toggleActive(u)}>
                        <Icon name="power" size={14} c1={u.is_active ? '#fca5a5' : '#6ee7b7'} c2={u.is_active ? '#ef4444' : '#10b981'} />
                      </button>
                      <button className="btn btn-ghost btn-sm" title="إنهاء الجلسات" onClick={() => forceLogout(u)}>
                        <Icon name="logout" size={14} c1="#fcd34d" c2="#f59e0b" />
                      </button>
                      <button className="btn btn-ghost btn-sm" title="تعديل" onClick={() => setEditUser({ ...u })}>
                        <Icon name="edit" size={14} c1="#c4b5fd" c2="#8b5cf6" />
                      </button>
                      <button className="btn btn-ghost btn-sm" title="حذف" onClick={() => setDelUser(u)}>
                        <Icon name="trash" size={14} c1="#fca5a5" c2="#ef4444" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--muted)', padding: 30 }}>لا يوجد مستخدمون مطابقون</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 18, alignItems: 'center' }}>
          <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>السابق</button>
          <span style={{ color: 'var(--muted)' }}>صفحة {page} من {pages}</span>
          <button className="btn btn-ghost btn-sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>التالي</button>
        </div>
      )}

      {/* ---------------------------- create modal --------------------------- */}
      {creating && (
        <Modal title="إنشاء مستخدم جديد" onClose={() => setCreating(false)}>
          <form onSubmit={submitCreate}>
            <div className="field"><label>الاسم الكامل</label>
              <input className="input" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field"><label>اسم المستخدم</label>
                <input className="input" dir="ltr" required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></div>
              <div className="field"><label>البريد الإلكتروني</label>
                <input className="input" type="email" dir="ltr" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <div className="field"><label>رقم الهاتف (اختياري)</label>
              <input className="input" dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <PasswordInput label="كلمة السر" value={form.password} onChange={(v) => setForm({ ...form, password: v })} placeholder="8 أحرف على الأقل" autoComplete="new-password" />
            <div className="field"><label>الدور</label>
              <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="user">مستخدم</option>
                <option value="admin">مشرف</option>
              </select>
            </div>
            <button className="btn" style={{ width: '100%' }} disabled={busy}>
              <Icon name="plus" size={16} c1="#e9e4ff" c2="#c4b5fd" /> {busy ? 'جارٍ الإنشاء…' : 'إنشاء'}
            </button>
          </form>
        </Modal>
      )}

      {/* ----------------------------- edit modal ---------------------------- */}
      {editUser && (
        <Modal title="تعديل المستخدم" onClose={() => setEditUser(null)}>
          <form onSubmit={submitEdit}>
            <div className="field"><label>الاسم الكامل</label>
              <input className="input" value={editUser.full_name} onChange={(e) => setEditUser({ ...editUser, full_name: e.target.value })} /></div>
            <div className="field"><label>البريد الإلكتروني</label>
              <input className="input" dir="ltr" value={editUser.email} onChange={(e) => setEditUser({ ...editUser, email: e.target.value })} /></div>
            <div className="field"><label>الهاتف</label>
              <input className="input" dir="ltr" value={editUser.phone || ''} onChange={(e) => setEditUser({ ...editUser, phone: e.target.value })} /></div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => { setPwUser(editUser); setEditUser(null); }}>
                <Icon name="key" size={15} c1="#fcd34d" c2="#f59e0b" /> تعيين كلمة سر
              </button>
              <button className="btn" style={{ flex: 1 }} disabled={busy}>{busy ? 'جارٍ الحفظ…' : 'حفظ التعديلات'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* -------------------------- reset pw modal --------------------------- */}
      {pwUser && (
        <Modal title={`تعيين كلمة سر لـ ${pwUser.full_name}`} onClose={() => { setPwUser(null); setNewPw(''); }}>
          <form onSubmit={submitResetPw}>
            <PasswordInput label="كلمة السر الجديدة" value={newPw} onChange={setNewPw} placeholder="8 أحرف على الأقل" autoComplete="new-password" />
            <button className="btn btn-success" style={{ width: '100%' }} disabled={busy}>
              <Icon name="check" size={16} c1="#d1fae5" c2="#6ee7b7" /> {busy ? 'جارٍ الحفظ…' : 'حفظ'}
            </button>
          </form>
        </Modal>
      )}

      {/* ----------------------------- delete -------------------------------- */}
      {delUser && (
        <ConfirmModal
          title="حذف المستخدم"
          message={`سيتم حذف "${delUser.full_name}" وكل أجهزته وجلساته نهائيًا. لا يمكن التراجع عن هذا الإجراء.`}
          busy={busy} onCancel={() => setDelUser(null)} onConfirm={confirmDelete}
        />
      )}

      {/* ----------------------------- detail -------------------------------- */}
      {detail && (
        <Modal title={`تفاصيل: ${detail.user.full_name}`} wide onClose={() => setDetail(null)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', marginBottom: 18, fontSize: 14 }}>
            <Info label="اسم المستخدم" value={`@${detail.user.username}`} />
            <Info label="البريد" value={detail.user.email} />
            <Info label="الهاتف" value={detail.user.phone || '—'} />
            <Info label="آخر دخول" value={fmtDate(detail.user.last_login_at)} />
          </div>

          <h4 style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="device" size={18} c1="#93c5fd" c2="#3b82f6" /> الأجهزة وحالة الاتصال
          </h4>
          {detail.devices.length ? detail.devices.map((d) => (
            <div key={d.device_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 14, marginBottom: 8 }}>
              <StatusBadge online={d.online} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700 }}>{d.device_name || d.device_id}</div>
                <div style={{ color: 'var(--muted)', fontSize: 12 }} dir="ltr">{d.platform} · v{d.app_version || '؟'} · آخر نبضة: {fmtDate(d.last_seen_at)}</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => removeDevice(d.device_id)}>
                <Icon name="trash" size={13} c1="#fca5a5" c2="#ef4444" />
              </button>
            </div>
          )) : <p style={{ color: 'var(--muted)', marginBottom: 12 }}>لا توجد أجهزة مسجلة لهذا المستخدم بعد.</p>}

          <h4 style={{ margin: '16px 0 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="clock" size={18} c1="#fcd34d" c2="#f59e0b" /> سجل الدخول الأخير
          </h4>
          <div style={{ maxHeight: 180, overflow: 'auto' }}>
            {detail.login_history.map((l, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 4px', borderBottom: '1px solid rgba(255,255,255,.05)', fontSize: 13 }}>
                <span style={{ color: l.success ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}>{l.success ? 'نجاح' : 'فشل'}</span>
                <span dir="ltr" style={{ color: 'var(--muted)' }}>{l.ip || '—'}</span>
                <span style={{ color: 'var(--muted)' }}>{fmtDate(l.created_at)}</span>
              </div>
            ))}
            {!detail.login_history.length && <p style={{ color: 'var(--muted)' }}>لا يوجد سجل.</p>}
          </div>
        </Modal>
      )}
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 700 }}>{label}</div>
      <div style={{ fontWeight: 700 }} dir="auto">{value}</div>
    </div>
  );
}
