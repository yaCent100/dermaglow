// Petit client HTTP pour l'API CodeIgniter.
const TOKEN_KEY = 'dg_admin_token';

function safeStorage() {
  try { return window.localStorage; } catch { return null; }
}

export const auth = {
  get token() { return safeStorage()?.getItem(TOKEN_KEY) || ''; },
  set token(v) {
    const s = safeStorage(); if (!s) return;
    v ? s.setItem(TOKEN_KEY, v) : s.removeItem(TOKEN_KEY);
  },
};

export class ApiError extends Error {
  constructor(message, status, fields) { super(message); this.status = status; this.fields = fields || {}; }
}

async function request(method, url, body, opts = {}) {
  const headers = { Accept: 'application/json' };
  const isForm = body instanceof FormData;
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json';
  if (url.startsWith('/admin') && auth.token) {
    headers.Authorization = 'Bearer ' + auth.token;
    headers['X-Auth-Token'] = auth.token;
  }
  let res;
  try {
    res = await fetch('/api' + url, {
      method, headers,
      body: body === undefined ? undefined : (isForm ? body : JSON.stringify(body)),
    });
  } catch {
    throw new ApiError('Connexion impossible. Vérifiez votre connexion internet.', 0);
  }
  if (opts.raw) {
    if (!res.ok) throw new ApiError('Téléchargement impossible.', res.status);
    return res;
  }
  let data = null;
  try { data = await res.json(); } catch { /* réponse vide */ }
  if (!res.ok) {
    if (res.status === 401 && url.startsWith('/admin') && url !== '/admin/login') {
      auth.token = '';
      window.dispatchEvent(new CustomEvent('dg:unauthorized'));
    }
    throw new ApiError(data?.error || 'Une erreur est survenue.', res.status, data?.fields);
  }
  return data;
}

export const api = {
  get: (url, params) => {
    const q = params ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined)).toString() : '';
    return request('GET', url + (q === '?' ? '' : q));
  },
  post: (url, body = {}) => request('POST', url, body),
  put: (url, body = {}) => request('PUT', url, body),
  patch: (url, body = {}) => request('PATCH', url, body),
  del: (url) => request('DELETE', url),
  upload: (url, formData) => request('POST', url, formData),
  async download(url, filename) {
    const res = await request('GET', url, undefined, { raw: true });
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  },
};
