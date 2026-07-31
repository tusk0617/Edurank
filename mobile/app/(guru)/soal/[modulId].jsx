import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, ScrollView,
  Modal, TextInput, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getGuruSoal, createSoal, updateSoal, deleteSoal } from '../../../services/api';
import Colors from '../../../constants/Colors';
import styles from '../../../styles/guru/soalDetail';

const JAWABAN_OPTIONS = ['a', 'b', 'c', 'd'];
const BLANK_FORM = {
  pertanyaan: '',
  opsi_a: '', opsi_b: '', opsi_c: '', opsi_d: '',
  jawaban_benar: 'a',
  bobot_poin: '1',
};

export default function SoalDetail() {
  const { modulId, judul } = useLocalSearchParams();
  const [soalList, setSoalList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(BLANK_FORM);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await getGuruSoal();
      setSoalList(res.data.filter(s => s.modul_id === parseInt(modulId)));
    } catch {
      Alert.alert('Error', 'Gagal memuat soal');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [modulId]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const openTambah = () => {
    setEditId(null);
    setForm(BLANK_FORM);
    setModalVisible(true);
  };

  const openEdit = (soal) => {
    setEditId(soal.id);
    setForm({
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
    setSaving(true);
    try {
      const payload = {
        modul_id: parseInt(modulId),
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

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={Colors.secondary} /></View>;
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.pageTitle} numberOfLines={1}>{judul || 'Soal'}</Text>
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.secondary, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 9 }}
          onPress={openTambah}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={15} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Tambah Pertanyaan</Text>
        </TouchableOpacity>
      </View>

      {/* Soal list */}
      <FlatList
        data={soalList}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={Colors.secondary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={48} color={Colors.border} />
            <Text style={styles.emptyText}>Belum ada soal</Text>
            <Text style={styles.emptyHint}>Tekan "Tambah Pertanyaan" untuk mulai</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <View style={styles.soalCard}>
            <View style={styles.soalMeta}>
              <View style={styles.soalNumBadge}>
                <Text style={styles.soalNum}>{index + 1}</Text>
              </View>
              <Text style={styles.soalText}>{item.pertanyaan}</Text>
            </View>
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

      {/* Modal Tambah/Edit Soal */}
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
