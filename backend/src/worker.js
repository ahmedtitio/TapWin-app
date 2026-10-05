// Cloudflare Worker entry point for the API.
// Uses a minimal Express-compatible router (mini-router.js) so no Node-only
// packages (body-parser/express) are bundled. Postgres goes through Neon's
// serverless driver (HTTPS); passwords use bcryptjs (pure JS, Workers-safe).
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

import { setQuery, migrateWithSql } from './db.js';
import authRoutes from './auth-routes.js';
import adminRoutes, { guards as adminGuards } from './admin-routes.js';

/** Neon's HTTPS driver doesn't accept libpq params (sslmode/channel_binding). */
export function cleanNeonUrl(u) {
  return String(u || '')
    .replace(/([?&])(sslmode|channel_binding)=[^&]*/g, '')
    .replace(/[?&]$/, '');
}

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
  'access-control-allow-headers': 'content-type,authorization',
  'access-control-max-age': '86400',
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...CORS },
  });
}

async function buildApp(env) {
  const sql = neon(cleanNeonUrl(env.DATABASE_URL));
  // Route modules call query(text, params) -> pg-style { rows, rowCount }.
  setQuery(async (text, params) => {
    // Neon serverless returns a plain array of row objects.
    let r;
    try {
      // Tagged-template-free call: sql(queryText, ...params) returns rows array.
      r = await sql.query(text, params || []);
    } catch (e) {
      console.error('[sql] query failed:', String(e?.message || e), '\n  on:', text.slice(0, 120));
      throw e;
    }
    const rows = Array.isArray(r) ? r : (r?.rows ?? []);
    return { rows, rowCount: rows.length };
  });

  // Make env available where code reads process.env (JWT_SECRET etc.)
  globalThis.process = globalThis.process || { env: {} };
  globalThis.process.env = Object.assign({}, globalThis.process.env, {
    JWT_SECRET: env.JWT_SECRET,
    ADMIN_EMAIL: env.ADMIN_EMAIL,
    ADMIN_PASSWORD: env.ADMIN_PASSWORD,
    APP_URL: env.APP_URL,
    FIREBASE_PROJECT_ID: env.FIREBASE_PROJECT_ID,
    RESEND_API_KEY: env.RESEND_API_KEY,
    GOOGLE_WEB_CLIENT_ID: env.GOOGLE_WEB_CLIENT_ID,
    GOOGLE_ANDROID_CLIENT_ID: env.GOOGLE_ANDROID_CLIENT_ID,
    NODE_ENV: 'production',
  });

  let diagDone = false;
  async function runDiag() {
    if (diagDone) return; diagDone = true;
    try {
      const steps = [
        ['pgcrypto', 'CREATE EXTENSION IF NOT EXISTS pgcrypto'],
        ['uuidoss', 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp"'],
        ['gr1', 'SELECT gen_random_uuid()'],
        ['gr2', 'SELECT uuid_generate_v4()'],
        ['tables', 'SELECT table_name FROM information_schema.tables WHERE table_schema=$1'],
      ];
      for (const [name, q] of steps) {
        try {
          const r = await sql.query(q, name === 'tables' ? ['public'] : []);
          console.log('[diag]', name, 'OK', JSON.stringify(r).slice(0, 120));
        } catch (e) {
          console.log('[diag]', name, 'FAIL', String(e?.message || e).slice(0, 200));
        }
      }
      console.log('[diag] driver version check:', typeof sql, Object.getOwnPropertyNames(sql.__proto__ || {}).join(','));
    } catch (e) { console.log('[diag] fatal', String(e?.stack || e).slice(0, 500)); }
  }

  let migrating = null;
  function ensureMigrated(ctx) {
    if (!migrating) {
      migrating = migrateWithSql({ query: async (t, p) => { const rows = await sql.query(t, p || []); return { rows, rowCount: rows.length }; } }, bcrypt)
        .then((r) => { console.log('[db] migrated', r); return r || { ok: false }; })
        .catch((e) => {
          const msg = String(e?.message || e);
          console.error('[db] migration failed:', msg);
          migrating = null;
          return { ok: false, error: msg };
        });
    }
    return migrating;
  }

  async function fetchHandler(request, ctx) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }
    if (url.pathname === '/healthz') return json({ ok: true, runtime: 'worker' });
    if (url.pathname === '/__diag') { await runDiag(); return json({ diag: 'see logs' }); }
    if (url.pathname === '/__sql' && request.method === 'POST') {
      const { q, p } = await request.json();
      try { const r = await sql.query(q, p || []); return json({ ok: true, rows: r.slice(0, 50) }); }
      catch (e) { return json({ ok: false, error: String(e?.message || e) }); }
    }

    const mig = await ensureMigrated(ctx);
    if (!mig.ok) {
      return json({ error: 'DB_NOT_READY', detail: mig.error || 'migration pending' }, 503);
    }

    // Build an express-like req object
    let body = {};
    if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method)) {
      try { body = await request.json(); } catch { body = {}; }
    }
    const headers = {};
    request.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });
    const req = {
      method: request.method,
      pathname: url.pathname.replace(/\/+$/, '') || '/',
      url,
      headers,
      body,
      query: Object.fromEntries(url.searchParams.entries()),
      ip: headers['cf-connecting-ip'] || (headers['x-forwarded-for'] || '').split(',')[0].trim(),
    };

    let routeRes = null;
    if (url.pathname.startsWith('/api/admin')) {
      req.pathname = url.pathname.slice('/api/admin'.length) || '/';
      const resShim = { _status: 200, response: null, status(c) { this._status = c; return this; }, json(o) { this.response = json(o, this._status); return this; } };
      await adminGuards(req, resShim);
      routeRes = resShim.response || (await adminRoutes.handle(req));
    } else if (url.pathname.startsWith('/api/auth')) {
      req.pathname = url.pathname.slice('/api/auth'.length) || '/';
      routeRes = await authRoutes.handle(req);
    }

    if (routeRes) {
      const h = new Headers(routeRes.headers);
      Object.entries(CORS).forEach(([k, v]) => h.set(k, v));
      return new Response(routeRes.body, { status: routeRes.status, headers: h });
    }
    return json({ error: 'NOT_FOUND' }, 404);
  }

  return { fetch: (request, ctx) => fetchHandler(request, ctx) };
}

let cached = null;

export default {
  async fetch(request, env, ctx) {
    if (!cached) cached = await buildApp(env);
    try {
      return await cached.fetch(request, ctx);
    } catch (e) {
      console.error(e);
      return json({ error: 'SERVER_ERROR', message: 'خطأ داخلي في الخادم' }, 500);
    }
  },
};
