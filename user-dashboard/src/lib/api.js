// REST client for the regular-user web dashboard (Talks to the same Cloudflare Worker API).
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';
export { API_URL };

const TOKEN_KEY = 'user_access_token';
const REFRESH_KEY = 'user_refresh_token';
const USER_KEY = 'user_account';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const getRefresh = () => localStorage.getItem(REFRESH_KEY);
export const getUser = () => {
  try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
};
export function setSession(access, refresh, user) {
  localStorage.setItem(TOKEN_KEY, access);
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}
export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && getToken()) headers.Authorization = `Bearer ${getToken()}`;
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('تعذر الاتصال بالخادم، تحقق من اتصالك بالإنترنت');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Session expired -> auto-recover once via the stored refresh token.
    if (res.status === 401 && auth && getRefresh()) {
      try {
        const r = await fetch(`${API_URL}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: getRefresh(), audience: 'app' }),
        });
        const d = await r.json();
        if (r.ok && d.tokens) {
          setSession(d.tokens.accessToken, null, d.user || getUser());
          return request(path, { method, body, auth });
        }
      } catch { /* fall through */ }
    }
    if (res.status === 401 && auth) {
      clearSession();
      window.dispatchEvent(new Event('user:logout'));
    }
    const err = new Error(data.message || data.error || 'حدث خطأ غير متوقع');
    err.code = data.error;
    err.status = res.status;
    err.dev_code = data.dev_code; // surfaced only when no mail provider is configured
    throw err;
  }
  return data;
}

/* ------------------------------- Auth -------------------------------- */
export const login = (email, password) =>
  request('/api/auth/login', {
    method: 'POST', auth: false,
    body: { email, password, audience: 'app', platform: 'web', device_name: 'Web Browser' },
  });

export const register = (payload) =>
  request('/api/auth/register', { method: 'POST', auth: false, body: payload });

export const verifyEmail = (accessToken, code) =>
  request('/api/auth/verify-email', { method: 'POST', auth: false, body: { access_token: accessToken, code } });

export const resendVerification = () =>
  request('/api/auth/resend-verification', { method: 'POST' });

export const forgotPassword = (email) =>
  request('/api/auth/forgot-password', { method: 'POST', auth: false, body: { email } });

export const resetPassword = (code, password) =>
  request('/api/auth/reset-password', { method: 'POST', auth: false, body: { token: code, password } });

export const logout = () =>
  request('/api/auth/logout', {
    method: 'POST', auth: false,
    body: { refresh_token: getRefresh() },
  }).catch(() => {});

/* ----------------------------- Account ------------------------------- */
export const getMe = () => request('/api/auth/me');
export const updateMe = (payload) => request('/api/auth/me', { method: 'PATCH', body: payload });
export const changePassword = (current_password, new_password) =>
  request('/api/auth/change-password', { method: 'POST', body: { current_password, new_password } });
