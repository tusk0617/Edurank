import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { getGuruActivityLog, getGuruActivityLogDetail } from '../../services/api';
import Colors from '../../constants/Colors';

function fmtWaktu(str) {
  if (!str) return '-';
  const d = new Date(str);
  return d.toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtTime(str) {
  if (!str) return '-';
  const d = new Date(str);
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function ActivityLog() {
  const [list, setList]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [detailModal, setDetailModal] = useState(false);
  const [detail, setDetail]           = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchList = useCallback(async () => {
    try {
      const res = await getGuruActivityLog();
      setList(res.data);
    } catch { /* noop */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { fetchList(); }, [fetchList]));

  const openDetail = async (item) => {
    setDetail(null);
    setDetailModal(true);
    setDetailLoading(true);
    try {
      const res = await getGuruActivityLogDetail(item.hasil_id);
      setDetail(res.data);
    } catch { setDetail({ error: true }); }
    finally { setDetailLoading(false); }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Activity Log</Text>
        <Text style={styles.headerSub}>Tab switch terdeteksi saat ujian</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchList(); }} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {list.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>✅</Text>
            <Text style={styles.emptyText}>Tidak ada pelanggaran terdeteksi</Text>
          </View>
        ) : list.map(item => {
          const skor = Math.round(parseFloat(item.skor) || 0);
          const statusColor = item.status === 'lulus' ? Colors.success : Colors.danger;
          return (
            <TouchableOpacity key={item.hasil_id} style={styles.card} onPress={() => openDetail(item)} activeOpacity={0.85}>
              <View style={styles.cardTop}>
                <View style={[styles.mapelDot, { backgroundColor: item.warna_hex || Colors.primary }]} />
                <Text style={[styles.mapelText, { color: item.warna_hex || Colors.primary }]}>{item.mapel}</Text>
                <View style={styles.violationBadge}>
                  <Text style={styles.violationNum}>{item.total_pelanggaran}x</Text>
                  <Text style={styles.violationLabel}> berpindah tab</Text>
                </View>
              </View>
              <Text style={styles.cardTitle}>{item.siswa}</Text>
              <Text style={styles.cardSub}>{item.username} • {item.assessment}</Text>
              <View style={styles.infoRow}>
                <View style={styles.infoItem}>
                  <Ionicons name="time-outline" size={13} color={Colors.muted} />
                  <Text style={styles.infoText}>{fmtWaktu(item.waktu_mulai)}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                  <Text style={[styles.statusText, { color: statusColor }]}>
                    {item.status === 'lulus' ? '✓ Lulus' : '✗ Tdk Lulus'} — {skor}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Detail Modal */}
      <Modal visible={detailModal} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={[styles.modalBox, { maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detail Pelanggaran</Text>
              <TouchableOpacity onPress={() => setDetailModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            {detailLoading ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <ActivityIndicator color={Colors.primary} />
              </View>
            ) : detail?.error ? (
              <Text style={{ color: Colors.danger, textAlign: 'center', padding: 20 }}>Gagal memuat detail</Text>
            ) : detail && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Sesi info */}
                <View style={styles.sesiCard}>
                  <Text style={styles.sesiName}>{detail.sesi?.siswa}</Text>
                  <Text style={styles.sesiAssessment}>{detail.sesi?.assessment}</Text>
                  <View style={styles.sesiRow}>
                    <Text style={styles.sesiDetail}>Mulai: {fmtWaktu(detail.sesi?.waktu_mulai)}</Text>
                    <Text style={styles.sesiDetail}>Skor: {Math.round(parseFloat(detail.sesi?.skor) || 0)}</Text>
                  </View>
                </View>

                <Text style={styles.logHeader}>
                  {detail.logs?.length || 0} Kejadian Tercatat
                </Text>

                {(detail.logs || []).map((log, idx) => (
                  <View key={log.id} style={styles.logItem}>
                    <View style={styles.logBullet}>
                      <Text style={styles.logBulletNum}>{idx + 1}</Text>
                    </View>
                    <View style={styles.logContent}>
                      <Text style={styles.logTime}>{fmtTime(log.waktu)}</Text>
                      <Text style={styles.logKet}>{log.keterangan || log.jenis}</Text>
                    </View>
                  </View>
                ))}
                <View style={{ height: 20 }} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  header: {
    padding: 16, paddingTop: 12, backgroundColor: Colors.card,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: Colors.text },
  headerSub: { fontSize: 12, color: Colors.muted, marginTop: 2 },
  listContent: { padding: 16 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: Colors.muted, fontSize: 15 },
  card: {
    backgroundColor: Colors.card, borderRadius: 14, padding: 16,
    marginBottom: 12, elevation: 2, borderLeftWidth: 4, borderLeftColor: Colors.danger,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  mapelDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  mapelText: { fontSize: 12, fontWeight: '700', flex: 1 },
  violationBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  violationNum: { fontSize: 13, fontWeight: '800', color: Colors.danger },
  violationLabel: { fontSize: 11, color: Colors.danger },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  cardSub: { fontSize: 12, color: Colors.muted, marginBottom: 10 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  infoText: { fontSize: 12, color: Colors.muted },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '700' },
  overlay: { flex: 1, backgroundColor: '#00000060', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: Colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  sesiCard: { backgroundColor: Colors.danger + '10', borderRadius: 12, padding: 14, marginBottom: 16 },
  sesiName: { fontSize: 16, fontWeight: '800', color: Colors.text },
  sesiAssessment: { fontSize: 13, color: Colors.muted, marginTop: 2, marginBottom: 8 },
  sesiRow: { flexDirection: 'row', justifyContent: 'space-between' },
  sesiDetail: { fontSize: 12, color: Colors.muted },
  logHeader: { fontSize: 13, fontWeight: '700', color: Colors.muted, marginBottom: 10 },
  logItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  logBullet: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: Colors.danger, justifyContent: 'center', alignItems: 'center',
  },
  logBulletNum: { color: '#fff', fontSize: 11, fontWeight: '800' },
  logContent: { flex: 1 },
  logTime: { fontSize: 12, fontWeight: '700', color: Colors.text },
  logKet: { fontSize: 12, color: Colors.muted, marginTop: 2 },
});
