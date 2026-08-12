import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, Modal, ActivityIndicator, AppState, BackHandler, FlatList,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getSoal, submitAssessment, logActivity, logKeluar, logKembali } from '../../services/api';
import Colors from '../../constants/Colors';

const KEYS = ['a', 'b', 'c', 'd'];
const LABELS = ['A', 'B', 'C', 'D'];

function fmtTime(sec) {
  if (!Number.isFinite(sec) || sec < 0) return '00:00';
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
  const STORAGE_KEY      = `asm_progress_${id}`;
  const PENDING_LOGS_KEY = `asm_pending_logs_${id}`;

  const [loading, setLoading] = useState(true);
  const [soalList, setSoalList] = useState([]);
  const [sesiId, setSesiId] = useState(null);
  const [judulAsm, setJudulAsm] = useState(judul || '');
  const [jawaban, setJawabanState] = useState({});
  const [currentIdx, setCurrentIdxState] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [violations, setViolations] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [warningVisible, setWarningVisible] = useState(false);
  const [savedIndicator, setSavedIndicator] = useState(false);

  // Refs untuk akses stale-closure-safe di callback async
  const sesiRef          = useRef(null);
  const jawabanRef       = useRef({});
  const currentIdxRef    = useRef(0);
  const soalRef          = useRef([]);
  const timeLeftRef      = useRef(0);         // sisa waktu (sync dengan state)
  const violationsRef    = useRef(0);
  const appStateRef      = useRef(AppState.currentState);
  const timerRef         = useRef(null);
  const resultRef        = useRef(false);
  const saveTimerRef     = useRef(null);
  const indicatorTimer   = useRef(null);
  const currentLogId     = useRef(null);      // log_id untuk PATCH /log-keluar
  const pendingLogs      = useRef([]);        // antrian offline log-keluar
  const bgEnteredAt      = useRef(null);      // timestamp masuk background (untuk koreksi timer)

  // Wrapper setter: sinkronisasi state + ref
  const setJawaban = useCallback((updater) => {
    setJawabanState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      jawabanRef.current = next;
      return next;
    });
  }, []);

  const setCurrentIdx = useCallback((updater) => {
    setCurrentIdxState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      currentIdxRef.current = next;
      return next;
    });
  }, []);

  // ── Simpan progres ke AsyncStorage ──────────────────────────────────────────
  const doSave = useCallback(async () => {
    if (!sesiRef.current || resultRef.current) return;
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
        sesi_id:    sesiRef.current,
        soal:       soalRef.current,
        jawaban:    jawabanRef.current,
        currentIdx: currentIdxRef.current,
        violations: violationsRef.current,  // simpan jumlah pelanggaran
      }));
      setSavedIndicator(true);
      clearTimeout(indicatorTimer.current);
      indicatorTimer.current = setTimeout(() => setSavedIndicator(false), 2000);
    } catch (_) {}
  }, [STORAGE_KEY]);

  const scheduleSave = useCallback(() => {
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(doSave, 3000);
  }, [doSave]);

  // ── Simpan/load pending logs ke AsyncStorage ─────────────────────────────────
  const savePendingLogs = useCallback(async () => {
    try {
      if (pendingLogs.current.length > 0) {
        await AsyncStorage.setItem(PENDING_LOGS_KEY, JSON.stringify(pendingLogs.current));
      } else {
        await AsyncStorage.removeItem(PENDING_LOGS_KEY);
      }
    } catch (_) {}
  }, [PENDING_LOGS_KEY]);

  const loadPendingLogs = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(PENDING_LOGS_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (Array.isArray(saved) && saved.length > 0) {
          pendingLogs.current = [...pendingLogs.current, ...saved];
        }
      }
    } catch (_) {}
  }, [PENDING_LOGS_KEY]);

  // ── Flush antrian log offline ────────────────────────────────────────────────
  const flushPendingLogs = useCallback(async (waktu_kembali = null) => {
    if (pendingLogs.current.length === 0) return;
    const queue = [...pendingLogs.current];
    pendingLogs.current = [];
    for (const pending of queue) {
      try {
        const payload = { sesi_id: pending.sesi_id, waktu_keluar: pending.waktu_keluar };
        if (waktu_kembali) payload.waktu_kembali = waktu_kembali;
        await logKeluar(payload);
      } catch {
        pendingLogs.current.push(pending); // masih offline, simpan kembali
      }
    }
    await savePendingLogs(); // update AsyncStorage setelah flush
  }, [savePendingLogs]);

  // ── Load soal + restore dari AsyncStorage ───────────────────────────────────
  const loadSoal = async () => {
    await loadPendingLogs(); // restore pending logs yang belum terkirim
    try {
      // Coba ambil progres tersimpan
      let stored = null;
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) stored = JSON.parse(raw);
      } catch (_) {}

      // Ambil sesi dari backend (lanjut atau baru)
      const res = await getSoal(id);
      const { sesi_id, soal, durasi_menit, judul: j, waktu_mulai } = res.data;

      sesiRef.current = sesi_id;
      setSesiId(sesi_id);
      setJudulAsm(j || judul || '');

      // Hitung sisa waktu berdasarkan waktu_mulai dari server (selalu akurat)
      const startMs = waktu_mulai ? new Date(waktu_mulai).getTime() : NaN;
      const elapsedSec = Number.isFinite(startMs) ? Math.floor((Date.now() - startMs) / 1000) : 0;
      const computedTimeLeft = Math.max(0, (durasi_menit || 0) * 60 - elapsedSec);
      setTimeLeft(computedTimeLeft);
      timeLeftRef.current = computedTimeLeft;

      // Restore progres jika sesi sama dan data valid
      if (stored && stored.sesi_id === sesi_id && stored.soal?.length > 0) {
        soalRef.current = stored.soal;
        setSoalList(stored.soal);
        setJawaban(stored.jawaban || {});
        setCurrentIdx(stored.currentIdx || 0);

        // Pulihkan jumlah pelanggaran dan tampilkan peringatan
        const restoredViolations = stored.violations || 0;
        if (restoredViolations > 0) {
          violationsRef.current = restoredViolations;
          setViolations(restoredViolations);
          setWarningVisible(true);  // tampilkan satu kali peringatan keluar
        }
      } else {
        if (stored) AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
        soalRef.current = soal;
        setSoalList(soal);
        setJawaban({});
        setCurrentIdx(0);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Gagal memuat soal';
      Alert.alert('Error', msg, [{ text: 'Kembali', onPress: () => router.back() }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSoal(); }, []);

  // ── Timer countdown ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (loading || result) return;
    if (timeLeft === 0) {
      if (!resultRef.current) doSubmit(true);
      return;
    }
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        const next = prev - 1;
        timeLeftRef.current = next;
        if (next <= 0) {
          clearInterval(timerRef.current);
          if (!resultRef.current) doSubmit(true);
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [loading, result]);

  // ── AppState: deteksi keluar & kembali ke aplikasi ──────────────────────────
  const handleAppStateChange = useCallback((nextState) => {
    const prev = appStateRef.current;
    appStateRef.current = nextState;
    if (resultRef.current) return;

    if (prev === 'active' && (nextState === 'background' || nextState === 'inactive')) {
      bgEnteredAt.current = Date.now();
      violationsRef.current += 1;
      setViolations(violationsRef.current);

      clearTimeout(saveTimerRef.current);
      doSave();

      console.log('[AppState] KELUAR — sesiRef:', sesiRef.current, '| violations:', violationsRef.current);

      if (sesiRef.current) {
        const waktu_keluar = new Date().toISOString();

        logActivity(id, {
          sesi_id: sesiRef.current,
          jenis: 'app_background',
          keterangan: `Keluar dari aplikasi (pelanggaran ke-${violationsRef.current})`,
        }).catch(err => console.log('[logActivity] GAGAL:', err?.response?.status, err?.message));

        console.log('[logKeluar] KIRIM sesi_id:', sesiRef.current, 'waktu_keluar:', waktu_keluar);
        logKeluar({ sesi_id: sesiRef.current, waktu_keluar })
          .then(res2 => {
            currentLogId.current = res2.data.log_id;
            console.log('[logKeluar] SUKSES log_id:', res2.data.log_id);
          })
          .catch(err => {
            console.log('[logKeluar] GAGAL:', err?.response?.status, err?.response?.data, err?.message);
            pendingLogs.current.push({ sesi_id: sesiRef.current, waktu_keluar });
            savePendingLogs();
          });
      } else {
        console.log('[AppState] sesiRef NULL — log tidak dikirim');
      }
    } else if (nextState === 'active' && (prev === 'background' || prev === 'inactive')) {
      // Koreksi timer: kurangi waktu yang berlalu selama background
      if (bgEnteredAt.current) {
        const bgElapsed = Math.floor((Date.now() - bgEnteredAt.current) / 1000);
        bgEnteredAt.current = null;
        const corrected = Math.max(0, timeLeftRef.current - bgElapsed);
        timeLeftRef.current = corrected;
        setTimeLeft(corrected);
        if (corrected === 0 && !resultRef.current) {
          clearInterval(timerRef.current);
          doSubmit(true);
          return;
        }
      }

      setWarningVisible(true);
      const waktu_kembali = new Date().toISOString();

      console.log('[AppState] KEMBALI — pendingLogs:', pendingLogs.current.length, '| currentLogId:', currentLogId.current);
      flushPendingLogs(waktu_kembali).catch(err => console.log('[flushPendingLogs] GAGAL:', err?.message));

      if (currentLogId.current) {
        logKembali(currentLogId.current, { waktu_kembali })
          .then(() => { currentLogId.current = null; console.log('[logKembali] SUKSES'); })
          .catch(err => console.log('[logKembali] GAGAL:', err?.response?.status, err?.message));
      }
    }
  }, [id, doSave, flushPendingLogs]);

  useEffect(() => {
    if (loading) return;
    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [loading, handleAppStateChange]);

  // ── Cegah back button Android saat ujian ────────────────────────────────────
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

  // ── Aksi ────────────────────────────────────────────────────────────────────
  const pilihJawaban = (key) => {
    const soalId = soalRef.current[currentIdxRef.current]?.id;
    if (!soalId) return;
    setJawaban(prev => ({ ...prev, [soalId]: key }));
    scheduleSave();
  };

  const doSubmit = async (auto = false) => {
    clearInterval(timerRef.current);
    clearTimeout(saveTimerRef.current);
    resultRef.current = true;
    setSubmitting(true);
    try {
      // Flush pending logs sebelum submit agar jumlah_keluar tercatat
      if (pendingLogs.current.length > 0) {
        await flushPendingLogs().catch(() => {});
      }

      const jawabanArr = soalRef.current
        .filter(s => jawabanRef.current[s.id])
        .map(s => ({ soal_id: s.id, jawaban: jawabanRef.current[s.id] }));

      const res = await submitAssessment(id, { sesi_id: sesiRef.current, jawaban: jawabanArr });
      setResult(res.data);
      AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
      AsyncStorage.removeItem(PENDING_LOGS_KEY).catch(() => {});
    } catch (err) {
      resultRef.current = false;
      Alert.alert('Gagal Submit', err.response?.data?.message || 'Terjadi kesalahan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = () => {
    const belumDijawab = soalRef.current.filter(s => !jawabanRef.current[s.id]).length;
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

  // ── Render ───────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={Colors.secondary} />
        <Text style={s.loadingText}>Memuat soal...</Text>
      </View>
    );
  }

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
              <Text style={s.skorLabel}>Nilai</Text>
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
          {savedIndicator && (
            <View style={s.savedBadge}>
              <Ionicons name="checkmark-circle" size={12} color={Colors.secondary} />
              <Text style={s.savedText}>Tersimpan</Text>
            </View>
          )}
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

      {/* Nomor soal navigator */}
      <View style={s.soalNav}>
        <FlatList
          data={soalList}
          horizontal
          keyExtractor={(_, i) => i.toString()}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.soalNavContent}
          renderItem={({ item, index }) => {
            const isActive   = index === currentIdx;
            const isDijawab  = !!jawaban[item.id];
            return (
              <TouchableOpacity
                style={[
                  s.soalNumBtn,
                  isDijawab && s.soalNumBtnDijawab,
                  isActive   && s.soalNumBtnActive,
                ]}
                onPress={() => { setCurrentIdx(index); scheduleSave(); }}
                activeOpacity={0.7}
              >
                <Text style={[
                  s.soalNumBtnText,
                  isDijawab && s.soalNumBtnTextDijawab,
                  isActive   && s.soalNumBtnTextActive,
                ]}>
                  {index + 1}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Navigasi */}
      <View style={s.navBar}>
        <TouchableOpacity
          style={[s.navBtn, currentIdx === 0 && s.navBtnDisabled]}
          onPress={() => { setCurrentIdx(i => Math.max(0, i - 1)); scheduleSave(); }}
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
            onPress={() => { setCurrentIdx(i => Math.min(soalList.length - 1, i + 1)); scheduleSave(); }}
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
  savedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: Colors.secondary + '20', borderRadius: 8,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  savedText: { fontSize: 10, color: Colors.secondary, fontWeight: '600' },
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

  soalNav: {
    backgroundColor: Colors.card,
    borderTopWidth: 1, borderTopColor: Colors.border,
    paddingVertical: 10,
  },
  soalNavContent: { paddingHorizontal: 12, gap: 8 },
  soalNumBtn: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  soalNumBtnDijawab: {
    backgroundColor: Colors.secondary + '20',
    borderColor: Colors.secondary,
  },
  soalNumBtnActive: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
  },
  soalNumBtnText: { fontSize: 13, fontWeight: '700', color: Colors.muted },
  soalNumBtnTextDijawab: { color: Colors.secondary },
  soalNumBtnTextActive: { color: '#fff' },

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
