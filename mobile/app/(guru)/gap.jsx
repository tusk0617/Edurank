import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  RefreshControl, TouchableOpacity, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { getGuruGap, getGuruGapSiswa } from '../../services/api';
import Colors from '../../constants/Colors';

const THRESHOLD_PERHATIAN = 60;

export default function GuruGap() {
  const [data, setData] = useState(null);
  const [siswaData, setSiswaData] = useState([]);
  const [activeTab, setActiveTab] = useState('soal');
  const [filterPerhatian, setFilterPerhatian] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [gapRes, siswaRes] = await Promise.all([getGuruGap(), getGuruGapSiswa()]);
      setData(gapRes.data);
      setSiswaData(siswaRes.data);
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

  // warna untuk persen-salah (lebih tinggi = lebih buruk)
  const getBarColor = (persen) => {
    if (persen >= 60) return Colors.danger;
    if (persen >= 40) return Colors.warning;
    return Colors.success;
  };

  // warna untuk capaian siswa (lebih tinggi = lebih baik)
  const getCapaianColor = (persen) => {
    if (persen >= THRESHOLD_PERHATIAN) return Colors.success;
    if (persen >= 40) return Colors.warning;
    return Colors.danger;
  };

  const maxPersen = data?.per_mapel?.length
    ? Math.max(...data.per_mapel.map(m => m.persen_salah || 0), 1)
    : 1;

  const filteredSiswa = filterPerhatian
    ? siswaData.filter(s => s.perlu_perhatian)
    : siswaData;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Tab switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'soal' && styles.tabActive]}
          onPress={() => setActiveTab('soal')}
        >
          <Text style={[styles.tabText, activeTab === 'soal' && styles.tabTextActive]}>Analisis Soal</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'siswa' && styles.tabActive]}
          onPress={() => setActiveTab('siswa')}
        >
          <Text style={[styles.tabText, activeTab === 'siswa' && styles.tabTextActive]}>Analisis Murid</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'soal' ? (
        /* ===== TAB ANALISIS SOAL (tidak berubah) ===== */
        <ScrollView
          style={styles.container}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={Colors.primary} />}
          showsVerticalScrollIndicator={false}
        >
          {(!data || !data.per_mapel?.length) ? (
            <View style={[styles.center, { paddingTop: 60 }]}>
              <Text style={styles.emptyText}>Belum ada data jawaban siswa</Text>
            </View>
          ) : (
            <>
              <Text style={styles.pageTitle}>Gap Analisis</Text>
              <Text style={styles.pageSubtitle}>Persentase kesalahan siswa per mata pelajaran</Text>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Persentase Jawaban Salah per Mapel</Text>
                {data.per_mapel.map((item, idx) => (
                  <View key={idx} style={styles.barRow}>
                    <Text style={styles.barLabel} numberOfLines={1}>{item.mapel}</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${(item.persen_salah / maxPersen) * 100}%`, backgroundColor: getBarColor(parseFloat(item.persen_salah)) }]} />
                    </View>
                    <Text style={[styles.barPct, { color: getBarColor(parseFloat(item.persen_salah)) }]}>{item.persen_salah}%</Text>
                  </View>
                ))}
                <View style={styles.legendRow}>
                  <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: Colors.danger }]} /><Text style={styles.legendText}>{'≥60% (Kritis)'}</Text></View>
                  <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: Colors.warning }]} /><Text style={styles.legendText}>{'≥40% (Perlu perhatian)'}</Text></View>
                  <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: Colors.success }]} /><Text style={styles.legendText}>{'<40% (Baik)'}</Text></View>
                </View>
              </View>

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
                          <Text style={styles.soalStatText}>{item.total_salah}/{item.total_jawaban} salah</Text>
                          <Text style={[styles.soalPct, { color: getBarColor(parseFloat(item.persen_salah)) }]}>{item.persen_salah}%</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {data.ringkasan && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Ringkasan Data</Text>
                  <View style={styles.statsGrid}>
                    <View style={styles.statBox}><Text style={styles.statNum}>{data.ringkasan.total_siswa}</Text><Text style={styles.statLabel}>Siswa</Text></View>
                    <View style={styles.statBox}><Text style={styles.statNum}>{data.ringkasan.total_soal}</Text><Text style={styles.statLabel}>Total Soal</Text></View>
                    <View style={styles.statBox}><Text style={styles.statNum}>{data.ringkasan.total_jawaban}</Text><Text style={styles.statLabel}>Total Jawaban</Text></View>
                  </View>
                </View>
              )}
            </>
          )}
          <View style={{ height: 30 }} />
        </ScrollView>
      ) : (
        /* ===== TAB ANALISIS MURID ===== */
        <View style={{ flex: 1 }}>
          {/* Filter */}
          <View style={styles.filterRow}>
            <TouchableOpacity
              style={[styles.filterBtn, !filterPerhatian && styles.filterBtnActive]}
              onPress={() => setFilterPerhatian(false)}
            >
              <Text style={[styles.filterBtnText, !filterPerhatian && styles.filterBtnTextActive]}>
                Semua ({siswaData.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterBtn, filterPerhatian && styles.filterBtnDanger]}
              onPress={() => setFilterPerhatian(true)}
            >
              <Text style={[styles.filterBtnText, filterPerhatian && styles.filterBtnTextActive]}>
                Perlu Perhatian ({siswaData.filter(s => s.perlu_perhatian).length})
              </Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={filteredSiswa}
            keyExtractor={item => item.user_id.toString()}
            contentContainerStyle={styles.siswaList}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={Colors.primary} />}
            ListEmptyComponent={
              <View style={[styles.center, { paddingTop: 60 }]}>
                <Text style={styles.emptyText}>
                  {filterPerhatian ? 'Semua siswa dalam kondisi baik' : 'Belum ada data siswa'}
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const persen = parseFloat(item.persentase_capaian) || 0;
              const color = getCapaianColor(persen);
              return (
                <View style={styles.siswaCard}>
                  <View style={styles.siswaHeader}>
                    <Text style={styles.siswaNama} numberOfLines={1}>{item.nama}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: item.perlu_perhatian ? Colors.danger + '20' : Colors.success + '20' }]}>
                      <Text style={[styles.statusBadgeText, { color: item.perlu_perhatian ? Colors.danger : Colors.success }]}>
                        {item.perlu_perhatian ? 'Perlu Perhatian' : 'Baik'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.siswaPoin}>
                    {item.poin_terkumpul} / {item.total_poin_seharusnya} poin
                    {parseInt(item.total_jawaban) === 0 && (
                      <Text style={styles.belumText}> — belum mengerjakan</Text>
                    )}
                  </Text>
                  <View style={styles.capaianRow}>
                    <View style={styles.capaianTrack}>
                      <View style={[styles.capaianFill, { width: `${Math.min(persen, 100)}%`, backgroundColor: color }]} />
                    </View>
                    <Text style={[styles.capaianPct, { color }]}>{persen}%</Text>
                  </View>
                </View>
              );
            }}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  emptyText: { color: Colors.muted, fontSize: 15 },

  // Tab switcher
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: { flex: 1, paddingVertical: 13, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: Colors.secondary },
  tabText: { fontSize: 13, fontWeight: '600', color: Colors.muted },
  tabTextActive: { color: Colors.secondary },

  // Analisis Soal
  container: { flex: 1, padding: 20 },
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

  // Analisis Murid
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterBtn: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.card,
  },
  filterBtnActive: { backgroundColor: Colors.secondary, borderColor: Colors.secondary },
  filterBtnDanger: { backgroundColor: Colors.danger, borderColor: Colors.danger },
  filterBtnText: { fontSize: 12, fontWeight: '600', color: Colors.muted },
  filterBtnTextActive: { color: '#fff' },
  siswaList: { paddingHorizontal: 16, paddingBottom: 24 },
  siswaCard: { backgroundColor: Colors.card, borderRadius: 14, padding: 14, marginBottom: 10, elevation: 2 },
  siswaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  siswaNama: { fontSize: 14, fontWeight: '700', color: Colors.text, flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  siswaPoin: { fontSize: 13, color: Colors.muted, marginBottom: 8 },
  belumText: { fontStyle: 'italic', color: Colors.muted },
  capaianRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  capaianTrack: { flex: 1, height: 8, backgroundColor: Colors.background, borderRadius: 4, overflow: 'hidden' },
  capaianFill: { height: '100%', borderRadius: 4 },
  capaianPct: { width: 42, fontSize: 12, fontWeight: '700', textAlign: 'right' },
});
