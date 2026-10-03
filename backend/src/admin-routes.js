// Admin-only routes used by the Cloudflare web dashboard.
import { Router } from 'express';
import { query } from './db.js';
import { authRequired, adminOnly, hashPassword } from './auth.js';

const router = Router();
router.use(authRequired('admin'), adminOnly);

const ONLINE_WINDOW_MIN = 5; // device considered online if heartbeat within N minutes

/* ------------------------------- STATS -------------------------------- */
router.get('/stats', async (req, res) => {
  try {
    const [{ rows: totals }] = await Promise.all([
      query(`SELECT
        COUNT(*)::int AS total_users,
        COUNT(*) FILTER (WHERE is_active)::int AS active_users,
        COUNT(*) FILTER (WHERE NOT is_active)::int AS disabled_users,
        COUNT(*) FILTER (WHERE created_at > now() - interval '7 days')::int AS new_this_week,
        COUNT(*) FILTER (WHERE last_login_at IS NOT NULL)::int AS ever_logged_in
      FROM users WHERE role='user'`),
    ]);

    const { rows: online } = await query(`
      SELECT COUNT(DISTINCT user_id)::int AS online_now FROM devices
      WHERE is_active AND last_seen_at > now() - ($1 || ' minutes')::interval`, [ONLINE_WINDOW_MIN]);

    const { rows: signups } = await query(`
      SELECT to_char(date_trunc('day', created_at),'YYYY-MM-DD') AS day, COUNT(*)::int AS n
      FROM users WHERE created_at > now() - interval '14 days' GROUP BY 1 ORDER BY 1`);

    const { rows: logins } = await query(`
      SELECT to_char(date_trunc('day', created_at),'YYYY-MM-DD') AS day, COUNT(*)::int AS n
      FROM login_logs WHERE success AND created_at > now() - interval '14 days' GROUP BY 1 ORDER BY 1`);

    res.json({ stats: { ...totals[0], online_now: online[0].online_now }, charts: { signups, logins } });
  } catch (e) { console.error(e); res.status(500).json({ error: 'SERVER_ERROR' }); }
});

/* ------------------------------ USERS LIST ----------------------------- */
// Includes live connection status per user for the "User Management" page.
router.get('/users', async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const search = `%${(req.query.search || '').trim()}%`;
    const status = req.query.status; // all | online | offline | active | disabled

    const { rows } = await query(`
      WITH dev AS (
        SELECT user_id,
               bool_or(is_active AND last_seen_at > now() - (${ONLINE_WINDOW_MIN} || ' minutes')::interval) AS online,
               max(last_seen_at) FILTER (WHERE is_active) AS last_seen,
               count(*)::int AS devices_count
        FROM devices GROUP BY user_id
      )
      SELECT u.id, u.full_name, u.username, u.email, u.phone, u.role, u.is_active,
             u.created_at, u.last_login_at,
             COALESCE(d.online,false) AS online,
             d.last_seen, COALESCE(d.devices_count,0) AS devices_count,
             (SELECT count(*)::int FROM password_resets pr WHERE pr.user_id=u.id AND pr.used_at IS NULL AND pr.expires_at>now()) AS pending_resets
      FROM users u LEFT JOIN dev d ON d.user_id=u.id
      WHERE (u.full_name ILIKE $1 OR u.username ILIKE $1 OR u.email ILIKE $1)
        AND ($3::text IS NULL OR ($3='online'  AND COALESCE(d.online,false))
                          OR ($3='offline' AND NOT COALESCE(d.online,false))
                          OR ($3='active'   AND u.is_active)
                          OR ($3='disabled' AND NOT u.is_active))
      ORDER BY u.created_at DESC
      LIMIT $2 OFFSET (($4)::int-1)*$2`,
      [search, limit, status || null, page]);

    const { rows: countRow } = await query('SELECT count(*)::int AS total FROM users');
    res.json({ users: rows, total: countRow[0].total, page, limit });
  } catch (e) { console.error(e); res.status(500).json({ error: 'SERVER_ERROR' }); }
});

/* ---------------------------- USER DETAIL ------------------------------ */
router.get('/users/:id', async (req, res) => {
  try {
    const { rows } = await query(`SELECT id, full_name, username, email, phone, role, is_active, avatar_url,
              created_at, updated_at, last_login_at FROM users WHERE id=$1`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND' });

    const { rows: devices } = await query(`
      SELECT device_id, device_name, platform, app_version, is_active, last_seen_at, created_at,
             (is_active AND last_seen_at > now() - ($2 || ' minutes')::interval) AS online
      FROM devices WHERE user_id=$1 ORDER BY last_seen_at DESC`, [req.params.id, ONLINE_WINDOW_MIN]);

    const { rows: logs } = await query(
      `SELECT success, ip, user_agent, created_at FROM login_logs WHERE user_id=$1 ORDER BY created_at DESC LIMIT 20`,
      [req.params.id]);

    res.json({ user: rows[0], devices, login_history: logs });
  } catch (e) { console.error(e); res.status(500).json({ error: 'SERVER_ERROR' }); }
});

/* --------------------------- CREATE USER ------------------------------- */
router.post('/users', async (req, res) => {
  try {
    const { full_name, username, email, phone, password, role = 'user' } = req.body || {};
    if (!full_name || !username || !email || !password)
      return res.status(400).json({ error: 'VALIDATION', message: 'جميع الحقول مطلوبة' });
    if (password.length < 8) return res.status(400).json({ error: 'VALIDATION', message: 'كلمة السر قصيرة' });

    const hash = await hashPassword(password);
    const { rows } = await query(
      `INSERT INTO users (full_name, username, email, phone, password_hash, role)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, full_name, username, email, phone, role, is_active, created_at`,
      [full_name, username.toLowerCase(), email.toLowerCase(), phone || null, hash, role === 'admin' ? 'admin' : 'user'],
    );
    res.status(201).json({ user: rows[0] });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'DUPLICATE', message: 'البريد أو اسم المستخدم موجود مسبقًا' });
    console.error(e); res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

/* --------------------------- UPDATE USER ------------------------------- */
router.patch('/users/:id', async (req, res) => {
  try {
    const { full_name, email, phone, is_active, role, password } = req.body || {};
    let hash = null;
    if (password) {
      if (password.length < 8) return res.status(400).json({ error: 'VALIDATION', message: 'كلمة السر قصيرة' });
      hash = await hashPassword(password);
    }
    const { rows } = await query(`
      UPDATE users SET
        full_name = COALESCE($2, full_name),
        email     = COALESCE($3, email),
        phone     = COALESCE($4, phone),
        is_active = COALESCE($5, is_active),
        role      = COALESCE($6, role),
        password_hash = COALESCE($7, password_hash),
        updated_at = now()
      WHERE id=$1
      RETURNING id, full_name, username, email, phone, role, is_active, updated_at`,
      [req.params.id, full_name, email?.toLowerCase(), phone, is_active, role, hash]);
    if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND' });

    // disabling a user kills their sessions/devices
    if (is_active === false) {
      await query('UPDATE devices SET is_active=false WHERE user_id=$1', [req.params.id]);
      await query('UPDATE refresh_tokens SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL', [req.params.id]);
    }
    res.json({ user: rows[0], message: 'تم تحديث المستخدم' });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'DUPLICATE' });
    console.error(e); res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

/* --------------------------- DELETE USER ------------------------------- */
router.delete('/users/:id', async (req, res) => {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ error: 'SELF_DELETE', message: 'لا يمكنك حذف حسابك الحالي' });
    const { rowCount } = await query('DELETE FROM users WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ message: 'تم حذف المستخدم' });
  } catch (e) { console.error(e); res.status(500).json({ error: 'SERVER_ERROR' }); }
});

/* ------------------------ FORCE LOGOUT / KILL DEVICE -------------------- */
router.post('/users/:id/revoke', async (req, res) => {
  try {
    await query('UPDATE refresh_tokens SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL', [req.params.id]);
    await query('UPDATE devices SET is_active=false WHERE user_id=$1', [req.params.id]);
    res.json({ message: 'تم إنهاء جميع جلسات المستخدم' });
  } catch (e) { console.error(e); res.status(500).json({ error: 'SERVER_ERROR' }); }
});

router.delete('/devices/:deviceId', async (req, res) => {
  try {
    const { rowCount } = await query('DELETE FROM devices WHERE device_id=$1', [req.params.deviceId]);
    if (!rowCount) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ message: 'تم حذف الجهاز' });
  } catch (e) { console.error(e); res.status(500).json({ error: 'SERVER_ERROR' }); }
});

/* ------------------------- APP ANALYTICS (GA-like) ---------------------- */
// First-party analytics from the Android app's /api/auth/event stream,
// rendered in the dashboard "Analytics" page.
router.get('/analytics', async (req, res) => {
  try {
    const [{ rows: totals }] = await Promise.all([
      query(`SELECT
        COUNT(*) FILTER (WHERE created_at > now() - interval '1 day')::int AS events_24h,
        COUNT(DISTINCT user_id) FILTER (WHERE created_at > now() - interval '1 day')::int AS dau,
        COUNT(DISTINCT user_id) FILTER (WHERE created_at > now() - interval '7 days')::int AS wau,
        COUNT(*)::int AS events_total
      FROM app_events`),
    ]);

    const { rows: daily } = await query(`
      SELECT to_char(date_trunc('day', created_at),'YYYY-MM-DD') AS day, COUNT(*)::int AS events,
             COUNT(DISTINCT user_id)::int AS users
      FROM app_events WHERE created_at > now() - interval '14 days' GROUP BY 1 ORDER BY 1`);

    const { rows: topEvents } = await query(`
      SELECT event, COUNT(*)::int AS n, COUNT(DISTINCT user_id)::int AS users
      FROM app_events WHERE created_at > now() - interval '7 days'
      GROUP BY event ORDER BY n DESC LIMIT 10`);

    const { rows: platforms } = await query(`
      SELECT COALESCE(platform,'unknown') AS platform, COUNT(DISTINCT device_id)::int AS devices
      FROM app_events WHERE created_at > now() - interval '30 days' GROUP BY 1`);

    const { rows: recent } = await query(`
      SELECT e.event, e.platform, e.created_at, u.full_name, u.username
      FROM app_events e LEFT JOIN users u ON u.id=e.user_id
      ORDER BY e.created_at DESC LIMIT 30`);

    res.json({ totals: totals[0], daily, top_events: topEvents, platforms, recent });
  } catch (e) { console.error(e); res.status(500).json({ error: 'SERVER_ERROR' }); }
});

/* ------------------------------ ACTIVITY -------------------------------- */
router.get('/activity', async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT l.id, l.success, l.ip, l.user_agent, l.created_at, l.email,
             u.full_name, u.username
      FROM login_logs l LEFT JOIN users u ON u.id=l.user_id
      ORDER BY l.created_at DESC LIMIT 50`);
    res.json({ activity: rows });
  } catch (e) { console.error(e); res.status(500).json({ error: 'SERVER_ERROR' }); }
});

export default router;
