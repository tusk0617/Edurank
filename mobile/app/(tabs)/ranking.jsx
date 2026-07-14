import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  FlatList, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  getRankingIndividu, getRankingSekolah, getRankingWilayah,
  getRankingSaya, getGapAnalisis,
} from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/ui/Card';
import Colors from '../../constants/Colors';

const TABS = ['Individu', 'Sekolah', 'Wilayah'];
const PERIODE = ['Minggu', 'Bulan', 'Semua'];
const WILAYAH_LIST = ['Jakarta Selatan', 'Jakarta Utara', 'Jakarta Pusat', 'Jakarta Barat', 'Jakarta Timur'];

const getInitials = (nama) => {
  if (!nama) return '?';
  return nama.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
};

const AVATAR_COLORS = ['#378ADD', '#639922', '#EF9F27', '#E24B4A', '#8B5CF6', '#EC4899'];
const getAvatarColor = (str) => AVATAR_COLORS[(str?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

export default function RankingScreen() {
  const { user } = useAuth();
  const [tab, setTab] = useState(0);
  const [periode, setPeriode] = useState(2);
  const [data, setData] = useState({ individu: [], sekolah: [], wilayah: [] });
  const [myRank, setMyRank] = useState(null);
  const [gapData, setGapData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [gapLoading, setGapLoading] = useState(false);

  const periodeKey = PERIODE[periode].toLowerCase();

  const fetchData = useCallback(async () => {
    try {
      const [indRes, sklRes, wilRes, myRes] = await Promise.all([
        getRankingIndividu(periodeKey),
        getRankingSekolah(periodeKey),
        getRankingWilayah(),
        getRankingSaya(),
      ]);
      setData({ individu: indRes.data, sekolah: sklRes.data, wilayah: wilRes.data });
      setMyRank(myRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [periodeKey]);

  useEffect(() => { fetchData(); }, [periodeKey]);

  const fetchGap = async () => {
    if (gapData) return;
    setGapLoading(true);
    try {
      const res = await getGapAnalisis();
      setGapData(res.data);
    } catch (err) {
      Alert.alert('Error', 'Gagal memuat gap analisis');
    } finally {
      setGapLoading(false);
    }
  };

  const isGuruAdvisor = false;

  const maxWilayah = Math.max(...(data.wilayah.map(w => w.rata_poin) || [1]));

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Leaderboard</Text>
        {/* Periode */}
        <View style={styles.periodeRow}>
          {PERIODE.map((p, i) => (
            <TouchableOpacity
              key={p}
              style={[styles.periodeBtn, periode === i && styles.periodeBtnActive]}
              onPress={() => setPeriode(i)}
            >
              <Text style={[styles.periodeBtnText, periode === i && styles.periodeBtnTextActive]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {TABS.map((t, i) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === i && styles.tabActive]}
            onPress={() => setTab(i)}
          >
            <Text style={[styles.tabText, tab === i && styles.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
        {isGuruAdvisor && (
          <TouchableOpacity
            style={[styles.tab, styles.gapTab]}
            onPress={() => { setTab(3); fetchGap(); }}
          >
            <Text style={[styles.tabText, tab === 3 && styles.tabTextActive]}>Gap</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={Colors.primary} />}
        >
          {/* Tab: Individu */}
          {tab === 0 && (
            <View>
              {/* Podium */}
              {data.individu.length >= 3 && (
                <View style={styles.podium}>
                  {/* 2nd */}
                  <PodiumItem rank={2} user={data.individu[1]} height={90} />
                  {/* 1st */}
                  <PodiumItem rank={1} user={data.individu[0]} height={110} />
                  {/* 3rd */}
                  <PodiumItem rank={3} user={data.individu[2]} height={75} />
                </View>
              )}

              {/* List 4+ */}
              <View style={styles.listContainer}>
                {data.individu.slice(3).map((u, idx) => (
                  <View key={u.user_id} style={[styles.rankRow, u.user_id === user?.id && styles.myRankRow]}>
                    <Text style={styles.rankNum}>{idx + 4}</Text>
                    <View style={[styles.miniAvatar, { backgroundColor: getAvatarColor(u.nama) }]}>
                      <Text style={styles.miniAvatarText}>{getInitials(u.nama)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rankName}>{u.nama}</Text>
                      <Text style={styles.rankSekolah}>{u.sekolah}</Text>
                    </View>
                    <Text style={styles.rankPoin}>{u.total_poin}</Text>
                  </View>
                ))}
              </View>

              {/* My position */}
              {myRank && !data.individu.slice(0, 50).find(u => u.user_id === user?.id) && (
                <View style={styles.myRankSticky}>
                  <Ionicons name="person" size={14} color={Colors.primary} />
                  <Text style={styles.myRankText}>Posisi kamu: #{myRank.rank} ({myRank.total_poin} poin)</Text>
                </View>
              )}
            </View>
          )}

          {/* Tab: Sekolah */}
          {tab === 1 && (
            <View style={styles.listContainer}>
              {data.sekolah.map((s, idx) => (
                <Card key={s.sekolah_id} style={styles.sekolahCard}>
                  <View style={styles.sekolahRank}>
                    <Text style={styles.sekolahRankNum}>#{idx + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sekolahNama}>{s.nama_sekolah}</Text>
                    <Text style={styles.sekolahWilayah}>{s.wilayah}</Text>
                    <View style={styles.sekolahMeta}>
                      <Text style={styles.metaChip}>👤 {s.jumlah_siswa} siswa</Text>
                      <Text style={styles.metaChip}>⭐ {parseFloat(s.rata_poin).toFixed(0)} rata poin</Text>
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          )}

          {/* Tab: Wilayah */}
          {tab === 2 && (
            <View style={styles.listContainer}>
              <Text style={styles.sectionTitle}>Rata Poin per Wilayah</Text>
              {WILAYAH_LIST.map(wil => {
                const w = data.wilayah.find(x => x.wilayah === wil) || { rata_poin: 0, jumlah_siswa: 0 };
                const pct = maxWilayah > 0 ? (w.rata_poin / maxWilayah) * 100 : 0;
                return (
                  <View key={wil} style={styles.wilayahRow}>
                    <Text style={styles.wilayahLabel}>{wil.replace('Jakarta ', 'Jkt ')}</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${pct}%` }]} />
                    </View>
                    <Text style={styles.barValue}>{parseFloat(w.rata_poin).toFixed(0)}</Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* Tab: Gap Analysis */}
          {tab === 3 && isGuruAdvisor && (
            gapLoading ? (
              <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>
            ) : gapData ? (
              <GapAnalisisView data={gapData} />
            ) : null
          )}

          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function PodiumItem({ rank, user, height }) {
  const colors = { 1: '#EF9F27', 2: '#9CA3AF', 3: '#CD7C3E' };
  const color = colors[rank];
  return (
    <View style={[styles.podiumItem, rank === 1 && { marginBottom: 0 }]}>
      <View style={[styles.podiumAvatar, { backgroundColor: color }]}>
        <Text style={styles.podiumAvatarText}>{getInitials(user?.nama)}</Text>
      </View>
      <Text style={styles.podiumName} numberOfLines={1}>{user?.nama?.split(' ')[0]}</Text>
      <Text style={styles.podiumPoin}>{user?.total_poin}</Text>
      <View style={[styles.podiumBase, { height, backgroundColor: color + '30', borderColor: color }]}>
        <Text style={[styles.podiumRank, { color }]}>{rank === 1 ? '👑' : `#${rank}`}</Text>
      </View>
    </View>
  );
}

function GapAnalisisView({ data }) {
  const sekolahList = [...new Set(data.per_sekolah.map(x => x.nama_sekolah))];
  const mapelList = [...new Set(data.per_sekolah.map(x => x.mapel))];

  const getSkor = (sekolah, mapel) => {
    const item = data.per_sekolah.find(x => x.nama_sekolah === sekolah && x.mapel === mapel);
    return item ? parseFloat(item.rata_skor) : 0;
  };

  const getHeatColor = (skor) => {
    if (skor >= 75) return Colors.secondary;
    if (skor >= 55) return Colors.warning;
    return Colors.danger;
  };

  return (
    <View style={styles.listContainer}>
      {/* Summary Cards */}
      {data.summary?.sekolah_terbaik && (
        <View style={styles.summaryRow}>
          <Card style={[styles.summaryCard, { borderTopColor: Colors.secondary }]}>
            <Text style={styles.summaryLabel}>🏆 Terbaik</Text>
            <Text style={styles.summaryValue} numberOfLines={2}>{data.summary.sekolah_terbaik.nama}</Text>
            <Text style={styles.summaryScore}>{data.summary.sekolah_terbaik.avg?.toFixed(0)} avg</Text>
          </Card>
          <Card style={[styles.summaryCard, { borderTopColor: Colors.danger }]}>
            <Text style={styles.summaryLabel}>⚠ Perlu Perhatian</Text>
            <Text style={styles.summaryValue} numberOfLines={2}>{data.summary.sekolah_terlemah?.nama}</Text>
            <Text style={styles.summaryScore}>{data.summary.sekolah_terlemah?.avg?.toFixed(0)} avg</Text>
          </Card>
        </View>
      )}

      {/* Bar Chart per Mapel */}
      <Text style={styles.sectionTitle}>Rata Skor per Mapel & Sekolah</Text>
      {mapelList.map(mapel => (
        <Card key={mapel} style={{ marginBottom: 12 }}>
          <Text style={styles.chartMapel}>{mapel}</Text>
          {sekolahList.map(skl => {
            const skor = getSkor(skl, mapel);
            return (
              <View key={skl} style={styles.chartRow}>
                <Text style={styles.chartLabel} numberOfLines={1}>{skl.replace('SMAN ', '').slice(0, 16)}</Text>
                <View style={styles.chartBarTrack}>
                  <View style={[styles.chartBar, { width: `${skor}%`, backgroundColor: getHeatColor(skor) }]} />
                </View>
                <Text style={[styles.chartScore, { color: getHeatColor(skor) }]}>{skor.toFixed(0)}</Text>
              </View>
            );
          })}
        </Card>
      ))}

      {/* Heatmap */}
      <Text style={styles.sectionTitle}>Heatmap Level Kesulitan</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={styles.heatHeaderRow}>
            <Text style={[styles.heatCell, styles.heatHeaderCell]}>Sekolah</Text>
            {[1, 2, 3].map(l => (
              <Text key={l} style={[styles.heatCell, styles.heatHeaderCell]}>Level {l}</Text>
            ))}
          </View>
          {sekolahList.map(skl => (
            <View key={skl} style={styles.heatRow}>
              <Text style={[styles.heatCell, { fontSize: 10, color: Colors.text }]} numberOfLines={2}>
                {skl.replace('SMAN ', '')}
              </Text>
              {[1, 2, 3].map(level => {
                const item = data.heatmap?.find(h => h.nama_sekolah === skl && h.level === level);
                const skor = item ? parseFloat(item.rata_skor) : 0;
                return (
                  <View key={level} style={[styles.heatCell, styles.heatValueCell, { backgroundColor: getHeatColor(skor) }]}>
                    <Text style={styles.heatValue}>{skor.toFixed(0)}</Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Siswa Berisiko */}
      {data.siswa_berisiko?.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { marginTop: 16 }]}>⚠ Siswa Berisiko (Rata Skor &lt; 60)</Text>
          {data.siswa_berisiko.map((s, i) => (
            <View key={i} style={styles.risikoRow}>
              <View style={[styles.miniAvatar, { backgroundColor: Colors.danger }]}>
                <Text style={styles.miniAvatarText}>{getInitials(s.nama)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.risikoNama}>{s.nama}</Text>
                <Text style={styles.risikoSekolah}>{s.nama_sekolah}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.risikoSkor, { color: Colors.danger }]}>{parseFloat(s.rata_skor).toFixed(0)}</Text>
                <Text style={styles.risikoMapel}>{s.mapel_lemah}</Text>
              </View>
            </View>
          ))}
        </>
      )}

      <TouchableOpacity style={styles.exportBtn} onPress={() => Alert.alert('Export', 'Laporan berhasil diexport (simulasi)')}>
        <Ionicons name="download-outline" size={18} color="#fff" />
        <Text style={styles.exportText}>Export Laporan</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  header: { padding: 16, paddingBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.text, marginBottom: 10 },
  periodeRow: { flexDirection: 'row', gap: 8 },
  periodeBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.card },
  periodeBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  periodeBtnText: { fontSize: 13, color: Colors.muted, fontWeight: '600' },
  periodeBtnTextActive: { color: '#fff' },
  tabRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.card, borderWidth: 1.5, borderColor: Colors.border },
  tabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  gapTab: { borderColor: Colors.warning },
  tabText: { fontSize: 13, color: Colors.muted, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  podium: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', paddingHorizontal: 24, paddingVertical: 16, gap: 8 },
  podiumItem: { alignItems: 'center', flex: 1 },
  podiumAvatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  podiumAvatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  podiumName: { fontSize: 11, fontWeight: '600', color: Colors.text, marginBottom: 2, textAlign: 'center' },
  podiumPoin: { fontSize: 12, color: Colors.muted, marginBottom: 4 },
  podiumBase: { width: '100%', borderRadius: 6, borderWidth: 2, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 6 },
  podiumRank: { fontSize: 18, fontWeight: '800' },
  listContainer: { paddingHorizontal: 16, gap: 8 },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.card, padding: 12, borderRadius: 10 },
  myRankRow: { backgroundColor: Colors.lightBlue },
  rankNum: { fontSize: 14, fontWeight: '700', color: Colors.muted, width: 24, textAlign: 'center' },
  miniAvatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  miniAvatarText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  rankName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  rankSekolah: { fontSize: 11, color: Colors.muted },
  rankPoin: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  myRankSticky: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.lightBlue, margin: 16, padding: 12, borderRadius: 10 },
  myRankText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  sekolahCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  sekolahRank: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary + '20', justifyContent: 'center', alignItems: 'center' },
  sekolahRankNum: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  sekolahNama: { fontSize: 14, fontWeight: '700', color: Colors.text },
  sekolahWilayah: { fontSize: 12, color: Colors.muted },
  sekolahMeta: { flexDirection: 'row', gap: 8, marginTop: 4 },
  metaChip: { fontSize: 11, color: Colors.muted },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 10 },
  wilayahRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  wilayahLabel: { fontSize: 11, color: Colors.text, width: 70 },
  barTrack: { flex: 1, height: 20, backgroundColor: Colors.border, borderRadius: 10, overflow: 'hidden' },
  barFill: { height: 20, backgroundColor: Colors.primary, borderRadius: 10 },
  barValue: { fontSize: 12, fontWeight: '700', color: Colors.primary, width: 32, textAlign: 'right' },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  summaryCard: { flex: 1, borderTopWidth: 3, padding: 12 },
  summaryLabel: { fontSize: 11, color: Colors.muted, marginBottom: 4 },
  summaryValue: { fontSize: 13, fontWeight: '700', color: Colors.text },
  summaryScore: { fontSize: 12, color: Colors.muted, marginTop: 2 },
  chartMapel: { fontSize: 13, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  chartRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  chartLabel: { fontSize: 10, color: Colors.muted, width: 70 },
  chartBarTrack: { flex: 1, height: 16, backgroundColor: Colors.border, borderRadius: 8, overflow: 'hidden' },
  chartBar: { height: 16, borderRadius: 8 },
  chartScore: { fontSize: 11, fontWeight: '700', width: 28, textAlign: 'right' },
  heatHeaderRow: { flexDirection: 'row' },
  heatRow: { flexDirection: 'row', alignItems: 'center' },
  heatCell: { width: 90, padding: 6, textAlign: 'center', fontSize: 11 },
  heatHeaderCell: { fontWeight: '700', color: Colors.muted, backgroundColor: Colors.background },
  heatValueCell: { height: 40, justifyContent: 'center', margin: 2, borderRadius: 6 },
  heatValue: { color: '#fff', fontWeight: '700', fontSize: 12, textAlign: 'center' },
  risikoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.card, padding: 12, borderRadius: 10, marginBottom: 6 },
  risikoNama: { fontSize: 14, fontWeight: '600', color: Colors.text },
  risikoSekolah: { fontSize: 11, color: Colors.muted },
  risikoSkor: { fontSize: 16, fontWeight: '800' },
  risikoMapel: { fontSize: 10, color: Colors.muted },
  exportBtn: { flexDirection: 'row', gap: 8, backgroundColor: Colors.primary, padding: 14, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 16 },
  exportText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
