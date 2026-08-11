import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { bulkCreateSoal } from '../../../services/api';
import Colors from '../../../constants/Colors';

const EXAMPLE =
  'Siapa proklamator kemerdekaan Indonesia?\nSoekarno dan Hatta*\nSoeharto dan Habibie\nSoekarno dan Megawati\nHabibie dan Wahid\n\nBerapakah nilai dari 2 + 2?\n3\n4*\n5\n6';

function parseInput(raw) {
  const blocks = raw.trim().split(/\n[ \t]*\n/);
  const soal = [];
  const errors = [];

  blocks.forEach((block, idx) => {
    const lines = block.trim().split('\n').map(l => l.trim()).filter(Boolean);
    const num = idx + 1;

    if (lines.length < 5) {
      errors.push(`Soal ke-${num}: harus 5 baris (pertanyaan + 4 opsi), ditemukan ${lines.length} baris`);
      return;
    }

    const pertanyaan = lines[0];
    const opsiLines = lines.slice(1, 5);
    const starCount = opsiLines.filter(o => o.endsWith('*')).length;

    if (starCount === 0) {
      errors.push(`Soal ke-${num}: tidak ditemukan jawaban benar — tandai opsi dengan * di akhir`);
      return;
    }
    if (starCount > 1) {
      errors.push(`Soal ke-${num}: lebih dari satu opsi bertanda *`);
      return;
    }

    const keys = ['a', 'b', 'c', 'd'];
    const parsed = { pertanyaan, jawaban_benar: '' };
    opsiLines.forEach((o, i) => {
      const correct = o.endsWith('*');
      parsed[`opsi_${keys[i]}`] = correct ? o.slice(0, -1).trim() : o;
      if (correct) parsed.jawaban_benar = keys[i];
    });

    soal.push(parsed);
  });

  return { soal, errors };
}

export default function BulkSoal() {
  const [mode, setMode] = useState('input');
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState([]);
  const [saving, setSaving] = useState(false);

  const handleParse = () => {
    if (!text.trim()) return Alert.alert('Perhatian', 'Teks soal tidak boleh kosong');

    const { soal, errors } = parseInput(text);

    if (errors.length > 0) {
      Alert.alert('Terdapat Kesalahan', errors.join('\n\n'));
      return;
    }
    if (soal.length === 0) {
      Alert.alert('Perhatian', 'Tidak ada soal yang berhasil diparsing');
      return;
    }

    setParsed(soal);
    setMode('preview');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await bulkCreateSoal(parsed);
      Alert.alert('Berhasil', `${parsed.length} soal berhasil disimpan`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      Alert.alert('Gagal', err.response?.data?.message || 'Terjadi kesalahan saat menyimpan');
    } finally {
      setSaving(false);
    }
  };

  if (mode === 'preview') {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => setMode('input')} style={s.iconBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Preview — {parsed.length} Soal</Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView contentContainerStyle={s.previewList} showsVerticalScrollIndicator={false}>
          {parsed.map((item, idx) => (
            <View key={idx} style={s.card}>
              <View style={s.numBadge}>
                <Text style={s.numText}>{idx + 1}</Text>
              </View>
              <Text style={s.qText}>{item.pertanyaan}</Text>
              {['a', 'b', 'c', 'd'].map(k => {
                const correct = item.jawaban_benar === k;
                return (
                  <View key={k} style={[s.opsiRow, correct && s.opsiCorrect]}>
                    <View style={[s.opsiLabel, correct && s.opsiLabelCorrect]}>
                      <Text style={[s.opsiLabelText, correct && { color: '#fff' }]}>
                        {k.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={[s.opsiText, correct && s.opsiTextCorrect]} numberOfLines={2}>
                      {item[`opsi_${k}`]}
                    </Text>
                    {correct && <Ionicons name="checkmark-circle" size={16} color={Colors.secondary} />}
                  </View>
                );
              })}
            </View>
          ))}
          <View style={{ height: 110 }} />
        </ScrollView>

        <View style={s.bottomBar}>
          <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.saveBtnText}>Simpan {parsed.length} Soal</Text>}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Bulk Input Soal</Text>
        <View style={{ width: 38 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={s.inputContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={s.infoBox}>
            <Text style={s.infoTitle}>Format Penulisan</Text>
            <Text style={s.infoText}>
              {'• Baris 1: Pertanyaan\n• Baris 2–5: Opsi A, B, C, D\n• Tandai jawaban benar dengan * di akhir opsi\n• Pisahkan tiap soal dengan 1 baris kosong'}
            </Text>
            <View style={s.exampleBox}>
              <Text style={s.exampleCode}>{EXAMPLE}</Text>
            </View>
          </View>

          <Text style={s.fieldLabel}>Teks Soal</Text>
          <TextInput
            style={s.textarea}
            value={text}
            onChangeText={setText}
            multiline
            placeholder={
              'Pertanyaan soal pertama\nOpsi A\nOpsi B benar*\nOpsi C\nOpsi D\n\nPertanyaan soal kedua\n...'
            }
            placeholderTextColor={Colors.muted}
            textAlignVertical="top"
            autoCorrect={false}
            autoCapitalize="sentences"
          />

          <TouchableOpacity style={s.parseBtn} onPress={handleParse} activeOpacity={0.85}>
            <Ionicons name="eye-outline" size={18} color="#fff" />
            <Text style={s.parseBtnText}>Parse & Preview</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: Colors.card, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: Colors.text },
  iconBtn: { width: 38, height: 38, justifyContent: 'center', alignItems: 'center' },

  // Input mode
  inputContent: { padding: 16 },
  infoBox: {
    backgroundColor: Colors.primary + '10', borderRadius: 12,
    padding: 14, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: Colors.primary,
  },
  infoTitle: { fontSize: 13, fontWeight: '700', color: Colors.primary, marginBottom: 6 },
  infoText: { fontSize: 12, color: Colors.text, lineHeight: 20 },
  exampleBox: {
    marginTop: 10, backgroundColor: '#1E1E2E', borderRadius: 8, padding: 12,
  },
  exampleCode: { fontSize: 11, color: '#A9DC76', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', lineHeight: 18 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  textarea: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12,
    padding: 14, fontSize: 13, color: Colors.text,
    backgroundColor: Colors.card, minHeight: 280, lineHeight: 20,
  },
  parseBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, marginTop: 16,
  },
  parseBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Preview mode
  previewList: { padding: 16 },
  card: {
    backgroundColor: Colors.card, borderRadius: 14, padding: 14,
    marginBottom: 12, elevation: 2,
  },
  numBadge: {
    alignSelf: 'flex-start', backgroundColor: Colors.primary,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 8,
  },
  numText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  qText: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 10, lineHeight: 20 },
  opsiRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, marginBottom: 4,
    backgroundColor: Colors.background,
  },
  opsiCorrect: { backgroundColor: Colors.secondary + '15' },
  opsiLabel: {
    width: 24, height: 24, borderRadius: 6, borderWidth: 1.5,
    borderColor: Colors.border, justifyContent: 'center', alignItems: 'center',
  },
  opsiLabelCorrect: { backgroundColor: Colors.secondary, borderColor: Colors.secondary },
  opsiLabelText: { fontSize: 11, fontWeight: '700', color: Colors.muted },
  opsiText: { flex: 1, fontSize: 13, color: Colors.text },
  opsiTextCorrect: { color: Colors.secondary, fontWeight: '600' },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, paddingBottom: 28,
    backgroundColor: Colors.card, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  saveBtn: {
    backgroundColor: Colors.secondary, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
