import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, ScrollView,
  Modal, TextInput, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getGuruModul, getGuruMapel, createModul } from '../../../services/api';
import Colors from '../../../constants/Colors';
import styles from '../../../styles/guru/soalIndex';

const LEVEL_OPTIONS = ['Mudah', 'Sedang', 'Sulit'];
const BLANK_FORM = { judul: '', mapel_id: '', level: '' };

export default function KelolaSOalIndex() {
  const [modulList, setModulList] = useState([]);
  const [mapelList, setMapelList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterMapel, setFilterMapel] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState(BLANK_FORM);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [modulRes, mapelRes] = await Promise.all([getGuruModul(), getGuruMapel()]);
      setModulList(modulRes.data);
      setMapelList(mapelRes.data);
    } catch {
      Alert.alert('Error', 'Gagal memuat data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const handleSave = async () => {
    if (!form.judul.trim()) return Alert.alert('Perhatian', 'Judul materi wajib diisi');
    if (!form.mapel_id) return Alert.alert('Perhatian', 'Pilih kategori mata pelajaran');
    if (!form.level) return Alert.alert('Perhatian', 'Pilih tingkat kesulitan');
    setSaving(true);
    try {
      await createModul({ judul: form.judul.trim(), mapel_id: parseInt(form.mapel_id), level: form.level });
      setModalVisible(false);
      setForm(BLANK_FORM);
      fetchData();
    } catch (err) {
      Alert.alert('Gagal', err.response?.data?.message || 'Terjadi kesalahan');
    } finally {
      setSaving(false);
    }
  };

  const mapelNames = [...new Set(modulList.map(m => m.nama_mapel))];
  const filtered = filterMapel ? modulList.filter(m => m.nama_mapel === filterMapel) : modulList;

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header with Tambah Materi button */}
      <View style={[styles.header, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
        <Text style={styles.headerTitle}>Kelola Soal</Text>
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 }}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Tambah Materi</Text>
        </TouchableOpacity>
      </View>

      {/* Filter mapel tabs — smaller */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabsContent}>
        <TouchableOpacity style={[styles.tab, !filterMapel && styles.tabActive]} onPress={() => setFilterMapel('')}>
          <Text style={[styles.tabText, !filterMapel && styles.tabTextActive]}>Semua</Text>
        </TouchableOpacity>
        {mapelNames.map(m => (
          <TouchableOpacity key={m} style={[styles.tab, filterMapel === m && styles.tabActive]} onPress={() => setFilterMapel(m)}>
            <Text style={[styles.tabText, filterMapel === m && styles.tabTextActive]}>{m}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Modul list */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={[styles.list, { paddingBottom: 24 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={Colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="book-outline" size={48} color={Colors.border} />
            <Text style={styles.emptyText}>Belum ada materi</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={styles.modulCard}
            onPress={() => router.push({ pathname: '/(guru)/soal/[modulId]', params: { modulId: item.id, judul: item.judul } })}
            activeOpacity={0.75}
          >
            <View style={styles.modulLeft}>
              <View style={styles.modulNumBadge}>
                <Text style={styles.modulNum}>{index + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modulJudul}>{item.judul}</Text>
                <Text style={styles.mapelLabel}>{item.nama_mapel}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.muted} />
          </TouchableOpacity>
        )}
      />

      {/* Modal Tambah Materi */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { setModalVisible(false); setForm(BLANK_FORM); }}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Tambah Materi</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              {saving
                ? <ActivityIndicator size="small" color={Colors.primary} />
                : <Text style={{ fontSize: 15, fontWeight: '700', color: Colors.primary }}>Simpan</Text>
              }
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <Text style={styles.fieldLabel}>Judul Materi *</Text>
            <TextInput
              style={styles.input}
              placeholder="Contoh: Sistem Persamaan Linear"
              placeholderTextColor={Colors.muted}
              value={form.judul}
              onChangeText={v => setForm(f => ({ ...f, judul: v }))}
            />

            <Text style={styles.fieldLabel}>Kategori (Mata Pelajaran) *</Text>
            <View style={styles.chipGroup}>
              {mapelList.map(m => (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.chip, form.mapel_id == m.id && styles.chipActive]}
                  onPress={() => setForm(f => ({ ...f, mapel_id: m.id.toString() }))}
                >
                  <Text style={[styles.chipText, form.mapel_id == m.id && styles.chipTextActive]}>{m.nama}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Tingkat Kesulitan *</Text>
            <View style={styles.levelRow}>
              {LEVEL_OPTIONS.map(lv => (
                <TouchableOpacity
                  key={lv}
                  style={[styles.levelBtn, form.level === lv && { borderColor: Colors.primary, backgroundColor: Colors.primary + '15' }]}
                  onPress={() => setForm(f => ({ ...f, level: lv }))}
                >
                  <Text style={[styles.levelBtnText, form.level === lv && { color: Colors.primary, fontWeight: '700' }]}>{lv}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
