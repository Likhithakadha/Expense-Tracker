export const getToken = () => localStorage.getItem('sw_token');

export async function api(path, { method = 'GET', body, raw } = {}) {
  let r;
  try {
    r = await fetch('/api' + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(getToken() ? { Authorization: 'Bearer ' + getToken() } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Cannot reach the server. Please make sure the backend is running (run start.bat) and try again.');
  }
  if (r.status === 401 && getToken()) {
    // Auth pages must show their own error (e.g. "Wrong email or password") instead of reloading silently
    if (path === '/auth/me') localStorage.removeItem('sw_token');
    else if (!path.startsWith('/auth/')) { localStorage.removeItem('sw_token'); location.reload(); }
  }
  if (raw) return r;
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || (r.status >= 500 ? 'Server is not responding. Make sure the backend is running on port 5000.' : 'Request failed'));
  return d;
}

export const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const thisMonth = () => today().slice(0, 7);
export const monthLabel = (m) => new Date(m + '-01').toLocaleString('en-IN', { month: 'short', year: 'numeric' });
