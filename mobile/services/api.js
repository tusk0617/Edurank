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
export const login = (username, password) => api.post('/api/auth/login', { username, password });
export const register = (data) => api.post('/api/auth/register', data);
export const getMe = () => api.get('/api/auth/me');

// Assessment (siswa)
export const getAssessment = () => api.get('/api/assessment');
export const getSoal = (id) => api.get(`/api/assessment/${id}/soal`);
export const submitAssessment = (id, data) => api.post(`/api/assessment/${id}/submit`, data);
export const logActivity = (id, data) => api.post(`/api/assessment/${id}/activity`, data);

// Guru
export const getGuruSoal = () => api.get('/api/guru/soal');
export const getGuruModul = () => api.get('/api/guru/modul');
export const getGuruMapel = () => api.get('/api/guru/mapel');
export const createModul = (data) => api.post('/api/guru/modul', data);
export const createSoal = (data) => api.post('/api/guru/soal', data);
export const updateSoal = (id, data) => api.put(`/api/guru/soal/${id}`, data);
export const deleteSoal = (id) => api.delete(`/api/guru/soal/${id}`);
// Statistik guru
export const getGuruStatistikSoal = () => api.get('/api/guru/statistik/soal');
export const getGuruStatistikSiswa = (userId) => api.get(`/api/guru/statistik/siswa/${userId}`);
// Assessment guru (CRUD)
export const getGuruAssessment = () => api.get('/api/guru/assessment');
export const createAssessment = (data) => api.post('/api/guru/assessment', data);
export const updateAssessment = (id, data) => api.put(`/api/guru/assessment/${id}`, data);
export const deleteAssessment = (id) => api.delete(`/api/guru/assessment/${id}`);
// Activity log guru
export const getGuruActivityLog = () => api.get('/api/guru/activity-log');
export const getGuruActivityLogDetail = (hasilId) => api.get(`/api/guru/activity-log/${hasilId}`);
// Auth actions
export const changePassword = (data) => api.put('/api/auth/change-password', data);

export default api;
