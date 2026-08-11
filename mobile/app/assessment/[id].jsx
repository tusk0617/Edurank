import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, Modal, ActivityIndicator, AppState, BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getSoal, submitAssessment, logActivity } from '../../services/api';
import Colors from '../../constants/Colors';

const KEYS = ['a', 'b', 'c', 'd'];
const LABELS = ['A', 'B', 'C', 'D'];

function fmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function fmtDurasi(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s} detik`;
  return `${m} menit ${s} detik`;
}

export default function AssessmentScreen() {
  const { id, judul } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [soalList, setSoalList] = useState([]);
  const [sesiId, setSesiId] = useState(null);
  const [judulAsm, setJudulAsm] = useState(judul || '');
  const [jawaban, setJawaban] = useState({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [violations, setViolations] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [warningVisible, setWarningVisible] = useState(false);

  const sesiRef = useRef(null);
  const violationsRef = useRef(0);
  const appStateRef = useRef(AppState.currentState);
  const timerRef = useRef(null);
  const resultRef = useRef(false);

  useEffect(() => { loadSoal(); }, []);

  const loadSoal = async () => {
    try {
      const res = await getSoal(id);
      const { sesi_id, soal, durasi_menit, judul: j } = res.data;
      setSoalList(soal);
      setSesiId(sesi_id);
      sesiRef.current = sesi_id;
      setJudulAsm(j || judul || '');
      setTimeLeft(durasi_menit * 60);
    } catch (err) {
      const msg = err.response?.data?.message || 'Gagal memuat soal';
      Alert.alert('Error', msg, [{ text: 'Kembali', onPress: () => router.back() }]);
    } finally {
      setLoading(false);
    }
  };

  // Timer countdown
  useEffect(() => {
    if (loading || result) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          if (!resultRef.current) doSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [loading, result]);

  // AppState — deteksi keluar app
  useEffect(() => {
    if (loading) return;
    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [loading, sesiId]);

  const handleAppStateChange = useCallback((nextState) => {
    const prev = appStateRef.current;
    appStateRef.current = nextState;
    if (resultRef.current) return;

    if (prev === 'active' && (nextState === 'background' || nextState === 'inactive')) {
      violationsRef.current += 1;
      setViolations(violationsRef.current);
      if (sesiRef.current) {
        logActivity(id, {
          sesi_id: sesiRef.current,
          jenis: 'app_background',
          keterangan: `Keluar dari aplikasi (pelanggaran ke-${violationsRef.current})`,
        }).catch(() => {});
      }
    } else if (nextState === 'active' && (prev === 'background' || prev === 'inactive')) {
      setWarningVisible(true);
    }
  }, [id]);

  // Cegah tombol back Android saat ujian berlangsung
  useEffect(() => {
    if (loading || result) return;
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      Alert.alert('Ujian Berlangsung', 'Yakin ingin keluar? Ujian akan tetap berjalan.', [
        { text: 'Tetap di sini', style: 'cancel' },
        { text: 'Keluar', style: 'destructive', onPress: () => router.back() },
      ]);
      return true;
    });
    return () => handler.remove();
  }, [loading, result]);

  const pilihJawaban = (key) => {
    const soalId = soalList[currentIdx]?.id;
    if (!soalId) return;
    setJawaban(prev => ({ ...prev, [soalId]: key }));
  };

  const doSubmit = async (auto = false) => {
    clearInterval(timerRef.current);
    resultRef.current = true;
    setSubmitting(true);
    try {
      const jawabanArr = soalList
        .filter(s => jawaban[s.id])
        .map(s => ({ soal_id: s.id, jawaban: jawaban[s.id] }));

      const res = await submitAssessment(id, { sesi_id: sesiRef.current, jawaban: jawabanArr });
      setResult(res.data);
    } catch (err) {
      resultRef.current = false;
      Alert.alert('Gagal Submit', err.response?.data?.message || 'Terjadi kesalahan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = () => {
    const belumDijawab = soalList.filter(s => !jawaban[s.id]).length;
    if (belumDijawab > 0) {
      Alert.alert(
        'Soal Belum Dijawab',
        `${belumDijawab} soal belum dijawab. Tetap submit?`,
        [
          { text: 'Cek lagi', style: 'cancel' },
          { text: 'Submit', style: 'destructive', onPress: () => doSubmit(false) },
        ]
      );
    } else {
      doSubmit(false);
    }
  };

  // Loading
  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={Colors.secondary} />
        <Text style={s.loadingText}>Memuat soal...</Text>
      </View>
    );
  }

  // Halaman hasil
  if (result) {
    const skor = Math.round(result.skor);
    const skorColor = skor >= 80 ? Colors.secondary : skor >= 60 ? Colors.warning : Colors.danger;
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.resultWrap}>
          <View style={s.resultCard}>
            <Text style={s.resultTitle}>Ujian Selesai</Text>
            <Text style={s.resultJudul}>{judulAsm}</Text>
            <View style={[s.skorCircle, { borderColor: skorColor }]}>
              <Text style={[s.skorNumber, { color: skorColor }]}>{skor}</Text>
              <Text style={s.skorLabel}>Skor</Text>
            </View>
            <View style={s.resultInfoRow}>
              <View style={s.resultInfoItem}>
                <Ionicons name="time-outline" size={18} color={Colors.muted} />
                <Text style={s.resultInfoText}>{fmtDurasi(result.durasi_detik)}</Text>
              </View>
              {violations > 0 && (
                <View style={s.resultInfoItem}>
                  <Ionicons name="warning-outline" size={18} color={Colors.danger} />
                  <Text style={[s.resultInfoText, { color: Colors.danger }]}>{violations} pelanggaran</Text>
                </View>
              )}
            </View>
            <TouchableOpacity style={s.doneBtn} onPress={() => router.replace('/(tabs)/home')} activeOpacity={0.85}>
              <Text style={s.doneBtnText}>Selesai</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const soal = soalList[currentIdx];
  const dijawab = soalList.filter(s => jawaban[s.id]).length;
  const isLast = currentIdx === soalList.length - 1;
  const timerDanger = timeLeft > 0 && timeLeft <= 60;

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.headerJudul} numberOfLines={1}>{judulAsm}</Text>
          <Text style={s.progressText}>{dijawab}/{soalList.length} dijawab</Text>
        </View>
        <View style={s.headerRight}>
          {violations > 0 && (
            <View style={s.violationBadge}>
              <Ionicons name="warning" size={12} color="#fff" />
              <Text style={s.violationText}>{violations}</Text>
            </View>
          )}
          <View style={[s.timerBox, timerDanger && s.timerDanger]}>
            <Ionicons name="time-outline" size={14} color={timerDanger ? '#fff' : Colors.text} />
            <Text style={[s.timerText, timerDanger && s.timerTextDanger]}>{fmtTime(timeLeft)}</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.soalContent} showsVerticalScrollIndicator={false}>
        <View style={s.soalNumRow}>
          <View style={s.soalNumBadge}>
            <Text style={s.soalNumText}>Soal {currentIdx + 1} / {soalList.length}</Text>
          </View>
        </View>

        <View style={s.pertanyaanCard}>
          <Text style={s.pertanyaanText}>{soal?.pertanyaan}</Text>
        </View>

        {KEYS.map((k, i) => {
          const teks = soal?.[`opsi_${k}`];
          if (!teks) return null;
          const selected = jawaban[soal?.id] === k;
          return (
            <TouchableOpacity
              key={k}
              style={[s.opsiBtn, selected && s.opsiBtnSelected]}
              onPress={() => pilihJawaban(k)}
              activeOpacity={0.7}
            >
              <View style={[s.opsiLabelBox, selected && s.opsiLabelBoxSelected]}>
                <Text style={[s.opsiLabelTxt, selected && { color: '#fff' }]}>{LABELS[i]}</Text>
              </View>
              <Text style={[s.opsiTeks, selected && s.opsiTeksSelected]}>{teks}</Text>
            </TouchableOpacity>
          );
        })}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Navigasi */}
      <View style={s.navBar}>
        <TouchableOpacity
          style={[s.navBtn, currentIdx === 0 && s.navBtnDisabled]}
          onPress={() => setCurrentIdx(i => Math.max(0, i - 1))}
          disabled={currentIdx === 0}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={20} color={currentIdx === 0 ? Colors.muted : Colors.text} />
          <Text style={[s.navBtnText, currentIdx === 0 && { color: Colors.muted }]}>Sebelumnya</Text>
        </TouchableOpacity>

        {isLast ? (
          <TouchableOpacity style={s.submitBtn} onPress={handleSubmit} disabled={submitting} activeOpacity={0.85}>
            {submitting
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.submitBtnText}>Submit</Text>}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={s.navBtn}
            onPress={() => setCurrentIdx(i => Math.min(soalList.length - 1, i + 1))}
            activeOpacity={0.7}
          >
            <Text style={s.navBtnText}>Berikutnya</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.text} />
          </TouchableOpacity>
        )}
      </View>

      {/* Modal peringatan kembali dari background */}
      <Modal visible={warningVisible} transparent animationType="fade">
        <View style={s.warningOverlay}>
          <View style={s.warningBox}>
            <Ionicons name="warning" size={44} color={Colors.warning} />
            <Text style={s.warningTitle}>Peringatan!</Text>
            <Text style={s.warningText}>
              Kamu keluar dari aplikasi saat ujian berlangsung.{'\n'}
              Pelanggaran ke-{violations} telah tercatat.
            </Text>
            <TouchableOpacity style={s.warningBtn} onPress={() => setWarningVisible(false)} activeOpacity={0.85}>
              <Text style={s.warningBtnText}>Lanjutkan Ujian</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background, gap: 12 },
  loadingText: { color: Colors.muted, fontSize: 14 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: Colors.card, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerJudul: { fontSize: 15, fontWeight: '700', color: Colors.text },
  progressText: { fontSize: 11, color: Colors.muted, marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  violationBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: Colors.danger, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3,
  },
  violationText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  timerBox: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.background, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: Colors.border,
  },
  timerDanger: { backgroundColor: Colors.danger, borderColor: Colors.danger },
  timerText: { fontSize: 14, fontWeight: '700', color: Colors.text },
  timerTextDanger: { color: '#fff' },

  soalContent: { padding: 16 },
  soalNumRow: { marginBottom: 12 },
  soalNumBadge: {
    alignSelf: 'flex-start', backgroundColor: Colors.secondary,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4,
  },
  soalNumText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  pertanyaanCard: {
    backgroundColor: Colors.card, borderRadius: 14, padding: 16, marginBottom: 16, elevation: 2,
  },
  pertanyaanText: { fontSize: 15, color: Colors.text, lineHeight: 24 },

  opsiBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.card, borderRadius: 12, padding: 14,
    marginBottom: 10, borderWidth: 1.5, borderColor: Colors.border, elevation: 1,
  },
  opsiBtnSelected: { borderColor: Colors.secondary, backgroundColor: Colors.secondary + '12' },
  opsiLabelBox: {
    width: 32, height: 32, borderRadius: 8, borderWidth: 1.5,
    borderColor: Colors.border, justifyContent: 'center', alignItems: 'center',
  },
  opsiLabelBoxSelected: { backgroundColor: Colors.secondary, borderColor: Colors.secondary },
  opsiLabelTxt: { fontSize: 13, fontWeight: '700', color: Colors.muted },
  opsiTeks: { flex: 1, fontSize: 14, color: Colors.text, lineHeight: 20 },
  opsiTeksSelected: { color: Colors.secondary, fontWeight: '600' },

  navBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 24,
    backgroundColor: Colors.card, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  navBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 8 },
  navBtnDisabled: { opacity: 0.4 },
  navBtnText: { fontSize: 14, fontWeight: '600', color: Colors.text },
  submitBtn: {
    backgroundColor: Colors.secondary, borderRadius: 10,
    paddingHorizontal: 28, paddingVertical: 12,
  },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  resultWrap: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: Colors.background },
  resultCard: { backgroundColor: Colors.card, borderRadius: 20, padding: 28, alignItems: 'center', elevation: 4 },
  resultTitle: { fontSize: 22, fontWeight: '800', color: Colors.text, marginBottom: 4 },
  resultJudul: { fontSize: 14, color: Colors.muted, marginBottom: 28, textAlign: 'center' },
  skorCircle: {
    width: 130, height: 130, borderRadius: 65, borderWidth: 4,
    justifyContent: 'center', alignItems: 'center', marginBottom: 24,
  },
  skorNumber: { fontSize: 48, fontWeight: '900' },
  skorLabel: { fontSize: 13, color: Colors.muted, fontWeight: '600' },
  resultInfoRow: { flexDirection: 'row', gap: 20, marginBottom: 28 },
  resultInfoItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  resultInfoText: { fontSize: 13, color: Colors.muted, fontWeight: '600' },
  doneBtn: {
    backgroundColor: Colors.secondary, borderRadius: 12,
    paddingHorizontal: 40, paddingVertical: 14, width: '100%', alignItems: 'center',
  },
  doneBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  warningOverlay: { flex: 1, backgroundColor: '#00000080', justifyContent: 'center', padding: 32 },
  warningBox: { backgroundColor: Colors.card, borderRadius: 20, padding: 28, alignItems: 'center' },
  warningTitle: { fontSize: 20, fontWeight: '800', color: Colors.danger, marginTop: 12, marginBottom: 8 },
  warningText: { textAlign: 'center', color: Colors.text, lineHeight: 22, marginBottom: 24 },
  warningBtn: {
    backgroundColor: Colors.secondary, borderRadius: 12,
    paddingHorizontal: 32, paddingVertical: 12, width: '100%', alignItems: 'center',
  },
  warningBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
