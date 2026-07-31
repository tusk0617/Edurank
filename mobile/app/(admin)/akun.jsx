import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput,
  Modal, ScrollView, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getAdminUsers, createUser, resetUserPassword, deleteUser } from '../../services/api';
import Colors from '../../constants/Colors';

const BLANK_FORM = { nama: '', email: '', password: '', role: 'siswa' };

export default function KelolaAkun() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterRole, setFilterRole] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [resetModal, setResetModal] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [form, setForm] = useState(BLANK_FORM);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await getAdminUsers();
      setUsers(res.data);
    } catch {
      Alert.alert('Error', 'Gagal memuat data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const handleCreate = async () => {
    if (!form.nama.trim() || !form.email.trim() || !form.password.trim()) {
      Alert.alert('Perhatian', 'Nama, email, dan password wajib diisi');
      return;
    }
    if (form.password.length < 6) {
      Alert.alert('Perhatian', 'Password minimal 6 karakter');
      return;
    }
    setSaving(true);
    try {
      await createUser({
        nama: form.nama.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role: form.role,
      });
      setModalVisible(false);
      setForm(BLANK_FORM);
      fetchData();
      Alert.alert('Berhasil', 'Akun berhasil dibuat');
    } catch (err) {
      Alert.alert('Gagal', err.response?.data?.message || 'Terjadi kesalahan');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      Alert.alert('Perhatian', 'Password minimal 6 karakter');
      return;
    }
    setSaving(true);
    try {
      await resetUserPassword(resetModal.id, newPassword);
      setResetModal(null);
      setNewPassword('');
      Alert.alert('Berhasil', 'Password berhasil direset');
    } catch (err) {
      Alert.alert('Gagal', err.response?.data?.message || 'Terjadi kesalahan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (user) => {
    Alert.alert(
      'Hapus Akun',
      `Yakin hapus akun "${user.nama}"?\nSemua data terkait akan ikut terhapus.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus', style: 'destructive',
          onPress: async () => {
            try {
              await deleteUser(user.id);
              fetchData();
            } catch {
              Alert.alert('Gagal', 'Tidak dapat menghapus akun');
            }
          },
        },
      ]
    );
  };

  const filtered = filterRole ? users.filter(u => u.role === filterRole) : users;
  const siswaCount = users.filter(u => u.role === 'siswa').length;
  const guruCount = users.filter(u => u.role === 'guru').length;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.warning} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.pageTitle}>Kelola Akun</Text>
          <Text style={styles.count}>{siswaCount} siswa · {guruCount} guru</Text>
        </View>
      </View>

      {/* Filter */}
      <View style={styles.filterRow}>
        {[['', 'Semua'], ['siswa', 'Siswa'], ['guru', 'Guru']].map(([val, label]) => (
          <TouchableOpacity
            key={val}
            style={[styles.filterChip, filterRole === val && styles.filterActive]}
            onPress={() => setFilterRole(val)}
          >
            <Text style={[styles.filterText, filterRole === val && styles.filterTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={Colors.warning} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color={Colors.border} />
            <Text style={styles.emptyText}>Belum ada akun</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.userCard}>
            <View style={styles.userAvatar}>
              <Text style={styles.avatarText}>{item.nama.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.userInfo}>
              <View style={styles.userNameRow}>
                <Text style={styles.userName}>{item.nama}</Text>
                <View style={[styles.roleBadge, { backgroundColor: item.role === 'guru' ? Colors.secondary + '20' : Colors.primary + '20' }]}>
                  <Text style={[styles.roleText, { color: item.role === 'guru' ? Colors.secondary : Colors.primary }]}>
                    {item.role.toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={styles.userEmail}>{item.email}</Text>
            </View>
            <View style={styles.userActions}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => { setResetModal(item); setNewPassword(''); }}
              >
                <Ionicons name="key-outline" size={18} color={Colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item)}>
                <Ionicons name="trash-outline" size={18} color={Colors.danger} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => { setForm(BLANK_FORM); setModalVisible(true); }} activeOpacity={0.85}>
        <Ionicons name="person-add" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Modal Tambah Akun */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Tambah Akun</Text>
            <TouchableOpacity onPress={handleCreate} disabled={saving}>
              {saving
                ? <ActivityIndicator size="small" color={Colors.warning} />
                : <Text style={styles.saveText}>Simpan</Text>
              }
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <Text style={styles.fieldLabel}>Nama Lengkap *</Text>
            <TextInput
              style={styles.input}
              placeholder="Masukkan nama lengkap"
              placeholderTextColor={Colors.muted}
              value={form.nama}
              onChangeText={v => setForm(f => ({ ...f, nama: v }))}
            />

            <Text style={styles.fieldLabel}>Email *</Text>
            <TextInput
              style={styles.input}
              placeholder="contoh@email.com"
              placeholderTextColor={Colors.muted}
              value={form.email}
              onChangeText={v => setForm(f => ({ ...f, email: v }))}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.fieldLabel}>Password *</Text>
            <TextInput
              style={styles.input}
              placeholder="Minimal 6 karakter"
              placeholderTextColor={Colors.muted}
              value={form.password}
              onChangeText={v => setForm(f => ({ ...f, password: v }))}
              secureTextEntry
            />

            <Text style={styles.fieldLabel}>Role *</Text>
            <View style={styles.roleRow}>
              {['siswa', 'guru'].map(r => (
                <TouchableOpacity
                  key={r}
                  style={[styles.roleBtn, form.role === r && styles.roleBtnActive]}
                  onPress={() => setForm(f => ({ ...f, role: r }))}
                >
                  <Ionicons
                    name={r === 'guru' ? 'school' : 'person'}
                    size={18}
                    color={form.role === r ? '#fff' : Colors.muted}
                  />
                  <Text style={[styles.roleBtnText, form.role === r && styles.roleBtnTextActive]}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Modal Reset Password */}
      <Modal visible={!!resetModal} animationType="fade" transparent>
        <View style={styles.overlayBg}>
          <View style={styles.resetBox}>
            <Text style={styles.resetTitle}>Reset Password</Text>
            <Text style={styles.resetName}>{resetModal?.nama}</Text>
            <TextInput
              style={[styles.input, { marginTop: 12 }]}
              placeholder="Password baru (min. 6 karakter)"
              placeholderTextColor={Colors.muted}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />
            <View style={styles.resetBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setResetModal(null)}>
                <Text style={styles.cancelBtnText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleResetPassword} disabled={saving}>
                {saving
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.confirmBtnText}>Reset</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  pageTitle: { fontSize: 22, fontWeight: '800', color: Colors.text },
  count: { fontSize: 13, color: Colors.muted, marginTop: 2 },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 12 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  filterActive: { backgroundColor: Colors.warning, borderColor: Colors.warning },
  filterText: { fontSize: 12, color: Colors.muted, fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  list: { padding: 16, paddingBottom: 100 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: Colors.muted, marginTop: 12, fontSize: 15 },
  userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: 14, padding: 14, marginBottom: 10, elevation: 2 },
  userAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.warning + '20', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 18, fontWeight: '800', color: Colors.warning },
  userInfo: { flex: 1 },
  userNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  userName: { fontSize: 14, fontWeight: '700', color: Colors.text },
  roleBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  roleText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  userEmail: { fontSize: 12, color: Colors.muted, marginTop: 2 },
  userActions: { flexDirection: 'row', gap: 6 },
  actionBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
  fab: {
    position: 'absolute', right: 20, bottom: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.warning,
    justifyContent: 'center', alignItems: 'center',
    elevation: 6,
  },
  modalSafe: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, backgroundColor: Colors.card, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  saveText: { fontSize: 15, fontWeight: '700', color: Colors.warning },
  modalBody: { flex: 1, padding: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 6, marginTop: 14 },
  input: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14,
    color: Colors.text, backgroundColor: Colors.card,
  },
  roleRow: { flexDirection: 'row', gap: 12 },
  roleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10, borderWidth: 2, borderColor: Colors.border, backgroundColor: Colors.card },
  roleBtnActive: { borderColor: Colors.warning, backgroundColor: Colors.warning },
  roleBtnText: { fontSize: 14, fontWeight: '700', color: Colors.muted },
  roleBtnTextActive: { color: '#fff' },
  overlayBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  resetBox: { backgroundColor: Colors.card, borderRadius: 20, padding: 24, width: '100%' },
  resetTitle: { fontSize: 18, fontWeight: '800', color: Colors.text },
  resetName: { fontSize: 14, color: Colors.muted, marginTop: 4 },
  resetBtns: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: Colors.muted },
  confirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: Colors.primary, alignItems: 'center' },
  confirmBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
