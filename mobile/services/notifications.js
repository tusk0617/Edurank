import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission() {
  if (Platform.OS === 'web') return false;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleDeadlineNotifications(assessments) {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();

  for (const a of assessments) {
    if (!a.deadline || a.status_terakhir === 'lulus') continue;

    const deadline = new Date(a.deadline);
    const now = new Date();

    // Notifikasi H-1
    const h1 = new Date(deadline);
    h1.setDate(h1.getDate() - 1);
    h1.setHours(8, 0, 0, 0);
    if (h1 > now) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ Ujian Besok!',
          body: `${a.judul} deadline besok. Jangan lupa kerjakan!`,
          data: { assessmentId: a.id },
        },
        trigger: h1,
      });
    }

    // Notifikasi H-3 jam
    const h3jam = new Date(deadline.getTime() - 3 * 60 * 60 * 1000);
    if (h3jam > now) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🚨 Deadline 3 Jam Lagi!',
          body: `${a.judul} akan berakhir dalam 3 jam. Segera kerjakan!`,
          data: { assessmentId: a.id },
        },
        trigger: h3jam,
      });
    }
  }
}
