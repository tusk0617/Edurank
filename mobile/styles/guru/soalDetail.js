import { StyleSheet } from 'react-native';
import Colors from '../../constants/Colors';

export default StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12,
    backgroundColor: Colors.card, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 38, height: 38, justifyContent: 'center', alignItems: 'center',
    borderRadius: 10, backgroundColor: Colors.background,
  },
  pageTitle: {
    flex: 1, fontSize: 17, fontWeight: '700', color: Colors.text,
    textAlign: 'center', marginHorizontal: 8,
  },

  // List soal
  list: { padding: 16, paddingBottom: 24 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { color: Colors.muted, marginTop: 12, fontSize: 15, fontWeight: '600' },
  emptyHint: { color: Colors.border, marginTop: 4, fontSize: 13 },

  // Card soal
  soalCard: { backgroundColor: Colors.card, borderRadius: 14, padding: 14, marginBottom: 12, elevation: 2 },
  soalMeta: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  soalNumBadge: {
    width: 28, height: 28, borderRadius: 7,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center', alignItems: 'center', marginTop: 1,
  },
  soalNum: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  soalText: { flex: 1, fontSize: 13, color: Colors.text, lineHeight: 18 },

  // Opsi jawaban
  opsiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  opsiChip: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
    backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, maxWidth: '48%',
  },
  opsiBenar: { backgroundColor: Colors.success + '20', borderColor: Colors.success },
  opsiChipText: { fontSize: 10, color: Colors.muted },
  opsiBenarText: { color: Colors.success, fontWeight: '700' },

  // Action buttons
  soalActions: { flexDirection: 'row', gap: 10, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 10 },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8, backgroundColor: Colors.lightBlue,
  },
  editBtnText: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#FEF2F2',
  },
  deleteBtnText: { fontSize: 12, color: Colors.danger, fontWeight: '600' },

  // Bottom button
  bottomAction: {
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: Colors.background,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Modal tambah/edit soal
  modalSafe: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, backgroundColor: Colors.card, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  saveText: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  modalBody: { flex: 1, padding: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14,
    color: Colors.text, backgroundColor: Colors.card,
  },
  textArea: { height: 90, textAlignVertical: 'top' },

  // Jawaban benar
  jawabanRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  jawabanBtn: {
    width: 48, height: 48, borderRadius: 12, borderWidth: 2,
    borderColor: Colors.border, justifyContent: 'center', alignItems: 'center',
    backgroundColor: Colors.card,
  },
  jawabanBtnActive: { borderColor: Colors.success, backgroundColor: Colors.success + '20' },
  jawabanBtnText: { fontSize: 16, fontWeight: '700', color: Colors.muted },
  jawabanBtnTextActive: { color: Colors.success },
});
