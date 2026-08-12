import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { getGuruHasilJawaban } from '../../services/api';
import Colors from '../../constants/Colors';

const OPSI = ['a', 'b', 'c', 'd'];
const LABEL = ['A', 'B', 'C', 'D'];

function fmtDurasi(detik) {
  if (!detik) return '-';
  const m = Math.floor(detik / 60);
  const s = detik % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function DetailJawaban() {
  const { hasilId, namaSiswa } = useLocalSearchParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState('');

  const fetchData = useCallback(async () => {
    if (!hasilId) { router.back(); return; }
    try {
      const res = await getGuruHasilJawaban(hasilId);
      setData(res.data);
    } catch (err) {
      const status = err?.response?.status;
      const msg    = err?.response?.data?.message || err?.message || 'unknown';
      console.log('[detail-jawaban] GAGAL', status, msg, 'hasilId:', hasilId);
      setErrMsg(`${status ?? 'ERR'}: ${msg}`);
      setData(null);
    }
    finally { setLoading(false); }
  }, [hasilId]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </TouchableOpacity>
        </View>
        <View style={s.center}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.danger} />
          <Text style={{ color: Colors.danger, marginTop: 8 }}>Gagal memuat data</Text>
          {!!errMsg && <Text style={{ color: Colors.muted, marginTop: 6, fontSize: 12, textAlign: 'center', paddingHorizontal: 16 }}>{errMsg}</Text>}
        </View>
      </SafeAreaView>
    );
  }

  const { sesi, jawaban } = data;
  const skor = Math.round(parseFloat(sesi.skor) || 0);
  const skorColor = skor >= 80 ? Colors.success : skor >= 60 ? Colors.warning : Colors.danger;
  const countBenar = jawaban.filter(j => j.benar).length;

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle} numberOfLines={1}>{sesi.nama}</Text>
          <Text style={s.headerSub} numberOfLines={1}>{sesi.assessment}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.sesiBanner}>
          <View style={s.sesiStat}>
            <Text style={s.sesiLabel}>Nilai</Text>
            <Text style={[s.sesiSkor, { color: skorColor }]}>{skor}</Text>
          </View>
          <View style={s.sesiDivider} />
          <View style={s.sesiStat}>
            <Text style={s.sesiLabel}>Benar</Text>
            <Text style={s.sesiVal}>{countBenar}/{jawaban.length}</Text>
          </View>
          <View style={s.sesiDivider} />
          <View style={s.sesiStat}>
            <Text style={s.sesiLabel}>Durasi</Text>
            <Text style={s.sesiVal}>{fmtDurasi(sesi.durasi_detik)}</Text>
          </View>
          {sesi.total_pelanggaran > 0 && (
            <>
              <View style={s.sesiDivider} />
              <View style={s.sesiStat}>
                <Text style={s.sesiLabel}>Pelanggaran</Text>
                <Text style={[s.sesiVal, { color: Colors.danger }]}>{sesi.total_pelanggaran}x</Text>
              </View>
            </>
          )}
        </View>

        {jawaban.map((item, idx) => {
          const benar = Boolean(item.benar);
          return (
            <View key={item.soal_id} style={s.soalCard}>
              <View style={s.soalHeader}>
                <View style={s.soalNumBadge}>
                  <Text style={s.soalNumText}>Soal {idx + 1}</Text>
                </View>
                <View style={[s.soalStatusBadge, { backgroundColor: benar ? Colors.success + '20' : Colors.danger + '20' }]}>
                  <Ionicons
                    name={benar ? 'checkmark-circle' : 'close-circle'}
                    size={14}
                    color={benar ? Colors.success : Colors.danger}
                  />
                  <Text style={[s.soalStatusText, { color: benar ? Colors.success : Colors.danger }]}>
                    {benar ? 'Benar' : 'Salah'}
                  </Text>
                </View>
              </View>

              <Text style={s.pertanyaan}>{item.pertanyaan}</Text>

              {OPSI.map((k, i) => {
                const teks = item[`opsi_${k}`];
                if (!teks) return null;
                const isCorrect = item.jawaban_benar === k;
                const isChosen  = item.jawaban_dipilih === k;

                let bg = 'transparent', borderColor = Colors.border, txtColor = Colors.text;
                let labelBg = 'transparent', labelBorder = Colors.border, labelTxt = Colors.muted;

                if (isCorrect) {
                  bg = Colors.success + '14'; borderColor = Colors.success; txtColor = Colors.success;
                  labelBg = Colors.success; labelBorder = Colors.success; labelTxt = '#fff';
                }
                if (isChosen && !isCorrect) {
                  bg = Colors.danger + '14'; borderColor = Colors.danger; txtColor = Colors.danger;
                  labelBg = Colors.danger; labelBorder = Colors.danger; labelTxt = '#fff';
                }

                return (
                  <View key={k} style={[s.opsiRow, { borderColor, backgroundColor: bg }]}>
                    <View style={[s.opsiLabel, { backgroundColor: labelBg, borderColor: labelBorder }]}>
                      <Text style={[s.opsiLabelText, { color: labelTxt }]}>{LABEL[i]}</Text>
                    </View>
                    <Text style={[s.opsiTeks, { color: txtColor }]} numberOfLines={4}>{teks}</Text>
                    {isChosen && (
                      <Ionicons
                        name={isCorrect ? 'checkmark-circle' : 'close-circle'}
                        size={18}
                        color={isCorrect ? Colors.success : Colors.danger}
                      />
                    )}
                    {isCorrect && !isChosen && (
                      <Ionicons name="checkmark" size={18} color={Colors.success} />
                    )}
                  </View>
                );
              })}
            </View>
          );
        })}
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, paddingTop: 12,
    backgroundColor: Colors.card, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: Colors.text },
  headerSub: { fontSize: 11, color: Colors.muted, marginTop: 1 },
  content: { padding: 16 },
  sesiBanner: {
    flexDirection: 'row', backgroundColor: Colors.card, borderRadius: 14,
    padding: 16, marginBottom: 16, elevation: 2, alignItems: 'center',
  },
  sesiStat: { flex: 1, alignItems: 'center' },
  sesiDivider: { width: 1, height: 36, backgroundColor: Colors.border, marginHorizontal: 4 },
  sesiLabel: { fontSize: 10, color: Colors.muted, marginBottom: 3 },
  sesiSkor: { fontSize: 26, fontWeight: '900' },
  sesiVal: { fontSize: 16, fontWeight: '800', color: Colors.text },
  soalCard: { backgroundColor: Colors.card, borderRadius: 14, padding: 16, marginBottom: 12, elevation: 2 },
  soalHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  soalNumBadge: { backgroundColor: Colors.primary + '18', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  soalNumText: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  soalStatusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  soalStatusText: { fontSize: 11, fontWeight: '700' },
  pertanyaan: { fontSize: 14, color: Colors.text, lineHeight: 22, marginBottom: 12 },
  opsiRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderRadius: 10, padding: 10, marginBottom: 8 },
  opsiLabel: { width: 28, height: 28, borderRadius: 7, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  opsiLabelText: { fontSize: 12, fontWeight: '800' },
  opsiTeks: { flex: 1, fontSize: 13, lineHeight: 18 },
});
