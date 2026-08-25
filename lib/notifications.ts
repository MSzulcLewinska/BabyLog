import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { getSupabase, loadSession } from '@/lib/supabase';
import { parseDateKey } from '@/lib/dates';
import { getLocalNotifId, setLocalNotifId } from '@/lib/storage';
import type { Plan } from '@/lib/types';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export async function registerPushToken(): Promise<void> {
  try {
    const session = await loadSession();
    if (!session) return;

    // Na Androidie utwórz kanały powiadomień przed proszeniem o uprawnienia
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Powiadomienia',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#34C759',
      });
      await Notifications.setNotificationChannelAsync('reminders', {
        name: 'Przypomnienia',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#F59E0B',
      });
    }

    // Proś o uprawnienia (nie tylko sprawdzaj!)
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    const projectId =
      (globalThis as Record<string, unknown>).__EXPO_CONSTANTS_PROJECT_ID__ as string | undefined;

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: projectId ?? 'fe168d73-bfda-44d0-a102-98422e2c4c65',
    });

    const token = tokenData.data;

    if (!token) return;

    const db = getSupabase(session);

    // Usuń stare tokeny tego urządzenia, potem wstaw nowy
    await db
      .from('push_tokens')
      .delete()
      .eq('member_id', session.deviceId)
      .eq('platform', Platform.OS);

    const { error } = await db.from('push_tokens').insert({
      child_id: session.childId,
      member_id: session.deviceId,
      token,
      platform: Platform.OS,
    });

    if (error) {
      console.warn('[push] błąd zapisu tokena:', error.message);
    }
  } catch (e) {
    console.warn('[push] registerPushToken error:', e);
  }
}

export async function notifyOtherMembers(
  plan: Plan,
  senderMemberId: string
): Promise<void> {
  try {
    const session = await loadSession();
    if (!session) return;

    const db = getSupabase(session);

    const { data, error } = await db.rpc('get_other_member_tokens', {
      p_child_id: session.childId,
      p_exclude_member_id: senderMemberId,
    });

    if (error || !data || (Array.isArray(data) && data.length === 0)) return;

    const tokens = (Array.isArray(data) ? data : []) as {
      out_token: string;
      out_platform: string;
    }[];

    const body =
      plan.reminderKind === 'custom'
        ? plan.reminderNote?.trim() ||
          `Zaplanowano: ${plan.title} o ${plan.time}`
        : `${plan.title} o ${plan.time}${
            plan.note?.trim() ? ` — ${plan.note.trim()}` : ''
          }`;

    const title =
      plan.reminderKind === 'custom'
        ? `${plan.icon} ${plan.reminderNote?.trim() || plan.title}`
        : `${plan.icon} Nowy plan: ${plan.title}`;

    const messages = tokens.map((t) => ({
      to: t.out_token,
      title,
      body,
      data: { type: 'plan_changed', planId: plan.id, childId: session.childId },
      ...(t.out_platform === 'android'
        ? { channelId: 'reminders' }
        : {}),
    }));

    // Wyślij partiami po 100
    for (let i = 0; i < messages.length; i += 100) {
      const chunk = messages.slice(i, i + 100);
      await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chunk),
      });
    }
  } catch {
    // cicho
  }
}

export async function schedulePlanLocalNotification(
  plan: Plan
): Promise<string | null> {
  const [hours, minutes] = plan.time.split(':').map(Number);
  const base = parseDateKey(plan.date);
  base.setHours(hours || 0, minutes || 0, 0, 0);

  let triggerAt: Date;

  if (plan.reminderKind === 'custom') {
    if (!plan.reminderTime) return null;
    const [rh, rm] = plan.reminderTime.split(':').map(Number);
    triggerAt = parseDateKey(plan.date);
    triggerAt.setHours(rh || 0, rm || 0, 0, 0);
  } else {
    triggerAt = new Date(base.getTime() - (plan.minutesBefore ?? 30) * 60000);
  }

  if (triggerAt.getTime() <= Date.now()) return null;

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
      date: triggerAt,
      channelId: Platform.OS === 'android' ? 'reminders' : undefined,
    },
  });
}

export async function syncPlanNotifications(
  plans: Plan[]
): Promise<string | null> {
  let updatedPlanId: string | null = null;

  for (const plan of plans) {
    const existingLocalId = await getLocalNotifId(plan.id);
    if (existingLocalId) continue;

    const notifId = await schedulePlanLocalNotification(plan);
    if (notifId) {
      updatedPlanId = plan.id;
      await setLocalNotifId(plan.id, notifId);
    }
  }

  return updatedPlanId;
}
