import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput,
  Modal, ScrollView, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getGuruSoal, getGuruModul, createSoal, updateSoal, deleteSoal } from '../../services/api';
import Colors from '../../constants/Colors';

const JAWABAN_OPTIONS = ['a', 'b', 'c', 'd'];
const BLANK_FORM = {
  modul_id: '',
  pertanyaan: '',
  opsi_a: '', opsi_b: '', opsi_c: '', opsi_d: '',
  jawaban_benar: 'a',
  bobot_poin: '1',
};

export default function KelolaSOal() {
  const [soalList, setSoalList] = useState([]);
  const [modulList, setModulList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(BLANK_FORM);
  const [saving, setSaving] = useState(false);
  const [filterMapel, setFilterMapel] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [soalRes, modulRes] = await Promise.all([getGuruSoal(), getGuruModul()]);
      setSoalList(soalRes.data);
      setModulList(modulRes.data);
    } catch {
      Alert.alert('Error', 'Gagal memuat data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const openTambah = () => {
    setEditId(null);
    setForm({ ...BLANK_FORM, modul_id: modulList[0]?.id?.toString() || '' });
    setModalVisible(true);
  };

  const openEdit = (soal) => {
    setEditId(soal.id);
    setForm({
      modul_id: soal.modul_id.toString(),
      pertanyaan: soal.pertanyaan,
      opsi_a: soal.opsi_a, opsi_b: soal.opsi_b,
      opsi_c: soal.opsi_c, opsi_d: soal.opsi_d,
      jawaban_benar: soal.jawaban_benar,
      bobot_poin: soal.bobot_poin.toString(),
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.pertanyaan.trim() || !form.opsi_a.trim() || !form.opsi_b.trim() || !form.opsi_c.trim() || !form.opsi_d.trim()) {
      Alert.alert('Perhatian', 'Pertanyaan dan semua opsi wajib diisi');
      return;
    }
    if (!form.modul_id) {
      Alert.alert('Perhatian', 'Pilih modul terlebih dahulu');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        modul_id: parseInt(form.modul_id),
        pertanyaan: form.pertanyaan.trim(),
        opsi_a: form.opsi_a.trim(), opsi_b: form.opsi_b.trim(),
        opsi_c: form.opsi_c.trim(), opsi_d: form.opsi_d.trim(),
        jawaban_benar: form.jawaban_benar,
        bobot_poin: parseInt(form.bobot_poin) || 1,
      };
      if (editId) {
        await updateSoal(editId, payload);
      } else {
        await createSoal(payload);
      }
      setModalVisible(false);
      fetchData();
    } catch (err) {
      Alert.alert('Gagal', err.response?.data?.message || 'Terjadi kesalahan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (soal) => {
    Alert.alert(
      'Hapus Soal',
      `Yakin hapus soal ini?\n"${soal.pertanyaan.substring(0, 60)}..."`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus', style: 'destructive',
          onPress: async () => {
            try {
              await deleteSoal(soal.id);
              fetchData();
            } catch {
              Alert.alert('Gagal', 'Tidak dapat menghapus soal');
            }
          },
        },
      ]
    );
  };

  // Ambil daftar mapel unik untuk filter
  const mapelList = [...new Set(soalList.map(s => s.nama_mapel))];
  const filtered = filterMapel ? soalList.filter(s => s.nama_mapel === filterMapel) : soalList;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.secondary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <Text style={styles.pageTitle}>Kelola Soal</Text>
        <Text style={styles.count}>{soalList.length} soal</Text>
      </View>

      {/* Filter mapel */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
        <TouchableOpacity
          style={[styles.filterChip, !filterMapel && styles.filterActive]}
          onPress={() => setFilterMapel('')}
        >
          <Text style={[styles.filterText, !filterMapel && styles.filterTextActive]}>Semua</Text>
        </TouchableOpacity>
        {mapelList.map(m => (
          <TouchableOpacity
            key={m}
            style={[styles.filterChip, filterMapel === m && styles.filterActive]}
            onPress={() => setFilterMapel(m)}
          >
            <Text style={[styles.filterText, filterMapel === m && styles.filterTextActive]}>{m}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={Colors.secondary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={48} color={Colors.border} />
            <Text style={styles.emptyText}>Belum ada soal</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.soalCard}>
            <View style={styles.soalMeta}>
              <View style={styles.mapelBadge}>
                <Text style={styles.mapelBadgeText}>{item.nama_mapel}</Text>
              </View>
              <Text style={styles.modulLabel}>{item.judul_modul}</Text>
            </View>
            <Text style={styles.soalText} numberOfLines={3}>{item.pertanyaan}</Text>
            <View style={styles.opsiRow}>
              {['a','b','c','d'].map(opt => (
                <View key={opt} style={[styles.opsiChip, item.jawaban_benar === opt && styles.opsiBenar]}>
                  <Text style={[styles.opsiChipText, item.jawaban_benar === opt && styles.opsiBenarText]}>
                    {opt.toUpperCase()}. {item[`opsi_${opt}`]?.substring(0, 20)}{item[`opsi_${opt}`]?.length > 20 ? '...' : ''}
                  </Text>
                </View>
              ))}
            </View>
            <View style={styles.soalActions}>
              <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
                <Ionicons name="pencil" size={14} color={Colors.primary} />
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
                <Ionicons name="trash" size={14} color={Colors.danger} />
                <Text style={styles.deleteBtnText}>Hapus</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openTambah} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Modal Tambah/Edit */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{editId ? 'Edit Soal' : 'Tambah Soal'}</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              {saving
                ? <ActivityIndicator size="small" color={Colors.secondary} />
                : <Text style={styles.saveText}>Simpan</Text>
              }
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Pilih Modul */}
            <Text style={styles.fieldLabel}>Modul *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {modulList.map(m => (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.modulChip, form.modul_id == m.id && styles.modulChipActive]}
                  onPress={() => setForm(f => ({ ...f, modul_id: m.id.toString() }))}
                >
                  <Text style={[styles.modulChipText, form.modul_id == m.id && styles.modulChipTextActive]}>
                    {m.nama_mapel} — {m.judul}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>Pertanyaan *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              multiline numberOfLines={3}
              placeholder="Tulis pertanyaan di sini..."
              placeholderTextColor={Colors.muted}
              value={form.pertanyaan}
              onChangeText={v => setForm(f => ({ ...f, pertanyaan: v }))}
            />

            {['a','b','c','d'].map(opt => (
              <View key={opt}>
                <Text style={styles.fieldLabel}>Opsi {opt.toUpperCase()} *</Text>
                <TextInput
                  style={styles.input}
                  placeholder={`Opsi ${opt.toUpperCase()}`}
                  placeholderTextColor={Colors.muted}
                  value={form[`opsi_${opt}`]}
                  onChangeText={v => setForm(f => ({ ...f, [`opsi_${opt}`]: v }))}
                />
              </View>
            ))}

            <Text style={styles.fieldLabel}>Jawaban Benar *</Text>
            <View style={styles.jawabanRow}>
              {JAWABAN_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.jawabanBtn, form.jawaban_benar === opt && styles.jawabanBtnActive]}
                  onPress={() => setForm(f => ({ ...f, jawaban_benar: opt }))}
                >
                  <Text style={[styles.jawabanBtnText, form.jawaban_benar === opt && styles.jawabanBtnTextActive]}>
                    {opt.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Bobot Poin</Text>
            <TextInput
              style={[styles.input, { width: 100 }]}
              keyboardType="number-pad"
              placeholder="1"
              placeholderTextColor={Colors.muted}
              value={form.bobot_poin}
              onChangeText={v => setForm(f => ({ ...f, bobot_poin: v }))}
            />
            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  pageTitle: { fontSize: 22, fontWeight: '800', color: Colors.text },
  count: { fontSize: 13, color: Colors.muted },
  filterScroll: { maxHeight: 44 },
  filterContent: { paddingHorizontal: 20, paddingBottom: 8, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  filterActive: { backgroundColor: Colors.secondary, borderColor: Colors.secondary },
  filterText: { fontSize: 12, color: Colors.muted, fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  list: { padding: 16, paddingBottom: 100 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: Colors.muted, marginTop: 12, fontSize: 15 },
  soalCard: { backgroundColor: Colors.card, borderRadius: 14, padding: 14, marginBottom: 12, elevation: 2 },
  soalMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  mapelBadge: { backgroundColor: Colors.secondary + '20', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  mapelBadgeText: { fontSize: 10, fontWeight: '700', color: Colors.secondary },
  modulLabel: { fontSize: 11, color: Colors.muted, flex: 1 },
  soalText: { fontSize: 13, color: Colors.text, lineHeight: 18, marginBottom: 10 },
  opsiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  opsiChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, maxWidth: '48%' },
  opsiBenar: { backgroundColor: Colors.success + '20', borderColor: Colors.success },
  opsiChipText: { fontSize: 10, color: Colors.muted },
  opsiBenarText: { color: Colors.success, fontWeight: '700' },
  soalActions: { flexDirection: 'row', gap: 10, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 10 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8, backgroundColor: Colors.lightBlue },
  editBtnText: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#FEF2F2' },
  deleteBtnText: { fontSize: 12, color: Colors.danger, fontWeight: '600' },
  fab: {
    position: 'absolute', right: 20, bottom: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.secondary,
    justifyContent: 'center', alignItems: 'center',
    elevation: 6,
  },
  modalSafe: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, backgroundColor: Colors.card, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  saveText: { fontSize: 15, fontWeight: '700', color: Colors.secondary },
  modalBody: { flex: 1, padding: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14,
    color: Colors.text, backgroundColor: Colors.card,
  },
  textArea: { height: 90, textAlignVertical: 'top' },
  modulChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginRight: 8,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.card,
  },
  modulChipActive: { borderColor: Colors.secondary, backgroundColor: Colors.secondary + '15' },
  modulChipText: { fontSize: 12, color: Colors.muted },
  modulChipTextActive: { color: Colors.secondary, fontWeight: '700' },
  jawabanRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  jawabanBtn: {
    width: 48, height: 48, borderRadius: 12, borderWidth: 2,
    borderColor: Colors.border, justifyContent: 'center', alignItems: 'center',
    backgroundColor: Colors.card,
  },
  jawabanBtnActive: { borderColor: Colors.success, backgroundColor: Colors.success + '20' },
  jawabanBtnText: { fontSize: 16, fontWeight: '700', color: Colors.muted },
  jawabanBtnTextActive: { color: Colors.success },
});
