import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, RefreshControl, Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { getAssessment, changePassword } from '../../services/api';
import Card from '../../components/ui/Card';
import Colors from '../../constants/Colors';

const getInitials = (nama) => {
  if (!nama) return '?';
  return nama.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
};

const ROLE_LABEL = { siswa: 'Siswa', guru: 'Guru' };
const ROLE_COLOR = { siswa: Colors.primary, guru: Colors.secondary };

export default function ProfilScreen() {
  const { user, logout } = useAuth();
  const [riwayat, setRiwayat] = useState([]);
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
      if (user?.role === 'guru') {
        const res = await getAssessment();
        setRiwayat(res.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.role]);

  useEffect(() => { fetchData(); }, [fetchData]);

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
      Alert.alert('Gagal', err.response?.data?.message || 'Gagal mengubah password');
    } finally {
      setSavingPass(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Yakin ingin keluar?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => { await logout(); router.replace('/login'); } },
    ]);
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={Colors.primary} />}
      >
        {/* Avatar & nama */}
        <View style={styles.profileSection}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarLargeText}>{getInitials(user?.nama)}</Text>
          </View>
          <Text style={styles.userName}>{user?.nama}</Text>
          <View style={[styles.roleBadge, { backgroundColor: ROLE_COLOR[user?.role] + '20' }]}>
            <Text style={[styles.roleText, { color: ROLE_COLOR[user?.role] }]}>{ROLE_LABEL[user?.role] || user?.role}</Text>
          </View>
        </View>

        {/* Info */}
        <Card style={styles.section}>
          <InfoRow icon="person-outline"    label="Nama Lengkap"      value={user?.nama} />
          <InfoRow icon="key-outline"       label="Kode Responden"    value={user?.username} />
          <InfoRow icon="mail-outline"      label="Email"             value={user?.email} />
          <InfoRow icon="calendar-outline"  label="Bergabung"         value={user?.created_at ? new Date(user.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long' }) : '-'} last />
        </Card>

        {/* Riwayat Ujian (guru only) */}
        {user?.role === 'guru' && riwayat.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📋 Riwayat Ujian</Text>
            <Card>
              {riwayat.map((a, idx) => (
                <View key={a.id} style={[styles.riwayatRow, idx < riwayat.length - 1 && styles.riwayatBorder]}>
                  <View style={[styles.riwayatDot, { backgroundColor: a.warna_hex || Colors.primary }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.riwayatJudul}>{a.judul}</Text>
                    <Text style={styles.riwayatMeta}>{a.nama_mapel}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.riwayatSkor}>{a.jumlah_percobaan ?? 0}</Text>
                    <Text style={styles.riwayatStatus}>percobaan</Text>
                  </View>
                </View>
              ))}
            </Card>
          </View>
        )}

        {/* Ganti Password */}
        <TouchableOpacity style={styles.gantiPassBtn} onPress={() => setGantiPassModal(true)} activeOpacity={0.8}>
          <Ionicons name="lock-closed-outline" size={20} color={Colors.primary} />
          <Text style={styles.gantiPassText}>Ganti Password</Text>
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
          <Text style={styles.logoutText}>Keluar</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
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

            {[
              { label: 'Password Lama', val: passLama, setVal: setPassLama, show: showPassLama, setShow: setShowPassLama, ph: 'Masukkan password lama' },
              { label: 'Password Baru', val: passBaru, setVal: setPassBaru, show: showPassBaru, setShow: setShowPassBaru, ph: 'Minimal 6 karakter' },
              { label: 'Konfirmasi Password Baru', val: passKonfirmasi, setVal: setPassKonfirmasi, show: showPassKonfirmasi, setShow: setShowPassKonfirmasi, ph: 'Ulangi password baru' },
            ].map(({ label, val, setVal, show, setShow, ph }) => (
              <View key={label}>
                <Text style={styles.passLabel}>{label}</Text>
                <View style={styles.passInputWrap}>
                  <TextInput
                    style={styles.passInput}
                    value={val}
                    onChangeText={setVal}
                    secureTextEntry={!show}
                    placeholder={ph}
                    placeholderTextColor={Colors.muted}
                  />
                  <TouchableOpacity onPress={() => setShow(!show)} style={styles.eyeBtn}>
                    <Ionicons name={show ? 'eye-off' : 'eye'} size={18} color={Colors.muted} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <TouchableOpacity style={styles.savePassBtn} onPress={handleGantiPassword} disabled={savingPass} activeOpacity={0.85}>
              {savingPass ? <ActivityIndicator color="#fff" /> : <Text style={styles.savePassText}>Simpan Password</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value, last }) {
  if (!value) return null;
  return (
    <View style={[infoStyles.row, !last && infoStyles.border]}>
      <View style={infoStyles.iconWrap}>
        <Ionicons name={icon} size={18} color={Colors.muted} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={infoStyles.label}>{label}</Text>
        <Text style={infoStyles.value}>{value}</Text>
      </View>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  border: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  iconWrap: { width: 36, height: 36, borderRadius: 8, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
  label: { fontSize: 11, color: Colors.muted },
  value: { fontSize: 14, fontWeight: '500', color: Colors.text, marginTop: 1 },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  profileSection: { alignItems: 'center', padding: 24, paddingBottom: 16 },
  avatarLarge: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 5,
  },
  avatarLargeText: { color: '#fff', fontWeight: '800', fontSize: 32 },
  userName: { fontSize: 22, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  roleBadge: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20 },
  roleText: { fontSize: 13, fontWeight: '700' },
  section: { marginHorizontal: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  riwayatRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 14 },
  riwayatBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  riwayatDot: { width: 8, height: 8, borderRadius: 4 },
  riwayatJudul: { fontSize: 13, fontWeight: '600', color: Colors.text },
  riwayatMeta: { fontSize: 11, color: Colors.muted, marginTop: 2 },
  riwayatSkor: { fontSize: 18, fontWeight: '800' },
  riwayatStatus: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  gantiPassBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 8, padding: 14, borderRadius: 10,
    borderWidth: 1.5, borderColor: Colors.primary + '60', backgroundColor: Colors.primary + '10',
  },
  gantiPassText: { color: Colors.primary, fontWeight: '700', fontSize: 15 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 10, padding: 14, borderRadius: 10,
    borderWidth: 1.5, borderColor: Colors.danger + '60', backgroundColor: Colors.danger + '10',
  },
  logoutText: { color: Colors.danger, fontWeight: '700', fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: '#00000060', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: Colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 36 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  passLabel: { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 6, marginTop: 14 },
  passInputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border, borderRadius: 10, backgroundColor: Colors.background },
  passInput: { flex: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: Colors.text },
  eyeBtn: { padding: 12 },
  savePassBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 24 },
  savePassText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
