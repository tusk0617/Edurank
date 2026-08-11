import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';

export default function SiswaTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.secondary,
        tabBarInactiveTintColor: Colors.muted,
        tabBarStyle: { borderTopColor: Colors.border, backgroundColor: '#fff' },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Daftar Ujian',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
