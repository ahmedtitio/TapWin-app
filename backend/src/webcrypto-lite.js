// Web-Crypto helpers that replace Node's crypto module (Workers-safe).
const enc = new TextEncoder();

export function randomBytesHex(n) {
  const b = crypto.getRandomValues(new Uint8Array(n));
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

export async function sha256Hex(s) {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(String(s)));
  return Array.from(new Uint8Array(digest), (x) => x.toString(16).padStart(2, '0')).join('');
}
