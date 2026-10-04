import React, { useEffect, useRef, useState } from 'react';
import { IconEye, IconEyeOff } from './icons.jsx';

/** 6-digit OTP input with paste support. onDone fires when all boxes are filled. */
export function OtpInput({ length = 6, value, onChange, onDone }) {
  const refs = useRef([]);
  const chars = Array.from({ length }, (_, i) => value[i] || '');

  const setChar = (i, c) => {
    const next = chars.slice();
    next[i] = c;
    const joined = next.join('').slice(0, length);
    onChange(joined);
    if (c && i < length - 1) refs.current[i + 1]?.focus();
    if (/^\d{6}$/.test(joined) && onDone) onDone(joined);
  };

  return (
    <div className="otp-row">
      {chars.map((c, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          className={`otp-box${c ? ' filled' : ''}`}
          inputMode="numeric"
          maxLength={1}
          value={c}
          onChange={(e) => setChar(i, e.target.value.replace(/\D/g, '').slice(-1))}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !c && i > 0) refs.current[i - 1]?.focus();
          }}
          onPaste={(e) => {
            e.preventDefault();
            const digits = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, length);
            if (digits) {
              onChange(digits);
              refs.current[Math.min(digits.length, length - 1)]?.focus();
              if (digits.length === length && onDone) onDone(digits);
            }
          }}
        />
      ))}
    </div>
  );
}

/** Password input with a 3D eye toggle. */
export function PasswordField({ label, value, onChange, placeholder = '••••••••', autoComplete = 'current-password' }) {
  const [show, setShow] = useState(false);
  return (
    <div className="field">
      <label>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          className="input"
          type={show ? 'text' : 'password'}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          style={{ paddingLeft: 42 }}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          aria-label={show ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
          style={{
            position: 'absolute', insetInlineStart: 8, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', padding: 6, display: 'grid', placeItems: 'center', opacity: .8,
          }}
        >
          {show ? <IconEyeOff size={20} /> : <IconEye size={20} />}
        </button>
      </div>
    </div>
  );
}

/** Auto-dismissing toast rendered by App shell. */
export function useToast() {
  const [toast, setToast] = useState(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(t);
  }, [toast]);
  const node = toast ? (
    <div className={`toast ${toast.kind === 'error' ? 'toast-error' : 'toast-success'}`}>{toast.msg}</div>
  ) : null;
  return { toast, setToast, node };
}

export function Alert({ kind = 'error', children }) {
  if (!children) return null;
  return <div className={`alert alert-${kind}`}>{children}</div>;
}
