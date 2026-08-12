import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Modal, TextInput,
  Alert, ActivityIndicator, RefreshControl, ScrollView, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, router } from 'expo-router';
import { useAuth } from '../../../context/AuthContext';
import {
  getGuruSoal, createSoal, updateSoal, deleteSoal,
  getGuruAssessment, createAssessment, updateAssessment, deleteAssessment,
  getGuruAssessmentSoalIds,
} from '../../../services/api';
import Colors from '../../../constants/Colors';

const JAWABAN_OPTS = ['a', 'b', 'c', 'd'];
const EMPTY_SOAL   = { pertanyaan: '', opsi_a: '', opsi_b: '', opsi_c: '', opsi_d: '', jawaban_benar: '' };
const EMPTY_FORM   = { judul: '', durasi_menit: '30', deadline: '' };

// ─── Sub-component: Bank Soal ────────────────────────────────────────────────
function BankSoal({ soalList, loading, refreshing, onRefresh }) {
  const [search, setSearch]               = useState('');
  const [modalVisible, setModalVisible]   = useState(false);
  const [editTarget, setEditTarget]       = useState(null);
  const [form, setForm]                   = useState(EMPTY_SOAL);
  const [saving, setSaving]               = useState(false);

  const openCreate = () => { setEditTarget(null); setForm(EMPTY_SOAL); setModalVisible(true); };
  const openEdit   = (item) => {
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
    if (!form.pertanyaan.trim() || !form.opsi_a || !form.opsi_b || !form.opsi_c || !form.opsi_d)
      return Alert.alert('Perhatian', 'Pertanyaan dan semua opsi wajib diisi');
    if (!form.jawaban_benar) return Alert.alert('Perhatian', 'Pilih jawaban benar');
    setSaving(true);
    try {
      editTarget ? await updateSoal(editTarget.id, form) : await createSoal(form);
      setModalVisible(false);
      onRefresh();
    } catch (err) {
      Alert.alert('Gagal', err.response?.data?.message || 'Terjadi kesalahan');
    } finally { setSaving(false); }
  };

  const handleDelete = (item) => {
    Alert.alert('Hapus Soal', 'Soal ini akan dihapus permanen.', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: async () => {
        try { await deleteSoal(item.id); onRefresh(); }
        catch { Alert.alert('Gagal', 'Gagal menghapus soal'); }
      }},
    ]);
  };

  const filtered = search
    ? soalList.filter(s => s.pertanyaan.toLowerCase().includes(search.toLowerCase()))
    : soalList;

  return (
    <View style={{ flex: 1 }}>
      {/* Toolbar */}
      <View style={s.toolbar}>
        <View style={s.searchWrap}>
          <Ionicons name="search-outline" size={15} color={Colors.muted} />
          <TextInput style={s.searchInput} placeholder="Cari soal..." placeholderTextColor={Colors.muted}
            value={search} onChangeText={setSearch} />
          {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={15} color={Colors.muted} /></TouchableOpacity> : null}
        </View>
        <TouchableOpacity style={s.bulkBtn} onPress={() => router.push('/(guru)/soal/bulk')} activeOpacity={0.85}>
          <Ionicons name="copy-outline" size={15} color={Colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={s.addBtn} onPress={openCreate} activeOpacity={0.85}>
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={s.addBtnText}>Tambah</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.countLabel}>{filtered.length} soal{search ? ` (dari ${soalList.length})` : ''}</Text>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={{ padding: 12, paddingTop: 4, paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="document-outline" size={44} color={Colors.border} />
            <Text style={s.emptyText}>{search ? 'Tidak ada hasil pencarian' : 'Belum ada soal — tekan Tambah atau Bulk Input'}</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <View style={s.soalCard}>
            <View style={s.soalCardTop}>
              <View style={s.numBadge}><Text style={s.numText}>{soalList.length - index}</Text></View>
              <Text style={s.pertanyaan} numberOfLines={3}>{item.pertanyaan}</Text>
            </View>
            <View style={s.opsiRow}>
              {JAWABAN_OPTS.map(opt => (
                <View key={opt} style={[s.opsiChip, item.jawaban_benar === opt && s.opsiChipBenar]}>
                  <Text style={[s.opsiLabel, item.jawaban_benar === opt && s.opsiLabelBenar]}>{opt.toUpperCase()}</Text>
                </View>
              ))}
            </View>
            <View style={s.soalCardActions}>
              <Text style={s.jawabanText}>Jawaban: <Text style={{ color: Colors.success, fontWeight: '700' }}>{item.jawaban_benar?.toUpperCase()}</Text></Text>
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

      {/* Modal Tambah/Edit Soal */}
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
              <TextInput style={[s.input, { height: 80, textAlignVertical: 'top' }]}
                multiline value={form.pertanyaan}
                onChangeText={v => setForm(f => ({ ...f, pertanyaan: v }))}
                placeholder="Tulis pertanyaan di sini..." placeholderTextColor={Colors.muted} />
              {['a', 'b', 'c', 'd'].map(opt => (
                <View key={opt}>
                  <Text style={s.fieldLabel}>Opsi {opt.toUpperCase()} *</Text>
                  <TextInput style={s.input} value={form[`opsi_${opt}`]}
                    onChangeText={v => setForm(f => ({ ...f, [`opsi_${opt}`]: v }))}
                    placeholder={`Opsi ${opt.toUpperCase()}`} placeholderTextColor={Colors.muted} />
                </View>
              ))}
              <Text style={s.fieldLabel}>Jawaban Benar *</Text>
              <View style={s.jawabanRow}>
                {JAWABAN_OPTS.map(opt => (
                  <TouchableOpacity key={opt} style={[s.jawabanBtn, form.jawaban_benar === opt && s.jawabanBtnActive]}
                    onPress={() => setForm(f => ({ ...f, jawaban_benar: opt }))}>
                    <Text style={[s.jawabanBtnText, form.jawaban_benar === opt && { color: '#fff' }]}>{opt.toUpperCase()}</Text>
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
    </View>
  );
}

// ─── Sub-component: Assessment ───────────────────────────────────────────────
function AssessmentView({ soalBank, loading, refreshing, onRefresh }) {
  const [list, setList]                 = useState([]);
  const [loadingList, setLoadingList]   = useState(true);
  const [formVisible, setFormVisible]   = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [editTarget, setEditTarget]     = useState(null);
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [selectedIds, setSelectedIds]   = useState([]);
  const [saving, setSaving]             = useState(false);

  const fetchList = useCallback(async () => {
    try {
      const res = await getGuruAssessment();
      setList(res.data);
    } catch { /* noop */ }
    finally { setLoadingList(false); }
  }, []);

  useFocusEffect(useCallback(() => { fetchList(); }, [fetchList]));

  // juga refresh saat parent refresh
  const prevRefreshing = useRef(refreshing);
  if (prevRefreshing.current !== refreshing) {
    prevRefreshing.current = refreshing;
    if (!refreshing) fetchList();
  }

  const openCreate = () => { setEditTarget(null); setForm(EMPTY_FORM); setSelectedIds([]); setFormVisible(true); };
  const openEdit   = async (item) => {
    setEditTarget(item);
    setForm({ judul: item.judul, durasi_menit: String(item.durasi_menit), deadline: item.deadline ? item.deadline.split('T')[0] : '' });
    try { const r = await getGuruAssessmentSoalIds(item.id); setSelectedIds(r.data); } catch { setSelectedIds([]); }
    setFormVisible(true);
  };

  const toggleSoal = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleSave = async () => {
    if (!form.judul.trim() || !form.durasi_menit) return Alert.alert('Perhatian', 'Judul dan durasi wajib diisi');
    if (selectedIds.length === 0) return Alert.alert('Perhatian', 'Pilih minimal 1 soal');
    setSaving(true);
    try {
      const payload = { judul: form.judul.trim(), durasi_menit: Number(form.durasi_menit) || 30, deadline: form.deadline || null, soal_ids: selectedIds };
      editTarget ? await updateAssessment(editTarget.id, payload) : await createAssessment(payload);
      setFormVisible(false);
      fetchList();
    } catch (err) {
      Alert.alert('Gagal', err.response?.data?.message || 'Terjadi kesalahan');
    } finally { setSaving(false); }
  };

  const handleDelete = (item) => {
    Alert.alert('Hapus Assessment', `Hapus "${item.judul}"? Semua hasil siswa akan ikut terhapus.`, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: async () => {
        try { await deleteAssessment(item.id); fetchList(); }
        catch { Alert.alert('Gagal', 'Gagal menghapus assessment'); }
      }},
    ]);
  };

  if (loadingList) return <View style={s.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  return (
    <View style={{ flex: 1 }}>
      {/* Toolbar */}
      <View style={[s.toolbar, { paddingVertical: 10 }]}>
        <Text style={s.toolbarLabel}>{list.length} assessment</Text>
        <TouchableOpacity style={s.addBtn} onPress={openCreate} activeOpacity={0.85}>
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={s.addBtnText}>Buat</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 12, paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { fetchList(); onRefresh(); }} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {list.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="clipboard-outline" size={44} color={Colors.border} />
            <Text style={s.emptyText}>Belum ada assessment{'\n'}Tekan "Buat" untuk membuat yang pertama</Text>
          </View>
        ) : list.map(item => {
          const deadline = item.deadline
            ? new Date(item.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
            : 'Tanpa batas';
          return (
            <View key={item.id} style={s.asmCard}>
              {/* Judul + aksi */}
              <View style={s.asmCardTop}>
                <Text style={s.asmTitle} numberOfLines={2}>{item.judul}</Text>
                <View style={{ flexDirection: 'row', gap: 2 }}>
                  <TouchableOpacity onPress={() => openEdit(item)} style={s.iconBtn}>
                    <Ionicons name="pencil" size={17} color={Colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(item)} style={s.iconBtn}>
                    <Ionicons name="trash" size={17} color={Colors.danger} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Info row */}
              <View style={s.asmInfoRow}>
                <View style={s.asmInfoItem}>
                  <Ionicons name="document-text-outline" size={13} color={Colors.muted} />
                  <Text style={s.asmInfoText}>{item.jumlah_soal} soal (maks 10 per sesi)</Text>
                </View>
                <View style={s.asmInfoItem}>
                  <Ionicons name="time-outline" size={13} color={Colors.muted} />
                  <Text style={s.asmInfoText}>{item.durasi_menit} mnt</Text>
                </View>
              </View>
              <View style={s.asmInfoRow}>
                <View style={s.asmInfoItem}>
                  <Ionicons name="calendar-outline" size={13} color={Colors.muted} />
                  <Text style={s.asmInfoText}>{deadline}</Text>
                </View>
              </View>

              {/* Tombol hasil */}
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
                placeholder="2026-12-31" placeholderTextColor={Colors.muted} />

              {/* Soal yang dipilih */}
              <View style={s.soalPickerHeader}>
                <Text style={s.fieldLabel}>Soal dari Bank ({selectedIds.length} dipilih)</Text>
                <TouchableOpacity onPress={() => setPickerVisible(true)} style={s.changeSoalBtn}>
                  <Text style={s.changeSoalText}>Ubah pilihan</Text>
                </TouchableOpacity>
              </View>

              {/* Preview soal terpilih */}
              {selectedIds.length === 0 ? (
                <TouchableOpacity style={s.emptyPicker} onPress={() => setPickerVisible(true)}>
                  <Ionicons name="add-circle-outline" size={20} color={Colors.muted} />
                  <Text style={s.emptyPickerText}>Tekan untuk memilih soal dari bank</Text>
                </TouchableOpacity>
              ) : (
                <View style={s.selectedPreview}>
                  {soalBank.filter(s => selectedIds.includes(s.id)).map((soal, i) => (
                    <View key={soal.id} style={s.selectedItem}>
                      <View style={s.selectedNumBadge}><Text style={s.selectedNum}>{i + 1}</Text></View>
                      <Text style={s.selectedText} numberOfLines={2}>{soal.pertanyaan}</Text>
                      <TouchableOpacity onPress={() => toggleSoal(soal.id)} style={{ padding: 4 }}>
                        <Ionicons name="close-circle" size={18} color={Colors.danger} />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity style={s.addMoreBtn} onPress={() => setPickerVisible(true)}>
                    <Ionicons name="add" size={14} color={Colors.primary} />
                    <Text style={s.addMoreText}>Tambah soal lagi</Text>
                  </TouchableOpacity>
                </View>
              )}

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
                <Text style={s.emptyText}>Belum ada soal di bank.{'\n'}Kembali ke tab Bank Soal dan tambahkan soal terlebih dahulu.</Text>
              </View>
            ) : (
              <FlatList
                data={soalBank}
                keyExtractor={item => item.id.toString()}
                showsVerticalScrollIndicator={false}
                renderItem={({ item, index }) => {
                  const selected = selectedIds.includes(item.id);
                  return (
                    <TouchableOpacity style={[s.pickerItem, selected && s.pickerItemSelected]}
                      onPress={() => toggleSoal(item.id)} activeOpacity={0.7}>
                      <View style={[s.checkbox, selected && s.checkboxChecked]}>
                        {selected && <Ionicons name="checkmark" size={14} color="#fff" />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.pickerNum}>Soal #{soalBank.length - index}</Text>
                        <Text style={s.pickerText} numberOfLines={2}>{item.pertanyaan}</Text>
                      </View>
                      {selected && <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />}
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Root screen ─────────────────────────────────────────────────────────────
export default function KelolaScreen() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('soal');
  const [soalList, setSoalList]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const handleLogout = () => {
    Alert.alert('Keluar', 'Yakin ingin keluar?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Keluar', style: 'destructive', onPress: async () => { await logout(); router.replace('/login'); } },
    ]);
  };

  const fetchSoal = useCallback(async () => {
    try {
      const res = await getGuruSoal();
      setSoalList(res.data);
    } catch { /* noop */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { fetchSoal(); }, [fetchSoal]));

  const onRefresh = () => { setRefreshing(true); fetchSoal(); };

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  return (
    <SafeAreaView style={s.safe}>
      {/* Page header */}
      <View style={s.pageHeader}>
        <View>
          <Text style={s.pageTitle}>Kelola Soal</Text>
          <Text style={s.pageSubtitle}>{user?.nama || 'Guru'}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={s.logoutBtn}>
          <Ionicons name="log-out-outline" size={22} color={Colors.danger} />
        </TouchableOpacity>
      </View>

      {/* Segment control */}
      <View style={s.segmentWrap}>
        <TouchableOpacity
          style={[s.segmentBtn, activeTab === 'soal' && s.segmentBtnActive]}
          onPress={() => setActiveTab('soal')}
          activeOpacity={0.8}
        >
          <Ionicons name="document-text-outline" size={15} color={activeTab === 'soal' ? '#fff' : Colors.muted} />
          <Text style={[s.segmentText, activeTab === 'soal' && s.segmentTextActive]}>
            Bank Soal ({soalList.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.segmentBtn, activeTab === 'assessment' && s.segmentBtnActive]}
          onPress={() => setActiveTab('assessment')}
          activeOpacity={0.8}
        >
          <Ionicons name="clipboard-outline" size={15} color={activeTab === 'assessment' ? '#fff' : Colors.muted} />
          <Text style={[s.segmentText, activeTab === 'assessment' && s.segmentTextActive]}>
            Assessment
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'soal'
        ? <BankSoal soalList={soalList} loading={loading} refreshing={refreshing} onRefresh={onRefresh} />
        : <AssessmentView soalBank={soalList} loading={loading} refreshing={refreshing} onRefresh={onRefresh} />
      }
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },

  pageHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: Colors.card,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  pageTitle: { fontSize: 18, fontWeight: '800', color: Colors.text },
  pageSubtitle: { fontSize: 11, color: Colors.muted, marginTop: 1 },
  logoutBtn: { padding: 6 },

  // Segment
  segmentWrap: {
    flexDirection: 'row', gap: 0,
    backgroundColor: Colors.card,
    paddingHorizontal: 12, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  segmentBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 9, borderRadius: 10,
    backgroundColor: Colors.background,
  },
  segmentBtnActive: { backgroundColor: Colors.primary },
  segmentText: { fontSize: 13, fontWeight: '600', color: Colors.muted },
  segmentTextActive: { color: '#fff' },

  // Toolbar
  toolbar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: Colors.card,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  toolbarLabel: { flex: 1, fontSize: 13, color: Colors.muted, fontWeight: '600' },
  searchWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.background, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 8,
    borderWidth: 1, borderColor: Colors.border,
  },
  searchInput: { flex: 1, fontSize: 13, color: Colors.text, padding: 0 },
  bulkBtn: { padding: 8, borderRadius: 8, borderWidth: 1.5, borderColor: Colors.primary },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  countLabel: { fontSize: 11, color: Colors.muted, paddingHorizontal: 14, paddingTop: 6, paddingBottom: 2 },

  // Soal card
  soalCard: { backgroundColor: Colors.card, borderRadius: 12, padding: 12, marginBottom: 10, elevation: 2 },
  soalCardTop: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  numBadge: { width: 26, height: 26, borderRadius: 7, backgroundColor: Colors.primary + '20', justifyContent: 'center', alignItems: 'center' },
  numText: { fontSize: 10, fontWeight: '800', color: Colors.primary },
  pertanyaan: { flex: 1, fontSize: 13, color: Colors.text, lineHeight: 20 },
  opsiRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  opsiChip: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6, backgroundColor: Colors.border },
  opsiChipBenar: { backgroundColor: Colors.success + '30' },
  opsiLabel: { fontSize: 11, fontWeight: '700', color: Colors.muted },
  opsiLabelBenar: { color: Colors.success },
  soalCardActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 10 },
  jawabanText: { fontSize: 12, color: Colors.muted },
  iconBtn: { padding: 4 },

  // Assessment card
  asmCard: { backgroundColor: Colors.card, borderRadius: 12, padding: 14, marginBottom: 10, elevation: 2 },
  asmCardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  asmTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: Colors.text, lineHeight: 20 },
  asmInfoRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', marginBottom: 6 },
  asmInfoItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  asmInfoText: { fontSize: 12, color: Colors.muted },
  hasilBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 10, backgroundColor: Colors.primary + '12',
    borderRadius: 10, marginTop: 8,
  },
  hasilBtnText: { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.primary },

  // Soal picker modal
  soalPickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  changeSoalBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: Colors.primary + '18' },
  changeSoalText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  emptyPicker: {
    flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed',
    borderRadius: 10, paddingVertical: 16, marginTop: 6,
  },
  emptyPickerText: { fontSize: 13, color: Colors.muted },
  selectedPreview: { borderWidth: 1, borderColor: Colors.border, borderRadius: 10, overflow: 'hidden', marginTop: 6 },
  selectedItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  selectedNumBadge: { width: 22, height: 22, borderRadius: 6, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  selectedNum: { fontSize: 10, fontWeight: '800', color: '#fff' },
  selectedText: { flex: 1, fontSize: 12, color: Colors.text },
  addMoreBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, justifyContent: 'center' },
  addMoreText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  pickerItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  pickerItemSelected: { backgroundColor: Colors.primary + '08' },
  pickerNum: { fontSize: 10, color: Colors.muted, fontWeight: '600', marginBottom: 2 },
  pickerText: { fontSize: 13, color: Colors.text, lineHeight: 18 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: Colors.border, justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },

  // Shared modal
  overlay: { flex: 1, backgroundColor: '#00000060', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: Colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '92%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: Colors.text, backgroundColor: Colors.background },
  jawabanRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  jawabanBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center' },
  jawabanBtnActive: { backgroundColor: Colors.success, borderColor: Colors.success },
  jawabanBtnText: { fontWeight: '800', fontSize: 15, color: Colors.text },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  empty: { alignItems: 'center', paddingTop: 60, gap: 12, paddingHorizontal: 24 },
  emptyText: { color: Colors.muted, textAlign: 'center', lineHeight: 22 },
});
