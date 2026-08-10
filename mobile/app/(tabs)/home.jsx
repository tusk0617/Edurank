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
import Card from '../../components/ui/Card';
import Colors from '../../constants/Colors';

export default function DashboardScreen() {
  const { user } = useAuth();
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      if (user?.role === 'guru') return;
      const res = await getAssessment();
      setAssessments(
        res.data.filter(a => !a.status_terakhir || a.status_terakhir === 'remedial').slice(0, 5)
      );
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
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
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Dashboard Guru</Text>
            <Text style={styles.guruDesc}>Gunakan tab di bawah untuk mengelola soal dan melihat gap analisis siswa.</Text>
          </Card>
        ) : (
          <>
            {assessments.length > 0 ? (
              <Card style={styles.section}>
                <Text style={styles.sectionTitle}>📝 Ujian Mendatang</Text>
                {assessments.map(a => {
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
            ) : (
              <Card style={styles.section}>
                <Text style={styles.emptyText}>Tidak ada ujian mendatang.</Text>
              </Card>
            )}
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
  avatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  assessItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  mapelDot: { width: 8, height: 8, borderRadius: 4 },
  assessJudul: { fontSize: 13, fontWeight: '600', color: Colors.text },
  assessDeadline: { fontSize: 12, color: Colors.muted, marginTop: 2 },
  guruDesc: { fontSize: 13, color: Colors.muted, lineHeight: 20 },
  emptyText: { fontSize: 13, color: Colors.muted, textAlign: 'center', paddingVertical: 8 },
});
