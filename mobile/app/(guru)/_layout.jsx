import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '../../constants/Colors';

export default function GuruLayout() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = 56 + insets.bottom;
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.muted,
        tabBarStyle: {
          backgroundColor: Colors.card,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          paddingBottom: insets.bottom || 6,
          paddingTop: 6,
          height: tabBarHeight,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="soal/index"
        options={{
          title: 'Kelola Soal',
          tabBarIcon: ({ color, size }) => <Ionicons name="document-text" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="activity-log"
        options={{
          title: 'Log Pelanggaran',
          tabBarIcon: ({ color, size }) => <Ionicons name="alert-circle" size={size} color={color} />,
        }}
      />
      <Tabs.Screen name="dashboard"        options={{ href: null }} />
      <Tabs.Screen name="soal/bulk"        options={{ href: null }} />
      <Tabs.Screen name="soal/[modulId]"   options={{ href: null }} />
      <Tabs.Screen name="assessment/index" options={{ href: null }} />
      <Tabs.Screen name="assessment/hasil" options={{ href: null }} />
      <Tabs.Screen name="assessment/detail-jawaban" options={{ href: null }} />
    </Tabs>
  );
}
