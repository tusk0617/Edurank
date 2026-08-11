import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { bulkCreateSoal } from '../../../services/api';
import Colors from '../../../constants/Colors';

const JAWABAN_OPTS = ['a', 'b', 'c', 'd'];
const newSlot = () => ({ pertanyaan: '', opsi_a: '', opsi_b: '', opsi_c: '', opsi_d: '', jawaban_benar: '' });

export default function BulkInputSoal() {
  const [slots, setSlots] = useState([newSlot()]);
  const [saving, setSaving] = useState(false);

  const update = (idx, key, val) => {
    setSlots(prev => prev.map((s, i) => i === idx ? { ...s, [key]: val } : s));
  };

  const addSlot = () => {
    if (slots.length >= 25) return Alert.alert('Batas', 'Maksimal 25 soal per sesi bulk input');
    setSlots(prev => [...prev, newSlot()]);
  };

  const removeSlot = (idx) => {
    if (slots.length === 1) return;
    setSlots(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    const valid = slots.filter(s =>
      s.pertanyaan.trim() && s.opsi_a && s.opsi_b && s.opsi_c && s.opsi_d && s.jawaban_benar
    );
    if (valid.length === 0) {
      return Alert.alert('Perhatian', 'Isi minimal 1 soal lengkap terlebih dahulu');
    }
    const incomplete = slots.length - valid.length;
    const msg = incomplete > 0
      ? `${valid.length} soal akan disimpan. ${incomplete} soal tidak lengkap akan dilewati. Lanjutkan?`
      : `Simpan ${valid.length} soal sekaligus?`;

    Alert.alert('Konfirmasi', msg, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Simpan', onPress: async () => {
          setSaving(true);
          try {
            await bulkCreateSoal(valid);
            Alert.alert('Berhasil', `${valid.length} soal berhasil ditambahkan`, [
              { text: 'OK', onPress: () => router.back() },
            ]);
          } catch (err) {
            Alert.alert('Gagal', err.response?.data?.message || 'Terjadi kesalahan');
          } finally { setSaving(false); }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Bulk Input Soal</Text>
        <Text style={s.headerCount}>{slots.length}/25</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={s.infoBox}>
          <Ionicons name="information-circle-outline" size={16} color={Colors.primary} />
          <Text style={s.infoText}>Isi soal satu per satu. Tekan "+ Tambah Soal" untuk soal berikutnya. Maksimal 25 soal.</Text>
        </View>

        {slots.map((slot, idx) => (
          <View key={idx} style={s.slotCard}>
            <View style={s.slotHeader}>
              <View style={s.slotNumBadge}>
                <Text style={s.slotNum}>{idx + 1}</Text>
              </View>
              <Text style={s.slotTitle}>Soal {idx + 1}</Text>
              {slots.length > 1 && (
                <TouchableOpacity onPress={() => removeSlot(idx)} style={{ padding: 4 }}>
                  <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                </TouchableOpacity>
              )}
            </View>

            <Text style={s.fieldLabel}>Pertanyaan *</Text>
            <TextInput
              style={[s.input, { height: 72, textAlignVertical: 'top' }]}
              multiline
              value={slot.pertanyaan}
              onChangeText={v => update(idx, 'pertanyaan', v)}
              placeholder="Tulis pertanyaan..."
              placeholderTextColor={Colors.muted}
            />

            {['a', 'b', 'c', 'd'].map(opt => (
              <View key={opt}>
                <Text style={s.fieldLabel}>Opsi {opt.toUpperCase()} *</Text>
                <TextInput
                  style={s.input}
                  value={slot[`opsi_${opt}`]}
                  onChangeText={v => update(idx, `opsi_${opt}`, v)}
                  placeholder={`Opsi ${opt.toUpperCase()}`}
                  placeholderTextColor={Colors.muted}
                />
              </View>
            ))}

            <Text style={s.fieldLabel}>Jawaban Benar *</Text>
            <View style={s.jawabanRow}>
              {JAWABAN_OPTS.map(opt => (
                <TouchableOpacity
                  key={opt}
                  style={[s.jawabanBtn, slot.jawaban_benar === opt && s.jawabanBtnActive]}
                  onPress={() => update(idx, 'jawaban_benar', opt)}
                >
                  <Text style={[s.jawabanBtnText, slot.jawaban_benar === opt && { color: '#fff' }]}>
                    {opt.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <TouchableOpacity style={s.addSlotBtn} onPress={addSlot} activeOpacity={0.8}>
          <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
          <Text style={s.addSlotText}>Tambah Soal Baru</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Bottom Bar */}
      <View style={s.bottomBar}>
        <TouchableOpacity style={s.submitBtn} onPress={handleSubmit} disabled={saving} activeOpacity={0.85}>
          {saving
            ? <ActivityIndicator color="#fff" />
            : <>
                <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
                <Text style={s.submitText}>Simpan {slots.length} Soal</Text>
              </>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, paddingTop: 12, backgroundColor: Colors.card, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '800', color: Colors.text },
  headerCount: { fontSize: 13, color: Colors.muted, fontWeight: '600' },
  infoBox: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: Colors.primary + '15', borderRadius: 10, padding: 12, marginBottom: 16 },
  infoText: { flex: 1, fontSize: 12, color: Colors.primary, lineHeight: 18 },
  slotCard: { backgroundColor: Colors.card, borderRadius: 14, padding: 16, marginBottom: 16, elevation: 2 },
  slotHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  slotNumBadge: { width: 28, height: 28, borderRadius: 8, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  slotNum: { color: '#fff', fontSize: 12, fontWeight: '800' },
  slotTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: Colors.text },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: Colors.text, marginBottom: 5, marginTop: 10 },
  input: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: Colors.text, backgroundColor: Colors.background },
  jawabanRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  jawabanBtn: { flex: 1, paddingVertical: 11, borderRadius: 10, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center' },
  jawabanBtnActive: { backgroundColor: Colors.success, borderColor: Colors.success },
  jawabanBtnText: { fontWeight: '800', fontSize: 14, color: Colors.text },
  addSlotBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.primary, borderStyle: 'dashed', marginBottom: 16 },
  addSlotText: { color: Colors.primary, fontWeight: '700', fontSize: 14 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: Colors.card, borderTopWidth: 1, borderTopColor: Colors.border },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, paddingVertical: 14, borderRadius: 12 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
