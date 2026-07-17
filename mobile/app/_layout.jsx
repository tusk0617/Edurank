import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../context/AuthContext';
import { requestNotificationPermission } from '../services/notifications';

export default function RootLayout() {
  useEffect(() => { requestNotificationPermission(); }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="assessment/[id]" />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
