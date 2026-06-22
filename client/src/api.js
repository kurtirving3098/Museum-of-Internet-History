import axios from 'axios';
import { useGlobalStore } from '@/stores/globalStore';

// ─── Base instance ──────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request interceptor — attach JWT from the Pinia store ────────────────────
// useGlobalStore() is called lazily (inside the interceptor, not at module
// load time) so this file can be safely imported by globalStore.js without
// a circular-import crash — by the time a request actually fires, Pinia is
// already installed and the store instance exists.
api.interceptors.request.use(
  (config) => {
    const globalStore = useGlobalStore();
    const token = globalStore.token;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response interceptor — handle expired/invalid tokens ─────────────────────
// On 401 (no/expired token) or 403 (rejected token / forbidden), clear local
// auth state. Redirect to login is handled by the store/route guard, not here —
// this module has no access to the router instance (it's local to main.js).
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    if (status === 401 || status === 403) {
      const globalStore = useGlobalStore();
      globalStore.logout(); // expected to clear token/user from state + localStorage
    }

    return Promise.reject(error);
  }
);

// ─── Users ──────────────────────────────────────────────────────────────────
export const userApi = {
  register: (payload) => api.post('/users/register', payload),
  login:    (payload) => api.post('/users/login', payload),
  getMe:    () => api.get('/users/me'),
};

// ─── Dig (Wayback search) ───────────────────────────────────────────────────
// countries is public (no auth) per dig.js; the rest require login.
export const digApi = {
  countries: () => api.get('/dig/countries'),
  search:    (params) => api.get('/dig', { params }),
  usage:     () => api.get('/dig/usage'),
  discover:  (params) => api.get('/dig/discover', { params }),
  // Returned as a blob since the controller streams raw image bytes
  thumbnailUrl: (waybackUrl) =>
    `${api.defaults.baseURL}/dig/thumbnail?url=${encodeURIComponent(waybackUrl)}`,
};

// ─── Artifacts (curation submissions) ───────────────────────────────────────
export const artifactApi = {
  submit:  (payload) => api.post('/artifacts', payload),
  getById: (id) => api.get(`/artifacts/${id}`),
  mine:    () => api.get('/artifacts/mine'),
};

// ─── Saved items ─────────────────────────────────────────────────────────────
export const savedApi = {
  list:  () => api.get('/saved'),
  count: () => api.get('/saved/count'),
  check: (params) => api.get('/saved/check', { params }), // { exhibit_id } or { wayback_url }
  save:  (payload) => api.post('/saved', payload),
  patchNote: (id, personal_note) => api.patch(`/saved/${id}/note`, { personal_note }),
  remove: (id) => api.delete(`/saved/${id}`),
};

// ─── Subscriptions ───────────────────────────────────────────────────────────
export const subscriptionApi = {
  getPlans:  () => api.get('/subscriptions/plans'), // public
  subscribe: (plan) => api.post('/subscriptions/subscribe', { plan }),
  cancel:    () => api.post('/subscriptions/cancel'),
};

// ─── Exhibits (curated gallery) ──────────────────────────────────────────────
export const exhibitApi = {
  list:    (params) => api.get('/exhibits', { params }), // { page, page_size, featured }
  getById: (id) => api.get(`/exhibits/${id}`),
};

// ─── Tags ─────────────────────────────────────────────────────────────────────
export const tagApi = {
  listByDomain: (domain) => api.get('/tags', { params: { domain } }),
};

// ─── Posts ────────────────────────────────────────────────────────────────────
export const postApi = {
  create:   (payload) => api.post('/posts', payload),
  getFeed:  (params) => api.get('/posts', { params }), // { page, limit, author }
  getById:  (id) => api.get(`/posts/${id}`),
  remove:   (id) => api.delete(`/posts/${id}`),
};

// ─── Comments ──────────────────────────────────────────────────────────────────
export const commentApi = {
  create:        (postId, body) => api.post(`/posts/${postId}/comments`, { body }),
  getForPost:    (postId) => api.get(`/posts/${postId}/comments`),
  remove:        (id) => api.delete(`/comments/${id}`), // note: route mounted as /api/posts/:postId/comments/:id in this app
  // Admin-only global view, mounted directly on the app at /api/comments
  getAll: (params) => api.get('/comments', { params }), // { page, limit }
};

// ─── Admin Curation ────────────────────────────────────────────────────────────
export const adminApi = {
  getQueue: () => api.get('/admin/artifacts?status=pending'),
  
  approve: (id, formData) => api.post(`/admin/artifacts/${id}/approve`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  
  reject: (id, note) => api.post(`/admin/artifacts/${id}/reject`, { reviewer_note: note }),

  // ── Exhibit management ──────────────────────────────────────────────────
  // listExhibits hits the admin-only unfiltered list (includes hidden
  // exhibits) — different from exhibitApi.list, which is the public gallery
  // endpoint and excludes hidden ones.
  listExhibits: () => api.get('/admin/exhibits'),

  editExhibit: (id, formData) => api.patch(`/admin/exhibits/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),

  // One-way soft delete — no unhide counterpart exists on the backend.
  hideExhibit: (id) => api.patch(`/admin/exhibits/${id}/hide`),
};

export default api;