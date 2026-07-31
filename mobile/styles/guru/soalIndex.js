import { StyleSheet } from 'react-native';
import Colors from '../../constants/Colors';

export default StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.text },

  // Tab kategori
  tabsScroll: { maxHeight: 34, marginBottom: 6 },
  tabsContent: { paddingHorizontal: 16, gap: 6 },
  tab: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card,
  },
  tabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { fontSize: 11, fontWeight: '600', color: Colors.muted },
  tabTextActive: { color: '#fff' },

  // List modul
  list: { paddingHorizontal: 16, paddingTop: 4 },
  modulCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.card, borderRadius: 14, padding: 14, marginBottom: 10, elevation: 2,
  },
  modulLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  modulNumBadge: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center', alignItems: 'center',
  },
  modulNum: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  modulJudul: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 2 },
  mapelLabel: { fontSize: 12, color: Colors.muted },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: Colors.muted, marginTop: 12, fontSize: 15 },

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

  // Modal
  modalSafe: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, backgroundColor: Colors.card,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  modalBody: { flex: 1, padding: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 8, marginTop: 16 },
  input: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14,
    color: Colors.text, backgroundColor: Colors.card,
  },

  // Chip kategori
  chipGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.card,
  },
  chipActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '15' },
  chipText: { fontSize: 13, color: Colors.muted, fontWeight: '600' },
  chipTextActive: { color: Colors.primary, fontWeight: '700' },

  // Tingkat kesulitan
  levelRow: { flexDirection: 'row', gap: 10 },
  levelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', backgroundColor: Colors.card,
  },
  levelBtnText: { fontSize: 13, color: Colors.muted, fontWeight: '600' },

  // Submit button di modal
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 15,
  },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
