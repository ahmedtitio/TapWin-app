// REST client for the Cloudflare Worker / Express API.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

const TOKEN_KEY = 'admin_access_token';
const USER_KEY = 'admin_user';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const getUser = () => {
  try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
};
export function setSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}
export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
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
    throw new Error('تعذر الاتصال بالخادم، تحقق من عنوان الـ API');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && auth) {
      clearSession();
      window.dispatchEvent(new Event('admin:logout'));
    }
    const err = new Error(data.message || data.error || 'حدث خطأ غير متوقع');
    err.code = data.error;
    err.status = res.status;
    throw err;
  }
  return data;
}

/* ------------------------------- Auth -------------------------------- */
export const login = (email, password, audience = 'admin') =>
  request('/api/auth/login', { method: 'POST', body: { email, password, audience }, auth: false });
export const forgotPassword = (email) =>
  request('/api/auth/forgot-password', { method: 'POST', body: { email }, auth: false });
export const resetPassword = (token, password) =>
  request('/api/auth/reset-password', { method: 'POST', body: { token, password }, auth: false });

/* ------------------------------- Admin ------------------------------- */
export const getStats = () => request('/api/admin/stats');
export const getUsers = ({ page = 1, limit = 20, search = '', status = '' } = {}) =>
  request(`/api/admin/users?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}&status=${status}`);
export const getUserDetail = (id) => request(`/api/admin/users/${id}`);
export const createUser = (payload) => request('/api/admin/users', { method: 'POST', body: payload });
export const updateUser = (id, payload) => request(`/api/admin/users/${id}`, { method: 'PATCH', body: payload });
export const deleteUser = (id) => request(`/api/admin/users/${id}`, { method: 'DELETE' });
export const revokeUser = (id) => request(`/api/admin/users/${id}/revoke`, { method: 'POST' });
export const deleteDevice = (deviceId) => request(`/api/admin/devices/${deviceId}`, { method: 'DELETE' });
export const getActivity = () => request('/api/admin/activity');
