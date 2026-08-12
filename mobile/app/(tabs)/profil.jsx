import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import Colors from '../../constants/Colors';

export default function SiswaProfil() {
  const { user, logout } = useAuth();

  const bergabung = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
    : 'Agustus 2026';

  const handleLogout = () => {
    Alert.alert('Keluar', 'Yakin ingin keluar?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Keluar', style: 'destructive', onPress: async () => { await logout(); router.replace('/login'); } },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{(user?.username || 'S')[0].toUpperCase()}{(user?.username || '')[1] || ''}</Text>
          </View>
          <Text style={styles.nama}>{user?.nama}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>Siswa</Text>
          </View>
        </View>

        {/* Info */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={18} color={Colors.muted} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Nama Lengkap</Text>
              <Text style={styles.infoValue}>{user?.nama}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Ionicons name="key-outline" size={18} color={Colors.muted} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Kode Responden</Text>
              <Text style={styles.infoValue}>{user?.username}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={18} color={Colors.muted} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Bergabung</Text>
              <Text style={styles.infoValue}>{bergabung}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={18} color={Colors.danger} />
          <Text style={styles.logoutText}>Keluar</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { padding: 24, alignItems: 'center' },
  avatarSection: { alignItems: 'center', marginBottom: 24 },
  avatarCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.secondary, justifyContent: 'center', alignItems: 'center',
    marginBottom: 12, elevation: 4,
  },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#fff' },
  nama: { fontSize: 20, fontWeight: '800', color: Colors.text },
  roleBadge: { marginTop: 6, backgroundColor: Colors.secondary + '20', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 3 },
  roleText: { fontSize: 12, fontWeight: '700', color: Colors.secondary },
  infoCard: { width: '100%', backgroundColor: Colors.card, borderRadius: 14, padding: 16, marginBottom: 16, elevation: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, color: Colors.muted, marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '600', color: Colors.text },
  divider: { height: 1, backgroundColor: Colors.border },
  logoutBtn: {
    width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: 14, borderRadius: 10, borderWidth: 1.5,
    borderColor: Colors.danger + '60', backgroundColor: Colors.danger + '10',
  },
  logoutText: { color: Colors.danger, fontWeight: '700', fontSize: 15 },
});
