// Data layer shared by BOTH runtimes:
//  - Node/Express dev server  -> uses the `pg` driver (TCP) via initNodePool()
//  - Cloudflare Workers       -> injects a Neon serverless-driver fn via setQuery()
let _query = null;

export function setQuery(fn) { _query = fn; }

export const query = (text, params) => {
  if (!_query) throw new Error('db not initialized');
  return _query(text, params);
};

/** App-side UUID v4 (works in Workers via crypto.randomUUID; fallback included). */
export function newId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const b = new Uint8Array(16);
  globalThis.crypto.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** Node-only: create a real pg pool and register it as the query function. */
export function initNodePool(connectionString) {
  // lazy import so bundlers targeting Workers never pull in the TCP driver
  return import('pg').then(({ Pool }) => {
    const pool = new Pool({ connectionString, ssl: { require: true }, max: 10 });
    setQuery((text, params) => pool.query(text, params));
    return pool;
  });
}

/**
 * Database schema for the whole platform (users + admin dashboard).
 * Idempotent: safe to run on every boot. Works with any executor that has
 * .query(text, params) — a pg Pool or the Neon serverless function.
 *
 * NOTE: we deliberately avoid the `pgcrypto` extension (CREATE EXTENSION can
 * fail on some Neon roles/regions and broke boot with DB_NOT_READY). UUIDs use
 * uuid_generate_v4() from the built-in `uuid-ossp` extension when available,
 * otherwise the app generates ids client-side (see newId()).
 */
export async function migrateWithSql(executor, bcryptLib, env = process.env) {
  const pool = executor;

  // Try optional extensions but never let them abort the migration.
  let uuidDefault = 'gen_random_uuid()'; // PG13+ built-in, no extension needed
  try { await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto'); }
  catch (e) { console.warn('[db] pgcrypto unavailable:', e?.message || e); }
  try { await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"'); }
  catch (e) { console.warn('[db] uuid-ossp unavailable:', e?.message || e); }
  // Verify which uuid generator actually works in this database:
  try {
    await pool.query('SELECT gen_random_uuid()');
  } catch {
    try { await pool.query('SELECT uuid_generate_v4()'); uuidDefault = 'uuid_generate_v4()'; }
    catch { uuidDefault = 'NULL'; console.warn('[db] no server-side uuid generator; ids will be app-generated'); }
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id                uuid PRIMARY KEY DEFAULT ${uuidDefault === 'NULL' ? '' : uuidDefault},
      full_name         text NOT NULL,
      username          text UNIQUE NOT NULL,
      email             text UNIQUE NOT NULL,
      phone             text,
      password_hash     text NOT NULL,
      role              text NOT NULL DEFAULT 'user',           -- user | admin
      is_active         boolean NOT NULL DEFAULT true,
      avatar_url        text,
      created_at        timestamptz NOT NULL DEFAULT now(),
      updated_at        timestamptz NOT NULL DEFAULT now(),
      last_login_at     timestamptz,
      failed_attempts   int NOT NULL DEFAULT 0,
      locked_until      timestamptz
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS devices (
      id            uuid PRIMARY KEY DEFAULT ${uuidDefault === "NULL" ? "" : uuidDefault},
      user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      device_id     text UNIQUE NOT NULL,          -- stable per-install id from the app
      device_name   text,
      platform      text,                          -- android | ios | web
      push_token    text,
      app_version   text,
      is_active     boolean NOT NULL DEFAULT false, -- true while the app session is alive
      last_seen_at  timestamptz NOT NULL DEFAULT now(),
      created_at    timestamptz NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_devices_user ON devices(user_id)
  `);

  // Firebase Google sign-in linkage (one firebase uid per user, one email per uid).
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS firebase_uid text UNIQUE
  `);

  // App analytics events reported by the Android app -> shown in the admin dashboard.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_events (
      id         bigserial PRIMARY KEY,
      user_id    uuid REFERENCES users(id) ON DELETE SET NULL,
      event      text NOT NULL,
      device_id  text,
      platform   text,
      props      jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_app_events_time ON app_events(created_at DESC)
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_app_events_name ON app_events(event, created_at DESC)
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id           uuid PRIMARY KEY DEFAULT ${uuidDefault === "NULL" ? "" : uuidDefault},
      user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      device_id    text,
      token_hash   text NOT NULL,
      ip           text,
      user_agent   text,
      created_at   timestamptz NOT NULL DEFAULT now(),
      expires_at   timestamptz NOT NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id          uuid PRIMARY KEY DEFAULT ${uuidDefault === "NULL" ? "" : uuidDefault},
      user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash  text NOT NULL,
      expires_at  timestamptz NOT NULL,
      used_at     timestamptz,
      created_at  timestamptz NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id           uuid PRIMARY KEY DEFAULT ${uuidDefault === "NULL" ? "" : uuidDefault},
      user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash   text NOT NULL UNIQUE,
      device_id    text,
      expires_at   timestamptz NOT NULL,
      revoked_at   timestamptz,
      created_at   timestamptz NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS login_logs (
      id          bigserial PRIMARY KEY,
      user_id     uuid,
      email       text,
      success     boolean NOT NULL,
      ip          text,
      user_agent  text,
      created_at  timestamptz NOT NULL DEFAULT now()
    )
  `);

  // Seed the first admin account if none exists.
  const { rows } = await pool.query("SELECT id FROM users WHERE role='admin' LIMIT 1");
  if (rows.length === 0) {
    const email = (env.ADMIN_EMAIL || 'admin@example.com').toLowerCase();
    const password = env.ADMIN_PASSWORD || 'ChangeMe123!';
    const hash = await bcryptLib.hash(password, 12);
    await pool.query(
      `INSERT INTO users (id, full_name, username, email, password_hash, role)
       VALUES ($5,$1,$2,$3,$4,'admin') ON CONFLICT (email) DO NOTHING`,
      ['Administrator', 'admin', email, hash, newId()],
    );
    console.log(`[db] seeded admin user: ${email}`);
  }

  return { ok: true, uuidDefault };
}

/** Node convenience wrapper: migrate using the registered pg pool. */
export async function migrate(bcryptLib) {
  return migrateWithSql({ query: (t, p) => query(t, p) }, bcryptLib);
}
