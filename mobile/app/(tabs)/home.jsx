import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { getProgressSaya, getRankingSaya, getAssessment, getModul } from '../../services/api';
import Card from '../../components/ui/Card';
import ProgressBar from '../../components/ui/ProgressBar';
import Colors from '../../constants/Colors';

export default function DashboardScreen() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [progressRes, rankRes, assessmentRes, modulRes] = await Promise.all([
        getProgressSaya(),
        getRankingSaya(),
        getAssessment(),
        getModul(),
      ]);

      const modulAktif = modulRes.data.find(m => m.status_progress === 'sedang');
      const assessmentMendatang = assessmentRes.data
        .filter(a => !a.status_terakhir || a.status_terakhir === 'remedial')
        .slice(0, 3);

      setData({
        progress: progressRes.data,
        rank: rankRes.data,
        modulAktif,
        assessmentMendatang,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, []);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Selamat Pagi';
    if (h < 17) return 'Selamat Siang';
    return 'Selamat Malam';
  };

  const getInitials = (nama) => {
    if (!nama) return '?';
    return nama.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const isSiswa = user?.role === 'siswa';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.userName}>{user?.nama?.split(' ')[0] || 'User'} 👋</Text>
            <Text style={styles.sekolah}>{user?.nama_sekolah || 'EduRank'}</Text>
          </View>
          <TouchableOpacity style={styles.avatar} onPress={() => router.push('/(tabs)/profil')} activeOpacity={0.8}>
            <Text style={styles.avatarText}>{getInitials(user?.nama)}</Text>
          </TouchableOpacity>
        </View>

        {isSiswa ? (
          <>
            {/* Poin & Rank */}
            <View style={styles.statsRow}>
              <Card style={styles.statCard}>
                <Ionicons name="star" size={20} color={Colors.warning} />
                <Text style={styles.statValue}>{data?.progress?.total_xp || 0}</Text>
                <Text style={styles.statLabel}>Total XP</Text>
              </Card>
              <Card style={styles.statCard}>
                <Ionicons name="trophy" size={20} color={Colors.primary} />
                <Text style={styles.statValue}>#{data?.rank?.rank || '-'}</Text>
                <Text style={styles.statLabel}>Peringkat</Text>
              </Card>
              <Card style={styles.statCard}>
                <Ionicons name="checkmark-circle" size={20} color={Colors.secondary} />
                <Text style={styles.statValue}>{data?.progress?.modul_selesai || 0}</Text>
                <Text style={styles.statLabel}>Modul Selesai</Text>
              </Card>
            </View>

            {/* Modul Aktif */}
            {data?.modulAktif && (
              <Card style={styles.section}>
                <Text style={styles.sectionTitle}>📚 Modul Aktif</Text>
                <View style={styles.modulAktif}>
                  <View style={[styles.modulDot, { backgroundColor: data.modulAktif.warna_hex }]} />
                  <View style={styles.modulInfo}>
                    <Text style={styles.modulJudul}>{data.modulAktif.judul}</Text>
                    <Text style={styles.modulMapel}>{data.modulAktif.nama_mapel}</Text>
                    <ProgressBar value={data.modulAktif.persen_selesai} color={data.modulAktif.warna_hex} showLabel height={6} />
                  </View>
                </View>
                <TouchableOpacity style={styles.lanjutBtn} onPress={() => router.push('/(tabs)/modul')}>
                  <Text style={styles.lanjutText}>Lanjutkan Belajar →</Text>
                </TouchableOpacity>
              </Card>
            )}

            {/* Assessment Mendatang */}
            {data?.assessmentMendatang?.length > 0 && (
              <Card style={styles.section}>
                <Text style={styles.sectionTitle}>📝 Ujian Mendatang</Text>
                {data.assessmentMendatang.map(a => {
                  const deadline = new Date(a.deadline);
                  const isClose = (deadline - new Date()) < 24 * 60 * 60 * 1000;
                  return (
                    <TouchableOpacity key={a.id} style={styles.assessItem} onPress={() => router.push('/(tabs)/assessment')}>
                      <View style={[styles.mapelDot, { backgroundColor: a.warna_hex }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.assessJudul}>{a.judul}</Text>
                        <Text style={[styles.assessDeadline, isClose && { color: Colors.danger }]}>
                          {isClose ? '⏰ ' : '📅 '}
                          {deadline.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={Colors.muted} />
                    </TouchableOpacity>
                  );
                })}
              </Card>
            )}

            {/* Badge */}
            {data?.progress?.badges?.length > 0 && (
              <Card style={styles.section}>
                <Text style={styles.sectionTitle}>🏅 Badge Diraih</Text>
                <View style={styles.badgeRow}>
                  {data.progress.badges.slice(0, 4).map(b => (
                    <View key={b.id} style={[styles.badgeItem, { backgroundColor: b.warna_hex + '20' }]}>
                      <Ionicons name={b.ikon_nama} size={22} color={b.warna_hex} />
                      <Text style={[styles.badgeName, { color: b.warna_hex }]}>{b.nama}</Text>
                    </View>
                  ))}
                </View>
              </Card>
            )}
          </>
        ) : (
          <>
            {/* Dashboard Guru/Advisor */}
            <View style={styles.statsRow}>
              <Card style={styles.statCard}>
                <Ionicons name="people" size={20} color={Colors.primary} />
                <Text style={styles.statValue}>5</Text>
                <Text style={styles.statLabel}>Siswa Aktif</Text>
              </Card>
              <Card style={styles.statCard}>
                <Ionicons name="bar-chart" size={20} color={Colors.secondary} />
                <Text style={styles.statValue}>74.2</Text>
                <Text style={styles.statLabel}>Rata Nilai</Text>
              </Card>
            </View>

            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>🔍 Analisis Gap</Text>
              <Text style={styles.gapDesc}>Lihat perbandingan performa antar sekolah dan identifikasi siswa berisiko.</Text>
              <TouchableOpacity style={styles.gapBtn} onPress={() => router.push('/(tabs)/ranking')}>
                <Ionicons name="analytics" size={18} color="#fff" />
                <Text style={styles.gapBtnText}>Buka Gap Analysis</Text>
              </TouchableOpacity>
            </Card>
          </>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, paddingHorizontal: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 20 },
  greeting: { fontSize: 14, color: Colors.muted },
  userName: { fontSize: 22, fontWeight: '700', color: Colors.text },
  sekolah: { fontSize: 12, color: Colors.muted, marginTop: 2 },
  avatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, alignItems: 'center', padding: 14, gap: 4 },
  statValue: { fontSize: 20, fontWeight: '800', color: Colors.text },
  statLabel: { fontSize: 11, color: Colors.muted, textAlign: 'center' },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  modulAktif: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 12 },
  modulDot: { width: 4, borderRadius: 2, alignSelf: 'stretch', minHeight: 40 },
  modulInfo: { flex: 1, gap: 4 },
  modulJudul: { fontSize: 14, fontWeight: '600', color: Colors.text },
  modulMapel: { fontSize: 12, color: Colors.muted, marginBottom: 4 },
  lanjutBtn: { alignItems: 'center', paddingVertical: 8, backgroundColor: Colors.lightBlue, borderRadius: 8 },
  lanjutText: { color: Colors.primary, fontWeight: '600', fontSize: 14 },
  assessItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  mapelDot: { width: 8, height: 8, borderRadius: 4 },
  assessJudul: { fontSize: 13, fontWeight: '600', color: Colors.text },
  assessDeadline: { fontSize: 12, color: Colors.muted, marginTop: 2 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badgeItem: { alignItems: 'center', padding: 10, borderRadius: 10, minWidth: 72 },
  badgeName: { fontSize: 10, fontWeight: '600', marginTop: 4, textAlign: 'center' },
  gapDesc: { fontSize: 13, color: Colors.muted, marginBottom: 12, lineHeight: 20 },
  gapBtn: {
    flexDirection: 'row', gap: 8, backgroundColor: Colors.primary,
    padding: 12, borderRadius: 8, justifyContent: 'center', alignItems: 'center',
  },
  gapBtnText: { color: '#fff', fontWeight: '600' },
});
