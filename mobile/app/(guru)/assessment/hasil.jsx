import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, ActivityIndicator, StyleSheet, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { getGuruAssessmentHasil } from '../../../services/api';
import Colors from '../../../constants/Colors';

function fmtDurasi(detik) {
  if (!detik) return '-';
  const m = Math.floor(detik / 60);
  const s = detik % 60;
  return `${m}m ${s}s`;
}

function fmtWaktu(str) {
  if (!str) return '-';
  return new Date(str).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export default function HasilAssessment() {
  const { assessmentId, judulAssessment } = useLocalSearchParams();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await getGuruAssessmentHasil(assessmentId);
      setData(res.data);
    } catch { setData(null); }
    finally { setLoading(false); }
  }, [assessmentId]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const rataRata = data?.hasil?.length
    ? Math.round(data.hasil.reduce((sum, h) => sum + parseFloat(h.skor || 0), 0) / data.hasil.length)
    : 0;

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle} numberOfLines={1}>{judulAssessment || data?.assessment?.judul}</Text>
          <Text style={s.headerSub}>Hasil Assessment</Text>
        </View>
      </View>

      {/* Ringkasan */}
      {data?.hasil?.length > 0 && (
        <View style={s.summaryRow}>
          <View style={s.summaryCard}>
            <Text style={s.summaryNum}>{data.hasil.length}</Text>
            <Text style={s.summaryLabel}>Peserta</Text>
          </View>
          <View style={s.summaryCard}>
            <Text style={[s.summaryNum, { color: Colors.primary }]}>{rataRata}</Text>
            <Text style={s.summaryLabel}>Rata-rata</Text>
          </View>
          <View style={s.summaryCard}>
            <Text style={[s.summaryNum, { color: Colors.success }]}>
              {data.hasil.filter(h => parseFloat(h.skor) >= 60).length}
            </Text>
            <Text style={s.summaryLabel}>≥60</Text>
          </View>
          <View style={s.summaryCard}>
            <Text style={[s.summaryNum, { color: Colors.danger }]}>
              {data.hasil.filter(h => (h.total_pelanggaran || 0) > 0).length}
            </Text>
            <Text style={s.summaryLabel}>Pelanggaran</Text>
          </View>
        </View>
      )}

      <FlatList
        data={data?.hasil || []}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="people-outline" size={48} color={Colors.border} />
            <Text style={s.emptyText}>Belum ada siswa yang mengumpulkan</Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const skor = Math.round(parseFloat(item.skor) || 0);
          const skorColor = skor >= 80 ? Colors.success : skor >= 60 ? Colors.warning : Colors.danger;
          return (
            <View style={s.card}>
              <View style={s.cardLeft}>
                <View style={s.rankBadge}>
                  <Text style={s.rankText}>{index + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.namaText}>{item.nama}</Text>
                  <Text style={s.usernameText}>{item.username}</Text>
                  <View style={s.metaRow}>
                    <View style={s.metaItem}>
                      <Ionicons name="time-outline" size={12} color={Colors.muted} />
                      <Text style={s.metaText}>{fmtDurasi(item.durasi_detik)}</Text>
                    </View>
                    <View style={s.metaItem}>
                      <Ionicons name="calendar-outline" size={12} color={Colors.muted} />
                      <Text style={s.metaText}>{fmtWaktu(item.waktu_selesai)}</Text>
                    </View>
                    {item.total_pelanggaran > 0 && (
                      <View style={[s.metaItem, { backgroundColor: '#FEF2F2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }]}>
                        <Ionicons name="warning-outline" size={12} color={Colors.danger} />
                        <Text style={[s.metaText, { color: Colors.danger, fontWeight: '700' }]}>{item.total_pelanggaran}x</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
              <Text style={[s.skorText, { color: skorColor }]}>{skor}</Text>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, paddingTop: 12, backgroundColor: Colors.card, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { fontSize: 16, fontWeight: '800', color: Colors.text },
  headerSub: { fontSize: 11, color: Colors.muted, marginTop: 1 },
  summaryRow: { flexDirection: 'row', padding: 12, gap: 8, backgroundColor: Colors.card, borderBottomWidth: 1, borderBottomColor: Colors.border },
  summaryCard: { flex: 1, alignItems: 'center', paddingVertical: 8, backgroundColor: Colors.background, borderRadius: 10 },
  summaryNum: { fontSize: 22, fontWeight: '800', color: Colors.text },
  summaryLabel: { fontSize: 10, color: Colors.muted, marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { color: Colors.muted, fontSize: 14 },
  card: { backgroundColor: Colors.card, borderRadius: 12, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', elevation: 2 },
  cardLeft: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  rankBadge: { width: 30, height: 30, borderRadius: 8, backgroundColor: Colors.primary + '20', justifyContent: 'center', alignItems: 'center' },
  rankText: { fontSize: 13, fontWeight: '800', color: Colors.primary },
  namaText: { fontSize: 14, fontWeight: '700', color: Colors.text },
  usernameText: { fontSize: 11, color: Colors.muted, marginTop: 1 },
  metaRow: { flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 11, color: Colors.muted },
  skorText: { fontSize: 28, fontWeight: '800' },
});
