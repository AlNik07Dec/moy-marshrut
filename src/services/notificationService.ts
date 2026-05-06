import * as Notifications from 'expo-notifications';
import { Alert } from 'react-native';

/** Russian UI strings as Unicode escapes (ASCII-only source) for stable native display. */
const PERM_TITLE =
  '\u041d\u0435\u0442 \u0440\u0430\u0437\u0440\u0435\u0448\u0435\u043d\u0438\u044f';
const PERM_MSG =
  '\u0420\u0430\u0437\u0440\u0435\u0448\u0438\u0442\u0435 \u0443\u0432\u0435\u0434\u043e\u043c\u043b\u0435\u043d\u0438\u044f \u0432 \u043d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0430\u0445 \u0442\u0435\u043b\u0435\u0444\u043e\u043d\u0430, \u0447\u0442\u043e\u0431\u044b \u043f\u043e\u043b\u0443\u0447\u0430\u0442\u044c \u043d\u0430\u043f\u043e\u043c\u0438\u043d\u0430\u043d\u0438\u044f \u043e \u043f\u0440\u043e\u0433\u0443\u043b\u043a\u0435.';
const NOTIFY_TITLE = 'Walk&Paw';
const NOTIFY_BODY =
  '\u0412\u0440\u0435\u043c\u044f \u0434\u043b\u044f \u043f\u0440\u043e\u0433\u0443\u043b\u043a\u0438!';

export async function requestPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(PERM_TITLE, PERM_MSG);
    return false;
  }
  return true;
}

export async function scheduleWithId(id: string, hour: number, minute: number): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: {
      title: NOTIFY_TITLE,
      body: NOTIFY_BODY,
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
