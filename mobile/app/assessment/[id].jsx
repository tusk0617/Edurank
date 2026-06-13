import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getSoal, submitAssessment } from '../../services/api';
import ProgressBar from '../../components/ui/ProgressBar';
import Colors from '../../constants/Colors';

const SCREENS = { LOADING: 'loading', SOAL: 'soal', HASIL: 'hasil', PEMBAHASAN: 'pembahasan' };

export default function AssessmentSoalScreen() {
  const { id } = useLocalSearchParams();
  const [screen, setScreen] = useState(SCREENS.LOADING);
  const [sesiId, setSesiId] = useState(null);
  const [soalList, setSoalList] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [jawaban, setJawaban] = useState({});
  const [durasiMenit, setDurasiMenit] = useState(30);
  const [timeLeft, setTimeLeft] = useState(0);
  const [hasil, setHasil] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [displaySkor, setDisplaySkor] = useState(0);

  useEffect(() => {
    fetchSoal();
  }, []);

  useEffect(() => {
    if (screen !== SCREENS.SOAL) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [screen]);

  const fetchSoal = async () => {
    try {
      const res = await getSoal(id);
      setSesiId(res.data.sesi_id);
      setSoalList(res.data.soal);
      setDurasiMenit(res.data.durasi_menit);
      setTimeLeft(res.data.durasi_menit * 60);
      setScreen(SCREENS.SOAL);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat soal');
      setScreen('error');
    }
  };

  const handleSubmit = useCallback(async (autoSubmit = false) => {
    const confirm = () => {
      setSubmitting(true);
      const jawabanArr = soalList.map(s => ({
        soal_id: s.id,
        jawaban: jawaban[s.id] || 'a',
      }));

      submitAssessment(id, { sesi_id: sesiId, jawaban: jawabanArr })
        .then(res => {
          setHasil(res.data);
          setDisplaySkor(Math.round(res.data.skor));
          setScreen(SCREENS.HASIL);
        })
        .catch(err => {
          Alert.alert('Error', err.response?.data?.message || 'Gagal submit');
        })
        .finally(() => setSubmitting(false));
    };

    if (autoSubmit) {
      confirm();
    } else {
      Alert.alert('Konfirmasi Submit', 'Yakin ingin mengumpulkan jawaban?', [
        { text: 'Batal', style: 'cancel' },
        { text: 'Submit', onPress: confirm },
      ]);
    }
  }, [jawaban, soalList, sesiId, id]);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (screen === SCREENS.LOADING) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  if (screen === 'error') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Ionicons name="alert-circle" size={48} color={Colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Kembali</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (screen === SCREENS.HASIL && hasil) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.hasilContainer}>
          <Ionicons
            name={hasil.lulus ? 'checkmark-circle' : 'close-circle'}
            size={64}
            color={hasil.lulus ? Colors.secondary : Colors.danger}
            style={{ marginBottom: 8 }}
          />

          <Text style={[styles.skorText, { color: hasil.lulus ? Colors.secondary : Colors.danger }]}>
            {displaySkor}
          </Text>

          <Text style={[styles.lulusText, { color: hasil.lulus ? Colors.secondary : Colors.danger }]}>
            {hasil.lulus ? '🎉 LULUS!' : 'BELUM LULUS'}
          </Text>

          <View style={styles.hasilCard}>
            <HasilRow label="Skor Mentah" value={`${hasil.skor_mentah?.toFixed(0) || 0}`} />
            {hasil.potongan_terlambat > 0 && (
              <HasilRow label="Potongan Terlambat" value={`-${hasil.potongan_terlambat}%`} color={Colors.danger} />
            )}
            {hasil.potongan_remedial > 0 && (
              <HasilRow label="Potongan Remedial" value={`-${hasil.potongan_remedial}%`} color={Colors.warning} />
            )}
            <HasilRow label="Poin Didapat" value={`+${hasil.poin_didapat} poin`} color={Colors.primary} bold />
            {hasil.ranking_baru && <HasilRow label="Ranking Kamu" value={`#${hasil.ranking_baru}`} />}
            <HasilRow label="Percobaan Ke-" value={`${hasil.percobaan_ke}`} />
          </View>

          <TouchableOpacity style={styles.actionBtnOutline} onPress={() => setScreen(SCREENS.PEMBAHASAN)}>
            <Text style={styles.actionBtnOutlineText}>📋 Lihat Pembahasan</Text>
          </TouchableOpacity>

          {hasil.bisa_remedial && (
            <TouchableOpacity style={[styles.actionBtnSolid, { backgroundColor: Colors.warning }]} onPress={() => router.replace(`/assessment/${id}`)}>
              <Text style={styles.actionBtnSolidText}>🔄 Ikuti Remedial</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={[styles.actionBtnSolid, { backgroundColor: Colors.primary }]} onPress={() => router.replace('/(tabs)/home')}>
            <Text style={styles.actionBtnSolidText}>🏠 Kembali ke Beranda</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === SCREENS.PEMBAHASAN && hasil) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.pembahasanHeader}>
          <TouchableOpacity onPress={() => setScreen(SCREENS.HASIL)}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.pembahasanTitle}>Pembahasan</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          {hasil.pembahasan.map((p, idx) => (
            <View key={p.soal_id} style={[styles.pembahasanCard, { borderLeftColor: p.benar ? Colors.secondary : Colors.danger }]}>
              <View style={styles.pembahasanHeader2}>
                <Text style={styles.nomorSoal}>Soal {idx + 1}</Text>
                <Ionicons name={p.benar ? 'checkmark-circle' : 'close-circle'} size={20} color={p.benar ? Colors.secondary : Colors.danger} />
              </View>
              <Text style={styles.pertanyaan}>{p.pertanyaan}</Text>
              {['a', 'b', 'c', 'd'].map(opt => (
                <View
                  key={opt}
                  style={[
                    styles.opsiRow,
                    p.jawaban_benar === opt && styles.opsiBenar,
                    p.jawaban_dipilih === opt && p.jawaban_dipilih !== p.jawaban_benar && styles.opsiSalah,
                  ]}
                >
                  <Text style={styles.opsiLabel}>{opt.toUpperCase()}.</Text>
                  <Text style={styles.opsiText}>{p.opsi[opt]}</Text>
                  {p.jawaban_benar === opt && <Ionicons name="checkmark" size={14} color={Colors.secondary} />}
                </View>
              ))}
            </View>
          ))}
          <View style={{ height: 24 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // SCREEN: SOAL
  const currentSoal = soalList[currentIdx];
  const isLast = currentIdx === soalList.length - 1;
  const answered = Object.keys(jawaban).length;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.soalHeader}>
        <TouchableOpacity onPress={() => Alert.alert('Keluar?', 'Progress akan hilang.', [
          { text: 'Batal', style: 'cancel' },
          { text: 'Keluar', style: 'destructive', onPress: () => router.back() },
        ])}>
          <Ionicons name="close" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, paddingHorizontal: 16 }}>
          <Text style={styles.soalCount}>Soal {currentIdx + 1} / {soalList.length}</Text>
          <ProgressBar value={(answered / soalList.length) * 100} color={Colors.primary} height={4} />
        </View>
        <View style={[styles.timerBadge, timeLeft < 60 && { backgroundColor: Colors.danger }]}>
          <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.soalContent}>
        <Text style={styles.pertanyaanText}>{currentSoal?.pertanyaan}</Text>

        {['a', 'b', 'c', 'd'].map(opt => (
          <TouchableOpacity
            key={opt}
            style={[styles.opsiBtn, jawaban[currentSoal?.id] === opt && styles.opsiBtnSelected]}
            onPress={() => setJawaban(prev => ({ ...prev, [currentSoal.id]: opt }))}
            activeOpacity={0.8}
          >
            <View style={[styles.opsiCircle, jawaban[currentSoal?.id] === opt && styles.opsiCircleSelected]}>
              <Text style={[styles.opsiCircleText, jawaban[currentSoal?.id] === opt && { color: '#fff' }]}>{opt.toUpperCase()}</Text>
            </View>
            <Text style={[styles.opsiBtnText, jawaban[currentSoal?.id] === opt && { color: Colors.primary, fontWeight: '600' }]}>
              {currentSoal?.[`opsi_${opt}`]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.navRow}>
        <TouchableOpacity
          style={[styles.navBtn, currentIdx === 0 && styles.navBtnDisabled]}
          onPress={() => setCurrentIdx(i => i - 1)}
          disabled={currentIdx === 0}
        >
          <Ionicons name="chevron-back" size={20} color={currentIdx === 0 ? Colors.muted : Colors.primary} />
          <Text style={[styles.navText, currentIdx === 0 && { color: Colors.muted }]}>Sebelumnya</Text>
        </TouchableOpacity>

        {isLast ? (
          <TouchableOpacity style={styles.submitBtn} onPress={() => handleSubmit(false)} disabled={submitting}>
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Submit ✓</Text>}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.nextBtn} onPress={() => setCurrentIdx(i => i + 1)}>
            <Text style={styles.nextBtnText}>Selanjutnya</Text>
            <Ionicons name="chevron-forward" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

function HasilRow({ label, value, color, bold }) {
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.label}>{label}</Text>
      <Text style={[rowStyles.value, color && { color }, bold && { fontWeight: '700' }]}>{value}</Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.border },
  label: { fontSize: 14, color: Colors.muted },
  value: { fontSize: 14, fontWeight: '600', color: Colors.text },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24 },
  errorText: { fontSize: 16, color: Colors.danger, textAlign: 'center' },
  backBtn: { backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  backBtnText: { color: '#fff', fontWeight: '600' },
  soalHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: Colors.card, borderBottomWidth: 1, borderBottomColor: Colors.border },
  soalCount: { fontSize: 12, color: Colors.muted, marginBottom: 4 },
  timerBadge: { backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  timerText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  soalContent: { padding: 20, gap: 12 },
  pertanyaanText: { fontSize: 16, fontWeight: '600', color: Colors.text, lineHeight: 24, marginBottom: 8 },
  opsiBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 10, borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  opsiBtnSelected: { borderColor: Colors.primary, backgroundColor: Colors.lightBlue },
  opsiCircle: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 1.5, borderColor: Colors.border,
    justifyContent: 'center', alignItems: 'center',
  },
  opsiCircleSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  opsiCircleText: { fontWeight: '700', fontSize: 13, color: Colors.text },
  opsiBtnText: { flex: 1, fontSize: 14, color: Colors.text },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: Colors.card, borderTopWidth: 1, borderTopColor: Colors.border },
  navBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 10 },
  navBtnDisabled: {},
  navText: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
  nextBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  nextBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  submitBtn: { backgroundColor: Colors.secondary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  hasilContainer: { padding: 24, alignItems: 'center', gap: 12 },
  skorText: { fontSize: 72, fontWeight: '800' },
  lulusText: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  hasilCard: { width: '100%', backgroundColor: Colors.card, borderRadius: 12, padding: 16, marginVertical: 8 },
  actionBtnOutline: { width: '100%', padding: 14, borderRadius: 10, borderWidth: 1.5, borderColor: Colors.primary, alignItems: 'center' },
  actionBtnOutlineText: { color: Colors.primary, fontWeight: '600', fontSize: 15 },
  actionBtnSolid: { width: '100%', padding: 14, borderRadius: 10, alignItems: 'center' },
  actionBtnSolidText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  pembahasanHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: Colors.card, borderBottomWidth: 1, borderBottomColor: Colors.border },
  pembahasanTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  pembahasanCard: { backgroundColor: Colors.card, borderRadius: 10, padding: 14, borderLeftWidth: 4, gap: 8 },
  pembahasanHeader2: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nomorSoal: { fontSize: 12, fontWeight: '700', color: Colors.muted },
  pertanyaan: { fontSize: 14, fontWeight: '600', color: Colors.text, lineHeight: 20 },
  opsiRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, borderRadius: 6 },
  opsiBenar: { backgroundColor: Colors.secondary + '20' },
  opsiSalah: { backgroundColor: Colors.danger + '15' },
  opsiLabel: { fontSize: 13, fontWeight: '700', color: Colors.muted, width: 20 },
  opsiText: { fontSize: 13, color: Colors.text, flex: 1 },
});
