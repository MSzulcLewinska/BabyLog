import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { getSupabase, loadSession } from '@/lib/supabase';
import { parseDateKey } from '@/lib/dates';
import type { Plan } from '@/lib/types';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export async function registerPushToken(): Promise<void> {
  try {
    const session = await loadSession();
    if (!session) return;

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'fe168d73-bfda-44d0-a102-98422e2c4c65',
    });

    const token = tokenData.data;

    const db = getSupabase(session);

    // Usuń stare tokeny tego urządzenia, potem wstaw nowy
    await db
      .from('push_tokens')
      .delete()
      .eq('member_id', session.deviceId)
      .eq('platform', Platform.OS);

    await db.from('push_tokens').insert({
      child_id: session.childId,
      member_id: session.deviceId,
      token,
      platform: Platform.OS,
    });
  } catch {
    // cicho — push nie jest krytyczny
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
