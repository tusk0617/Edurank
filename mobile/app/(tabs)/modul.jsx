import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getModul, getProgressSaya } from '../../services/api';
import Card from '../../components/ui/Card';
import ProgressBar from '../../components/ui/ProgressBar';
import Badge from '../../components/ui/Badge';
import Colors from '../../constants/Colors';

const LEVEL_LABEL = { 1: 'Mudah', 2: 'Menengah', 3: 'Sulit' };
const LEVEL_COLOR = { 1: Colors.secondary, 2: Colors.warning, 3: Colors.danger };

export default function ModulScreen() {
  const [moduls, setModuls] = useState([]);
  const [mapels, setMapels] = useState([]);
  const [selectedMapel, setSelectedMapel] = useState(null);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [modulRes, progressRes] = await Promise.all([getModul(), getProgressSaya()]);
      const data = modulRes.data;
      setModuls(data);
      setProgress(progressRes.data);

      const seen = new Set();
      const uniqueMapels = [];
      data.forEach(m => {
        if (!seen.has(m.mapel_id)) {
          seen.add(m.mapel_id);
          uniqueMapels.push({ id: m.mapel_id, nama: m.nama_mapel, warna_hex: m.warna_hex });
        }
      });
      setMapels(uniqueMapels);
      if (uniqueMapels.length > 0) setSelectedMapel(prev => prev || uniqueMapels[0].id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, []);

  const handlePress = (m) => {
    if (m.status_progress === 'terkunci') {
      Alert.alert('Terkunci', 'Selesaikan modul sebelumnya terlebih dahulu.');
      return;
    }
    router.push(`/modul/${m.id}`);
  };

  const filteredModuls = moduls.filter(m => m.mapel_id === selectedMapel);

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Modul Pembelajaran</Text>
          <View style={styles.xpBadge}>
            <Ionicons name="star" size={14} color={Colors.warning} />
            <Text style={styles.xpText}>{progress?.total_xp || 0} XP</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabsContent}>
          {mapels.map(mp => (
            <TouchableOpacity
              key={mp.id}
              style={[styles.tab, selectedMapel === mp.id && { backgroundColor: mp.warna_hex }]}
              onPress={() => setSelectedMapel(mp.id)}
            >
              <Text style={[styles.tabText, selectedMapel === mp.id && { color: '#fff' }]}>{mp.nama}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.modulList}>
          {filteredModuls.map((m, idx) => {
            const isLocked = m.status_progress === 'terkunci';
            return (
              <TouchableOpacity key={m.id} onPress={() => handlePress(m)} activeOpacity={0.8}>
                <Card style={[styles.modulCard, isLocked && styles.lockedCard]}>
                  <View style={styles.modulHeader}>
                    <View style={styles.modulLeft}>
                      <View style={[styles.modulNumBadge, { backgroundColor: m.warna_hex + '20' }]}>
                        <Text style={[styles.modulNum, { color: m.warna_hex }]}>{idx + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.modulJudul, isLocked && styles.lockedText]}>{m.judul}</Text>
                        <View style={styles.modulMeta}>
                          <Badge label={LEVEL_LABEL[m.level]} color={LEVEL_COLOR[m.level]} style={{ marginRight: 6 }} />
                          <Text style={styles.metaText}>⏱ {m.estimasi_menit}m</Text>
                          <Text style={styles.metaText}>⭐ {m.xp_reward} XP</Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.statusIcon}>
                      {isLocked
                        ? <Ionicons name="lock-closed" size={20} color={Colors.muted} />
                        : m.status_progress === 'selesai'
                          ? <Ionicons name="checkmark-circle" size={22} color={Colors.secondary} />
                          : m.status_progress === 'sedang'
                            ? <Ionicons name="play-circle" size={22} color={Colors.primary} />
                            : <Ionicons name="ellipse-outline" size={22} color={Colors.primary} />
                      }
                    </View>
                  </View>

                  {!isLocked && (
                    <View style={styles.progressSection}>
                      <ProgressBar value={m.persen_selesai} color={m.warna_hex} showLabel height={5} />
                    </View>
                  )}
                </Card>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 8 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: Colors.text },
  xpBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.warning + '20', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  xpText: { fontSize: 14, fontWeight: '700', color: Colors.warning },
  tabsScroll: { marginBottom: 8 },
  tabsContent: { paddingHorizontal: 16, gap: 8 },
  tab: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.card,
  },
  tabText: { fontSize: 13, fontWeight: '600', color: Colors.muted },
  modulList: { paddingHorizontal: 16, gap: 12 },
  modulCard: { padding: 14 },
  lockedCard: { opacity: 0.5 },
  modulHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modulLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, flex: 1 },
  modulNumBadge: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  modulNum: { fontSize: 16, fontWeight: '700' },
  modulJudul: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 4 },
  lockedText: { color: Colors.muted },
  modulMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 11, color: Colors.muted },
  statusIcon: { marginLeft: 8 },
  progressSection: { marginTop: 10 },
});
