import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { getAssessment } from '../../services/api';
import Colors from '../../constants/Colors';

export default function SiswaHome() {
  const { user, logout } = useAuth();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await getAssessment();
      setList(res.data);
    } catch { }
    finally { setLoading(false); setRefreshing(false); }
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
      <View style={s.center}>
        <ActivityIndicator size="large" color={Colors.secondary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>Selamat datang,</Text>
          <Text style={s.name}>{user?.nama || 'Siswa'}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={s.logoutBtn}>
          <Ionicons name="log-out-outline" size={22} color={Colors.danger} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={list}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchData(); }}
            tintColor={Colors.secondary}
          />
        }
        ListHeaderComponent={<Text style={s.sectionTitle}>Daftar Ujian</Text>}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyIcon}>📄</Text>
            <Text style={s.emptyText}>Belum ada ujian tersedia</Text>
          </View>
        }
        renderItem={({ item }) => {
          const selesai = item.status === 'selesai';
          const deadline = item.deadline
            ? new Date(item.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
            : null;

          return (
            <View style={s.card}>
              <View style={s.cardTop}>
                <Text style={s.cardTitle}>{item.judul}</Text>
                <View style={[s.badge, { backgroundColor: selesai ? '#F0FDF4' : '#EBF4FF' }]}>
                  <Text style={[s.badgeText, { color: selesai ? Colors.secondary : Colors.primary }]}>
                    {selesai ? '✓ Selesai' : '● Tersedia'}
                  </Text>
                </View>
              </View>

              <View style={s.infoRow}>
                <View style={s.infoItem}>
                  <Ionicons name="time-outline" size={13} color={Colors.muted} />
                  <Text style={s.infoText}>{item.durasi_menit} menit</Text>
                </View>
                <View style={s.infoItem}>
                  <Ionicons name="document-text-outline" size={13} color={Colors.muted} />
                  <Text style={s.infoText}>{item.jumlah_soal} soal</Text>
                </View>
                {deadline && (
                  <View style={s.infoItem}>
                    <Ionicons name="calendar-outline" size={13} color={Colors.muted} />
                    <Text style={s.infoText}>{deadline}</Text>
                  </View>
                )}
              </View>

              {selesai ? (
                <View style={s.selesaiRow}>
                  <Text style={s.selesaiText}>
                    Ujian selesai — Skor:{' '}
                    <Text style={s.skorText}>{Math.round(item.skor || 0)}</Text>
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={s.mulaiBtn}
                  onPress={() => router.push({ pathname: '/assessment/[id]', params: { id: item.id, judul: item.judul } })}
                  activeOpacity={0.85}
                >
                  <Ionicons name="play-circle" size={18} color="#fff" />
                  <Text style={s.mulaiBtnText}>Mulai Ujian</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: Colors.card, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  greeting: { fontSize: 12, color: Colors.muted },
  name: { fontSize: 18, fontWeight: '800', color: Colors.text, marginTop: 2 },
  logoutBtn: { padding: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 12, marginTop: 4 },
  listContent: { padding: 16, flexGrow: 1 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: Colors.muted, fontSize: 14 },
  card: { backgroundColor: Colors.card, borderRadius: 14, padding: 16, marginBottom: 12, elevation: 2 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: Colors.text, marginRight: 10, lineHeight: 22 },
  badge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  infoRow: { flexDirection: 'row', gap: 14, flexWrap: 'wrap', marginBottom: 12 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  infoText: { fontSize: 12, color: Colors.muted },
  selesaiRow: { padding: 10, backgroundColor: '#F0FDF4', borderRadius: 10, alignItems: 'center' },
  selesaiText: { fontSize: 13, color: Colors.secondary, fontWeight: '600' },
  skorText: { fontSize: 16, fontWeight: '800' },
  mulaiBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.secondary, borderRadius: 10, paddingVertical: 12,
  },
  mulaiBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
