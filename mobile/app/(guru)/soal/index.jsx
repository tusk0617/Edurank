import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Modal, TextInput,
  Alert, ActivityIndicator, RefreshControl, ScrollView, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, router } from 'expo-router';
import { getGuruSoal, createSoal, updateSoal, deleteSoal } from '../../../services/api';
import Colors from '../../../constants/Colors';

const JAWABAN_OPTS = ['a', 'b', 'c', 'd'];
const EMPTY_FORM = { pertanyaan: '', opsi_a: '', opsi_b: '', opsi_c: '', opsi_d: '', jawaban_benar: '' };

export default function KelolaSOal() {
  const [soalList, setSoalList]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]       = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editTarget, setEditTarget]     = useState(null);
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [saving, setSaving]             = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await getGuruSoal();
      setSoalList(res.data);
    } catch { Alert.alert('Error', 'Gagal memuat soal'); }
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
      pertanyaan: item.pertanyaan,
      opsi_a: item.opsi_a, opsi_b: item.opsi_b,
      opsi_c: item.opsi_c, opsi_d: item.opsi_d,
      jawaban_benar: item.jawaban_benar,
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.pertanyaan.trim() || !form.opsi_a || !form.opsi_b || !form.opsi_c || !form.opsi_d) {
      return Alert.alert('Perhatian', 'Pertanyaan dan semua opsi wajib diisi');
    }
    if (!form.jawaban_benar) return Alert.alert('Perhatian', 'Pilih jawaban benar');
    setSaving(true);
    try {
      if (editTarget) {
        await updateSoal(editTarget.id, form);
      } else {
        await createSoal(form);
      }
      setModalVisible(false);
      fetchData();
    } catch (err) {
      Alert.alert('Gagal', err.response?.data?.message || 'Terjadi kesalahan');
    } finally { setSaving(false); }
  };

  const handleDelete = (item) => {
    Alert.alert('Hapus Soal', 'Soal ini akan dihapus permanen.', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus', style: 'destructive',
        onPress: async () => {
          try { await deleteSoal(item.id); fetchData(); }
          catch { Alert.alert('Gagal', 'Gagal menghapus soal'); }
        },
      },
    ]);
  };

  const filtered = search
    ? soalList.filter(s => s.pertanyaan.toLowerCase().includes(search.toLowerCase()))
    : soalList;

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Kelola Soal</Text>
        <View style={s.headerBtns}>
          <TouchableOpacity style={s.btnSecondary} onPress={() => router.push('/(guru)/soal/bulk')} activeOpacity={0.85}>
            <Ionicons name="copy-outline" size={16} color={Colors.primary} />
            <Text style={s.btnSecondaryText}>Bulk Input</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.btnPrimary} onPress={openCreate} activeOpacity={0.85}>
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={s.btnPrimaryText}>Tambah</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={16} color={Colors.muted} style={{ marginRight: 8 }} />
        <TextInput
          style={s.searchInput}
          placeholder="Cari soal..."
          placeholderTextColor={Colors.muted}
          value={search}
          onChangeText={setSearch}
        />
        {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={16} color={Colors.muted} /></TouchableOpacity> : null}
      </View>

      <Text style={s.countLabel}>{filtered.length} soal{search ? ` (dari ${soalList.length})` : ''}</Text>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={{ padding: 16, paddingTop: 0, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={Colors.primary} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="document-outline" size={48} color={Colors.border} />
            <Text style={s.emptyText}>{search ? 'Tidak ada hasil pencarian' : 'Belum ada soal — tekan Tambah atau Bulk Input'}</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <View style={s.card}>
            <View style={s.cardTop}>
              <View style={s.numBadge}><Text style={s.numText}>{soalList.length - index}</Text></View>
              <Text style={s.pertanyaan} numberOfLines={3}>{item.pertanyaan}</Text>
            </View>
            <View style={s.opsiRow}>
              {JAWABAN_OPTS.map(opt => (
                <View key={opt} style={[s.opsiChip, item.jawaban_benar === opt && s.opsiChipBenar]}>
                  <Text style={[s.opsiLabel, item.jawaban_benar === opt && s.opsiLabelBenar]}>
                    {opt.toUpperCase()}
                  </Text>
                </View>
              ))}
            </View>
            <View style={s.cardActions}>
              <Text style={s.jawabanText}>Jawaban: <Text style={{ color: Colors.success, fontWeight: '700' }}>{item.jawaban_benar.toUpperCase()}</Text></Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity onPress={() => openEdit(item)} style={s.iconBtn}>
                  <Ionicons name="pencil-outline" size={18} color={Colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item)} style={s.iconBtn}>
                  <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      />

      {/* Modal Tambah / Edit */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={s.modalBox}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{editTarget ? 'Edit Soal' : 'Tambah Soal'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={s.fieldLabel}>Pertanyaan *</Text>
              <TextInput
                style={[s.input, { height: 80, textAlignVertical: 'top' }]}
                multiline value={form.pertanyaan}
                onChangeText={v => setForm(f => ({ ...f, pertanyaan: v }))}
                placeholder="Tulis pertanyaan di sini..."
                placeholderTextColor={Colors.muted}
              />
              {['a', 'b', 'c', 'd'].map(opt => (
                <View key={opt}>
                  <Text style={s.fieldLabel}>Opsi {opt.toUpperCase()} *</Text>
                  <TextInput
                    style={s.input}
                    value={form[`opsi_${opt}`]}
                    onChangeText={v => setForm(f => ({ ...f, [`opsi_${opt}`]: v }))}
                    placeholder={`Opsi ${opt.toUpperCase()}`}
                    placeholderTextColor={Colors.muted}
                  />
                </View>
              ))}
              <Text style={s.fieldLabel}>Jawaban Benar *</Text>
              <View style={s.jawabanRow}>
                {JAWABAN_OPTS.map(opt => (
                  <TouchableOpacity
                    key={opt}
                    style={[s.jawabanBtn, form.jawaban_benar === opt && s.jawabanBtnActive]}
                    onPress={() => setForm(f => ({ ...f, jawaban_benar: opt }))}
                  >
                    <Text style={[s.jawabanBtnText, form.jawaban_benar === opt && { color: '#fff' }]}>
                      {opt.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Simpan</Text>}
              </TouchableOpacity>
              <View style={{ height: 24 }} />
            </ScrollView>
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
  headerBtns: { flexDirection: 'row', gap: 8 },
  btnPrimary: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  btnSecondary: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1.5, borderColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  btnSecondaryText: { color: Colors.primary, fontWeight: '700', fontSize: 13 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', margin: 12, marginBottom: 4, backgroundColor: Colors.card, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: Colors.border },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text },
  countLabel: { fontSize: 12, color: Colors.muted, paddingHorizontal: 16, paddingBottom: 8 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { color: Colors.muted, textAlign: 'center', lineHeight: 20 },
  card: { backgroundColor: Colors.card, borderRadius: 12, padding: 14, marginBottom: 10, elevation: 2 },
  cardTop: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  numBadge: { width: 28, height: 28, borderRadius: 8, backgroundColor: Colors.primary + '20', justifyContent: 'center', alignItems: 'center' },
  numText: { fontSize: 11, fontWeight: '800', color: Colors.primary },
  pertanyaan: { flex: 1, fontSize: 13, color: Colors.text, lineHeight: 20 },
  opsiRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  opsiChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: Colors.border },
  opsiChipBenar: { backgroundColor: Colors.success + '30' },
  opsiLabel: { fontSize: 11, fontWeight: '700', color: Colors.muted },
  opsiLabelBenar: { color: Colors.success },
  cardActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 10 },
  jawabanText: { fontSize: 12, color: Colors.muted },
  iconBtn: { padding: 4 },
  overlay: { flex: 1, backgroundColor: '#00000060', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: Colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: Colors.text, backgroundColor: Colors.background },
  jawabanRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  jawabanBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center' },
  jawabanBtnActive: { backgroundColor: Colors.success, borderColor: Colors.success },
  jawabanBtnText: { fontWeight: '800', fontSize: 15, color: Colors.text },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
