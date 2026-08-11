import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert, Modal, TextInput, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { getGuruAssessment, createAssessment, updateAssessment, deleteAssessment, getGuruModul } from '../../../services/api';
import Colors from '../../../constants/Colors';

const EMPTY_FORM = { judul: '', modul_id: '', durasi_menit: '30', max_retake: '3', deadline: '' };

export default function GuruAssessment() {
  const [list, setList]           = useState([]);
  const [modulList, setModulList] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editTarget, setEditTarget]     = useState(null);
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [saving, setSaving]             = useState(false);
  const [modulPickerVisible, setModulPickerVisible] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [aRes, mRes] = await Promise.all([getGuruAssessment(), getGuruModul()]);
      setList(aRes.data);
      setModulList(mRes.data);
    } catch { /* noop */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setModalVisible(true);
  };

  const openEdit = (item) => {
    setEditTarget(item);
    setForm({
      judul: item.judul,
      modul_id: String(item.modul_id),
      durasi_menit: String(item.durasi_menit),
      max_retake: String(item.max_retake),
      deadline: item.deadline ? item.deadline.split('T')[0] : '',
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.judul.trim() || !form.modul_id || !form.durasi_menit) {
      Alert.alert('Perhatian', 'Judul, modul, dan durasi wajib diisi');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        judul: form.judul.trim(),
        modul_id: Number(form.modul_id),
        durasi_menit: Number(form.durasi_menit) || 30,
        max_retake: Number(form.max_retake) || 3,
        deadline: form.deadline || null,
      };
      if (editTarget) {
        await updateAssessment(editTarget.id, payload);
        Alert.alert('Berhasil', 'Assessment berhasil diperbarui');
      } else {
        await createAssessment(payload);
        Alert.alert('Berhasil', 'Assessment berhasil dibuat');
      }
      setModalVisible(false);
      fetchData();
    } catch (err) {
      Alert.alert('Gagal', err.response?.data?.message || 'Terjadi kesalahan');
    } finally { setSaving(false); }
  };

  const handleDelete = (item) => {
    Alert.alert(
      'Hapus Assessment',
      `Hapus "${item.judul}"? Semua data hasil siswa akan ikut terhapus.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus', style: 'destructive',
          onPress: async () => {
            try {
              await deleteAssessment(item.id);
              fetchData();
            } catch (err) {
              Alert.alert('Gagal', err.response?.data?.message || 'Gagal menghapus');
            }
          },
        },
      ]
    );
  };

  const selectedModul = modulList.find(m => String(m.id) === String(form.modul_id));

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Kelola Assessment</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openCreate} activeOpacity={0.85}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addBtnText}>Buat</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {list.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>Belum ada assessment{'\n'}Tekan "Buat" untuk membuat yang pertama</Text>
          </View>
        ) : list.map(item => {
          const hasDeadline = !!item.deadline;
          const deadlineStr = hasDeadline
            ? new Date(item.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
            : 'Tanpa batas';
          return (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={[styles.mapelDot, { backgroundColor: item.warna_hex || Colors.primary }]} />
                <Text style={[styles.mapelText, { color: item.warna_hex || Colors.primary }]}>{item.mapel}</Text>
                <View style={styles.cardActions}>
                  <TouchableOpacity onPress={() => openEdit(item)} style={styles.iconBtn}>
                    <Ionicons name="pencil" size={18} color={Colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(item)} style={styles.iconBtn}>
                    <Ionicons name="trash" size={18} color={Colors.danger} />
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.cardTitle}>{item.judul}</Text>
              <Text style={styles.cardModul}>{item.modul}</Text>
              <View style={styles.infoRow}>
                <View style={styles.infoItem}>
                  <Ionicons name="time-outline" size={13} color={Colors.muted} />
                  <Text style={styles.infoText}>{item.durasi_menit} menit</Text>
                </View>
                <View style={styles.infoItem}>
                  <Ionicons name="refresh-outline" size={13} color={Colors.muted} />
                  <Text style={styles.infoText}>Max {item.max_retake}x</Text>
                </View>
                <View style={styles.infoItem}>
                  <Ionicons name="calendar-outline" size={13} color={Colors.muted} />
                  <Text style={styles.infoText}>{deadlineStr}</Text>
                </View>
              </View>
              <View style={styles.statsRow}>
                <View style={styles.statChip}>
                  <Text style={styles.statNum}>{item.total_peserta}</Text>
                  <Text style={styles.statLabel}>Peserta</Text>
                </View>
                <View style={styles.statChip}>
                  <Text style={styles.statNum}>{item.total_sesi}</Text>
                  <Text style={styles.statLabel}>Sesi</Text>
                </View>
              </View>
            </View>
          );
        })}
        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Modal Create / Edit */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editTarget ? 'Edit Assessment' : 'Buat Assessment'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.fieldLabel}>Judul Assessment *</Text>
              <TextInput
                style={styles.input}
                value={form.judul}
                onChangeText={v => setForm(f => ({ ...f, judul: v }))}
                placeholder="Contoh: Ujian Geometri Analitik Gasal 2026"
                placeholderTextColor={Colors.muted}
              />

              <Text style={styles.fieldLabel}>Modul *</Text>
              <TouchableOpacity style={styles.pickerBtn} onPress={() => setModulPickerVisible(true)}>
                <Text style={[styles.pickerText, !selectedModul && { color: Colors.muted }]}>
                  {selectedModul ? `${selectedModul.judul} (${selectedModul.nama_mapel})` : 'Pilih modul...'}
                </Text>
                <Ionicons name="chevron-down" size={16} color={Colors.muted} />
              </TouchableOpacity>

              <Text style={styles.fieldLabel}>Durasi (menit) *</Text>
              <TextInput
                style={styles.input}
                value={form.durasi_menit}
                onChangeText={v => setForm(f => ({ ...f, durasi_menit: v.replace(/[^0-9]/g, '') }))}
                keyboardType="numeric"
                placeholder="30"
                placeholderTextColor={Colors.muted}
              />

              <Text style={styles.fieldLabel}>Max Pengulangan</Text>
              <TextInput
                style={styles.input}
                value={form.max_retake}
                onChangeText={v => setForm(f => ({ ...f, max_retake: v.replace(/[^0-9]/g, '') }))}
                keyboardType="numeric"
                placeholder="3"
                placeholderTextColor={Colors.muted}
              />

              <Text style={styles.fieldLabel}>Deadline (YYYY-MM-DD, opsional)</Text>
              <TextInput
                style={styles.input}
                value={form.deadline}
                onChangeText={v => setForm(f => ({ ...f, deadline: v }))}
                placeholder="2026-08-31"
                placeholderTextColor={Colors.muted}
              />

              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.saveBtnText}>{editTarget ? 'Simpan Perubahan' : 'Buat Assessment'}</Text>
                }
              </TouchableOpacity>
              <View style={{ height: 24 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modul Picker */}
      <Modal visible={modulPickerVisible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={[styles.modalBox, { maxHeight: '70%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pilih Modul</Text>
              <TouchableOpacity onPress={() => setModulPickerVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {modulList.map(m => (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.modulItem, String(form.modul_id) === String(m.id) && styles.modulItemSelected]}
                  onPress={() => { setForm(f => ({ ...f, modul_id: String(m.id) })); setModulPickerVisible(false); }}
                >
                  <Text style={styles.modulItemTitle}>{m.judul}</Text>
                  <Text style={styles.modulItemMapel}>{m.nama_mapel}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, paddingTop: 12, backgroundColor: Colors.card,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: Colors.text },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  listContent: { padding: 16 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { textAlign: 'center', color: Colors.muted, lineHeight: 22 },
  card: {
    backgroundColor: Colors.card, borderRadius: 14, padding: 16,
    marginBottom: 12, elevation: 2,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  mapelDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  mapelText: { fontSize: 12, fontWeight: '700', flex: 1 },
  cardActions: { flexDirection: 'row', gap: 4 },
  iconBtn: { padding: 6 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 2 },
  cardModul: { fontSize: 12, color: Colors.muted, marginBottom: 10 },
  infoRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', marginBottom: 10 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  infoText: { fontSize: 12, color: Colors.muted },
  statsRow: { flexDirection: 'row', gap: 10 },
  statChip: {
    flex: 1, backgroundColor: Colors.primary + '15', borderRadius: 8,
    paddingVertical: 8, alignItems: 'center',
  },
  statNum: { fontSize: 18, fontWeight: '800', color: Colors.primary },
  statLabel: { fontSize: 10, color: Colors.muted, marginTop: 2 },
  overlay: { flex: 1, backgroundColor: '#00000060', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: Colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 6, marginTop: 14 },
  input: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14,
    color: Colors.text, backgroundColor: Colors.background,
  },
  pickerBtn: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.background,
  },
  pickerText: { fontSize: 14, color: Colors.text, flex: 1 },
  saveBtn: {
    backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', marginTop: 24,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  modulItem: {
    padding: 14, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  modulItemSelected: { backgroundColor: Colors.primary + '15' },
  modulItemTitle: { fontSize: 14, fontWeight: '600', color: Colors.text },
  modulItemMapel: { fontSize: 12, color: Colors.muted, marginTop: 2 },
});
