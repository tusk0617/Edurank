import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getAssessment } from '../../services/api';
import Card from '../../components/ui/Card';
import Colors from '../../constants/Colors';

const STATUS_CONFIG = {
  lulus: { label: 'Lulus', color: Colors.secondary, icon: 'checkmark-circle' },
  remedial: { label: 'Remedial', color: Colors.warning, icon: 'refresh-circle' },
  tidak_lulus: { label: 'Tidak Lulus', color: Colors.danger, icon: 'close-circle' },
  null: { label: 'Tersedia', color: Colors.primary, icon: 'play-circle' },
};

export default function AssessmentScreen() {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await getAssessment();
      setAssessments(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, []);

  const getDeadlineInfo = (deadline) => {
    if (!deadline) return null;
    const d = new Date(deadline);
    const diff = d - new Date();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const isExpired = diff < 0;
    const isClose = diff > 0 && diff < 24 * 60 * 60 * 1000;
    return { d, diff, hours, isExpired, isClose };
  };

  const canStart = (a) => {
    const info = getDeadlineInfo(a.deadline);
    const expired = info?.isExpired;
    const used = a.jumlah_percobaan >= a.max_retake;
    return !expired && !used && a.status_terakhir !== 'lulus';
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ujian</Text>
        <Text style={styles.headerSub}>{assessments.length} assessment tersedia</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={Colors.primary} />}
        contentContainerStyle={styles.list}
      >
        {assessments.map(a => {
          const info = getDeadlineInfo(a.deadline);
          const cfg = STATUS_CONFIG[a.status_terakhir || 'null'];
          const sisaPercobaan = a.max_retake - (a.jumlah_percobaan || 0);
          const bisa = canStart(a);

          return (
            <Card key={a.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.mapelDot, { backgroundColor: a.warna_hex }]} />
                <Text style={styles.mapelName}>{a.nama_mapel}</Text>
                <View style={[styles.statusBadge, { backgroundColor: cfg.color + '20' }]}>
                  <Ionicons name={cfg.icon} size={12} color={cfg.color} />
                  <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
              </View>

              <Text style={styles.judul}>{a.judul}</Text>
              <Text style={styles.namaModul}>{a.nama_modul}</Text>

              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={14} color={Colors.muted} />
                  <Text style={styles.metaText}>{a.durasi_menit} menit</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="refresh-outline" size={14} color={Colors.muted} />
                  <Text style={styles.metaText}>{sisaPercobaan} percobaan tersisa</Text>
                </View>
                {a.skor_terbaik != null && (
                  <View style={styles.metaItem}>
                    <Ionicons name="star-outline" size={14} color={Colors.muted} />
                    <Text style={styles.metaText}>Skor: {parseFloat(a.skor_terbaik).toFixed(0)}</Text>
                  </View>
                )}
              </View>

              {a.deadline && (
                <View style={styles.deadlineRow}>
                  <Ionicons
                    name="calendar-outline"
                    size={13}
                    color={info?.isClose ? Colors.danger : info?.isExpired ? Colors.muted : Colors.muted}
                  />
                  <Text style={[styles.deadlineText, info?.isClose && { color: Colors.danger }, info?.isExpired && { color: Colors.muted }]}>
                    {info?.isExpired
                      ? 'Sudah lewat deadline'
                      : info?.isClose
                        ? `⏰ ${info.hours} jam lagi`
                        : `Deadline: ${new Date(a.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`
                    }
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.startBtn, !bisa && styles.startBtnDisabled, { backgroundColor: bisa ? Colors.primary : Colors.border }]}
                onPress={() => bisa && router.push(`/assessment/${a.id}`)}
                disabled={!bisa}
                activeOpacity={0.8}
              >
                <Text style={[styles.startBtnText, !bisa && { color: Colors.muted }]}>
                  {info?.isExpired
                    ? 'Deadline Habis'
                    : a.status_terakhir === 'lulus'
                      ? '✓ Sudah Lulus'
                      : sisaPercobaan <= 0
                        ? 'Batas Percobaan Habis'
                        : a.status_terakhir === 'remedial'
                          ? '🔄 Ikuti Remedial'
                          : '▶ Mulai Ujian'
                  }
                </Text>
              </TouchableOpacity>
            </Card>
          );
        })}
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 16, paddingBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.text },
  headerSub: { fontSize: 13, color: Colors.muted, marginTop: 2 },
  list: { paddingHorizontal: 16, gap: 14, paddingTop: 8 },
  card: { padding: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  mapelDot: { width: 10, height: 10, borderRadius: 5 },
  mapelName: { fontSize: 12, color: Colors.muted, flex: 1 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '600' },
  judul: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 2 },
  namaModul: { fontSize: 12, color: Colors.muted, marginBottom: 12 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: Colors.muted },
  deadlineRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 14 },
  deadlineText: { fontSize: 12, color: Colors.muted },
  startBtn: { paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  startBtnDisabled: {},
  startBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
