import { parseDateKey } from '@/lib/dates';
import type { Plan } from '@/lib/types';
import * as Notifications from 'expo-notifications';
import { Alert, Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const CHANNEL_ID = 'reminders';

export function planDateTime(plan: Plan): Date {
  const base = parseDateKey(plan.date);
  const [hours, minutes] = plan.time.split(':').map(Number);
  base.setHours(hours || 0, minutes || 0, 0, 0);
  return base;
}

export function reminderDate(plan: Plan): Date | null {
  if (plan.reminderKind === 'custom') {
    if (!plan.reminderTime) return null;

    const [hours, minutes] = plan.reminderTime.split(':').map(Number);
    const when = parseDateKey(plan.date);
    when.setHours(hours || 0, minutes || 0, 0, 0);
    return when;
  }

  const eventTime = planDateTime(plan);
  return new Date(eventTime.getTime() - (plan.minutesBefore ?? 30) * 60000);
}

export function describeReminder(plan: Plan): string {
  if (plan.reminderKind === 'custom') {
    return `Przypomnienie o ${plan.reminderTime}`;
  }
  return `${plan.minutesBefore} min przed (o ${plan.reminderTime})`;
}

export async function ensureNotificationSetup(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Przypomnienia',
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: '#34C759',
    });
  }

  const settings = await Notifications.requestPermissionsAsync();

  if (!settings.granted) {
    Alert.alert(
      'Brak zgody na powiadomienia',
      'Włącz powiadomienia dla BabyLog w ustawieniach telefonu, aby otrzymywać przypomnienia.'
    );
    return false;
  }

  return true;
}

export async function schedulePlanReminder(plan: Plan): Promise<string | null> {
  const when = reminderDate(plan);

  if (!when || when.getTime() <= Date.now()) {
    return null;
  }

  const body =
    plan.reminderKind === 'custom'
      ? plan.reminderNote?.trim() ||
        `Zaplanowano: ${plan.title} o ${plan.time}`
      : `${plan.title} o ${plan.time}${
          plan.note?.trim() ? ` — ${plan.note.trim()}` : ''
        }`;

  return Notifications.scheduleNotificationAsync({
    content: {
      title:
        plan.reminderKind === 'custom'
          ? `${plan.icon} ${plan.reminderNote?.trim() || plan.title}`
          : `${plan.icon} Za chwilę: ${plan.title}`,
      body,
      data: { planId: plan.id },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: when,
      channelId: Platform.OS === 'android' ? CHANNEL_ID : undefined,
    },
  });
}

export async function cancelPlanReminder(plan: Plan): Promise<void> {
  if (!plan.notificationId) return;
  await Notifications.cancelScheduledNotificationAsync(plan.notificationId);
}
