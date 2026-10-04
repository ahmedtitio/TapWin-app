// Authentication routes shared by the Flutter app and the web admin panel.
import { Router } from './mini-router.js';
import { guardChain } from './mini-router.js';
import { randomBytesHex } from './webcrypto-lite.js';
import { query, newId } from './db.js';
import {
  hashPassword, verifyPassword, signAccessToken, signRefreshToken,
  authRequired, sha256, clientIp,
} from './auth.js';
import * as jwt from './jwt-lite.js';

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const pwIssue = (p) => {
  if (!p || p.length < 8) return 'كلمة السر يجب أن تكون 8 أحرف على الأقل';
  if (!/[A-Za-z]/.test(p) || !/\d/.test(p)) return 'كلمة السر يجب أن تحتوي على حروف وأرقام';
  return null;
};

async function storeRefreshToken(userId, token, deviceId) {
  const hash = await sha256(token);
  // Upsert: if the same token is stored twice (e.g. retried request), update instead of failing on UNIQUE.
  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, device_id, expires_at)
     VALUES ($1,$2,$3, now() + interval '30 days')
     ON CONFLICT (token_hash) DO UPDATE
       SET user_id = EXCLUDED.user_id,
           device_id = EXCLUDED.device_id,
           expires_at = EXCLUDED.expires_at,
           revoked_at = NULL`,
    [userId, hash, deviceId || null],
  );
}

async function logLogin(userId, email, success, req) {
  await query(
    'INSERT INTO login_logs (user_id, email, success, ip, user_agent) VALUES ($1,$2,$3,$4,$5)',
    [userId, email, success, clientIp(req), req.headers['user-agent'] || null],
  ).catch(() => {});
}

/** Like authRequired but never rejects: sets req.user when a valid app JWT is present. */
async function optionalAuth(req, res, next) {
  try {
    const h = req.headers['authorization'] || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (token) {
      const payload = await jwt.verify(token, process.env.JWT_SECRET, { audience: 'app' });
      req.user = { id: payload.sub, role: payload.role, email: payload.email };
    }
  } catch { /* anonymous */ }
  next();
}

/* ------------------------- EMAIL CODE HELPERS -------------------------- */
async function sendEmail({ to, subject, html }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) { console.log('[mail] skipped (no RESEND_API_KEY):', subject, '->', to); return false; }
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: process.env.MAIL_FROM || 'Tap Win <onboarding@resend.dev>',
        to: [to], subject, html,
      }),
    });
    if (!r.ok) console.error('[mail] resend error', r.status, (await r.text()).slice(0, 200));
    return r.ok;
  } catch (e) { console.error('[mail] failed', String(e?.message || e)); return false; }
}

function sixDigits() {
  let c = '';
  for (let i = 0; i < 6; i++) c += Math.floor(Math.random() * 10);
  return c;
}

async function issueEmailCode(userId, purpose, email, name, kind) {
  const code = sixDigits();
  await query(
    `INSERT INTO email_codes (user_id, purpose, code_hash, expires_at)
     VALUES ($1,$2,$3, now() + interval '${kind === 'reset' ? '15 minutes' : '24 hours'}')`,
    [userId, purpose, await sha256(code)],
  );
  const title = kind === 'reset' ? 'رمز استعادة كلمة السر' : 'رمز التحقق من البريد الإلكتروني';
  const intro = kind === 'reset'
    ? 'طلب أحد (ربما أنت) إعادة تعيين كلمة سر حساب Tap Win. استخدم الرمز التالي لتعيين كلمة سر جديدة:'
    : `مرحبًا ${name || ''}! أكمل تفعيل حسابك في Tap Win باستخدام الرمز التالي:`;
  await sendEmail({
    to: email,
    subject: `${title} — Tap Win`,
    html: `<div style="font-family:Arial,sans-serif;background:#120B33;color:#fff;padding:32px;border-radius:12px">
      <h2 style="color:#6C4DF6">Tap Win</h2>
      <p>${intro}</p>
      <p style="font-size:34px;letter-spacing:10px;font-weight:bold;color:#00D4AA;background:#1D1445;display:inline-block;padding:12px 24px;border-radius:10px">${code}</p>
      <p style="color:#aaa">${kind === 'reset' ? 'الرمز صالح 15 دقيقة.' : 'الرمز صالح 24 ساعة.'} إذا لم تطلب هذا الإجراء تجاهل الرسالة.</p>
    </div>`,
  });
  // Dev convenience: no mail provider configured -> surface the code so clients can proceed.
  return process.env.RESEND_API_KEY ? null : code;
}

async function consumeEmailCode(userId, purpose, code) {
  const { rows } = await query(
    `SELECT id FROM email_codes
     WHERE user_id=$1 AND purpose=$2 AND code_hash=$3 AND used_at IS NULL AND expires_at > now()
     ORDER BY id DESC LIMIT 1`,
    [userId, purpose, await sha256(String(code || '').trim())],
  );
  if (!rows.length) return false;
  await query('UPDATE email_codes SET used_at=now() WHERE id=$1', [rows[0].id]);
  return true;
}

/* ------------------------------ REGISTER ------------------------------ */
router.post('/register', async (req, res) => {
  try {
    const { email, phone, password } = req.body || {};
    const full_name = req.body.full_name || req.body.name;
    // username is optional (web dashboard doesn't collect it) — derive from email local-part.
    const username = (req.body?.username || '').trim() || String(email || '').split('@')[0].replace(/[^a-z0-9._-]/gi, '') || `user_${Date.now().toString(36)}`;
    if (!full_name || !email || !password)
      return res.status(400).json({ error: 'VALIDATION', message: 'كل الحقول المطلوبة يجب تعبئتها' });
    if (!EMAIL_RE.test(email))
      return res.status(400).json({ error: 'VALIDATION', message: 'صيغة البريد الإلكتروني غير صحيحة' });
    const bad = pwIssue(password);
    if (bad) return res.status(400).json({ error: 'VALIDATION', message: bad });

    const exists = await query('SELECT email, username FROM users WHERE email=$1 OR username=$2', [email.toLowerCase(), username.toLowerCase()]);
    if (exists.rows.length) {
      const isEmail = exists.rows[0].email.toLowerCase() === email.toLowerCase();
      return res.status(409).json({ error: 'DUPLICATE', message: isEmail ? 'البريد الإلكتروني مسجّل مسبقًا' : 'اسم المستخدم مستخدم بالفعل' });
    }

    const hash = await hashPassword(password);
    const { rows } = await query(
      `INSERT INTO users (id, full_name, username, email, phone, password_hash, email_verified)
       VALUES ($6,$1,$2,$3,$4,$5,false) RETURNING id, full_name, username, email, role, created_at, email_verified`,
      [full_name.trim(), username.toLowerCase(), email.toLowerCase(), phone || null, hash, newId()],
    );
    const user = rows[0];

    // optional device registration on signup
    const { device_id, device_name, platform } = req.body || {};
    if (device_id) {
      await query(
        `INSERT INTO devices (user_id, device_id, device_name, platform, is_active, last_seen_at)
         VALUES ($1,$2,$3,$4,true, now())
         ON CONFLICT (device_id) DO UPDATE SET user_id=$1, is_active=true, last_seen_at=now()`,
        [user.id, device_id, device_name || 'Android Device', platform || 'android'],
      );
    }

    const accessToken = await signAccessToken(user, 'app');
    const refreshToken = signRefreshToken();
    await storeRefreshToken(user.id, refreshToken, device_id);

    // Email verification is mandatory before entering the dashboard.
    const devCode = await issueEmailCode(user.id, 'verify_email', user.email, user.full_name, 'verify');
    res.status(201).json({
      user,
      tokens: { accessToken, refreshToken },
      message: 'تم إنشاء الحساب! أدخل رمز التحقق المرسل إلى بريدك الإلكتروني لتفعيل الحساب.',
      ...(devCode ? { dev_code: devCode } : {}),
    });
  } catch (e) {
    console.error('[register] error:', String(e?.stack || e).slice(0, 1000));
    res.status(500).json({ error: 'SERVER_ERROR', message: 'حدث خطأ في الخادم', detail: String(e?.message || e).slice(0, 200) });
  }
});

/* ------------------------------- LOGIN -------------------------------- */
router.post('/login', async (req, res) => {
  try {
    const { email, password, audience = 'app', device_id, device_name, platform } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'VALIDATION', message: 'أدخل البريد وكلمة السر' });

    const aud = audience === 'admin' ? 'admin' : 'app';
    const { rows } = await query(
      `SELECT * FROM users WHERE email=$1 AND (role <> 'admin' OR $2='admin')`,
      [email.toLowerCase(), aud],
    );
    const user = rows[0];

    if (user && user.locked_until && new Date(user.locked_until) > new Date()) {
      await logLogin(user.id, email, false, req);
      return res.status(423).json({ error: 'LOCKED', message: 'الحساب مقفل مؤقتًا بسبب محاولات فاشلة، حاول لاحقًا' });
    }

    if (!user || !(await verifyPassword(password, user.password_hash))) {
      if (user) {
        await query(`UPDATE users SET failed_attempts = failed_attempts + 1,
                     locked_until = CASE WHEN failed_attempts + 1 >= 5 THEN now() + interval '15 minutes' ELSE locked_until END
                     WHERE id=$1`, [user.id]);
      }
      await logLogin(user?.id ?? null, email, false, req);
      return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'بيانات الدخول غير صحيحة' });
    }
    if (!user.is_active) {
      await logLogin(user.id, email, false, req);
      return res.status(403).json({ error: 'ACCOUNT_DISABLED', message: 'تم تعطيل هذا الحساب' });
    }
    // If a legacy unverified account exists, re-send its verification code and
    // surface it in the response so clients can complete verification inline.
    let devCode = null;
    if (aud === 'app' && user.role !== 'admin' && user.email_verified === false) {
      devCode = await issueEmailCode(user.id, 'verify_email', user.email, user.full_name, 'verify')
        .catch(() => null);
    }

    await query('UPDATE users SET last_login_at=now(), failed_attempts=0, locked_until=NULL WHERE id=$1', [user.id]);

    if (aud === 'app' && device_id) {
      await query(
        `INSERT INTO devices (user_id, device_id, device_name, platform, is_active, last_seen_at)
         VALUES ($1,$2,$3,$4,true, now())
         ON CONFLICT (device_id) DO UPDATE SET user_id=$1, is_active=true, last_seen_at=now(), device_name=COALESCE($3, devices.device_name)`,
        [user.id, device_id, device_name || 'Android Device', platform || 'android'],
      );
    }

    const publicUser = {
      id: user.id, full_name: user.full_name, username: user.username, email: user.email,
      phone: user.phone, role: user.role, avatar_url: user.avatar_url, last_login_at: user.last_login_at,
      email_verified: user.email_verified !== false,
    };
    const accessToken = await signAccessToken(publicUser, aud);
    const refreshToken = signRefreshToken();
    await storeRefreshToken(user.id, refreshToken, device_id);
    await logLogin(user.id, email, true, req);

    res.json({
      user: publicUser,
      tokens: { accessToken, refreshToken },
      email_verified: publicUser.email_verified,
      ...(devCode ? { dev_code: devCode } : {}),
      message: publicUser.email_verified
        ? null
        : 'تم تسجيل الدخول! أدخل رمز التحقق المرسل إلى بريدك الإلكتروني لتفعيل الحساب.',
    });
  } catch (e) {
    console.error('[login] error:', String(e?.stack || e).slice(0, 1000));
    res.status(500).json({ error: 'SERVER_ERROR', message: String(e?.message || e).slice(0, 200) });
  }
});

/* --------------------- FIREBASE GOOGLE SIGN-IN ------------------------- */
// The Android app gets an ID token from Firebase Auth (Google provider) and
// exchanges it here for our own JWT session. Requires FIREBASE_PROJECT_ID env.

/* ---- PEM (x509) -> RSA JWK parts, pure JS, Workers-safe ---- */
function b64FromPem(pem) {
  return pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
}
function bytesFromB64(b64) {
  const bin = atob(b64);
  const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u;
}
// Minimal DER walker returning [tag, contentBytes] slices of an ASN.1 sequence.
function derSeq(buf, offset) {
  if (buf[offset] !== 0x30) throw new Error('DER: expected SEQUENCE');
  let len = buf[offset + 1];
  let hdr = 2;
  if (len & 0x80) { const n = len & 0x7f; len = 0; for (let i = 0; i < n; i++) len = (len << 8) | buf[offset + 2 + i]; hdr = 2 + n; }
  return { start: offset + hdr, end: offset + hdr + len };
}
function derIntBytes(buf, offset) {
  if (buf[offset] !== 0x02) throw new Error('DER: expected INTEGER');
  let len = buf[offset + 1];
  let hdr = 2;
  if (len & 0x80) { const n = len & 0x7f; len = 0; for (let i = 0; i < n; i++) len = (len << 8) | buf[offset + 2 + i]; hdr = 2 + n; }
  let v = buf.slice(offset + hdr, offset + hdr + len);
  while (v.length && v[0] === 0x00) v = v.slice(1); // strip leading zero
  return v;
}
async function pemToModulusExponent(pem) {
  // x509 cert: SEQUENCE { tbsCertificate { ... subjectPublicKeyInfo { alg, BIT STRING { RSAPublicKey } } } }
  // Google serves keys as x509 PEM. Extract the SPKI via simple scan for the trailing RSA key.
  const der = bytesFromB64(b64FromPem(pem));
  const cert = derSeq(der, 0);            // outer SEQUENCE
  const tbs = derSeq(der, cert.start);    // tbsCertificate SEQUENCE
  // Walk tbs fields to find subjectPublicKeyInfo (SEQUENCE containing OID rsaEncryption + BIT STRING)
  let o = tbs.start;
  const end = tbs.end;
  let spki = null;
  while (o < end) {
    if (der[o] === 0x30) {
      const seq = derSeq(der, o);
      if (der[seq.start] === 0x30 && der[seq.start + 1] !== undefined) {
        const alg = derSeq(der, seq.start);
        if (der[alg.end] === 0x03) { // AlgorithmIdentifier then BIT STRING
          spki = seq; break;
        }
      }
      const seq2 = derSeq(der, o);
      o = seq2.end;
    } else {
      // skip non-SEQUENCE TLV
      let len = der[o + 1]; let hdr = 2;
      if (len & 0x80) { const n = len & 0x7f; len = 0; for (let i = 0; i < n; i++) len = (len << 8) | der[o + 2 + i]; hdr = 2 + n; }
      o += hdr + len;
    }
  }
  if (!spki) throw new Error('SPKI not found');
  const bitStringOffset = (() => { let x = spki.start; const alg = derSeq(der, x); x = alg.end; return x; })();
  if (der[bitStringOffset] !== 0x03) throw new Error('expected BIT STRING');
  let blen = der[bitStringOffset + 1]; let bhdr = 2;
  if (blen & 0x80) { const n = blen & 0x7f; blen = 0; for (let i = 0; i < n; i++) blen = (blen << 8) | der[bitStringOffset + 2 + i]; bhdr = 2 + n; }
  const rsaStart = bitStringOffset + bhdr + 1; // skip unused-bits byte
  const rsaSeq = derSeq(der, rsaStart);         // RSAPublicKey SEQUENCE
  const modulus = derIntBytes(der, rsaSeq.start);
  let afterMod = rsaSeq.start;
  { const m = derIntBytes(der, afterMod); let l = der[afterMod + 1]; let h = 2; if (l & 0x80) { const n = l & 0x7f; l = 0; for (let i = 0; i < n; i++) l = (l << 8) | der[afterMod + 2 + i]; h = 2 + n; } afterMod += h + m.length; }
  const exponent = derIntBytes(der, afterMod);
  return [modulus, exponent];
}

async function verifyFirebaseIdToken(idToken) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error('FIREBASE_NOT_CONFIGURED');

  // Decode header/payload without verifying first to get kid/aud/exp.
  const decode = (part) => {
    let b = part.replace(/-/g, '+').replace(/_/g, '/');
    b += '='.repeat((4 - (b.length % 4)) % 4);
    const bin = atob(b);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return JSON.parse(new TextDecoder().decode(bytes));
  };
  const [header, payload] = idToken.split('.');
  const h = decode(header);
  const p = decode(payload);

  if (h.alg !== 'RS256' || !h.kid) throw new Error('BAD_TOKEN_FORMAT');
  if (p.aud !== projectId) throw new Error('BAD_AUDIENCE');
  if (!p.exp || p.exp * 1000 < Date.now()) throw new Error('TOKEN_EXPIRED');
  if (!p.email) throw new Error('NO_EMAIL');

  // Fetch Google's public keys (cached ~10 min).
  if (!verifyFirebaseIdToken._jwks || Date.now() > (verifyFirebaseIdToken._jwksAt || 0)) {
    const res = await fetch('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com');
    const keys = await res.json();
    verifyFirebaseIdToken._jwks = keys;
    const cc = (res.headers.get('cache-control') || '').match(/max-age=(\d+)/);
    verifyFirebaseIdToken._jwksAt = Date.now() + (cc ? Math.min(+cc[1], 600) * 1000 : 300000);
  }
  const pem = verifyFirebaseIdToken._jwks[h.kid];
  if (!pem) throw new Error('UNKNOWN_KID');

  // Verify RS256 signature using Web Crypto (Workers-safe).
  const [jwkModulus, jwkExponent] = await pemToModulusExponent(pem);
  const key = await crypto.subtle.importKey(
    'public',
    { kty: 'RSA', n: jwkModulus, e: jwkExponent, alg: 'RS256', ext: true },
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['verify'],
  );
  const signed = idToken.split('.').slice(0, 2).join('.');
  const sigB64 = idToken.split('.')[2].replace(/-/g, '+').replace(/_/g, '/');
  const sigBin = atob(sigB64 + '='.repeat((4 - (sigB64.length % 4)) % 4));
  const sig = new Uint8Array(sigBin.length);
  for (let i = 0; i < sigBin.length; i++) sig[i] = sigBin.charCodeAt(i);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, sig, new TextEncoder().encode(signed));
  if (!ok) throw new Error('BAD_SIGNATURE');
  return p;
}

router.post('/firebase', async (req, res) => {
  try {
    const { id_token, device_id, device_name, platform } = req.body || {};
    if (!id_token) return res.status(400).json({ error: 'VALIDATION', message: 'رمز Firebase مفقود' });

    let fp;
    try {
      fp = await verifyFirebaseIdToken(id_token);
    } catch (e) {
      if (e.message === 'FIREBASE_NOT_CONFIGURED')
        return res.status(501).json({ error: 'FIREBASE_NOT_CONFIGURED', message: 'لم يتم إعداد Firebase على الخادم' });
      return res.status(401).json({ error: 'INVALID_FIREBASE_TOKEN', message: 'تعذر التحقق من حساب Google' });
    }

    const email = String(fp.email).toLowerCase();
    // Find by firebase uid -> by email (link account) -> create new user.
    let { rows } = await query('SELECT * FROM users WHERE firebase_uid=$1', [fp.user_id]);
    let user = rows[0];

    if (!user) {
      ({ rows } = await query('SELECT * FROM users WHERE email=$1', [email]));
      user = rows[0];
      if (user) {
        await query('UPDATE users SET firebase_uid=$2 WHERE id=$1', [user.id, fp.user_id]);
        user.firebase_uid = fp.user_id;
      }
    }

    if (!user) {
      const name = (fp.name || email.split('@')[0]).trim();
      const base = (fp.email.split('@')[0] || 'user').replace(/[^a-zA-Z0-9._]/g, '').toLowerCase() || 'user';
      let username = base, suffix = 1;
      // ensure unique username
      for (;;) {
        const taken = await query('SELECT 1 FROM users WHERE username=$1', [username]);
        if (!taken.rows.length) break;
        username = `${base}${++suffix}`;
      }
      const randomHash = await hashPassword(randomBytesHex(24));
      ({ rows } = await query(
        `INSERT INTO users (id, full_name, username, email, phone, password_hash, avatar_url, firebase_uid)
         VALUES ($8,$1,$2,$3,NULL,$5,$6,$7,true)
         RETURNING id, full_name, username, email, phone, role, avatar_url, last_login_at, email_verified`,
        [name, username, email, null, randomHash, fp.picture || null, fp.user_id, newId()],
      ));
      user = rows[0];
      await query(
        `INSERT INTO login_logs (user_id, email, success, ip, user_agent) VALUES ($1,$2,true,$3,$4)`,
        [user.id, email, clientIp(req), req.headers['user-agent'] || null],
      ).catch(() => {});
    }

    if (!user.is_active) return res.status(403).json({ error: 'ACCOUNT_DISABLED', message: 'تم تعطيل هذا الحساب' });

    await query('UPDATE users SET last_login_at=now(), failed_attempts=0, locked_until=NULL WHERE id=$1', [user.id]);

    if (device_id) {
      await query(
        `INSERT INTO devices (user_id, device_id, device_name, platform, is_active, last_seen_at)
         VALUES ($1,$2,$3,$4,true, now())
         ON CONFLICT (device_id) DO UPDATE SET user_id=$1, is_active=true, last_seen_at=now()`,
        [user.id, device_id, device_name || 'Android Device', platform || 'android'],
      );
    }

    const publicUser = {
      id: user.id, full_name: user.full_name, username: user.username, email: user.email,
      phone: user.phone, role: user.role, avatar_url: user.avatar_url, last_login_at: user.last_login_at,
      email_verified: user.email_verified !== false,
    };
    const accessToken = await signAccessToken(publicUser, 'app');
    const refreshToken = signRefreshToken();
    await storeRefreshToken(user.id, refreshToken, device_id);
    await logLogin(user.id, email, true, req);

    res.json({ user: publicUser, tokens: { accessToken, refreshToken } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

/* ---------------------------- APP ANALYTICS ---------------------------- */
// Lightweight event ingestion from the Android app (Google Analytics is also
// wired on the client; this gives the admin dashboard first-party stats too).
router.post('/event', [authRequired('app')], async (req, res) => {
  try {
    const { event, device_id, platform, props } = req.body || {};
    if (!event || typeof event !== 'string' || event.length > 64)
      return res.status(400).json({ error: 'VALIDATION' });
    await query(
      `INSERT INTO app_events (user_id, event, device_id, platform, props)
       VALUES ($1,$2,$3,$4,$5)`,
      [req.user.id, event, device_id || null, platform || 'android',
       JSON.stringify(props && typeof props === 'object' ? props : {})],
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

/* ---------------------------- FORGOT PASSWORD -------------------------- */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body || {};
    // Always answer 200 to avoid account enumeration.
    const generic = { message: 'إذا كان البريد مسجّلًا لدينا فقد أُرسلت إليه رسالة تحتوي رمز تحقق' };
    if (!email || !EMAIL_RE.test(email)) return res.json(generic);

    const { rows } = await query('SELECT id, full_name FROM users WHERE email=$1', [email.toLowerCase()]);
    if (!rows.length) return res.json(generic);

    const devCode = await issueEmailCode(rows[0].id, 'reset_password', email.toLowerCase(), rows[0].full_name, 'reset');
    console.log(`[auth] password reset code issued for ${email}`);
    res.json({ ...generic, ...(devCode ? { dev_code: devCode } : {}) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'حدث خطأ في الخادم' });
  }
});

/* ---------------------------- RESET PASSWORD --------------------------- */
router.post('/reset-password', async (req, res) => {
  try {
    const { token, code, password } = req.body || {};
    const resetToken = token || code; // web/app may send the OTP as `code`
    if (!resetToken || !password) return res.status(400).json({ error: 'VALIDATION', message: 'التوكن وكلمة السر مطلوبان' });
    const bad = pwIssue(password);
    if (bad) return res.status(400).json({ error: 'VALIDATION', message: bad });

    let userId = null;
    const isSixDigit = /^\d{6}$/.test(String(resetToken).trim());
    if (isSixDigit) {
      // Find the user that owns this active reset code.
      const { rows } = await query(
        `SELECT ec.user_id FROM email_codes ec
         WHERE ec.purpose='reset_password' AND ec.code_hash=$1 AND ec.used_at IS NULL AND ec.expires_at > now()
         ORDER BY ec.id DESC LIMIT 1`,
        [await sha256(String(resetToken).trim())],
      );
      if (!rows.length) return res.status(400).json({ error: 'INVALID_CODE', message: 'رمز التحقق غير صالح أو منتهي الصلاحية' });
      userId = rows[0].user_id;
      await query(`UPDATE email_codes SET used_at=now() WHERE user_id=$1 AND purpose='reset_password' AND used_at IS NULL`, [userId]);
    } else {
      const { rows } = await query(
        `SELECT pr.user_id FROM password_resets pr
         WHERE pr.token_hash=$1 AND pr.expires_at > now() AND pr.used_at IS NULL`,
        [await sha256(resetToken)],
      );
      if (!rows.length) return res.status(400).json({ error: 'INVALID_TOKEN', message: 'الرابط غير صالح أو منتهي الصلاحية' });
      userId = rows[0].user_id;
      await query('UPDATE password_resets SET used_at=now() WHERE token_hash=$1', [await sha256(resetToken)]);
    }

    const hash = await hashPassword(password);
    await query('UPDATE users SET password_hash=$2, updated_at=now(), failed_attempts=0, locked_until=NULL WHERE id=$1', [userId, hash]);
    await query('UPDATE refresh_tokens SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL', [userId]);

    res.json({ message: 'تم تعيين كلمة سر جديدة بنجاح' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

/* ------------------------- EMAIL VERIFICATION -------------------------- */
// New app accounts must confirm the 6-digit code emailed at registration.
router.post('/verify-email', [optionalAuth], async (req, res) => {
  try {
    const { access_token, code } = req.body || {};
    if (!code) return res.status(400).json({ error: 'VALIDATION', message: 'أدخل رمز التحقق' });
    let uid = req.user?.id;
    if (!uid && access_token) {
      try {
        const payload = await jwt.verify(access_token, process.env.JWT_SECRET, { audience: 'app' });
        uid = payload.sub;
      } catch { /* fall through */ }
    }
    if (!uid) return res.status(401).json({ error: 'UNAUTHORIZED', message: 'انتهت صلاحية الجلسة، سجّل الدخول من جديد' });

    const ok = await consumeEmailCode(uid, 'verify_email', code);
    if (!ok) return res.status(400).json({ error: 'INVALID_CODE', message: 'رمز التحقق غير صحيح أو منتهي الصلاحية' });

    await query('UPDATE users SET email_verified=true, updated_at=now() WHERE id=$1', [uid]);
    res.json({ message: 'تم تفعيل الحساب بنجاح' });
  } catch (e) {
    console.error('[verify-email]', String(e?.message || e));
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

router.post('/resend-verification', [authRequired('app')], async (req, res) => {
  try {
    const { rows } = await query('SELECT email, full_name, email_verified FROM users WHERE id=$1', [req.user.id]);
    const u = rows[0];
    if (!u) return res.status(404).json({ error: 'NOT_FOUND' });
    if (u.email_verified) return res.json({ message: 'الحساب مفعّل بالفعل' });
    const devCode = await issueEmailCode(u.id, 'verify_email', u.email, u.full_name, 'verify');
    res.json({ message: 'تم إرسال رمز تحقق جديد إلى بريدك الإلكتروني', ...(devCode ? { dev_code: devCode } : {}) });
  } catch (e) {
    console.error('[resend-verification]', String(e?.message || e));
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

/* ------------------------------ REFRESH -------------------------------- */
router.post('/refresh', async (req, res) => {
  try {
    const { refresh_token, audience = 'app' } = req.body || {};
    if (!refresh_token) return res.status(400).json({ error: 'VALIDATION' });
    const aud = audience === 'admin' ? 'admin' : 'app';

    const { rows } = await query(
      `SELECT rt.*, u.is_active, u.role FROM refresh_tokens rt JOIN users u ON u.id=rt.user_id
       WHERE rt.token_hash=$1 AND rt.revoked_at IS NULL AND rt.expires_at > now()`,
      [await sha256(refresh_token)],
    );
    const row = rows[0];
    if (!row || !row.is_active) return res.status(401).json({ error: 'INVALID_REFRESH' });
    if (aud === 'admin' && row.role !== 'admin') return res.status(403).json({ error: 'FORBIDDEN' });

    const { rows: urows } = await query('SELECT id, full_name, username, email, role, avatar_url FROM users WHERE id=$1', [row.user_id]);
    const user = urows[0];
    const accessToken = await signAccessToken(user, aud);
    res.json({ tokens: { accessToken, refreshToken: refresh_token }, user });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

/* ------------------------------- LOGOUT -------------------------------- */
router.post('/logout', async (req, res) => {
  try {
    const { refresh_token, device_id } = req.body || {};
    if (refresh_token) {
      await query('UPDATE refresh_tokens SET revoked_at=now() WHERE token_hash=$1', [await sha256(refresh_token)]);
    }
    if (device_id) {
      await query('UPDATE devices SET is_active=false WHERE device_id=$1', [device_id]);
    }
    res.json({ message: 'تم تسجيل الخروج' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

/* ------------------------- HEARTBEAT (presence) ------------------------ */
// Called periodically by the Flutter app so the admin panel can show online status.
router.post('/heartbeat', [authRequired('app')], async (req, res) => {
  try {
    const { device_id, device_name, platform, app_version, push_token } = req.body || {};
    if (!device_id) return res.status(400).json({ error: 'VALIDATION' });
    await query(
      `INSERT INTO devices (user_id, device_id, device_name, platform, app_version, push_token, is_active, last_seen_at)
       VALUES ($1,$2,$3,$4,$5,$6,true, now())
       ON CONFLICT (device_id) DO UPDATE SET is_active=true, last_seen_at=now(),
         device_name=COALESCE($3, devices.device_name), app_version=COALESCE($5, devices.app_version),
         push_token=COALESCE($6, devices.push_token)`,
      [req.user.id, device_id, device_name || null, platform || 'android', app_version || null, push_token || null],
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

/* ---------------------- FCM TOKEN UPLOAD ------------------------------- */
// Called by the app when Firebase Messaging issues/refreshes a device token.
router.post('/fcm-token', [authRequired('app')], async (req, res) => {
  try {
    const { device_id, push_token } = req.body || {};
    if (!device_id || !push_token) return res.status(400).json({ error: 'VALIDATION' });
    await query(
      `INSERT INTO devices (user_id, device_id, platform, push_token, is_active, last_seen_at)
       VALUES ($1,$2,'android',$3,false,now())
       ON CONFLICT (device_id) DO UPDATE SET push_token=$3, last_seen_at=now()`,
      [req.user.id, device_id, push_token],
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

/* ------------------------------- ME ------------------------------------ */
router.get('/me', [authRequired('app')], async (req, res) => {
  const { rows } = await query(
    `SELECT id, full_name, username, email, phone, role, avatar_url, is_active,
            email_verified, last_login_at, created_at
     FROM users WHERE id=$1`, [req.user.id]);
  // Enrich with the user's own devices + recent activity for the web dashboard.
  let devices = [], activity = [];
  try {
    const d = await query(
      `SELECT device_id, device_name, platform, app_version, is_active, push_token IS NOT NULL AS has_push,
              last_seen_at
       FROM devices WHERE user_id=$1 ORDER BY last_seen_at DESC NULLS LAST LIMIT 20`, [req.user.id]);
    devices = d.rows;
  } catch (e) { console.error('me/devices', e); }
  try {
    const a = await query(
      `SELECT action, platform, ip, created_at FROM login_logs WHERE user_id=$1
       ORDER BY created_at DESC LIMIT 15`, [req.user.id]);
    activity = a.rows;
  } catch (e) { console.error('me/activity', e); }
  res.json({ user: rows[0], devices, activity });
});

router.patch('/me', [authRequired('app')], async (req, res) => {
  try {
    const { full_name, phone, avatar_url } = req.body || {};
    const { rows } = await query(
      `UPDATE users SET full_name=COALESCE($2,full_name), phone=COALESCE($3,phone),
                        avatar_url=COALESCE($4,avatar_url), updated_at=now()
       WHERE id=$1 RETURNING id, full_name, username, email, phone, role, avatar_url`,
      [req.user.id, full_name, phone, avatar_url],
    );
    res.json({ user: rows[0], message: 'تم تحديث الملف الشخصي' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

router.post('/change-password', [authRequired('app')], async (req, res) => {
  try {
    const { current_password, new_password } = req.body || {};
    const { rows } = await query('SELECT password_hash FROM users WHERE id=$1', [req.user.id]);
    if (!(await verifyPassword(current_password || '', rows[0].password_hash)))
      return res.status(400).json({ error: 'WRONG_PASSWORD', message: 'كلمة السر الحالية غير صحيحة' });
    const bad = pwIssue(new_password);
    if (bad) return res.status(400).json({ error: 'VALIDATION', message: bad });
    const hash = await hashPassword(new_password);
    await query('UPDATE users SET password_hash=$2, updated_at=now() WHERE id=$1', [req.user.id, hash]);
    await query('UPDATE refresh_tokens SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL', [req.user.id]);
    res.json({ message: 'تم تغيير كلمة السر بنجاح' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

export default router;
