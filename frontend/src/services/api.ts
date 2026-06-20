import axios, { InternalAxiosRequestConfig } from 'axios';
import { config as appConfig } from '../config';

const api = axios.create({
  baseURL: appConfig.apiUrl,
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('accessToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
