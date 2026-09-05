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
  const shareToken = localStorage.getItem('quoteShareToken') || localStorage.getItem('customer_share_token');
  if (shareToken) {
    config.headers['X-Quote-Token'] = shareToken;
  }
  return config;
});


export default customerApi;
