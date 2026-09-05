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


export default customerApi;
