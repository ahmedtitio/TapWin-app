// Minimal JWT (HS256) implementation using Web Crypto — safe for Cloudflare Workers.
// API-compatible subset of jsonwebtoken for our usage: sign(payload, secret, {expiresIn, audience})
// and verify(token, secret, {audience}).
const enc = new TextEncoder();

function b64url(bytes) {
  let s = '';
  const bin = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (const c of bin) s += String.fromCharCode(c);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlEncode(str) {
  return b64url(enc.encode(str));
}

function b64urlDecodeToStr(b64) {
  const padded = b64.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

async function hmac(secretBytes, dataStr) {
  const key = await crypto.subtle.importKey(
    'raw', secretBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(dataStr)));
}

const DURATIONS = { s: 1, m: 60, h: 3600, d: 86400 };
function toSeconds(str) {
  const m = /^(\d+)\s*(s|m|h|d)?$/.exec(String(str).trim());
  if (!m) return 3600;
  return parseInt(m[1], 10) * (DURATIONS[m[2] || 's']);
}

export async function sign(payload, secret, options = {}) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + toSeconds(options.expiresIn || '2h') };
  if (options.audience) body.aud = options.audience;
  const part = `${b64urlEncode(JSON.stringify(header))}.${b64urlEncode(JSON.stringify(body))}`;
  const sig = await hmac(enc.encode(secret), part);
  return `${part}.${b64url(sig)}`;
}

export async function verify(token, secret, options = {}) {
  const parts = String(token).split('.');
  if (parts.length !== 3) throw new Error('jwt malformed');
  const expected = await hmac(enc.encode(secret), `${parts[0]}.${parts[1]}`);
  const given = parts[2];
  const givenBytes = (() => {
    const p = given.replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(p + '='.repeat((4 - (p.length % 4)) % 4));
    const u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return u;
  })();
  if (givenBytes.length !== expected.length) throw new Error('invalid signature');
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected[i] ^ givenBytes[i];
  if (diff !== 0) throw new Error('invalid signature');
  const payload = JSON.parse(b64urlDecodeToStr(parts[1]));
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && now > payload.exp) throw new Error('jwt expired');
  if (options.audience) {
    const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!aud.includes(options.audience)) throw new Error('audience mismatch');
  }
  return payload;
}

export default { sign, verify };
