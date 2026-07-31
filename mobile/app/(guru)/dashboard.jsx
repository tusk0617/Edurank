import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { getGuruGap } from '../../services/api';
import Colors from '../../constants/Colors';

export default function GuruDashboard() {
  const { user, logout } = useAuth();
  const [ringkasan, setRingkasan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await getGuruGap();
      setRingkasan(res.data.ringkasan);
    } catch {
      setRingkasan(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const handleLogout = () => {
    Alert.alert('Keluar', 'Yakin ingin keluar?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Keluar', style: 'destructive',
        onPress: async () => { await logout(); router.replace('/login'); },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.secondary} />
      </View>
    );
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
            <Text style={styles.greeting}>Selamat datang,</Text>
            <Text style={styles.name}>{user?.nama || 'Guru'}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>GURU</Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={22} color={Colors.danger} />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        {ringkasan && (
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { borderLeftColor: Colors.secondary }]}>
              <Text style={styles.statNum}>{ringkasan.total_soal}</Text>
              <Text style={styles.statLabel}>Total Soal</Text>
            </View>
            <View style={[styles.statCard, { borderLeftColor: Colors.primary }]}>
              <Text style={styles.statNum}>{ringkasan.total_siswa}</Text>
              <Text style={styles.statLabel}>Total Siswa</Text>
            </View>
            <View style={[styles.statCard, { borderLeftColor: Colors.warning }]}>
              <Text style={styles.statNum}>{ringkasan.total_jawaban}</Text>
              <Text style={styles.statLabel}>Total Jawaban</Text>
            </View>
          </View>
        )}

        {/* Menu */}
        <Text style={styles.sectionTitle}>Menu Utama</Text>

        <TouchableOpacity style={styles.menuCard} onPress={() => router.push('/(guru)/soal')} activeOpacity={0.85}>
          <View style={[styles.menuIcon, { backgroundColor: '#EDF7ED' }]}>
            <Ionicons name="document-text" size={28} color={Colors.secondary} />
          </View>
          <View style={styles.menuInfo}>
            <Text style={styles.menuTitle}>Kelola Soal</Text>
            <Text style={styles.menuDesc}>Tambah, edit, dan hapus soal ujian per modul</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.muted} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuCard} onPress={() => router.push('/(guru)/gap')} activeOpacity={0.85}>
          <View style={[styles.menuIcon, { backgroundColor: '#EBF4FF' }]}>
            <Ionicons name="bar-chart" size={28} color={Colors.primary} />
          </View>
          <View style={styles.menuInfo}>
            <Text style={styles.menuTitle}>Gap Analisis</Text>
            <Text style={styles.menuDesc}>Persentase kesalahan siswa per mata pelajaran</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.muted} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    backgroundColor: Colors.card, borderRadius: 16, padding: 20, marginBottom: 16,
    elevation: 3,
  },
  greeting: { fontSize: 13, color: Colors.muted },
  name: { fontSize: 20, fontWeight: '800', color: Colors.text, marginTop: 2 },
  roleBadge: {
    marginTop: 6, alignSelf: 'flex-start',
    backgroundColor: Colors.secondary, borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  roleText: { fontSize: 10, fontWeight: '700', color: '#fff', letterSpacing: 1 },
  logoutBtn: { padding: 8 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1, backgroundColor: Colors.card, borderRadius: 12, padding: 14,
    borderLeftWidth: 3, elevation: 2,
  },
  statNum: { fontSize: 22, fontWeight: '800', color: Colors.text },
  statLabel: { fontSize: 11, color: Colors.muted, marginTop: 2 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.muted, marginBottom: 12, letterSpacing: 0.5 },
  menuCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card,
    borderRadius: 14, padding: 16, marginBottom: 12, elevation: 2,
  },
  menuIcon: { width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  menuInfo: { flex: 1 },
  menuTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  menuDesc: { fontSize: 12, color: Colors.muted, marginTop: 2 },
});
