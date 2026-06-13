import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { getProgressSaya, getRankingSaya, getAssessment } from '../../services/api';
import Card from '../../components/ui/Card';
import Colors from '../../constants/Colors';

const getInitials = (nama) => {
  if (!nama) return '?';
  return nama.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
};

const ROLE_LABEL = { siswa: 'Siswa', guru: 'Guru', advisor: 'Advisor' };
const ROLE_COLOR = { siswa: Colors.primary, guru: Colors.secondary, advisor: Colors.warning };

export default function ProfilScreen() {
  const { user, logout } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [progressRes, rankRes, assessRes] = await Promise.all([
        getProgressSaya(),
        getRankingSaya(),
        getAssessment(),
      ]);
      setData({
        progress: progressRes.data,
        rank: rankRes.data,
        assessmentRiwayat: assessRes.data.filter(a => a.jumlah_percobaan > 0).slice(0, 5),
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, []);

  const handleLogout = () => {
    Alert.alert('Logout', 'Yakin ingin keluar?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={Colors.primary} />}
      >
        {/* Profile Card */}
        <View style={styles.profileSection}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarLargeText}>{getInitials(user?.nama)}</Text>
          </View>
          <Text style={styles.userName}>{user?.nama}</Text>
          <View style={[styles.roleBadge, { backgroundColor: ROLE_COLOR[user?.role] + '20' }]}>
            <Text style={[styles.roleText, { color: ROLE_COLOR[user?.role] }]}>{ROLE_LABEL[user?.role]}</Text>
          </View>
          <Text style={styles.email}>{user?.email}</Text>
          {user?.nama_sekolah && (
            <View style={styles.sekolahRow}>
              <Ionicons name="school" size={14} color={Colors.muted} />
              <Text style={styles.sekolahText}>{user.nama_sekolah}</Text>
              <Text style={styles.wilayahText}>· {user.wilayah}</Text>
            </View>
          )}
        </View>

        {/* Stats */}
        {user?.role === 'siswa' && (
          <View style={styles.statsRow}>
            <Card style={styles.statCard}>
              <Ionicons name="star" size={22} color={Colors.warning} />
              <Text style={styles.statValue}>{data?.progress?.total_xp || 0}</Text>
              <Text style={styles.statLabel}>Total XP</Text>
            </Card>
            <Card style={styles.statCard}>
              <Ionicons name="trophy" size={22} color={Colors.primary} />
              <Text style={styles.statValue}>#{data?.rank?.rank || '-'}</Text>
              <Text style={styles.statLabel}>Ranking</Text>
            </Card>
            <Card style={styles.statCard}>
              <Ionicons name="book" size={22} color={Colors.secondary} />
              <Text style={styles.statValue}>{data?.progress?.modul_selesai || 0}</Text>
              <Text style={styles.statLabel}>Modul</Text>
            </Card>
          </View>
        )}

        {/* Badge */}
        {data?.progress?.badges?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏅 Badge Saya</Text>
            <View style={styles.badgeGrid}>
              {data.progress.badges.map(b => (
                <View key={b.id} style={[styles.badgeItem, { backgroundColor: b.warna_hex + '15', borderColor: b.warna_hex + '40' }]}>
                  <Ionicons name={b.ikon_nama} size={28} color={b.warna_hex} />
                  <Text style={[styles.badgeName, { color: b.warna_hex }]}>{b.nama}</Text>
                  <Text style={styles.badgeDesc} numberOfLines={2}>{b.deskripsi}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Riwayat Assessment */}
        {data?.assessmentRiwayat?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📋 Riwayat Ujian</Text>
            {data.assessmentRiwayat.map(a => (
              <View key={a.id} style={styles.riwayatRow}>
                <View style={[styles.riwayatDot, { backgroundColor: a.warna_hex }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.riwayatJudul}>{a.judul}</Text>
                  <Text style={styles.riwayatMeta}>{a.nama_mapel} · {a.jumlah_percobaan}x percobaan</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[
                    styles.riwayatSkor,
                    { color: a.skor_terbaik >= 60 ? Colors.secondary : Colors.danger }
                  ]}>
                    {a.skor_terbaik ? parseFloat(a.skor_terbaik).toFixed(0) : '-'}
                  </Text>
                  <Text style={[
                    styles.riwayatStatus,
                    { color: a.status_terakhir === 'lulus' ? Colors.secondary : a.status_terakhir === 'remedial' ? Colors.warning : Colors.danger }
                  ]}>
                    {a.status_terakhir === 'lulus' ? '✓ Lulus' : a.status_terakhir === 'remedial' ? '↺ Remedial' : '✗ Tidak Lulus'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Info Section */}
        <Card style={[styles.section, { gap: 0, padding: 0 }]}>
          <InfoRow icon="person-outline" label="Nama Lengkap" value={user?.nama} />
          <InfoRow icon="mail-outline" label="Email" value={user?.email} />
          {user?.nama_sekolah && <InfoRow icon="school-outline" label="Sekolah" value={user?.nama_sekolah} />}
          {user?.wilayah && <InfoRow icon="location-outline" label="Wilayah" value={user?.wilayah} />}
          <InfoRow icon="calendar-outline" label="Bergabung" value={user?.created_at ? new Date(user.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long' }) : '-'} last />
        </Card>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
          <Text style={styles.logoutText}>Keluar</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value, last }) {
  return (
    <View style={[infoStyles.row, !last && infoStyles.border]}>
      <View style={infoStyles.iconWrap}>
        <Ionicons name={icon} size={18} color={Colors.muted} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={infoStyles.label}>{label}</Text>
        <Text style={infoStyles.value}>{value || '-'}</Text>
      </View>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  border: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  iconWrap: { width: 36, height: 36, borderRadius: 8, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
  label: { fontSize: 11, color: Colors.muted },
  value: { fontSize: 14, fontWeight: '500', color: Colors.text, marginTop: 1 },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  profileSection: { alignItems: 'center', padding: 24, paddingBottom: 16 },
  avatarLarge: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 5,
  },
  avatarLargeText: { color: '#fff', fontWeight: '800', fontSize: 32 },
  userName: { fontSize: 22, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  roleBadge: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, marginBottom: 8 },
  roleText: { fontSize: 13, fontWeight: '700' },
  email: { fontSize: 14, color: Colors.muted, marginBottom: 8 },
  sekolahRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sekolahText: { fontSize: 13, color: Colors.muted },
  wilayahText: { fontSize: 13, color: Colors.muted },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 16 },
  statCard: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 20, fontWeight: '800', color: Colors.text },
  statLabel: { fontSize: 11, color: Colors.muted },
  section: { marginHorizontal: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badgeItem: { width: '47%', padding: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  badgeName: { fontSize: 13, fontWeight: '700', marginTop: 8, textAlign: 'center' },
  badgeDesc: { fontSize: 11, color: Colors.muted, textAlign: 'center', marginTop: 4, lineHeight: 16 },
  riwayatRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  riwayatDot: { width: 8, height: 8, borderRadius: 4 },
  riwayatJudul: { fontSize: 13, fontWeight: '600', color: Colors.text },
  riwayatMeta: { fontSize: 11, color: Colors.muted, marginTop: 2 },
  riwayatSkor: { fontSize: 18, fontWeight: '800' },
  riwayatStatus: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 8, padding: 14, borderRadius: 10,
    borderWidth: 1.5, borderColor: Colors.danger + '60', backgroundColor: Colors.danger + '10',
  },
  logoutText: { color: Colors.danger, fontWeight: '700', fontSize: 15 },
});
