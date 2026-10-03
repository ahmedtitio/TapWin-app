// Authentication routes shared by the Flutter app and the web admin panel.
import { Router } from 'express';
import crypto from 'crypto';
import { query } from './db.js';
import {
  hashPassword, verifyPassword, signAccessToken, signRefreshToken,
  authRequired, sha256, clientIp,
} from './auth.js';

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const pwIssue = (p) => {
  if (!p || p.length < 8) return 'كلمة السر يجب أن تكون 8 أحرف على الأقل';
  if (!/[A-Za-z]/.test(p) || !/\d/.test(p)) return 'كلمة السر يجب أن تحتوي على حروف وأرقام';
  return null;
};

async function storeRefreshToken(userId, token, deviceId) {
  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, device_id, expires_at)
     VALUES ($1,$2,$3, now() + interval '30 days')`,
    [userId, sha256(token), deviceId || null],
  );
}

async function logLogin(userId, email, success, req) {
  await query(
    'INSERT INTO login_logs (user_id, email, success, ip, user_agent) VALUES ($1,$2,$3,$4,$5)',
    [userId, email, success, clientIp(req), req.headers['user-agent'] || null],
  ).catch(() => {});
}

/* ------------------------------ REGISTER ------------------------------ */
router.post('/register', async (req, res) => {
  try {
    const { full_name, username, email, phone, password } = req.body || {};
    if (!full_name || !username || !email || !password)
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
      `INSERT INTO users (full_name, username, email, phone, password_hash)
       VALUES ($1,$2,$3,$4,$5) RETURNING id, full_name, username, email, role, created_at`,
      [full_name.trim(), username.toLowerCase(), email.toLowerCase(), phone || null, hash],
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

    const accessToken = signAccessToken(user, 'app');
    const refreshToken = signRefreshToken();
    await storeRefreshToken(user.id, refreshToken, device_id);

    res.status(201).json({ user, tokens: { accessToken, refreshToken } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'حدث خطأ في الخادم' });
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
    };
    const accessToken = signAccessToken(publicUser, aud);
    const refreshToken = signRefreshToken();
    await storeRefreshToken(user.id, refreshToken, device_id);
    await logLogin(user.id, email, true, req);

    res.json({ user: publicUser, tokens: { accessToken, refreshToken } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

/* --------------------- FIREBASE GOOGLE SIGN-IN ------------------------- */
// The Android app gets an ID token from Firebase Auth (Google provider) and
// exchanges it here for our own JWT session. Requires FIREBASE_PROJECT_ID env.
async function verifyFirebaseIdToken(idToken) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error('FIREBASE_NOT_CONFIGURED');

  // Decode header/payload without verifying first to get kid/aud/exp.
  const decode = (part) => JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
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

  const cryptoLib = await import('crypto');
  const ok = cryptoLib.default.createVerify('RSA-SHA256')
    .verify(pem, idToken.split('.').slice(0, 2).join('.'), 'base64url');
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
      const randomHash = await hashPassword(crypto.randomBytes(24).toString('hex'));
      ({ rows } = await query(
        `INSERT INTO users (full_name, username, email, phone, password_hash, avatar_url, firebase_uid)
         VALUES ($1,$2,$3,NULL,$5,$6,$7)
         RETURNING id, full_name, username, email, phone, role, avatar_url, last_login_at`,
        [name, username, email, null, randomHash, fp.picture || null, fp.user_id],
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
    };
    const accessToken = signAccessToken(publicUser, 'app');
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
router.post('/event', authRequired('app'), async (req, res) => {
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
    const generic = { message: 'إذا كان البريد مسجّلًا لدينا فقد أُرسلت إليه رابط إعادة التعيين' };
    if (!email || !EMAIL_RE.test(email)) return res.json(generic);

    const { rows } = await query('SELECT id FROM users WHERE email=$1', [email.toLowerCase()]);
    if (!rows.length) return res.json(generic);

    const token = crypto.randomBytes(32).toString('hex');
    await query(
      `INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES ($1,$2, now() + interval '1 hour')`,
      [rows[0].id, sha256(token)],
    );
    const link = `${process.env.APP_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
    console.log(`[auth] password reset link for ${email}: ${link}`);
    // TODO production: send this link through Cloudflare Email Sending / Resend / SendGrid.

    // In development (no SMTP configured) return the raw link so clients can use it directly.
    if (!process.env.SMTP_READY && process.env.NODE_ENV !== 'production') {
      return res.json({ ...generic, reset_url: link });
    }
    res.json(generic);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

/* ---------------------------- RESET PASSWORD --------------------------- */
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body || {};
    if (!token || !password) return res.status(400).json({ error: 'VALIDATION', message: 'التوكن وكلمة السر مطلوبان' });
    const bad = pwIssue(password);
    if (bad) return res.status(400).json({ error: 'VALIDATION', message: bad });

    const { rows } = await query(
      `SELECT pr.user_id FROM password_resets pr
       WHERE pr.token_hash=$1 AND pr.expires_at > now() AND pr.used_at IS NULL`,
      [sha256(token)],
    );
    if (!rows.length) return res.status(400).json({ error: 'INVALID_TOKEN', message: 'الرابط غير صالح أو منتهي الصلاحية' });

    const hash = await hashPassword(password);
    await query('UPDATE users SET password_hash=$2, updated_at=now(), failed_attempts=0, locked_until=NULL WHERE id=$1', [rows[0].user_id, hash]);
    await query('UPDATE password_resets SET used_at=now() WHERE token_hash=$1', [sha256(token)]);
    await query('UPDATE refresh_tokens SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL', [rows[0].user_id]);

    res.json({ message: 'تم تعيين كلمة سر جديدة بنجاح' });
  } catch (e) {
    console.error(e);
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
      [sha256(refresh_token)],
    );
    const row = rows[0];
    if (!row || !row.is_active) return res.status(401).json({ error: 'INVALID_REFRESH' });
    if (aud === 'admin' && row.role !== 'admin') return res.status(403).json({ error: 'FORBIDDEN' });

    const { rows: urows } = await query('SELECT id, full_name, username, email, role, avatar_url FROM users WHERE id=$1', [row.user_id]);
    const user = urows[0];
    const accessToken = signAccessToken(user, aud);
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
      await query('UPDATE refresh_tokens SET revoked_at=now() WHERE token_hash=$1', [sha256(refresh_token)]);
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
router.post('/heartbeat', authRequired('app'), async (req, res) => {
  try {
    const { device_id, device_name, platform, app_version } = req.body || {};
    if (!device_id) return res.status(400).json({ error: 'VALIDATION' });
    await query(
      `INSERT INTO devices (user_id, device_id, device_name, platform, app_version, is_active, last_seen_at)
       VALUES ($1,$2,$3,$4,$5,true, now())
       ON CONFLICT (device_id) DO UPDATE SET is_active=true, last_seen_at=now(),
         device_name=COALESCE($3, devices.device_name), app_version=COALESCE($5, devices.app_version)`,
      [req.user.id, device_id, device_name || null, platform || 'android', app_version || null],
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

/* ------------------------------- ME ------------------------------------ */
router.get('/me', authRequired('app'), async (req, res) => {
  const { rows } = await query(
    `SELECT id, full_name, username, email, phone, role, avatar_url, is_active, last_login_at, created_at
     FROM users WHERE id=$1`, [req.user.id]);
  res.json({ user: rows[0] });
});

router.patch('/me', authRequired('app'), async (req, res) => {
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

router.post('/change-password', authRequired('app'), async (req, res) => {
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
