// Cloudflare Worker entry point for the API.
// Runs Express inside Workers with nodejs_compat; Postgres goes through Neon's
// serverless driver (HTTPS) and passwords use bcryptjs (pure JS, works in Workers).
import express from 'express';
import cors from 'cors';
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

import { setQuery, migrateWithSql } from './db.js';
import authRoutes from './auth-routes.js';
import adminRoutes from './admin-routes.js';

/** Neon's HTTPS driver doesn't accept libpq params (sslmode/channel_binding). */
export function cleanNeonUrl(u) {
  return String(u || '')
    .replace(/([?&])(sslmode|channel_binding)=[^&]*/g, '')
    .replace(/[?&]$/, '');
}

let cached = null;

export function buildApp(env) {
  const sql = neon(cleanNeonUrl(env.DATABASE_URL));
  // Route modules call query(text, params) -> pg-style { rows, rowCount }.
  setQuery(async (text, params) => {
    const r = await sql.query(text, params || []);
    return { rows: r, rowCount: Array.isArray(r) ? r.length : 0 };
  });

  const app = express();
  app.disable('x-powered-by');
  app.use(cors({ origin: true }));
  app.use(express.json({ limit: '1mb' }));

  app.get('/healthz', (_req, res) => res.json({ ok: true, runtime: 'worker' }));
  app.use('/api/auth', authRoutes);
  app.use('/api/admin', adminRoutes);
  app.use((_req, res) => res.status(404).json({ error: 'NOT_FOUND' }));
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'خطأ داخلي في الخادم' });
  });
  return app;
}

export default {
  async fetch(request, env, ctx) {
    if (!cached) {
      process.env.JWT_SECRET = env.JWT_SECRET;
      process.env.ADMIN_EMAIL = env.ADMIN_EMAIL;
      process.env.ADMIN_PASSWORD = env.ADMIN_PASSWORD;
      process.env.APP_URL = env.APP_URL;
      process.env.FIREBASE_PROJECT_ID = env.FIREBASE_PROJECT_ID;
      cached = buildApp(env);
      const sql = neon(cleanNeonUrl(env.DATABASE_URL));
      cached._migrating = migrateWithSql(sql, bcrypt)
        .then(() => { cached._migrated = true; console.log('[db] migrated'); })
        .catch((e) => console.error('[db] migration failed:', e?.message || e));
    }
    if (!cached._migrated) ctx.waitUntil(cached._migrating);
    return cached.fetch(request);
  },
};
