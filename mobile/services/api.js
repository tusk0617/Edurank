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

const api = axios.create({ baseURL: BASE_URL, timeout: 10000 });

api.interceptors.request.use(async (config) => {
  const token = await storage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let offlineAlertShown = false;
api.interceptors.response.use(
  (response) => { offlineAlertShown = false; return response; },
  async (error) => {
    if (!error.response) {
      if (!offlineAlertShown) {
        offlineAlertShown = true;
        Alert.alert('🔌 Tidak Ada Koneksi', 'Pastikan perangkat Anda terhubung ke internet, lalu coba lagi.',
          [{ text: 'OK', onPress: () => { offlineAlertShown = false; } }]);
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
export const getMe = () => api.get('/api/auth/me');
export const changePassword = (data) => api.put('/api/auth/change-password', data);

// Guru — Soal
export const getGuruSoal    = ()       => api.get('/api/guru/soal');
export const createSoal     = (data)   => api.post('/api/guru/soal', data);
export const bulkCreateSoal = (soal)   => api.post('/api/guru/soal/bulk', { soal });
export const updateSoal     = (id, d)  => api.put(`/api/guru/soal/${id}`, d);
export const deleteSoal     = (id)     => api.delete(`/api/guru/soal/${id}`);

// Guru — Assessment
export const getGuruAssessment       = ()       => api.get('/api/guru/assessment');
export const getGuruAssessmentSoalIds= (id)     => api.get(`/api/guru/assessment/${id}/soal-ids`);
export const getGuruAssessmentHasil  = (id)     => api.get(`/api/guru/assessment/${id}/hasil`);
export const createAssessment        = (data)   => api.post('/api/guru/assessment', data);
export const updateAssessment        = (id, d)  => api.put(`/api/guru/assessment/${id}`, d);
export const deleteAssessment        = (id)     => api.delete(`/api/guru/assessment/${id}`);

// Guru — Activity Log
export const getGuruActivityLog       = ()    => api.get('/api/guru/activity-log');
export const getGuruActivityLogDetail = (id)  => api.get(`/api/guru/activity-log/${id}`);

// Siswa — Assessment
export const getAssessment    = ()          => api.get('/api/assessment');
export const getSoal          = (id)        => api.get(`/api/assessment/${id}/soal`);
export const submitAssessment = (id, data)  => api.post(`/api/assessment/${id}/submit`, data);
export const logActivity      = (id, data)  => api.post(`/api/assessment/${id}/activity`, data);

export default api;
