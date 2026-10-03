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
    const r = await sql.query(text, params || []);
    return { rows: r, rowCount: Array.isArray(r) ? r.length : 0 };
  });

  // Make env available where code reads process.env (JWT_SECRET etc.)
  globalThis.process = globalThis.process || { env: {} };
  globalThis.process.env = Object.assign({}, globalThis.process.env, {
    JWT_SECRET: env.JWT_SECRET,
    ADMIN_EMAIL: env.ADMIN_EMAIL,
    ADMIN_PASSWORD: env.ADMIN_PASSWORD,
    APP_URL: env.APP_URL,
    FIREBASE_PROJECT_ID: env.FIREBASE_PROJECT_ID,
    NODE_ENV: 'production',
  });

  let migrating = null;
  function ensureMigrated(ctx) {
    if (!migrating) {
      migrating = migrateWithSql(sql, bcrypt)
        .then(() => { console.log('[db] migrated'); return true; })
        .catch((e) => { console.error('[db] migration failed:', e?.message || e); migrating = null; return false; });
    }
    return migrating;
  }

  async function fetchHandler(request, ctx) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }
    if (url.pathname === '/healthz') return json({ ok: true, runtime: 'worker' });

    if (!(await ensureMigrated(ctx))) {
      return json({ error: 'DB_NOT_READY' }, 503);
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
