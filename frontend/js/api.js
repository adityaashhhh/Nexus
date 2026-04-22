// ========== API SERVICE ==========

const API_BASE = window.location.origin + '/api/v1';

/**
 * Generic fetch wrapper that attaches JWT token and handles errors.
 */
async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('token');

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  // Don't set Content-Type for GET/HEAD requests with no body
  if (!options.body) {
    delete config.body;
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      // Auto-logout on 401
      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        showView('auth');
        showToast('Session expired — please log in again', 'error');
        throw new Error('Unauthorized');
      }

      throw new Error(data.message || 'Something went wrong');
    }

    return data;
  } catch (error) {
    if (error.message === 'Failed to fetch') {
      showToast('Cannot connect to server. Is the backend running?', 'error');
    }
    throw error;
  }
}

// ========== AUTH API ==========

const AuthAPI = {
  register: (data) =>
    apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  login: (data) =>
    apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(data) }),

  getMe: () => apiRequest('/auth/me'),
};

// ========== PRODUCTS API ==========

const ProductsAPI = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/products${query ? '?' + query : ''}`);
  },

  getOne: (id) => apiRequest(`/products/${id}`),

  create: (data) =>
    apiRequest('/products', { method: 'POST', body: JSON.stringify(data) }),

  update: (id, data) =>
    apiRequest(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  delete: (id) =>
    apiRequest(`/products/${id}`, { method: 'DELETE' }),
};
