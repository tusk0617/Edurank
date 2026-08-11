import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  Modal, TextInput, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { changePassword } from '../../services/api';
import Colors from '../../constants/Colors';

export default function SiswaProfil() {
  const { user, logout } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [passLama, setPassLama] = useState('');
  const [passBaru, setPassBaru] = useState('');
  const [passKonfirmasi, setPassKonfirmasi] = useState('');
  const [showLama, setShowLama] = useState(false);
  const [showBaru, setShowBaru] = useState(false);
  const [showKonfirmasi, setShowKonfirmasi] = useState(false);
  const [saving, setSaving] = useState(false);

  const bergabung = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
    : 'Agustus 2026';

  const handleLogout = () => {
    Alert.alert('Keluar', 'Yakin ingin keluar?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Keluar', style: 'destructive', onPress: async () => { await logout(); router.replace('/login'); } },
    ]);
  };

  const handleGantiPassword = async () => {
    if (!passLama || !passBaru || !passKonfirmasi) return Alert.alert('Perhatian', 'Semua kolom wajib diisi');
    if (passBaru !== passKonfirmasi) return Alert.alert('Perhatian', 'Konfirmasi password tidak cocok');
    if (passBaru.length < 6) return Alert.alert('Perhatian', 'Password baru minimal 6 karakter');
    setSaving(true);
    try {
      await changePassword({ password_lama: passLama, password_baru: passBaru });
      setModalVisible(false);
      setPassLama(''); setPassBaru(''); setPassKonfirmasi('');
      Alert.alert('Berhasil', 'Password berhasil diubah');
    } catch (err) {
      Alert.alert('Gagal', err.response?.data?.message || 'Gagal mengubah password');
    } finally { setSaving(false); }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{(user?.username || 'S')[0].toUpperCase()}{(user?.username || '')[1] || ''}</Text>
          </View>
          <Text style={styles.nama}>{user?.nama}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>Siswa</Text>
          </View>
        </View>

        {/* Info */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={18} color={Colors.muted} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Nama Lengkap</Text>
              <Text style={styles.infoValue}>{user?.nama}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Ionicons name="key-outline" size={18} color={Colors.muted} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Kode Responden</Text>
              <Text style={styles.infoValue}>{user?.username}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={18} color={Colors.muted} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Bergabung</Text>
              <Text style={styles.infoValue}>{bergabung}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.gantiPassBtn} onPress={() => setModalVisible(true)} activeOpacity={0.8}>
          <Ionicons name="lock-closed-outline" size={18} color={Colors.secondary} />
          <Text style={styles.gantiPassText}>Ganti Password</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={18} color={Colors.danger} />
          <Text style={styles.logoutText}>Keluar</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ganti Password</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            {[
              { label: 'Password Lama', val: passLama, set: setPassLama, show: showLama, toggle: () => setShowLama(v => !v) },
              { label: 'Password Baru', val: passBaru, set: setPassBaru, show: showBaru, toggle: () => setShowBaru(v => !v) },
              { label: 'Konfirmasi Password Baru', val: passKonfirmasi, set: setPassKonfirmasi, show: showKonfirmasi, toggle: () => setShowKonfirmasi(v => !v) },
            ].map(f => (
              <View key={f.label}>
                <Text style={styles.passLabel}>{f.label}</Text>
                <View style={styles.passWrap}>
                  <TextInput style={styles.passInput} value={f.val} onChangeText={f.set}
                    secureTextEntry={!f.show} placeholder="••••••" placeholderTextColor={Colors.muted} />
                  <TouchableOpacity onPress={f.toggle} style={styles.eyeBtn}>
                    <Ionicons name={f.show ? 'eye-off' : 'eye'} size={18} color={Colors.muted} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            <TouchableOpacity style={styles.saveBtn} onPress={handleGantiPassword} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Simpan</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { padding: 24, alignItems: 'center' },
  avatarSection: { alignItems: 'center', marginBottom: 24 },
  avatarCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.secondary, justifyContent: 'center', alignItems: 'center',
    marginBottom: 12, elevation: 4,
  },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#fff' },
  nama: { fontSize: 20, fontWeight: '800', color: Colors.text },
  roleBadge: { marginTop: 6, backgroundColor: Colors.secondary + '20', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 3 },
  roleText: { fontSize: 12, fontWeight: '700', color: Colors.secondary },
  infoCard: { width: '100%', backgroundColor: Colors.card, borderRadius: 14, padding: 16, marginBottom: 16, elevation: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, color: Colors.muted, marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '600', color: Colors.text },
  divider: { height: 1, backgroundColor: Colors.border },
  gantiPassBtn: {
    width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: 14, borderRadius: 10, borderWidth: 1.5,
    borderColor: Colors.secondary + '60', backgroundColor: Colors.secondary + '10', marginBottom: 10,
  },
  gantiPassText: { color: Colors.secondary, fontWeight: '700', fontSize: 15 },
  logoutBtn: {
    width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: 14, borderRadius: 10, borderWidth: 1.5,
    borderColor: Colors.danger + '60', backgroundColor: Colors.danger + '10',
  },
  logoutText: { color: Colors.danger, fontWeight: '700', fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: '#00000060', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: Colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 36 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  passLabel: { fontSize: 13, fontWeight: '600', color: Colors.text, marginTop: 12, marginBottom: 6 },
  passWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border, borderRadius: 10, backgroundColor: Colors.background },
  passInput: { flex: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: Colors.text },
  eyeBtn: { padding: 12 },
  saveBtn: { backgroundColor: Colors.secondary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
