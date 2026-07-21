import { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

export default function Index() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      router.replace('/login');
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoIcon}>📐</Text>
        </View>
        <Text style={styles.appName}>FrontSchooler</Text>
        <Text style={styles.tagline}>Platform Pendukung Akademis Siswa SMA</Text>
      </Animated.View>
      <Animated.Text style={[styles.version, { opacity: fadeAnim }]}>v1.0.0</Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#378ADD',
  },
  content: { alignItems: 'center', gap: 12 },
  logoCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 8,
  },
  logoIcon: { fontSize: 48 },
  appName: {
    fontSize: 32, fontWeight: '800',
    color: '#fff', letterSpacing: 1,
  },
  tagline: {
    fontSize: 14, color: 'rgba(255,255,255,0.85)',
    textAlign: 'center', paddingHorizontal: 32,
  },
  version: {
    position: 'absolute', bottom: 40,
    fontSize: 12, color: 'rgba(255,255,255,0.5)',
  },
});
