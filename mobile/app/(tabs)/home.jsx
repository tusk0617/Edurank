import React, { useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { getAssessment } from '../../services/api';
import Colors from '../../constants/Colors';

const STATUS_CFG = {
  lulus:       { label: 'Lulus',     color: Colors.success,   icon: 'checkmark-circle' },
  remedial:    { label: 'Remedial',  color: Colors.warning,   icon: 'refresh-circle'   },
  tidak_lulus: { label: 'Tdk Lulus', color: Colors.danger,    icon: 'close-circle'     },
  tersedia:    { label: 'Tersedia',  color: Colors.primary,   icon: 'play-circle'      },
  habis:       { label: 'Habis',     color: Colors.muted,     icon: 'ban'              },
};

function getStatus(item) {
  if (!item.status_terakhir) return 'tersedia';
  if (item.status_terakhir === 'lulus') return 'lulus';
  if (item.status_terakhir === 'remedial') return 'remedial';
  if (item.jumlah_percobaan >= item.max_retake) return 'habis';
  return 'tersedia';
}

export default function SiswaHome() {
  const { user } = useAuth();
  const [assessments, setAssessments] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 11) return 'Selamat Pagi';
    if (h < 15) return 'Selamat Siang';
    if (h < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  const fetchData = useCallback(async () => {
    try {
      const res = await getAssessment();
      setAssessments(res.data);
    } catch {
      setAssessments([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={Colors.secondary} /></View>;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={Colors.secondary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting()},</Text>
            <Text style={styles.name}>{user?.nama || 'Siswa'} 👋</Text>
          </View>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{(user?.nama || 'S')[0].toUpperCase()}{(user?.username || '')[1] || ''}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Daftar Ujian</Text>

        {assessments.length === 0 ? (
          <View style={[styles.center, { paddingTop: 60 }]}>
            <Ionicons name="document-outline" size={48} color={Colors.muted} />
            <Text style={styles.emptyText}>Belum ada ujian tersedia</Text>
          </View>
        ) : (
          assessments.map(item => {
            const statusKey = getStatus(item);
            const cfg = STATUS_CFG[statusKey];
            const percobaan_tersisa = item.max_retake - (item.jumlah_percobaan || 0);
            const bisa_mulai = statusKey === 'tersedia' || statusKey === 'remedial';

            return (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.mapelRow}>
                    <View style={[styles.dot, { backgroundColor: item.warna_hex || Colors.primary }]} />
                    <Text style={[styles.mapelText, { color: item.warna_hex || Colors.primary }]}>{item.nama_mapel}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: cfg.color + '20' }]}>
                    <Ionicons name={cfg.icon} size={12} color={cfg.color} />
                    <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                </View>

                <Text style={styles.cardTitle}>{item.judul}</Text>
                <Text style={styles.cardModul}>{item.nama_modul}</Text>

                <View style={styles.infoRow}>
                  <View style={styles.infoItem}>
                    <Ionicons name="time-outline" size={13} color={Colors.muted} />
                    <Text style={styles.infoText}>{item.durasi_menit} menit</Text>
                  </View>
                  {percobaan_tersisa > 0 && (
                    <View style={styles.infoItem}>
                      <Ionicons name="refresh-outline" size={13} color={Colors.muted} />
                      <Text style={styles.infoText}>{percobaan_tersisa} percobaan tersisa</Text>
                    </View>
                  )}
                  {item.skor_terbaik != null && (
                    <View style={styles.infoItem}>
                      <Ionicons name="star-outline" size={13} color={Colors.muted} />
                      <Text style={styles.infoText}>Skor: {Math.round(item.skor_terbaik)}</Text>
                    </View>
                  )}
                </View>

                {bisa_mulai && (
                  <TouchableOpacity
                    style={[styles.startBtn, { backgroundColor: statusKey === 'remedial' ? Colors.warning : Colors.secondary }]}
                    onPress={() => router.push(`/assessment/${item.id}`)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name={statusKey === 'remedial' ? 'refresh' : 'play'} size={16} color="#fff" />
                    <Text style={styles.startBtnText}>
                      {statusKey === 'remedial' ? 'Ikuti Remedial' : 'Mulai Ujian'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  emptyText: { color: Colors.muted, fontSize: 15 },
  container: { flex: 1, padding: 20 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 24,
  },
  greeting: { fontSize: 13, color: Colors.muted },
  name: { fontSize: 22, fontWeight: '800', color: Colors.text, marginTop: 2 },
  avatarCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.secondary, justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  card: {
    backgroundColor: Colors.card, borderRadius: 14, padding: 16,
    marginBottom: 12, elevation: 2,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  mapelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  mapelText: { fontSize: 12, fontWeight: '600' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: '700' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 2 },
  cardModul: { fontSize: 12, color: Colors.muted, marginBottom: 10 },
  infoRow: { flexDirection: 'row', gap: 14, marginBottom: 12 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  infoText: { fontSize: 12, color: Colors.muted },
  startBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12, borderRadius: 10,
  },
  startBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
