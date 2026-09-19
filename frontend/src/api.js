/**
 * ShopSphere Frontend - API Client Library
 * Centralized HTTP Client with Bearer Token Injection & Error Handling
 */

const API_BASE = (import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:8000') + '/api';

/**
 * Generic request helper with automatic Authorization header injection
 */
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('shopsphere_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    // Parse JSON response safely
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = { text: await response.text() };
    }

    if (!response.ok) {
      const errorMessage = data?.message || data?.error || `Request failed with status ${response.status}`;
      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    // If unauthorized, clear invalid token
    if (error.status === 401 || error.status === 403) {
      // Don't auto-clear during initial login attempt
      if (!endpoint.includes('/auth/login')) {
        localStorage.removeItem('shopsphere_token');
        localStorage.removeItem('shopsphere_user');
      }
    }
    throw error;
  }
}

// Authentication API
export const authApi = {
  login: (credentials) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    }),

  register: (userData) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    }),

  validateToken: () =>
    request('/auth/validate', {
      method: 'POST'
    })
};

// User Profile API
export const userApi = {
  getProfile: (userId) => request(`/users/${userId}`),
  getMyProfile: () => request('/users/me'),
  updateProfile: (userId, updateData) =>
    request(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    })
};

// Products & Catalog API
export const productApi = {
  getProducts: (params = {}) => {
    const query = new URLSearchParams();
    if (params.category && params.category !== 'All') query.append('category', params.category);
    if (params.search) query.append('search', params.search);
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return request(`/orders/products${queryString}`);
  },
  getProductById: (id) => request(`/orders/products/${id}`)
};

// Orders API
export const orderApi = {
  createOrder: (orderPayload) =>
    request('/orders', {
      method: 'POST',
      body: JSON.stringify(orderPayload)
    }),

  getOrders: (params = {}) => {
    const query = new URLSearchParams();
    if (params.userId) query.append('userId', params.userId);
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return request(`/orders${queryString}`);
  },

  getOrderById: (id) => request(`/orders/${id}`),

  updateStatus: (id, status, trackingNumber = '') =>
    request(`/orders/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, trackingNumber })
    })
};

// Health Check API
export const healthApi = {
  checkGateway: () =>
    fetch(`${API_BASE.replace('/api', '')}/health`).then((r) => r.json())
};
