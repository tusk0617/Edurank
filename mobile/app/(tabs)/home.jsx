import React, { useState, useCallback } from 'react';
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

const STATUS_CONFIG = {
  lulus:       { label: 'Lulus',       color: Colors.secondary, icon: 'checkmark-circle' },
  remedial:    { label: 'Remedial',    color: Colors.warning,   icon: 'refresh-circle'   },
  tidak_lulus: { label: 'Tidak Lulus', color: Colors.danger,    icon: 'close-circle'     },
  null:        { label: 'Tersedia',    color: Colors.primary,   icon: 'play-circle'      },
};

export default function HomeScreen() {
  const { user } = useAuth();
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      if (user?.role === 'guru') { setLoading(false); return; }
      const res = await getAssessment();
      setAssessments(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.role]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

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

  const getDeadlineInfo = (deadline) => {
    if (!deadline) return null;
    const d = new Date(deadline);
    const diff = d - new Date();
    return { d, isExpired: diff < 0, isClose: diff > 0 && diff < 86400000 };
  };

  const canStart = (a) => {
    const info = getDeadlineInfo(a.deadline);
    return !info?.isExpired && a.jumlah_percobaan < a.max_retake && a.status_terakhir !== 'lulus';
  };

  if (loading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  const isGuru = user?.role === 'guru';

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
          </View>
          <TouchableOpacity style={styles.avatar} onPress={() => router.push('/(tabs)/profil')} activeOpacity={0.8}>
            <Text style={styles.avatarText}>{getInitials(user?.nama)}</Text>
          </TouchableOpacity>
        </View>

        {isGuru ? (
          <View style={styles.guruCard}>
            <Ionicons name="school" size={32} color={Colors.primary} />
            <Text style={styles.guruTitle}>Dashboard Guru</Text>
            <Text style={styles.guruDesc}>Gunakan tab di bawah untuk mengelola soal dan melihat gap analisis.</Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Daftar Ujian</Text>

            {assessments.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="document-outline" size={40} color={Colors.muted} />
                <Text style={styles.emptyText}>Belum ada ujian tersedia.</Text>
              </View>
            ) : (
              <View style={styles.cardList}>
                {assessments.map(a => {
                  const info = getDeadlineInfo(a.deadline);
                  const cfg = STATUS_CONFIG[a.status_terakhir] ?? STATUS_CONFIG['null'];
                  const sisaPercobaan = a.max_retake - (a.jumlah_percobaan || 0);
                  const bisa = canStart(a);

                  return (
                    <View key={a.id} style={styles.card}>
                      {/* Card header: subject + status */}
                      <View style={styles.cardHeader}>
                        <View style={[styles.mapelDot, { backgroundColor: a.warna_hex }]} />
                        <Text style={styles.mapelName}>{a.nama_mapel}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: cfg.color + '20' }]}>
                          <Ionicons name={cfg.icon} size={12} color={cfg.color} />
                          <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                        </View>
                      </View>

                      {/* Title & module */}
                      <Text style={styles.judul}>{a.judul}</Text>
                      <Text style={styles.namaModul}>{a.nama_modul}</Text>

                      {/* Meta info */}
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

                      {/* Deadline */}
                      {a.deadline && (
                        <View style={styles.deadlineRow}>
                          <Ionicons name="calendar-outline" size={13} color={info?.isClose ? Colors.danger : Colors.muted} />
                          <Text style={[styles.deadlineText, info?.isClose && { color: Colors.danger }, info?.isExpired && { color: Colors.muted }]}>
                            {info?.isExpired
                              ? 'Deadline sudah lewat'
                              : info?.isClose
                                ? `⏰ Deadline hari ini`
                                : `Deadline: ${new Date(a.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`
                            }
                          </Text>
                        </View>
                      )}

                      {/* Action button */}
                      <TouchableOpacity
                        style={[styles.startBtn, !bisa && { backgroundColor: Colors.border }]}
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
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}

        <View style={{ height: 24 }} />
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
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  cardList: { gap: 14 },
  card: { backgroundColor: Colors.card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: Colors.border },
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
  startBtn: { backgroundColor: Colors.primary, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  startBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  emptyBox: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyText: { fontSize: 14, color: Colors.muted },
  guruCard: { alignItems: 'center', backgroundColor: Colors.card, borderRadius: 12, padding: 32, gap: 12, marginTop: 8 },
  guruTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  guruDesc: { fontSize: 13, color: Colors.muted, textAlign: 'center', lineHeight: 20 },
});
