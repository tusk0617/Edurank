import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { getRankingIndividu, getRankingSaya } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Colors from '../../constants/Colors';

const PERIODE = ['Minggu', 'Bulan', 'Semua'];

const getInitials = (nama) => {
  if (!nama) return '?';
  return nama.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
};

const AVATAR_COLORS = ['#378ADD', '#639922', '#EF9F27', '#E24B4A', '#8B5CF6', '#EC4899'];
const getAvatarColor = (str) => AVATAR_COLORS[(str?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

export default function RankingScreen() {
  const { user } = useAuth();
  const [periode, setPeriode] = useState(2);
  const [individu, setIndividu] = useState([]);
  const [myRank, setMyRank] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const periodeKey = PERIODE[periode].toLowerCase();

  const fetchData = useCallback(async () => {
    try {
      const [indRes, myRes] = await Promise.all([
        getRankingIndividu(periodeKey),
        getRankingSaya(),
      ]);
      setIndividu(indRes.data);
      setMyRank(myRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [periodeKey]);

  useEffect(() => { fetchData(); }, [periodeKey]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Leaderboard</Text>
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

      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={Colors.primary} />}
        >
          {/* Podium top 3 */}
          {individu.length >= 3 && (
            <View style={styles.podium}>
              <PodiumItem rank={2} user={individu[1]} height={90} />
              <PodiumItem rank={1} user={individu[0]} height={110} />
              <PodiumItem rank={3} user={individu[2]} height={75} />
            </View>
          )}

          {/* List 4+ */}
          <View style={styles.listContainer}>
            {individu.slice(3).map((u, idx) => (
              <View key={u.user_id} style={[styles.rankRow, u.user_id === user?.id && styles.myRankRow]}>
                <Text style={styles.rankNum}>{idx + 4}</Text>
                <View style={[styles.miniAvatar, { backgroundColor: getAvatarColor(u.nama) }]}>
                  <Text style={styles.miniAvatarText}>{getInitials(u.nama)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rankName}>{u.nama}</Text>
                </View>
                <Text style={styles.rankPoin}>{u.total_poin}</Text>
              </View>
            ))}
          </View>

          {/* Posisi saya jika di luar top 50 */}
          {myRank && !individu.slice(0, 50).find(u => u.user_id === user?.id) && (
            <View style={styles.myRankSticky}>
              <Text style={styles.myRankText}>Posisi kamu: #{myRank.rank} ({myRank.total_poin} poin)</Text>
            </View>
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
  rankPoin: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  myRankSticky: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.lightBlue, margin: 16, padding: 12, borderRadius: 10 },
  myRankText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
});
