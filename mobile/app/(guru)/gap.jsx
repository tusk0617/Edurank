import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { getGuruGap } from '../../services/api';
import Colors from '../../constants/Colors';

export default function GuruGap() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await getGuruGap();
      setData(res.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!data || !data.per_mapel?.length) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Belum ada data jawaban siswa</Text>
      </View>
    );
  }

  const maxPersen = Math.max(...data.per_mapel.map(m => m.persen_salah || 0), 1);

  const getBarColor = (persen) => {
    if (persen >= 60) return Colors.danger;
    if (persen >= 40) return Colors.warning;
    return Colors.success;
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>Gap Analisis</Text>
        <Text style={styles.pageSubtitle}>Persentase kesalahan siswa per mata pelajaran</Text>

        {/* Bar chart per mapel */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Persentase Jawaban Salah per Mapel</Text>
          {data.per_mapel.map((item, idx) => (
            <View key={idx} style={styles.barRow}>
              <Text style={styles.barLabel} numberOfLines={1}>{item.mapel}</Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${(item.persen_salah / maxPersen) * 100}%`,
                      backgroundColor: getBarColor(parseFloat(item.persen_salah)),
                    },
                  ]}
                />
              </View>
              <Text style={[styles.barPct, { color: getBarColor(parseFloat(item.persen_salah)) }]}>
                {item.persen_salah}%
              </Text>
            </View>
          ))}
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.danger }]} />
              <Text style={styles.legendText}>{'≥60% (Kritis)'}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.warning }]} />
              <Text style={styles.legendText}>{'≥40% (Perlu perhatian)'}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.success }]} />
              <Text style={styles.legendText}>{'<40% (Baik)'}</Text>
            </View>
          </View>
        </View>

        {/* Top 10 soal paling banyak salah */}
        {data.top_soal_salah?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Soal Paling Banyak Salah</Text>
            {data.top_soal_salah.map((item, idx) => (
              <View key={idx} style={styles.soalRow}>
                <View style={[styles.rankBadge, { backgroundColor: idx < 3 ? Colors.danger : Colors.warning }]}>
                  <Text style={styles.rankText}>{idx + 1}</Text>
                </View>
                <View style={styles.soalInfo}>
                  <Text style={styles.soalMapel}>{item.mapel} — {item.modul}</Text>
                  <Text style={styles.soalPertanyaan} numberOfLines={2}>{item.pertanyaan}</Text>
                  <View style={styles.soalStat}>
                    <Text style={styles.soalStatText}>
                      {item.total_salah}/{item.total_jawaban} salah
                    </Text>
                    <Text style={[styles.soalPct, { color: getBarColor(parseFloat(item.persen_salah)) }]}>
                      {item.persen_salah}%
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Ringkasan */}
        {data.ringkasan && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ringkasan Data</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statNum}>{data.ringkasan.total_siswa}</Text>
                <Text style={styles.statLabel}>Siswa</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNum}>{data.ringkasan.total_soal}</Text>
                <Text style={styles.statLabel}>Total Soal</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNum}>{data.ringkasan.total_jawaban}</Text>
                <Text style={styles.statLabel}>Total Jawaban</Text>
              </View>
            </View>
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  emptyText: { color: Colors.muted, fontSize: 15 },
  pageTitle: { fontSize: 22, fontWeight: '800', color: Colors.text },
  pageSubtitle: { fontSize: 13, color: Colors.muted, marginTop: 2, marginBottom: 20 },
  section: { backgroundColor: Colors.card, borderRadius: 16, padding: 16, marginBottom: 16, elevation: 2 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 14 },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  barLabel: { width: 90, fontSize: 12, color: Colors.text, fontWeight: '500' },
  barTrack: { flex: 1, height: 12, backgroundColor: Colors.background, borderRadius: 6, marginHorizontal: 8, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 6 },
  barPct: { width: 42, fontSize: 12, fontWeight: '700', textAlign: 'right' },
  legendRow: { marginTop: 12, gap: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, color: Colors.muted },
  soalRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  rankBadge: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 10, marginTop: 2 },
  rankText: { fontSize: 13, fontWeight: '800', color: '#fff' },
  soalInfo: { flex: 1 },
  soalMapel: { fontSize: 10, color: Colors.muted, fontWeight: '600', marginBottom: 2 },
  soalPertanyaan: { fontSize: 13, color: Colors.text, lineHeight: 18, marginBottom: 4 },
  soalStat: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  soalStatText: { fontSize: 11, color: Colors.muted },
  soalPct: { fontSize: 13, fontWeight: '700' },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  statBox: { alignItems: 'center' },
  statNum: { fontSize: 26, fontWeight: '800', color: Colors.text },
  statLabel: { fontSize: 11, color: Colors.muted, marginTop: 2 },
});
