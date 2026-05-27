const API = (() => {
  // Development  → points to your local FastAPI server
  // Production   → set window.API_BASE_URL before loading this script,
  //                or update this string to your Render URL.
  const BASE_URL = window.API_BASE_URL || 'http://localhost:8000/api';

  async function request(method, endpoint, body = null) {
    const token = Auth.getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(`${BASE_URL}${endpoint}`, opts);

    if (res.status === 401) {
      Auth.clearSession();
      window.location.href = 'login.html';
      return;
    }

    const data = await res.json();
    if (!res.ok) {
      let msg = 'Something went wrong';
      if (typeof data.detail === 'string') {
        msg = data.detail;
      } else if (Array.isArray(data.detail)) {
        // FastAPI/Pydantic v2 validation errors: [{loc, msg, type}, ...]
        // Filter out the generic "Input should be None" fallback messages from union types
        const useful = data.detail.filter(e => e.type !== 'none_required');
        const source = useful.length ? useful : data.detail;
        msg = source.map(e => {
          const field = Array.isArray(e.loc) ? e.loc.filter(x => x !== 'body').join('.') : '';
          return field ? `${field}: ${e.msg}` : e.msg;
        }).join('; ');
      } else if (data.message) {
        msg = data.message;
      }
      throw new Error(msg);
    }
    return data;
  }

  return {
    auth: {
      login:          (email, password) => request('POST', '/auth/login', { email, password }),
      register:       (payload)         => request('POST', '/auth/register', payload),
      getMe:          ()                => request('GET',  '/auth/me'),
      updateProfile:  (payload)         => request('PATCH', '/auth/profile', payload),
      changePassword: (payload)         => request('POST', '/auth/change-password', payload),
    },
    dashboard: {
      getSummary: () => request('GET', '/dashboard/summary'),
    },
    customers: {
      list:   (params = '')      => request('GET', `/customers${params}`),
      get:    (id)               => request('GET', `/customers/${id}`),
      create: (payload)          => request('POST', '/customers', payload),
      update: (id, payload)      => request('PUT', `/customers/${id}`, payload),
      delete: (id)               => request('DELETE', `/customers/${id}`),
    },
    orders: {
      list:         (params = '') => request('GET', `/orders${params}`),
      get:          (id)          => request('GET', `/orders/${id}`),
      create:       (payload)     => request('POST', '/orders', payload),
      update:       (id, payload) => request('PUT', `/orders/${id}`, payload),
      updateStatus: (id, status)  => request('PATCH', `/orders/${id}/status`, { status }),
      delete:       (id)          => request('DELETE', `/orders/${id}`),
    },
    payments: {
      list:         (params = '') => request('GET', `/payments${params}`),
      recordPayment:(orderId, payload) => request('POST', `/orders/${orderId}/payments`, payload),
      getReceipt:   (orderId)     => request('GET', `/orders/${orderId}/receipt`),
      delete:       (id)          => request('DELETE', `/payments/${id}`),
    },
    appointments: {
      list:   (params = '')  => request('GET', `/appointments${params}`),
      create: (payload)      => request('POST', '/appointments', payload),
      update: (id, payload)  => request('PUT', `/appointments/${id}`, payload),
      delete: (id)           => request('DELETE', `/appointments/${id}`),
    },
    analytics: {
      getSummary:        (period) => request('GET', `/analytics/summary?period=${period}`),
      getRevenue:        (period) => request('GET', `/analytics/revenue?period=${period}`),
      getTopCustomers:   ()       => request('GET', '/analytics/top-customers'),
      getPopularGarments:()       => request('GET', '/analytics/popular-garments'),
    },
    admin: {
      getStats:   ()        => request('GET',   '/admin/stats'),
      listTailors:()        => request('GET',   '/admin/tailors'),
      deactivate: (id)      => request('PATCH', `/admin/tailors/${id}/deactivate`),
      reactivate: (id)      => request('PATCH', `/admin/tailors/${id}/reactivate`),
      promote:    (secret)  => request('POST',  '/admin/promote', { secret }),
    },
  };
})();
