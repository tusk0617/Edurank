import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getGuruLive } from '../../services/api';
import Colors from '../../constants/Colors';

const STATUS_CFG = {
  mengerjakan: { label: 'Mengerjakan', color: '#22C55E' },
  berpindah:   { label: 'Berpindah Soal', color: '#F59E0B' },
  keluar:      { label: 'Keluar Aplikasi', color: '#EF4444' },
  selesai:     { label: 'Selesai', color: '#6B7280' },
};

const FILTERS = [
  { key: 'semua',       label: 'Semua'      },
  { key: 'mengerjakan', label: 'Mengerjakan' },
  { key: 'berpindah',   label: 'Berpindah'  },
  { key: 'keluar',      label: 'Keluar'     },
  { key: 'selesai',     label: 'Selesai'    },
];

export default function LiveMonitorScreen() {
  const [data, setData]     = useState([]);
  const [filter, setFilter] = useState('semua');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await getGuruLive();
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 5000);
    return () => clearInterval(intervalRef.current);
  }, [fetchData]);

  const filtered = data.filter(s => {
    const matchFilter = filter === 'semua' || s.status === filter;
    const matchSearch = !search.trim() || s.nama.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const counts = {
    mengerjakan: data.filter(s => s.status === 'mengerjakan').length,
    berpindah:   data.filter(s => s.status === 'berpindah').length,
    keluar:      data.filter(s => s.status === 'keluar').length,
    selesai:     data.filter(s => s.status === 'selesai').length,
  };

  const formatTime = (secs) => {
    if (secs < 60) return `${secs}d lalu`;
    if (secs < 3600) return `${Math.floor(secs / 60)}m lalu`;
    return `${Math.floor(secs / 3600)}j lalu`;
  };

  const renderCard = ({ item: s }) => {
    const cfg = STATUS_CFG[s.status] || STATUS_CFG.mengerjakan;
    return (
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <View style={[styles.statusDot, { backgroundColor: cfg.color }]} />
          <Text style={styles.nama} numberOfLines={1}>{s.nama}</Text>
          <View style={[styles.badge, { backgroundColor: cfg.color + '20' }]}>
            <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>
        <Text style={styles.judul} numberOfLines={1}>{s.judul || '—'}</Text>
        <View style={styles.cardFooter}>
          <View style={styles.footerItem}>
            <Ionicons name="help-circle-outline" size={13} color={Colors.muted} />
            <Text style={styles.footerText}>Soal {s.soal_ke}/{s.total_soal || '?'}</Text>
          </View>
          <Text style={styles.timeText}>{formatTime(s.secs_since)}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Live Monitor</Text>
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      {/* Summary chips */}
      <View style={styles.summaryRow}>
        <SummaryChip count={counts.mengerjakan} label="Aktif"   color="#22C55E" />
        <SummaryChip count={counts.berpindah}   label="Pindah"  color="#F59E0B" />
        <SummaryChip count={counts.keluar}       label="Keluar"  color="#EF4444" />
        <SummaryChip count={counts.selesai}      label="Selesai" color="#6B7280" />
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={Colors.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Cari nama siswa..."
          placeholderTextColor={Colors.muted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={Colors.muted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter chips */}
      <View style={styles.filtersRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={Colors.primary} />
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="people-outline" size={44} color={Colors.muted} />
          <Text style={styles.emptyTitle}>
            {data.length === 0 ? 'Belum ada siswa yang sedang ujian' : 'Tidak ada hasil'}
          </Text>
          <Text style={styles.emptyDesc}>
            {data.length === 0 ? 'Data akan muncul saat siswa membuka ujian.' : 'Coba ubah filter atau pencarian.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={s => String(s.user_id)}
          renderItem={renderCard}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

function SummaryChip({ count, label, color }) {
  return (
    <View style={[styles.summaryChip, { borderColor: color + '50', backgroundColor: color + '18' }]}>
      <Text style={[styles.summaryCount, { color }]}>{count}</Text>
      <Text style={[styles.summaryLabel, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#EF4444' + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#EF4444' },
  liveText: { fontSize: 11, fontWeight: '800', color: '#EF4444', letterSpacing: 1 },
  summaryRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 12 },
  summaryChip: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  summaryCount: { fontSize: 18, fontWeight: '800' },
  summaryLabel: { fontSize: 10, fontWeight: '600', marginTop: 1 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 10, backgroundColor: Colors.card, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: Colors.border },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text },
  filtersRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 6, marginBottom: 12 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.card },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: 12, fontWeight: '600', color: Colors.muted },
  filterTextActive: { color: '#fff' },
  list: { paddingHorizontal: 16, gap: 10, paddingBottom: 24 },
  card: { backgroundColor: Colors.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.border },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  statusDot: { width: 9, height: 9, borderRadius: 5 },
  nama: { flex: 1, fontSize: 15, fontWeight: '700', color: Colors.text },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  judul: { fontSize: 12, color: Colors.muted, marginBottom: 8, marginLeft: 17 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginLeft: 17 },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerText: { fontSize: 12, color: Colors.muted },
  timeText: { fontSize: 11, color: Colors.muted },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8, paddingTop: 60 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: Colors.text },
  emptyDesc: { fontSize: 13, color: Colors.muted, textAlign: 'center', paddingHorizontal: 32 },
});
