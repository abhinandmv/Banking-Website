import axios from 'axios';

const BASE_URL = 'http://localhost:5001/api';

const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('banking_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('banking_token');
      localStorage.removeItem('banking_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  signup: (data) => api.post('/auth/signup', data),
  login: (acno, password, account_type) => api.post('/auth/login', { acno, password, account_type }),
  forgotPassword: (acno, email, new_password, confirm_password) =>
    api.post('/auth/forgot-password', { acno, email, new_password, confirm_password }),
  verify: () => api.get('/auth/verify'),
};

export const accountAPI = {
  getDetails: () => api.get('/account/details'),
  getBalance: () => api.get('/account/balance'),
  closeAccount: (password) => api.delete('/account/close', { data: { password } }),
};

export const transactionAPI = {
  deposit: (amount) => api.post('/transactions/deposit', { amount }),
  withdraw: (amount) => api.post('/transactions/withdraw', { amount }),
  transfer: (to_acno, amount) => api.post('/transactions/transfer', { to_acno, amount }),
  getHistory: (limit = 20) => api.get(`/transactions/history?limit=${limit}`),
};

export const cardAPI = {
  getCards: () => api.get('/cards'),
  createCard: () => api.post('/cards/create'),
  getCard: (id) => api.get(`/cards/${id}`),
  withdraw: (id, amount, card_password) => api.post(`/cards/${id}/withdraw`, { amount, card_password }),
  payment: (id, to_acno, amount, card_password) =>
    api.post(`/cards/${id}/payment`, { to_acno, amount, card_password }),
  redeem: (id, points) => api.post(`/cards/${id}/redeem`, { points }),
  changePassword: (id, old_password, new_password) =>
    api.put(`/cards/${id}/password`, { old_password, new_password }),
};

export const currentAPI = {
  apply: (data) => api.post('/current/apply', data),
  getDashboard: () => api.get('/current/dashboard'),
  gstPayment: (gst_amount) => api.post('/current/gst-payment', { gst_amount }),
  downloadStatement: () => api.post('/current/download-statement'),
};

export default api;
