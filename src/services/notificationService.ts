import * as Notifications from 'expo-notifications';
import { Alert } from 'react-native';

export async function requestPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(
      'Нет разрешения',
      'Разрешите уведомления в настройках телефона, чтобы получать напоминания о прогулке.',
    );
    return false;
  }
  return true;
}

export async function scheduleWithId(id: string, hour: number, minute: number): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: {
      title: 'Walk&Paw ??',
      body: 'Время для прогулки!',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    } as Notifications.DailyTriggerInput,
  });
}

export async function cancelById(id: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(id);
}

export async function cancelAll(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function scheduleDaily(hour: number, minute: number): Promise<void> {
  await cancelAll();
  await scheduleWithId('default', hour, minute);
}
