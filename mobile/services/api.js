import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';

// Ganti IP sesuai IP laptop kamu (cek: ipconfig di Windows / ifconfig di Mac)
const BASE_URL = 'https://edurank-production.up.railway.app';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

// Request interceptor: attach token
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      // Jangan redirect jika sedang validasi token awal
      if (!url.includes('/api/auth/me') && !url.includes('/api/auth/login')) {
        await SecureStore.deleteItemAsync('token');
        router.replace('/login');
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const login = (email, password) => api.post('/api/auth/login', { email, password });
export const register = (data) => api.post('/api/auth/register', data);
export const getMe = () => api.get('/api/auth/me');

// Modul
export const getModul = () => api.get('/api/modul');
export const getModulById = (id) => api.get(`/api/modul/${id}`);
export const mulaiModul = (id) => api.post(`/api/modul/${id}/mulai`);
export const selesaiModul = (id) => api.post(`/api/modul/${id}/selesai`);
export const getProgressSaya = () => api.get('/api/modul/progress/saya');

// Assessment
export const getAssessment = () => api.get('/api/assessment');
export const getSoal = (id) => api.get(`/api/assessment/${id}/soal`);
export const submitAssessment = (id, data) => api.post(`/api/assessment/${id}/submit`, data);

// Ranking
export const getRankingIndividu = (periode = 'semua') => api.get(`/api/ranking/individu?periode=${periode}`);
export const getRankingSekolah = (periode = 'semua') => api.get(`/api/ranking/sekolah?periode=${periode}`);
export const getRankingWilayah = () => api.get('/api/ranking/wilayah');
export const getRankingSaya = () => api.get('/api/ranking/saya');
export const getGapAnalisis = () => api.get('/api/ranking/gap/analisis');

export default api;
