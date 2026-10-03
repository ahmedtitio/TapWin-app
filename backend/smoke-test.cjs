// End-to-end smoke test against the real Neon DB (runs the Worker code path).
(await import('dotenv')).default.config({ path: '.dev.vars' });

(async () => {
  const { cleanNeonUrl, buildApp } = await import('./src/worker.js');
  const { migrateWithSql } = await import('./src/db.js');
  const { neon } = await import('@neondatabase/serverless');
  const bcrypt = (await import('bcryptjs')).default;

  const env = {
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: 'test-secret-0123456789abcdef0123456789abcdef',
    ADMIN_EMAIL: 'admin@example.com',
    ADMIN_PASSWORD: 'ChangeMe123!',
    APP_URL: 'http://localhost:5173',
  };

  await migrateWithSql(neon(cleanNeonUrl(env.DATABASE_URL)), bcrypt);
  console.log('MIGRATION OK');

  const app = buildApp(env);
  const call = async (method, path, body, token) => {
    const req = new Request('http://w' + path, {
      method,
      headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const res = await app.fetch(req);
    let json = {}; try { json = await res.json(); } catch {}
    return { status: res.status, json };
  };

  const uniq = Date.now().toString(36);
  const email = `u_${uniq}@test.com`;

  const results = [];
  const check = (name, cond, extra='') => { results.push([name, cond ? 'PASS' : 'FAIL', extra]); };

  let r = await call('GET', '/healthz'); check('healthz', r.status === 200);

  r = await call('POST', '/api/auth/register', { full_name: 'Test User', username: 'user_' + uniq, email, password: 'Pass1234', device_id: 'dev-' + uniq });
  check('register', r.status === 201 && r.json.tokens?.accessToken, JSON.stringify(r.json.message||r.json.user?.email));

  r = await call('POST', '/api/auth/login', { email, password: 'Pass1234', device_id: 'dev-' + uniq });
  const userToken = r.json.tokens?.accessToken;
  const userRefresh = r.json.tokens?.refreshToken;
  check('login(app)', r.status === 200 && !!userToken);

  r = await call('POST', '/api/auth/heartbeat', { device_id: 'dev-' + uniq, device_name: 'Pixel 8 Pro', platform: 'android', app_version: '1.0.0' }, userToken);
  check('heartbeat', r.status === 200 && r.json.ok === true);

  r = await call('GET', '/api/auth/me', null, userToken);
  check('me', r.status === 200 && r.json.user?.username === 'user_' + uniq);

  r = await call('POST', '/api/auth/forgot-password', { email });
  check('forgot-password', r.status === 200);

  r = await call('POST', '/api/auth/login', { email, password: 'WrongPass1' });
  check('bad-login rejected', r.status === 401 && r.json.error === 'INVALID_CREDENTIALS');

  r = await call('POST', '/api/auth/login', { email: 'admin@example.com', password: 'ChangeMe123!', audience: 'admin' });
  const adminToken = r.json.tokens?.accessToken;
  check('login(admin)', r.status === 200 && r.json.user?.role === 'admin');

  // non-admin cannot access admin routes
  r = await call('GET', '/api/admin/stats', null, userToken);
  check('admin-guard', r.status === 401 || r.status === 403);

  r = await call('GET', '/api/admin/stats', null, adminToken);
  check('stats', r.status === 200 && typeof r.json.stats?.total_users === 'number', JSON.stringify(r.json.stats));

  r = await call('GET', '/api/admin/users?search=' + uniq, null, adminToken);
  const found = r.json.users?.[0];
  check('users-list + online status', r.status === 200 && found?.online === true, `online=${found?.online}`);
  const uid = found?.id;

  r = await call('GET', '/api/admin/users/' + uid, null, adminToken);
  check('user-detail devices', r.status === 200 && r.json.devices?.[0]?.online === true);

  r = await call('POST', '/api/admin/users', { full_name: 'Created By Admin', username: 'adm_' + uniq, email: `a_${uniq}@test.com`, password: 'Admin1234' });
  check('admin-create-user', r.status === 201);
  const createdId = r.json.user?.id;

  r = await call('PATCH', '/api/admin/users/' + createdId, { is_active: false }, adminToken);
  check('admin-disable-user', r.status === 200 && r.json.user?.is_active === false);

  r = await call('POST', '/api/auth/login', { email: `a_${uniq}@test.com`, password: 'Admin1234' });
  check('disabled-cannot-login', r.status === 403);

  r = await call('GET', '/api/admin/users?search=' + uniq + '&status=offline', null, adminToken);
  check('filter-offline', r.status === 200);

  r = await call('DELETE', '/api/admin/users/' + createdId, null, adminToken);
  check('admin-delete-user', r.status === 200);

  r = await call('GET', '/api/admin/activity', null, adminToken);
  check('activity-log', r.status === 200 && r.json.activity?.length > 0);

  r = await call('POST', `/api/admin/users/${uid}/revoke`, {}, adminToken);
  check('revoke-sessions', r.status === 200);

  r = await call('POST', '/api/auth/logout', { refresh_token: userRefresh, device_id: 'dev-' + uniq });
  check('logout', r.status === 200);

  r = await call('POST', '/api/auth/refresh', { refresh_token: userRefresh });
  check('revoked-refresh-rejected', r.status === 401);

  // cleanup test user
  await call('DELETE', '/api/admin/users/' + uid, null, adminToken);

  console.log('\n--- RESULTS ---');
  for (const [n, s, x] of results) console.log(`${s}  ${n}${x ? '  | ' + x : ''}`);
  const fails = results.filter((x) => x[1] === 'FAIL').length;
  console.log(`\n${results.length - fails}/${results.length} passed`);
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
