import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal,
  Animated, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getModul, getProgressSaya, mulaiModul, selesaiModul } from '../../services/api';
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
  const [selectedModul, setSelectedModul] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [badgeModal, setBadgeModal] = useState(null);

  // Toast
  const toastAnim = useRef(new Animated.Value(-80)).current;
  const [toastMsg, setToastMsg] = useState('');

  // Modal progress animation
  const progressAnim = useRef(new Animated.Value(0)).current;
  const badgeScale = useRef(new Animated.Value(0)).current;

  const fetchData = useCallback(async () => {
    try {
      const [modulRes, progressRes] = await Promise.all([getModul(), getProgressSaya()]);
      const data = modulRes.data;
      setModuls(data);
      setProgress(progressRes.data);

      // Extract unique mapels
      const seen = new Set();
      const uniqueMapels = [];
      data.forEach(m => {
        if (!seen.has(m.mapel_id)) {
          seen.add(m.mapel_id);
          uniqueMapels.push({ id: m.mapel_id, nama: m.nama_mapel, warna_hex: m.warna_hex });
        }
      });
      setMapels(uniqueMapels);
      if (!selectedMapel && uniqueMapels.length > 0) setSelectedMapel(uniqueMapels[0].id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedMapel]);

  useEffect(() => { fetchData(); }, []);

  const showToast = (msg) => {
    setToastMsg(msg);
    Animated.sequence([
      Animated.spring(toastAnim, { toValue: 16, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.spring(toastAnim, { toValue: -80, useNativeDriver: true }),
    ]).start();
  };

  const openModal = (modul) => {
    if (modul.status_progress === 'terkunci') return;
    setSelectedModul(modul);
    setModalVisible(true);
    progressAnim.setValue(0);
    Animated.timing(progressAnim, {
      toValue: modul.persen_selesai,
      duration: 800,
      useNativeDriver: false,
    }).start();
  };

  const handleMulai = async () => {
    if (!selectedModul) return;
    setActionLoading(true);
    try {
      await mulaiModul(selectedModul.id);
      await fetchData();
      setModalVisible(false);
      showToast('▶ Modul dimulai!');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Gagal memulai modul');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSelesai = async () => {
    if (!selectedModul) return;
    Alert.alert('Konfirmasi', 'Tandai modul ini sebagai selesai?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Selesai', onPress: async () => {
          setActionLoading(true);
          try {
            const res = await selesaiModul(selectedModul.id);
            await fetchData();
            setModalVisible(false);
            showToast(`+${res.data.xp_didapat} XP — Modul selesai! 🎉`);

            if (res.data.new_badges?.length > 0) {
              setTimeout(() => {
                setBadgeModal(res.data.new_badges[0]);
                Animated.spring(badgeScale, { toValue: 1, useNativeDriver: true, friction: 5 }).start();
              }, 500);
            }
          } catch (err) {
            Alert.alert('Error', err.response?.data?.message || 'Gagal menyelesaikan modul');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const filteredModuls = moduls.filter(m => m.mapel_id === selectedMapel);

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Toast */}
      <Animated.View style={[styles.toast, { transform: [{ translateY: toastAnim }] }]}>
        <Text style={styles.toastText}>{toastMsg}</Text>
      </Animated.View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Modul Pembelajaran</Text>
          <View style={styles.xpBadge}>
            <Ionicons name="star" size={14} color={Colors.warning} />
            <Text style={styles.xpText}>{progress?.total_xp || 0} XP</Text>
          </View>
        </View>

        {/* Mapel Tabs */}
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

        {/* Modul List */}
        <View style={styles.modulList}>
          {filteredModuls.map((m, idx) => {
            const isLocked = m.status_progress === 'terkunci';
            return (
              <TouchableOpacity key={m.id} onPress={() => openModal(m)} disabled={isLocked} activeOpacity={0.8}>
                <Card style={[styles.modulCard, isLocked && styles.lockedCard]}>
                  <View style={styles.modulHeader}>
                    <View style={styles.modulLeft}>
                      <View style={[styles.modulNumBadge, { backgroundColor: m.warna_hex + '20' }]}>
                        <Text style={[styles.modulNum, { color: m.warna_hex }]}>{idx + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.modulJudul, isLocked && styles.lockedText]}>{m.judul}</Text>
                        <View style={styles.modulMeta}>
                          <Badge
                            label={LEVEL_LABEL[m.level]}
                            color={LEVEL_COLOR[m.level]}
                            style={{ marginRight: 6 }}
                          />
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

      {/* Detail Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <TouchableOpacity style={styles.modalClose} onPress={() => setModalVisible(false)}>
              <Ionicons name="close-circle" size={28} color={Colors.muted} />
            </TouchableOpacity>

            {selectedModul && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={[styles.modalColorBar, { backgroundColor: selectedModul.warna_hex }]} />
                <View style={styles.modalBody}>
                  <Badge label={LEVEL_LABEL[selectedModul.level]} color={LEVEL_COLOR[selectedModul.level]} />
                  <Text style={styles.modalTitle}>{selectedModul.judul}</Text>
                  <Text style={styles.modalMapel}>{selectedModul.nama_mapel}</Text>
                  <Text style={styles.modalDesc}>{selectedModul.deskripsi}</Text>

                  <View style={styles.modalStats}>
                    <View style={styles.modalStat}>
                      <Ionicons name="time" size={18} color={Colors.muted} />
                      <Text style={styles.modalStatText}>{selectedModul.estimasi_menit} menit</Text>
                    </View>
                    <View style={styles.modalStat}>
                      <Ionicons name="star" size={18} color={Colors.warning} />
                      <Text style={styles.modalStatText}>{selectedModul.xp_reward} XP</Text>
                    </View>
                  </View>

                  <Text style={styles.progressLabel}>Progress: {selectedModul.persen_selesai}%</Text>
                  <Animated.View style={styles.progressTrack}>
                    <Animated.View
                      style={[
                        styles.progressFill,
                        {
                          width: progressAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
                          backgroundColor: selectedModul.warna_hex,
                        },
                      ]}
                    />
                  </Animated.View>

                  {selectedModul.status_progress === 'tersedia' && (
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.primary }]} onPress={handleMulai} disabled={actionLoading}>
                      {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionBtnText}>▶ Mulai Modul</Text>}
                    </TouchableOpacity>
                  )}
                  {selectedModul.status_progress === 'sedang' && (
                    <>
                      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.primary }]} onPress={handleMulai} disabled={actionLoading}>
                        <Text style={styles.actionBtnText}>▶ Lanjutkan</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.secondary }]} onPress={handleSelesai} disabled={actionLoading}>
                        {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionBtnText}>✓ Tandai Selesai</Text>}
                      </TouchableOpacity>
                    </>
                  )}
                  {selectedModul.status_progress === 'selesai' && (
                    <View style={[styles.actionBtn, { backgroundColor: Colors.secondary + '20' }]}>
                      <Text style={[styles.actionBtnText, { color: Colors.secondary }]}>✓ Modul Selesai</Text>
                    </View>
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Badge Modal */}
      <Modal visible={!!badgeModal} transparent animationType="fade">
        <View style={styles.badgeOverlay}>
          <Animated.View style={[styles.badgeModal, { transform: [{ scale: badgeScale }] }]}>
            <Text style={styles.badgeCongrats}>🎉 Badge Baru!</Text>
            {badgeModal && (
              <>
                <View style={[styles.badgeCircle, { backgroundColor: badgeModal.warna_hex }]}>
                  <Ionicons name={badgeModal.ikon_nama} size={40} color="#fff" />
                </View>
                <Text style={styles.badgeName}>{badgeModal.nama}</Text>
              </>
            )}
            <TouchableOpacity style={styles.badgeCloseBtn} onPress={() => { setBadgeModal(null); badgeScale.setValue(0); }}>
              <Text style={styles.badgeCloseText}>Keren!</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  toast: {
    position: 'absolute', top: 0, left: 16, right: 16, zIndex: 999,
    backgroundColor: '#1A1A1A', borderRadius: 12, padding: 14,
    alignItems: 'center',
  },
  toastText: { color: '#fff', fontWeight: '600', fontSize: 14 },
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%' },
  modalClose: { position: 'absolute', top: 12, right: 12, zIndex: 10 },
  modalColorBar: { height: 4, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalBody: { padding: 20 },
  modalTitle: { fontSize: 22, fontWeight: '700', color: Colors.text, marginTop: 10, marginBottom: 4 },
  modalMapel: { fontSize: 14, color: Colors.muted, marginBottom: 12 },
  modalDesc: { fontSize: 14, color: Colors.text, lineHeight: 22, marginBottom: 16 },
  modalStats: { flexDirection: 'row', gap: 20, marginBottom: 16 },
  modalStat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  modalStatText: { fontSize: 14, color: Colors.muted },
  progressLabel: { fontSize: 12, color: Colors.muted, marginBottom: 6 },
  progressTrack: { height: 8, backgroundColor: Colors.border, borderRadius: 99, overflow: 'hidden', marginBottom: 20 },
  progressFill: { height: 8, borderRadius: 99 },
  actionBtn: { paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginBottom: 10 },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  badgeOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  badgeModal: { backgroundColor: '#fff', borderRadius: 20, padding: 32, alignItems: 'center', width: 280 },
  badgeCongrats: { fontSize: 24, fontWeight: '700', marginBottom: 16 },
  badgeCircle: { width: 90, height: 90, borderRadius: 45, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  badgeName: { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: 20 },
  badgeCloseBtn: { backgroundColor: Colors.primary, paddingHorizontal: 32, paddingVertical: 12, borderRadius: 10 },
  badgeCloseText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
