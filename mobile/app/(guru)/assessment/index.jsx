import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert, Modal, TextInput, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, router } from 'expo-router';
import {
  getGuruAssessment, createAssessment, updateAssessment, deleteAssessment,
  getGuruAssessmentSoalIds, getGuruSoal,
} from '../../../services/api';
import Colors from '../../../constants/Colors';

const EMPTY_FORM = { judul: '', durasi_menit: '30', deadline: '' };

export default function GuruAssessment() {
  const [list, setList]       = useState([]);
  const [soalBank, setSoalBank] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [formVisible, setFormVisible]   = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [editTarget, setEditTarget]     = useState(null);
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [selectedIds, setSelectedIds]   = useState([]);
  const [saving, setSaving]             = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [aRes, sRes] = await Promise.all([getGuruAssessment(), getGuruSoal()]);
      setList(aRes.data);
      setSoalBank(sRes.data);
    } catch { /* noop */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setSelectedIds([]);
    setFormVisible(true);
  };

  const openEdit = async (item) => {
    setEditTarget(item);
    setForm({
      judul: item.judul,
      durasi_menit: String(item.durasi_menit),
      deadline: item.deadline ? item.deadline.split('T')[0] : '',
    });
    try {
      const res = await getGuruAssessmentSoalIds(item.id);
      setSelectedIds(res.data);
    } catch { setSelectedIds([]); }
    setFormVisible(true);
  };

  const toggleSoal = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (!form.judul.trim() || !form.durasi_menit) {
      return Alert.alert('Perhatian', 'Judul dan durasi wajib diisi');
    }
    if (selectedIds.length === 0) {
      return Alert.alert('Perhatian', 'Pilih minimal 1 soal');
    }
    setSaving(true);
    try {
      const payload = {
        judul: form.judul.trim(),
        durasi_menit: Number(form.durasi_menit) || 30,
        deadline: form.deadline || null,
        soal_ids: selectedIds,
      };
      if (editTarget) {
        await updateAssessment(editTarget.id, payload);
      } else {
        await createAssessment(payload);
      }
      setFormVisible(false);
      fetchData();
    } catch (err) {
      Alert.alert('Gagal', err.response?.data?.message || 'Terjadi kesalahan');
    } finally { setSaving(false); }
  };

  const handleDelete = (item) => {
    Alert.alert('Hapus Assessment', `Hapus "${item.judul}"? Semua data hasil siswa akan ikut terhapus.`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus', style: 'destructive',
        onPress: async () => {
          try { await deleteAssessment(item.id); fetchData(); }
          catch { Alert.alert('Gagal', 'Gagal menghapus assessment'); }
        },
      },
    ]);
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Kelola Assessment</Text>
        <TouchableOpacity style={s.addBtn} onPress={openCreate} activeOpacity={0.85}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={s.addBtnText}>Buat</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={s.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {list.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>📋</Text>
            <Text style={s.emptyText}>Belum ada assessment{'\n'}Tekan "Buat" untuk membuat yang pertama</Text>
          </View>
        ) : list.map(item => {
          const deadline = item.deadline
            ? new Date(item.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
            : 'Tanpa batas';
          return (
            <View key={item.id} style={s.card}>
              <View style={s.cardTop}>
                <Text style={s.cardTitle}>{item.judul}</Text>
                <View style={s.cardActions}>
                  <TouchableOpacity onPress={() => openEdit(item)} style={s.iconBtn}>
                    <Ionicons name="pencil" size={17} color={Colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(item)} style={s.iconBtn}>
                    <Ionicons name="trash" size={17} color={Colors.danger} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={s.infoRow}>
                <View style={s.infoItem}>
                  <Ionicons name="document-text-outline" size={13} color={Colors.muted} />
                  <Text style={s.infoText}>{item.jumlah_soal} soal</Text>
                </View>
                <View style={s.infoItem}>
                  <Ionicons name="time-outline" size={13} color={Colors.muted} />
                  <Text style={s.infoText}>{item.durasi_menit} menit</Text>
                </View>
                <View style={s.infoItem}>
                  <Ionicons name="calendar-outline" size={13} color={Colors.muted} />
                  <Text style={s.infoText}>{deadline}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={s.hasilBtn}
                onPress={() => router.push({ pathname: '/guru-pages/hasil', params: { assessmentId: item.id, judulAssessment: item.judul } })}
                activeOpacity={0.85}
              >
                <Ionicons name="people-outline" size={15} color={Colors.primary} />
                <Text style={s.hasilBtnText}>Lihat Hasil — {item.total_peserta} peserta</Text>
                <Ionicons name="chevron-forward" size={15} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          );
        })}
        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Form Modal */}
      <Modal visible={formVisible} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={s.modalBox}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{editTarget ? 'Edit Assessment' : 'Buat Assessment'}</Text>
              <TouchableOpacity onPress={() => setFormVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={s.fieldLabel}>Judul *</Text>
              <TextInput style={s.input} value={form.judul}
                onChangeText={v => setForm(f => ({ ...f, judul: v }))}
                placeholder="Contoh: Ujian Geometri Analitik" placeholderTextColor={Colors.muted} />

              <Text style={s.fieldLabel}>Durasi (menit) *</Text>
              <TextInput style={s.input} value={form.durasi_menit}
                onChangeText={v => setForm(f => ({ ...f, durasi_menit: v.replace(/[^0-9]/g, '') }))}
                keyboardType="numeric" placeholder="30" placeholderTextColor={Colors.muted} />

              <Text style={s.fieldLabel}>Deadline (YYYY-MM-DD, opsional)</Text>
              <TextInput style={s.input} value={form.deadline}
                onChangeText={v => setForm(f => ({ ...f, deadline: v }))}
                placeholder="2026-08-31" placeholderTextColor={Colors.muted} />

              <Text style={s.fieldLabel}>Soal * ({selectedIds.length} dipilih)</Text>
              <TouchableOpacity style={s.pickerBtn} onPress={() => setPickerVisible(true)}>
                <Ionicons name="list-outline" size={16} color={Colors.primary} />
                <Text style={s.pickerBtnText}>
                  {selectedIds.length === 0 ? 'Pilih soal...' : `${selectedIds.length} soal dipilih — ubah pilihan`}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.muted} />
              </TouchableOpacity>

              <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>{editTarget ? 'Simpan Perubahan' : 'Buat Assessment'}</Text>}
              </TouchableOpacity>
              <View style={{ height: 24 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Soal Picker Modal */}
      <Modal visible={pickerVisible} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={[s.modalBox, { maxHeight: '80%' }]}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Pilih Soal ({selectedIds.length})</Text>
              <TouchableOpacity onPress={() => setPickerVisible(false)}>
                <Ionicons name="checkmark" size={24} color={Colors.primary} />
              </TouchableOpacity>
            </View>
            {soalBank.length === 0 ? (
              <View style={s.empty}>
                <Text style={s.emptyText}>Belum ada soal di bank soal.{'\n'}Tambahkan soal di menu Kelola Soal.</Text>
              </View>
            ) : (
              <FlatList
                data={soalBank}
                keyExtractor={item => item.id.toString()}
                showsVerticalScrollIndicator={false}
                renderItem={({ item, index }) => {
                  const selected = selectedIds.includes(item.id);
                  return (
                    <TouchableOpacity style={[s.soalPickerItem, selected && s.soalPickerItemSelected]}
                      onPress={() => toggleSoal(item.id)} activeOpacity={0.7}>
                      <View style={[s.checkbox, selected && s.checkboxChecked]}>
                        {selected && <Ionicons name="checkmark" size={14} color="#fff" />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.soalPickerNum}>Soal #{soalBank.length - index}</Text>
                        <Text style={s.soalPickerText} numberOfLines={2}>{item.pertanyaan}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 12, backgroundColor: Colors.card, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { fontSize: 18, fontWeight: '800', color: Colors.text },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  listContent: { padding: 16 },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 20 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { textAlign: 'center', color: Colors.muted, lineHeight: 22 },
  card: { backgroundColor: Colors.card, borderRadius: 14, padding: 16, marginBottom: 12, elevation: 2 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: Colors.text, lineHeight: 20 },
  cardActions: { flexDirection: 'row', gap: 4 },
  iconBtn: { padding: 6 },
  infoRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', marginBottom: 12 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  infoText: { fontSize: 12, color: Colors.muted },
  hasilBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, backgroundColor: Colors.primary + '12', borderRadius: 10 },
  hasilBtnText: { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.primary },
  overlay: { flex: 1, backgroundColor: '#00000060', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: Colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 6, marginTop: 14 },
  input: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: Colors.text, backgroundColor: Colors.background },
  pickerBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: Colors.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: Colors.primary + '08' },
  pickerBtnText: { flex: 1, fontSize: 14, color: Colors.primary, fontWeight: '600' },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  soalPickerItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  soalPickerItemSelected: { backgroundColor: Colors.primary + '08' },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: Colors.border, justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  soalPickerNum: { fontSize: 10, color: Colors.muted, fontWeight: '600', marginBottom: 2 },
  soalPickerText: { fontSize: 13, color: Colors.text, lineHeight: 18 },
});
