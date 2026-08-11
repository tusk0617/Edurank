import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert, Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { getGuruGap, changePassword } from '../../services/api';
import Colors from '../../constants/Colors';

export default function GuruDashboard() {
  const { user, logout } = useAuth();
  const [ringkasan, setRingkasan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [gantiPassModal, setGantiPassModal] = useState(false);
  const [passLama, setPassLama] = useState('');
  const [passBaru, setPassBaru] = useState('');
  const [passKonfirmasi, setPassKonfirmasi] = useState('');
  const [showPassLama, setShowPassLama] = useState(false);
  const [showPassBaru, setShowPassBaru] = useState(false);
  const [showPassKonfirmasi, setShowPassKonfirmasi] = useState(false);
  const [savingPass, setSavingPass] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await getGuruGap();
      setRingkasan(res.data.ringkasan);
    } catch {
      setRingkasan(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const handleGantiPassword = async () => {
    if (!passLama || !passBaru || !passKonfirmasi) {
      Alert.alert('Perhatian', 'Semua kolom wajib diisi');
      return;
    }
    if (passBaru !== passKonfirmasi) {
      Alert.alert('Perhatian', 'Konfirmasi password tidak cocok');
      return;
    }
    if (passBaru.length < 6) {
      Alert.alert('Perhatian', 'Password baru minimal 6 karakter');
      return;
    }
    setSavingPass(true);
    try {
      await changePassword({ password_lama: passLama, password_baru: passBaru });
      setGantiPassModal(false);
      setPassLama(''); setPassBaru(''); setPassKonfirmasi('');
      Alert.alert('Berhasil', 'Password berhasil diubah');
    } catch (err) {
      const msg = err.response?.data?.message || 'Gagal mengubah password';
      Alert.alert('Gagal', msg);
    } finally {
      setSavingPass(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Keluar', 'Yakin ingin keluar?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Keluar', style: 'destructive',
        onPress: async () => { await logout(); router.replace('/login'); },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Selamat datang,</Text>
            <Text style={styles.name}>{user?.nama || 'Guru'}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>GURU</Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={22} color={Colors.danger} />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        {ringkasan && (
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { borderLeftColor: Colors.primary }]}>
              <Text style={styles.statNum}>{ringkasan.total_soal}</Text>
              <Text style={styles.statLabel}>Total Soal</Text>
            </View>
            <View style={[styles.statCard, { borderLeftColor: Colors.primary }]}>
              <Text style={styles.statNum}>{ringkasan.total_siswa}</Text>
              <Text style={styles.statLabel}>Total Siswa</Text>
            </View>
            <View style={[styles.statCard, { borderLeftColor: Colors.warning }]}>
              <Text style={styles.statNum}>{ringkasan.total_jawaban}</Text>
              <Text style={styles.statLabel}>Total Jawaban</Text>
            </View>
          </View>
        )}

        {/* Menu */}
        <Text style={styles.sectionTitle}>Menu Utama</Text>

        <TouchableOpacity style={styles.menuCard} onPress={() => router.push('/(guru)/soal')} activeOpacity={0.85}>
          <View style={[styles.menuIcon, { backgroundColor: '#EDF7ED' }]}>
            <Ionicons name="document-text" size={28} color={Colors.primary} />
          </View>
          <View style={styles.menuInfo}>
            <Text style={styles.menuTitle}>Kelola Soal</Text>
            <Text style={styles.menuDesc}>Tambah, edit, dan hapus soal ujian per modul</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.muted} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuCard} onPress={() => router.push('/(guru)/gap')} activeOpacity={0.85}>
          <View style={[styles.menuIcon, { backgroundColor: '#EBF4FF' }]}>
            <Ionicons name="bar-chart" size={28} color={Colors.primary} />
          </View>
          <View style={styles.menuInfo}>
            <Text style={styles.menuTitle}>Gap Analisis</Text>
            <Text style={styles.menuDesc}>Persentase kesalahan siswa per mata pelajaran</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.muted} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuCard} onPress={() => router.push('/(guru)/statistik')} activeOpacity={0.85}>
          <View style={[styles.menuIcon, { backgroundColor: '#FFF4E5' }]}>
            <Ionicons name="stats-chart" size={28} color={Colors.warning} />
          </View>
          <View style={styles.menuInfo}>
            <Text style={styles.menuTitle}>Statistik</Text>
            <Text style={styles.menuDesc}>Tingkat keberhasilan per soal & detail jawaban siswa</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.muted} />
        </TouchableOpacity>

        {/* Ganti Password */}
        <TouchableOpacity style={styles.gantiPassBtn} onPress={() => setGantiPassModal(true)} activeOpacity={0.8}>
          <Ionicons name="lock-closed-outline" size={20} color={Colors.primary} />
          <Text style={styles.gantiPassText}>Ganti Password</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal Ganti Password */}
      <Modal visible={gantiPassModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ganti Password</Text>
              <TouchableOpacity onPress={() => { setGantiPassModal(false); setPassLama(''); setPassBaru(''); setPassKonfirmasi(''); }}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.passLabel}>Password Lama</Text>
            <View style={styles.passInputWrap}>
              <TextInput
                style={styles.passInput}
                value={passLama}
                onChangeText={setPassLama}
                secureTextEntry={!showPassLama}
                placeholder="Masukkan password lama"
                placeholderTextColor={Colors.muted}
              />
              <TouchableOpacity onPress={() => setShowPassLama(!showPassLama)} style={styles.eyeBtn}>
                <Ionicons name={showPassLama ? 'eye-off' : 'eye'} size={18} color={Colors.muted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.passLabel}>Password Baru</Text>
            <View style={styles.passInputWrap}>
              <TextInput
                style={styles.passInput}
                value={passBaru}
                onChangeText={setPassBaru}
                secureTextEntry={!showPassBaru}
                placeholder="Minimal 6 karakter"
                placeholderTextColor={Colors.muted}
              />
              <TouchableOpacity onPress={() => setShowPassBaru(!showPassBaru)} style={styles.eyeBtn}>
                <Ionicons name={showPassBaru ? 'eye-off' : 'eye'} size={18} color={Colors.muted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.passLabel}>Konfirmasi Password Baru</Text>
            <View style={styles.passInputWrap}>
              <TextInput
                style={styles.passInput}
                value={passKonfirmasi}
                onChangeText={setPassKonfirmasi}
                secureTextEntry={!showPassKonfirmasi}
                placeholder="Ulangi password baru"
                placeholderTextColor={Colors.muted}
              />
              <TouchableOpacity onPress={() => setShowPassKonfirmasi(!showPassKonfirmasi)} style={styles.eyeBtn}>
                <Ionicons name={showPassKonfirmasi ? 'eye-off' : 'eye'} size={18} color={Colors.muted} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.savePassBtn} onPress={handleGantiPassword} disabled={savingPass} activeOpacity={0.85}>
              {savingPass
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.savePassText}>Simpan Password</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    backgroundColor: Colors.card, borderRadius: 16, padding: 20, marginBottom: 16,
    elevation: 3,
  },
  greeting: { fontSize: 13, color: Colors.muted },
  name: { fontSize: 20, fontWeight: '800', color: Colors.text, marginTop: 2 },
  roleBadge: {
    marginTop: 6, alignSelf: 'flex-start',
    backgroundColor: Colors.primary, borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  roleText: { fontSize: 10, fontWeight: '700', color: '#fff', letterSpacing: 1 },
  logoutBtn: { padding: 8 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1, backgroundColor: Colors.card, borderRadius: 12, padding: 14,
    borderLeftWidth: 3, elevation: 2,
  },
  statNum: { fontSize: 22, fontWeight: '800', color: Colors.text },
  statLabel: { fontSize: 11, color: Colors.muted, marginTop: 2 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.muted, marginBottom: 12, letterSpacing: 0.5 },
  menuCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card,
    borderRadius: 14, padding: 16, marginBottom: 12, elevation: 2,
  },
  menuIcon: { width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  menuInfo: { flex: 1 },
  menuTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  menuDesc: { fontSize: 12, color: Colors.muted, marginTop: 2 },
  gantiPassBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 8, padding: 14, borderRadius: 10,
    borderWidth: 1.5, borderColor: Colors.primary + '60', backgroundColor: Colors.primary + '10',
  },
  gantiPassText: { color: Colors.primary, fontWeight: '700', fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: '#00000060', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: Colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, paddingBottom: 36,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  passLabel: { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 6, marginTop: 14 },
  passInputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border, borderRadius: 10, backgroundColor: Colors.background },
  passInput: { flex: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: Colors.text },
  eyeBtn: { padding: 12 },
  savePassBtn: {
    backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 15,
    alignItems: 'center', marginTop: 24,
  },
  savePassText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
