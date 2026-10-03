// Auth helpers: JWT, hashing, middleware.
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query } from './db.js';

const SECRET = () => process.env.JWT_SECRET || 'dev-secret-change-me';

export const hashPassword = (plain) => bcrypt.hash(plain, 12);
export const verifyPassword = (plain, hash) => bcrypt.compare(plain, hash);
export const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

export function signAccessToken(user, audience) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email, username: user.username },
    SECRET(),
    { expiresIn: '2h', audience },
  );
}

export function signRefreshToken() {
  return crypto.randomBytes(48).toString('hex');
}

/** Express middleware factory: require a valid JWT with the given audience. */
export function authRequired(audience) {
  return async (req, res, next) => {
    try {
      const header = req.headers.authorization || '';
      const token = header.startsWith('Bearer ') ? header.slice(7) : null;
      if (!token) return res.status(401).json({ error: 'UNAUTHORIZED', message: 'لا يوجد توكن صالح' });

      const payload = jwt.verify(token, SECRET(), { audience });
      const { rows } = await query(
        'SELECT id, full_name, username, email, phone, role, is_active, avatar_url, last_login_at, created_at FROM users WHERE id=$1',
        [payload.sub],
      );
      if (!rows.length) return res.status(401).json({ error: 'UNAUTHORIZED' });
      if (!rows[0].is_active) return res.status(403).json({ error: 'ACCOUNT_DISABLED', message: 'تم تعطيل هذا الحساب' });
      req.user = rows[0];
      next();
    } catch (e) {
      return res.status(401).json({ error: 'TOKEN_EXPIRED', message: 'انتهت صلاحية الجلسة، سجّل الدخول من جديد' });
    }
  };
}

export function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'FORBIDDEN', message: 'صلاحيات المشرف مطلوبة' });
  }
  next();
}

export const clientIp = (req) =>
  (req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '')
    .toString().split(',')[0].trim();
