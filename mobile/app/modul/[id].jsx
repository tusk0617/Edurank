import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getModulById, mulaiModul, selesaiModul } from '../../services/api';
import Colors from '../../constants/Colors';

const LEVEL_LABEL = { 1: 'Mudah', 2: 'Menengah', 3: 'Sulit' };
const LEVEL_COLOR = { 1: Colors.secondary, 2: Colors.warning, 3: Colors.danger };

const TOPIK_MAP = {
  1: [
    { n: 1, t: 'Variabel dan ekspresi aljabar' },
    { n: 2, t: 'Persamaan linear satu variabel' },
    { n: 3, t: 'Pertidaksamaan linear' },
    { n: 4, t: 'Sistem persamaan linear dua variabel' },
  ],
  2: [
    { n: 1, t: 'Pengertian fungsi dan notasi f(x)' },
    { n: 2, t: 'Domain dan kodomain' },
    { n: 3, t: 'Komposisi fungsi (f∘g)(x)' },
    { n: 4, t: 'Fungsi invers f⁻¹(x)' },
    { n: 5, t: 'Grafik fungsi dan transformasi' },
  ],
  5: [
    { n: 1, t: 'Definisi sin, cos, tan (SOH-CAH-TOA)' },
    { n: 2, t: 'Sudut istimewa 30°, 45°, 60°, 90°' },
    { n: 3, t: 'Identitas Pythagoras sin²+cos²=1' },
    { n: 4, t: 'Aturan sinus dan cosinus' },
    { n: 5, t: 'Persamaan trigonometri sederhana' },
  ],
  7: [
    { n: 1, t: 'Pengumpulan & penyajian data' },
    { n: 2, t: 'Mean, median, modus' },
    { n: 3, t: 'Jangkauan, ragam & simpangan baku' },
    { n: 4, t: 'Histogram dan diagram lingkaran' },
  ],
  9: [
    { n: 1, t: 'Pengertian vektor dan notasi' },
    { n: 2, t: 'Operasi vektor (penjumlahan & pengurangan)' },
    { n: 3, t: 'Panjang vektor dan vektor satuan' },
    { n: 4, t: 'Dot product (perkalian titik)' },
    { n: 5, t: 'Cross product dan aplikasi geometri' },
  ],
  10: [
    { n: 1, t: 'Konsep limit dan notasi lim' },
    { n: 2, t: 'Kekontinuan dan limit tak hingga' },
    { n: 3, t: 'Definisi turunan (laju perubahan)' },
    { n: 4, t: 'Aturan rantai & turunan fungsi' },
    { n: 5, t: 'Anti-turunan dan integral tak tentu' },
    { n: 6, t: 'Teorema dasar kalkulus' },
  ],
};

export default function ModulDetailScreen() {
  const { id } = useLocalSearchParams();
  const [modul, setModul] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const loadModul = useCallback(() => {
    setLoading(true);
    getModulById(id)
      .then(res => setModul(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [id]);

  useFocusEffect(loadModul);

  const handleMulai = async () => {
    setActionLoading(true);
    try {
      await mulaiModul(id);
      const res = await getModulById(id);
      setModul(res.data);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Gagal memulai modul');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSelesai = () => {
    Alert.alert('Konfirmasi', 'Tandai modul ini sebagai selesai?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Selesai', onPress: async () => {
          setActionLoading(true);
          try {
            const res = await selesaiModul(id);
            Alert.alert('🎉 Selesai!', `+${res.data.xp_didapat} XP didapat!`, [
              { text: 'OK', onPress: () => router.back() },
            ]);
          } catch (err) {
            Alert.alert('Error', err.response?.data?.message || 'Gagal menyelesaikan modul');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  if (!modul) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: Colors.muted }}>Modul tidak ditemukan.</Text>
      </View>
    );
  }

  const topiks = TOPIK_MAP[parseInt(id)] || [];
  const isSelesai = modul.status_progress === 'selesai';
  const isSedang = modul.status_progress === 'sedang';
  const isTersedia = modul.status_progress === 'tersedia';

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={[styles.topBar, { backgroundColor: modul.warna_hex }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle} numberOfLines={1}>{modul.nama_mapel}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        {/* Judul */}
        <View style={styles.titleSection}>
          <View style={[styles.levelBadge, { backgroundColor: LEVEL_COLOR[modul.level] + '20' }]}>
            <Text style={[styles.levelText, { color: LEVEL_COLOR[modul.level] }]}>{LEVEL_LABEL[modul.level]}</Text>
          </View>
          <Text style={styles.judul}>{modul.judul}</Text>
          <Text style={styles.deskripsi}>{modul.deskripsi}</Text>
        </View>

        {/* Meta */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={18} color={Colors.muted} />
            <Text style={styles.metaText}>{modul.estimasi_menit} menit</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="star-outline" size={18} color={Colors.warning} />
            <Text style={styles.metaText}>{modul.xp_reward} XP</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="bar-chart-outline" size={18} color={Colors.muted} />
            <Text style={styles.metaText}>{modul.persen_selesai}% selesai</Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progWrap}>
          <View style={styles.progBg}>
            <View style={[styles.progFill, { width: `${modul.persen_selesai}%`, backgroundColor: modul.warna_hex }]} />
          </View>
        </View>

        {/* Sumber */}
        <View style={styles.sourceBadge}>
          <Ionicons name="globe-outline" size={14} color={Colors.muted} />
          <Text style={styles.sourceText}>Materi berdasarkan Khan Academy Indonesia</Text>
        </View>

        {/* Topik */}
        <Text style={styles.sectionTitle}>Topik dalam modul ini</Text>
        <View style={styles.topikList}>
          {topiks.map((t, i) => (
            <View key={i} style={styles.topikItem}>
              <View style={[styles.topikNum, { backgroundColor: modul.warna_hex + '20' }]}>
                <Text style={[styles.topikNumText, { color: modul.warna_hex }]}>{t.n}</Text>
              </View>
              <Text style={styles.topikText}>{t.t}</Text>
              {isSelesai && <Ionicons name="checkmark-circle" size={18} color={Colors.secondary} />}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Action Button */}
      <View style={styles.footer}>
        {isTersedia && (
          <TouchableOpacity style={[styles.btnFull, { backgroundColor: modul.warna_hex }]} onPress={handleMulai} disabled={actionLoading}>
            {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Mulai Modul</Text>}
          </TouchableOpacity>
        )}
        {isSedang && (
          <View style={styles.btnRow}>
            <TouchableOpacity style={[styles.btnHalf, styles.btnOutline]} onPress={handleMulai} disabled={actionLoading}>
              <Text style={[styles.btnText, { color: modul.warna_hex }]}>Lanjutkan</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btnHalf, { backgroundColor: Colors.secondary }]} onPress={handleSelesai} disabled={actionLoading}>
              {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Tandai Selesai</Text>}
            </TouchableOpacity>
          </View>
        )}
        {isSelesai && (
          <View style={[styles.btnFull, { backgroundColor: Colors.secondary + '20' }]}>
            <Text style={[styles.btnText, { color: Colors.secondary }]}>Modul Selesai</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topBar: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 12, gap: 12 },
  backBtn: { padding: 4 },
  topBarTitle: { fontSize: 16, fontWeight: '600', color: '#fff', flex: 1 },
  container: { padding: 16, paddingBottom: 32 },
  titleSection: { marginBottom: 16 },
  levelBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginBottom: 8 },
  levelText: { fontSize: 12, fontWeight: '600' },
  judul: { fontSize: 22, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  deskripsi: { fontSize: 14, color: Colors.muted, lineHeight: 22 },
  metaRow: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 13, color: Colors.muted },
  progWrap: { marginBottom: 16 },
  progBg: { height: 6, backgroundColor: Colors.border, borderRadius: 99, overflow: 'hidden' },
  progFill: { height: 6, borderRadius: 99 },
  sourceBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.card, borderRadius: 8, padding: 10, marginBottom: 20 },
  sourceText: { fontSize: 12, color: Colors.muted },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.text, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  topikList: { gap: 2 },
  topikItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  topikNum: { width: 28, height: 28, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  topikNumText: { fontSize: 12, fontWeight: '700' },
  topikText: { flex: 1, fontSize: 14, color: Colors.text },
  footer: { padding: 16, paddingBottom: 24, backgroundColor: Colors.background, borderTopWidth: 0.5, borderTopColor: Colors.border },
  btnRow: { flexDirection: 'row', gap: 10 },
  btnFull: { paddingVertical: 14, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  btnHalf: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  btnOutline: { borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.card },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
