import axios from 'axios';
import { Platform, Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';

const BASE_URL = 'https://app-7b28b5c9-226a-4f4b-a64e-4cc73da21c44.cleverapps.io';

const storage = {
  async getItem(key) {
    if (Platform.OS === 'web') return localStorage.getItem(key);
    return await SecureStore.getItemAsync(key);
  },
  async deleteItem(key) {
    if (Platform.OS === 'web') { localStorage.removeItem(key); return; }
    await SecureStore.deleteItemAsync(key);
  },
};

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

// Request interceptor: attach token
api.interceptors.request.use(async (config) => {
  const token = await storage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401 & network error
let offlineAlertShown = false;
api.interceptors.response.use(
  (response) => { offlineAlertShown = false; return response; },
  async (error) => {
    if (!error.response) {
      // Network error / no internet
      if (!offlineAlertShown) {
        offlineAlertShown = true;
        Alert.alert(
          '🔌 Tidak Ada Koneksi',
          'Pastikan perangkat Anda terhubung ke internet, lalu coba lagi.',
          [{ text: 'OK', onPress: () => { offlineAlertShown = false; } }]
        );
      }
      return Promise.reject(error);
    }
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      if (!url.includes('/api/auth/me') && !url.includes('/api/auth/login')) {
        await storage.deleteItem('token');
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
export const getRankingSaya = () => api.get('/api/ranking/saya');

// Guru
export const getGuruSoal = () => api.get('/api/guru/soal');
export const getGuruModul = () => api.get('/api/guru/modul');
export const getGuruMapel = () => api.get('/api/guru/mapel');
export const createModul = (data) => api.post('/api/guru/modul', data);
export const createSoal = (data) => api.post('/api/guru/soal', data);
export const updateSoal = (id, data) => api.put(`/api/guru/soal/${id}`, data);
export const deleteSoal = (id) => api.delete(`/api/guru/soal/${id}`);
export const getGuruGap = () => api.get('/api/guru/gap');
export const getGuruGapSiswa = () => api.get('/api/guru/gap/siswa');
export const getGuruGapModul = () => api.get('/api/guru/gap/modul');
export const getGuruGapModulSoal = (id) => api.get(`/api/guru/gap/modul/${id}`);


export default api;
