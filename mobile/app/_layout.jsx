import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../context/AuthContext';

export default function RootLayout() {

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(guru)" />
          <Stack.Screen name="assessment/[id]" />
          <Stack.Screen name="guru-pages" />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
