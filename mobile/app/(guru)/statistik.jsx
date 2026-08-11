import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  RefreshControl, TouchableOpacity, FlatList, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getGuruStatistikSoal, getGuruGapSiswa, getGuruStatistikSiswa } from '../../services/api';
import Colors from '../../constants/Colors';

const THRESHOLD_PERHATIAN = 65;
const THRESHOLD_BAIK = 80;

const getKategoriCfg = (kategori) => {
  if (kategori === 'baik') return { color: Colors.success, label: 'Baik' };
  if (kategori === 'cukup') return { color: Colors.warning, label: 'Cukup' };
  return { color: Colors.danger, label: 'Perlu Perhatian' };
};

const getCapaianColor = (persen) => {
  if (persen >= THRESHOLD_BAIK) return Colors.success;
  if (persen >= THRESHOLD_PERHATIAN) return Colors.warning;
  return Colors.danger;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function GuruStatistik() {
  const [activeTab, setActiveTab] = useState('soal');
  const [soalData, setSoalData] = useState([]);
  const [siswaData, setSiswaData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal detail per siswa
  const [selectedSiswa, setSelectedSiswa] = useState(null);
  const [detailSiswa, setDetailSiswa] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [soalRes, siswaRes] = await Promise.all([
        getGuruStatistikSoal(),
        getGuruGapSiswa(),
      ]);
      setSoalData(soalRes.data);
      setSiswaData(siswaRes.data.map(s => {
        const persen = parseFloat(s.persentase_capaian) || 0;
        const kategori = s.kategori || (persen >= THRESHOLD_BAIK ? 'baik' : persen >= THRESHOLD_PERHATIAN ? 'cukup' : 'perlu_perhatian');
        return { ...s, kategori };
      }));
    } catch {
      setSoalData([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const openDetailSiswa = async (siswa) => {
    setSelectedSiswa(siswa);
    setModalVisible(true);
    setLoadingDetail(true);
    setDetailSiswa([]);
    try {
      const res = await getGuruStatistikSiswa(siswa.user_id);
      // Group by sesi_id
      const grouped = {};
      res.data.forEach(row => {
        if (!grouped[row.sesi_id]) {
          grouped[row.sesi_id] = {
            sesi_id: row.sesi_id,
            assessment: row.assessment,
            waktu_selesai: row.waktu_selesai,
            skor: row.skor,
            percobaan_ke: row.percobaan_ke,
            status: row.status,
            jawaban: [],
          };
        }
        grouped[row.sesi_id].jawaban.push({
          soal_id: row.soal_id,
          pertanyaan: row.pertanyaan,
          jawaban_dipilih: row.jawaban_dipilih,
          benar: row.benar,
          jawaban_benar: row.jawaban_benar,
        });
      });
      const sesiList = Object.values(grouped).sort(
        (a, b) => new Date(b.waktu_selesai) - new Date(a.waktu_selesai)
      );
      setDetailSiswa(sesiList);
    } catch {
      setDetailSiswa([]);
    } finally {
      setLoadingDetail(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const top5 = soalData.slice(0, 5);

  const renderSoalItem = (item, index, isTop5 = false) => {
    const persen = parseFloat(item.persen_benar) || 0;
    const color = getCapaianColor(persen);
    return (
      <View key={item.id} style={[styles.soalCard, isTop5 && styles.soalCardTop]}>
        <View style={styles.soalCardHeader}>
          {isTop5 && (
            <View style={[styles.rankBadge, { backgroundColor: Colors.danger }]}>
              <Text style={styles.rankText}>{index + 1}</Text>
            </View>
          )}
          <Text style={styles.soalText} numberOfLines={3}>{item.pertanyaan}</Text>
        </View>
        <View style={styles.soalMeta}>
          <View style={[styles.mapelPill, { backgroundColor: (item.warna_hex || Colors.primary) + '20' }]}>
            <Text style={[styles.mapelPillText, { color: item.warna_hex || Colors.primary }]}>{item.mapel}</Text>
          </View>
          <Text style={styles.dijawabText}>{item.total_dijawab} jawaban</Text>
        </View>
        <View style={styles.statsRow}>
          {/* Berhasil */}
          <View style={styles.statBlock}>
            <Text style={styles.statBlockLabel}>Berhasil</Text>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${Math.min(persen, 100)}%`, backgroundColor: Colors.success }]} />
            </View>
            <Text style={[styles.statBlockPct, { color: Colors.success }]}>{item.persen_benar}%</Text>
          </View>
          {/* Gagal */}
          <View style={styles.statBlock}>
            <Text style={styles.statBlockLabel}>Gagal</Text>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${Math.min(parseFloat(item.persen_salah) || 0, 100)}%`, backgroundColor: Colors.danger }]} />
            </View>
            <Text style={[styles.statBlockPct, { color: Colors.danger }]}>{item.persen_salah}%</Text>
          </View>
        </View>
        <View style={styles.soalFooter}>
          <Text style={styles.benarSalahText}>
            {item.total_benar} benar · {item.total_salah} salah
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Tab switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'soal' && styles.tabActive]}
          onPress={() => setActiveTab('soal')}
        >
          <Text style={[styles.tabText, activeTab === 'soal' && styles.tabTextActive]}>Per Soal</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'siswa' && styles.tabActive]}
          onPress={() => setActiveTab('siswa')}
        >
          <Text style={[styles.tabText, activeTab === 'siswa' && styles.tabTextActive]}>Per Siswa</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'soal' ? (
        /* ===== TAB PER SOAL ===== */
        <ScrollView
          style={styles.container}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={Colors.primary} />}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.pageTitle}>Statistik Soal</Text>
          <Text style={styles.pageSubtitle}>Persentase keberhasilan & kegagalan per soal</Text>

          {soalData.length === 0 ? (
            <View style={[styles.center, { paddingTop: 60 }]}>
              <Text style={styles.emptyText}>Belum ada data jawaban siswa</Text>
            </View>
          ) : (
            <>
              {/* Top 5 soal tersulit */}
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="alert-circle" size={18} color={Colors.danger} />
                  <Text style={[styles.sectionTitle, { color: Colors.danger, marginLeft: 6 }]}>
                    Top 5 Soal Tingkat Keberhasilan Terendah
                  </Text>
                </View>
                <Text style={styles.sectionHint}>Soal-soal yang paling banyak dijawab salah oleh siswa</Text>
                {top5.map((item, idx) => renderSoalItem(item, idx, true))}
              </View>

              {/* Semua soal */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Semua Soal</Text>
                <Text style={styles.sectionHint}>Diurutkan: keberhasilan terendah → tertinggi</Text>
                {soalData.map((item, idx) => renderSoalItem(item, idx, false))}
              </View>
            </>
          )}
          <View style={{ height: 30 }} />
        </ScrollView>
      ) : (
        /* ===== TAB PER SISWA ===== */
        <FlatList
          data={siswaData}
          keyExtractor={item => item.user_id.toString()}
          contentContainerStyle={styles.siswaList}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={Colors.primary} />}
          ListHeaderComponent={
            <View style={{ paddingTop: 16, paddingBottom: 4 }}>
              <Text style={styles.pageTitle}>Statistik Siswa</Text>
              <Text style={styles.pageSubtitle}>Tap siswa untuk melihat detail jawaban per soal</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={[styles.center, { paddingTop: 60 }]}>
              <Text style={styles.emptyText}>Belum ada data siswa</Text>
            </View>
          }
          renderItem={({ item }) => {
            const persen = parseFloat(item.persentase_capaian) || 0;
            const color = getCapaianColor(persen);
            const cfg = getKategoriCfg(item.kategori);
            const belum = parseInt(item.total_jawaban) === 0;
            return (
              <TouchableOpacity
                style={styles.siswaCard}
                onPress={() => !belum && openDetailSiswa(item)}
                activeOpacity={belum ? 1 : 0.75}
              >
                <View style={styles.siswaHeader}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>{(item.nama || '?')[0].toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.siswaNama} numberOfLines={1}>{item.nama}</Text>
                    <Text style={styles.siswaPoin}>
                      {belum ? 'Belum mengerjakan' : `${item.poin_terkumpul} / ${item.total_poin_seharusnya} poin`}
                    </Text>
                  </View>
                  <View style={styles.siswaRight}>
                    <View style={[styles.statusBadge, { backgroundColor: cfg.color + '22' }]}>
                      <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                    {!belum && <Ionicons name="chevron-forward" size={14} color={Colors.muted} style={{ marginTop: 4 }} />}
                  </View>
                </View>
                {!belum && (
                  <View style={styles.capaianRow}>
                    <View style={styles.capaianTrack}>
                      <View style={[styles.capaianFill, { width: `${Math.min(persen, 100)}%`, backgroundColor: color }]} />
                    </View>
                    <Text style={[styles.capaianPct, { color }]}>{persen}%</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* ===== MODAL DETAIL JAWABAN SISWA ===== */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
            <View style={{ flex: 1, marginHorizontal: 12 }}>
              <Text style={styles.modalTitle} numberOfLines={1}>
                {selectedSiswa?.nama}
              </Text>
              <Text style={styles.modalSubtitle}>Detail Jawaban per Soal</Text>
            </View>
          </View>

          {loadingDetail ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          ) : detailSiswa.length === 0 ? (
            <View style={styles.center}>
              <Ionicons name="document-outline" size={48} color={Colors.muted} style={{ marginBottom: 8 }} />
              <Text style={styles.emptyText}>Belum ada jawaban tercatat</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
              {detailSiswa.map((sesi) => {
                const benarCount = sesi.jawaban.filter(j => j.benar).length;
                const totalCount = sesi.jawaban.length;
                const statusColor = sesi.status === 'lulus' ? Colors.success : sesi.status === 'remedial' ? Colors.warning : Colors.danger;
                return (
                  <View key={sesi.sesi_id} style={styles.sesiCard}>
                    <View style={styles.sesiHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.sesiJudul} numberOfLines={1}>{sesi.assessment}</Text>
                        <Text style={styles.sesiMeta}>
                          {formatDate(sesi.waktu_selesai)} · Percobaan ke-{sesi.percobaan_ke}
                        </Text>
                      </View>
                      <View style={styles.sesiRight}>
                        <Text style={[styles.sesiSkor, { color: statusColor }]}>{Math.round(parseFloat(sesi.skor) || 0)}%</Text>
                        <View style={[styles.statusPill, { backgroundColor: statusColor + '22' }]}>
                          <Text style={[styles.statusPillText, { color: statusColor }]}>
                            {sesi.status === 'lulus' ? 'Lulus' : sesi.status === 'remedial' ? 'Remedial' : 'Tidak Lulus'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <Text style={styles.sesiRingkasan}>
                      {benarCount}/{totalCount} benar · {totalCount - benarCount} salah
                    </Text>

                    {sesi.jawaban.map((j, idx) => (
                      <View key={j.soal_id} style={[styles.jawabanRow, idx < sesi.jawaban.length - 1 && styles.jawabanBorder]}>
                        <View style={[styles.benarIcon, { backgroundColor: j.benar ? Colors.success + '22' : Colors.danger + '22' }]}>
                          <Ionicons
                            name={j.benar ? 'checkmark' : 'close'}
                            size={14}
                            color={j.benar ? Colors.success : Colors.danger}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.jawabanPertanyaan} numberOfLines={2}>{j.pertanyaan}</Text>
                          <View style={styles.jawabanPilihan}>
                            <Text style={[styles.jawabanLabel, { color: j.benar ? Colors.success : Colors.danger }]}>
                              Dijawab: {j.jawaban_dipilih?.toUpperCase()}
                            </Text>
                            {!j.benar && (
                              <Text style={[styles.jawabanLabel, { color: Colors.success, marginLeft: 12 }]}>
                                Benar: {j.jawaban_benar?.toUpperCase()}
                              </Text>
                            )}
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                );
              })}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  emptyText: { color: Colors.muted, fontSize: 15, textAlign: 'center' },

  tabContainer: { flexDirection: 'row', backgroundColor: Colors.card, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tab: { flex: 1, paddingVertical: 13, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: Colors.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: Colors.muted },
  tabTextActive: { color: Colors.primary },

  container: { flex: 1, padding: 16 },
  pageTitle: { fontSize: 20, fontWeight: '800', color: Colors.text, marginBottom: 2 },
  pageSubtitle: { fontSize: 12, color: Colors.muted, marginBottom: 16 },

  section: { backgroundColor: Colors.card, borderRadius: 16, padding: 16, marginBottom: 16, elevation: 2 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.text },
  sectionHint: { fontSize: 11, color: Colors.muted, marginBottom: 12 },

  // Soal card
  soalCard: {
    backgroundColor: Colors.background, borderRadius: 12, padding: 12,
    marginBottom: 10, borderWidth: 1, borderColor: Colors.border,
  },
  soalCardTop: { borderColor: Colors.danger + '60', borderWidth: 1.5 },
  soalCardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  rankBadge: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  rankText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  soalText: { flex: 1, fontSize: 12, color: Colors.text, lineHeight: 17 },
  soalMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  mapelPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  mapelPillText: { fontSize: 10, fontWeight: '700' },
  dijawabText: { fontSize: 11, color: Colors.muted },

  statsRow: { gap: 6, marginBottom: 6 },
  statBlock: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statBlockLabel: { width: 52, fontSize: 11, color: Colors.muted, fontWeight: '500' },
  barTrack: { flex: 1, height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  statBlockPct: { width: 38, fontSize: 12, fontWeight: '700', textAlign: 'right' },

  soalFooter: { marginTop: 4 },
  benarSalahText: { fontSize: 11, color: Colors.muted },

  // Siswa list
  siswaList: { paddingHorizontal: 16, paddingBottom: 24 },
  siswaCard: {
    backgroundColor: Colors.card, borderRadius: 14, padding: 14,
    marginBottom: 10, elevation: 2,
  },
  siswaHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  avatarCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primary + '20', justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '800', color: Colors.primary },
  siswaNama: { fontSize: 14, fontWeight: '700', color: Colors.text },
  siswaPoin: { fontSize: 12, color: Colors.muted, marginTop: 1 },
  siswaRight: { alignItems: 'flex-end' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  statusText: { fontSize: 10, fontWeight: '700' },
  capaianRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  capaianTrack: { flex: 1, height: 7, backgroundColor: Colors.background, borderRadius: 4, overflow: 'hidden' },
  capaianFill: { height: '100%', borderRadius: 4 },
  capaianPct: { width: 40, fontSize: 12, fontWeight: '700', textAlign: 'right' },

  // Modal
  modalSafe: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    backgroundColor: Colors.card, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  closeBtn: { padding: 4 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  modalSubtitle: { fontSize: 11, color: Colors.muted, marginTop: 1 },

  // Sesi detail
  sesiCard: {
    backgroundColor: Colors.card, borderRadius: 14, padding: 14,
    marginBottom: 12, elevation: 2,
  },
  sesiHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  sesiJudul: { fontSize: 14, fontWeight: '700', color: Colors.text },
  sesiMeta: { fontSize: 11, color: Colors.muted, marginTop: 2 },
  sesiRight: { alignItems: 'flex-end', marginLeft: 12 },
  sesiSkor: { fontSize: 20, fontWeight: '800' },
  statusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginTop: 2 },
  statusPillText: { fontSize: 10, fontWeight: '700' },
  sesiRingkasan: { fontSize: 12, color: Colors.muted, marginBottom: 12, marginTop: 4 },

  jawabanRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8 },
  jawabanBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  benarIcon: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', flexShrink: 0, marginTop: 1 },
  jawabanPertanyaan: { fontSize: 12, color: Colors.text, lineHeight: 17, marginBottom: 4 },
  jawabanPilihan: { flexDirection: 'row' },
  jawabanLabel: { fontSize: 11, fontWeight: '600' },
});
