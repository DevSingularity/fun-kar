import axios from 'axios';

const customerApi = axios.create({
  baseURL: '/api/v1/portal',
  headers: {
    'Content-Type': 'application/json',
  },
});

customerApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('portalToken') || localStorage.getItem('customer_portal_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Self-service quotation pipeline helpers
export const createSelfServiceQuote = () => customerApi.post('/quotes');
export const addSelfServiceItem = (quotationId, payload) => customerApi.post(`/quotes/${quotationId}/items`, payload);
export const submitSelfServiceQuote = (quotationId) => customerApi.post(`/quotes/${quotationId}/submit`);
export const listCatalog = (params) => customerApi.get('/quotes/catalog/products', { params });

export default customerApi;
