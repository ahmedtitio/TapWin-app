import { useState } from 'react';
import Icon from './Icons3D';

export function Modal({ title, onClose, children, wide }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`card modal ${wide ? 'modal-wide' : ''}`} onClick={(e) => e.stopPropagation()} style={{ maxWidth: wide ? 640 : 480 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h3 style={{ fontSize: 17, fontWeight: 800 }}>{title}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="إغلاق">
            <Icon name="x" size={15} c1="#cbd5e1" c2="#94a3b8" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ConfirmModal({ title = 'تأكيد الحذف', message, onConfirm, onCancel, busy }) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p style={{ color: 'var(--muted)', lineHeight: 1.9, marginBottom: 20 }}>{message}</p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost" onClick={onCancel} disabled={busy}>إلغاء</button>
        <button className="btn btn-danger" onClick={onConfirm} disabled={busy}>
          <Icon name="trash" size={15} c1="#fecaca" c2="#f87171" />
          {busy ? 'جارٍ التنفيذ…' : 'حذف نهائي'}
        </button>
      </div>
    </Modal>
  );
}

export function PasswordInput({ label, value, onChange, placeholder, autoComplete }) {
  const [show, setShow] = useState(false);
  return (
    <div className="field">
      <label>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          className="input" type={show ? 'text' : 'password'} value={value}
          onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoComplete={autoComplete}
          style={{ paddingLeft: 44 }}
        />
        <button
          type="button" onClick={() => setShow(!show)} aria-label="إظهار كلمة السر"
          style={{ position: 'absolute', insetInlineStart: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', padding: 6, opacity: 0.7 }}
        >
          <Icon name={show ? 'eyeOff' : 'eye'} size={17} c1="#c4b5fd" c2="#8b5cf6" />
        </button>
      </div>
    </div>
  );
}

export function StatusBadge({ online }) {
  return (
    <span className={`badge ${online ? 'badge-online' : 'badge-offline'}`}>
      <span className={`dot ${online ? 'dot-online' : 'dot-offline'}`} />
      {online ? 'نشط الآن' : 'غير متصل'}
    </span>
  );
}

export function AccountBadge({ isActive, role }) {
  if (role === 'admin') return <span className="badge badge-admin"><Icon name="shield" size={12} c1="#d8ccff" c2="#9f7bff" /> مشرف</span>;
  return isActive
    ? <span className="badge badge-active"><Icon name="check" size={12} c1="#a5f3fc" c2="#22d3ee" /> مفعّل</span>
    : <span className="badge badge-disabled"><Icon name="power" size={12} c1="#fecaca" c2="#f87171" /> معطّل</span>;
}

const fmtDate = (d) => (d ? new Date(d).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }) : '—');
export { fmtDate };

export function Avatar({ name }) {
  const initials = (name || '؟').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('');
  return <div className="avatar3d">{initials}</div>;
}
