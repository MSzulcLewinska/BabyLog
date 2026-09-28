import AsyncStorage from '@react-native-async-storage/async-storage';
import { File } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';

import { notifyDataChanged } from '@/lib/bus';
import { toDateKey } from '@/lib/dates';
import {
  clearSession,
  getSupabase,
  isSupabaseConfigured,
  loadSession,
  loadSessions,
  removeSession,
  saveSession,
  setActiveChild,
  type DeviceSession,
} from '@/lib/supabase';
import type {
  Activity,
  ChildProfile,
  LogEvent,
  Measurement,
  Member,
  Plan,
  UserAccount,
} from '@/lib/types';

const EVENTS_KEY = 'babylog_events';
const ACTIVITIES_KEY = 'babylog_activities';
const CHILD_KEY = 'babylog_child';
const USER_KEY = 'babylog_user';
const PLANS_KEY = 'babylog_plans';
const MEASUREMENTS_KEY = 'babylog_measurements';
const LEGACY_FEEDINGS_KEY = 'feedings';
const MIGRATED_KEY = 'babylog_cloud_migrated';
const PLAN_NOTIFS_KEY = 'babylog_plan_notifs';

export const DEFAULT_ACTIVITIES: Activity[] = [
  { id: 'milk', name: 'Mleko', icon: '🍼', unit: 'ml', color: '#34C759', builtin: true, kind: 'milk' },
  { id: 'poop', name: 'Kupa', icon: '💩', color: '#C4A35A', builtin: true, kind: 'poop' },
  { id: 'vitamin-d', name: 'Witamina D', icon: '💧', color: '#3B82F6', builtin: true, kind: 'drops' },
  { id: 'probiotic', name: 'Probiotyk', icon: '💊', color: '#8B5CF6', builtin: true, kind: 'drops' },
  { id: 'temperature', name: 'Temperatura', icon: '🌡️', unit: '°C', color: '#EF4444', builtin: true, kind: 'custom' },
  { id: 'sleep', name: 'Sen', icon: '😴', unit: 'min', color: '#6366F1', builtin: true, kind: 'custom' },
  { id: 'spit', name: 'Ulewanie', icon: '💧', color: '#06B6D4', builtin: true, kind: 'custom' },
  { id: 'pee', name: 'Siusiu', icon: '🐤', color: '#F59E0B', builtin: true, kind: 'custom' },
];

export function newId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export async function getLocalNotifId(planId: string): Promise<string | null> {
  const map = await readCache<Record<string, string>>(PLAN_NOTIFS_KEY, {});
  return map[planId] ?? null;
}

export async function setLocalNotifId(planId: string, notifId: string): Promise<void> {
  const map = await readCache<Record<string, string>>(PLAN_NOTIFS_KEY, {});
  await writeCache(PLAN_NOTIFS_KEY, { ...map, [planId]: notifId });
}

function generateShareCode(name: string): string {
  const letters =
    name
      .toUpperCase()
      .replace(/[^A-ZĄĆĘŁŃÓŚŹŻ]/g, '')
      .slice(0, 12) || 'BABY';
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `${letters}-${digits}`;
}

type LegacyFeeding = {
  id: string;
  time: string;
  type?: string;
  amount?: string;
  date?: string;
};

function eventDate(event: LogEvent | LegacyFeeding): string {
  if (event.date && /^\d{4}-\d{2}-\d{2}$/.test(event.date)) {
    return event.date;
  }

  if (event.date) {
    const parsed = new Date(event.date);
    if (!Number.isNaN(parsed.getTime())) {
      return toDateKey(parsed);
    }
  }

  return toDateKey(new Date());
}

// ---------- Lokalny cache ----------

async function readCache<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);

    if (!raw) {
      return fallback;
    }

    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeCache(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

async function readCachedChild(): Promise<ChildProfile | null> {
  return readCache<ChildProfile | null>(CHILD_KEY, null);
}

async function requireSession(): Promise<DeviceSession> {
  const session = await loadSession();

  if (!session) {
    throw new Error('BRAK_SESJI');
  }

  return session;
}

function clientFor(session: DeviceSession) {
  return getSupabase(session);
}

// ---------- Mapowanie wierszy ----------

type ChildRow = {
  id: string;
  name: string;
  share_code: string;
  photo_uri: string | null;
  birth_date: string | null;
  weight_kg: number | null;
  height_cm: number | null;
};

type MemberRow = {
  id: string;
  name: string;
  role: string;
};

type ActivityRow = {
  id: string;
  child_id: string;
  name: string;
  icon: string;
  unit: string | null;
  color: string;
  builtin: boolean;
  kind: string;
};

type EventRow = {
  id: string;
  child_id: string;
  kind: string;
  activity_id: string;
  title: string;
  icon: string;
  color: string;
  time: string;
  date: string;
  amount: string | null;
  unit: string | null;
  notes: string | null;
  drop_kind: string | null;
  fever_medication: string | null;
  end_time: string | null;
  author: string | null;
};

type PlanRow = {
  id: string;
  child_id: string;
  activity_id: string | null;
  title: string;
  icon: string;
  color: string;
  date: string;
  time: string;
  note: string | null;
  reminder_kind: string;
  minutes_before: number | null;
  reminder_time: string | null;
  reminder_note: string | null;
  notification_id: string | null;
  series_id: string | null;
  series_time: string | null;
};

type MeasurementRow = {
  id: string;
  child_id: string;
  date: string;
  weight_kg: number | null;
  height_cm: number | null;
  note: string | null;
  author: string | null;
  created_at: string;
};

function rowToActivity(row: ActivityRow): Activity {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    unit: row.unit ?? undefined,
    color: row.color,
    builtin: row.builtin,
    kind: row.kind as Activity['kind'],
  };
}

function rowToEvent(row: EventRow): LogEvent {
  return {
    id: row.id,
    kind: row.kind as LogEvent['kind'],
    activityId: row.activity_id,
    title: row.title,
    icon: row.icon,
    color: row.color,
    time: row.time,
    date: row.date,
    amount: row.amount ?? undefined,
    unit: row.unit ?? undefined,
    notes: row.notes ?? undefined,
    dropKind: row.drop_kind ?? undefined,
    feverMedication: row.fever_medication
      ? (row.fever_medication as 'ibuprofen' | 'paracetamol')
      : undefined,
    endTime: row.end_time ?? undefined,
    author: row.author ?? undefined,
  };
}

function rowToPlan(row: PlanRow): Plan {
  return {
    id: row.id,
    activityId: row.activity_id ?? undefined,
    title: row.title,
    icon: row.icon,
    color: row.color,
    date: row.date,
    time: row.time,
    note: row.note ?? undefined,
    reminderKind: row.reminder_kind as Plan['reminderKind'],
    minutesBefore: row.minutes_before ?? undefined,
    reminderTime: row.reminder_time ?? undefined,
    reminderNote: row.reminder_note ?? undefined,
    notificationId: undefined,
    seriesId: row.series_id ?? undefined,
    seriesTime: row.series_time ?? undefined,
  };
}

function activityToRow(activity: Activity, childId: string): ActivityRow {
  return {
    id: activity.id,
    child_id: childId,
    name: activity.name,
    icon: activity.icon,
    unit: activity.unit ?? null,
    color: activity.color,
    builtin: activity.builtin,
    kind: activity.kind,
  };
}

function eventToRow(event: LogEvent, childId: string): EventRow {
  return {
    id: event.id,
    child_id: childId,
    kind: event.kind,
    activity_id: event.activityId,
    title: event.title,
    icon: event.icon,
    color: event.color,
    time: event.time,
    date: event.date,
    amount: event.amount ?? null,
    unit: event.unit ?? null,
    notes: event.notes ?? null,
    drop_kind: event.dropKind ?? null,
    fever_medication: event.feverMedication ?? null,
    end_time: event.endTime ?? null,
    author: event.author ?? null,
  };
}

function planToRow(plan: Plan, childId: string): PlanRow {
  return {
    id: plan.id,
    child_id: childId,
    activity_id: plan.activityId ?? null,
    title: plan.title,
    icon: plan.icon,
    color: plan.color,
    date: plan.date,
    time: plan.time,
    note: plan.note ?? null,
    reminder_kind: plan.reminderKind,
    minutes_before: plan.minutesBefore ?? null,
    reminder_time: plan.reminderTime ?? null,
    reminder_note: plan.reminderNote ?? null,
    notification_id: null,
    series_id: plan.seriesId ?? null,
    series_time: plan.seriesTime ?? null,
  };
}

function rowToMeasurement(row: MeasurementRow): Measurement {
  return {
    id: row.id,
    date: row.date,
    weightKg: row.weight_kg != null ? Number(row.weight_kg) : undefined,
    heightCm: row.height_cm != null ? Number(row.height_cm) : undefined,
    note: row.note ?? undefined,
    author: row.author ?? undefined,
    createdAt: row.created_at,
  };
}

function measurementToRow(
  measurement: Measurement,
  session: { childId: string; memberId?: string }
): MeasurementRow {
  return {
    id: measurement.id,
    child_id: session.childId,
    date: measurement.date,
    weight_kg: measurement.weightKg ?? null,
    height_cm: measurement.heightCm ?? null,
    note: measurement.note ?? null,
    author: measurement.author ?? null,
    created_at: measurement.createdAt,
  };
}

// ---------- Zdarzenia ----------

export async function loadEvents(): Promise<LogEvent[]> {
  if (!isSupabaseConfigured()) {
    return readCache<LogEvent[]>(EVENTS_KEY, []);
  }

  try {
    const session = await requireSession();
    const { data, error } = await clientFor(session)
      .from('events')
      .select('*')
      .eq('child_id', session.childId)
      .order('created_at');

    if (error) {
      throw error;
    }

    const events = ((data ?? []) as unknown as EventRow[]).map(rowToEvent);
    await writeCache(EVENTS_KEY, events);
    return events;
  } catch {
    return readCache<LogEvent[]>(EVENTS_KEY, []);
  }
}

export async function addEvent(event: LogEvent): Promise<void> {
  try {
    const session = await requireSession();
    const { error } = await clientFor(session)
      .from('events')
      .insert(eventToRow(event, session.childId));

    if (error) {
      throw error;
    }
  } catch {
    // offline — zostaje w cache, sync przy następnym uruchomieniu
  }

  const events = await readCache<LogEvent[]>(EVENTS_KEY, []);
  await writeCache(EVENTS_KEY, [...events, event]);
  notifyDataChanged();
}

export async function removeEvent(eventId: string): Promise<void> {
  try {
    const session = await requireSession();
    const { error } = await clientFor(session)
      .from('events')
      .delete()
      .eq('id', eventId)
      .eq('child_id', session.childId);

    if (error) {
      throw error;
    }
  } catch {
    // offline
  }

  const events = await readCache<LogEvent[]>(EVENTS_KEY, []);
  await writeCache(
    EVENTS_KEY,
    events.filter((event) => event.id !== eventId)
  );
  notifyDataChanged();
}

export async function updateEvent(event: LogEvent): Promise<void> {
  try {
    const session = await requireSession();
    const { error } = await clientFor(session)
      .from('events')
      .update(eventToRow(event, session.childId))
      .eq('id', event.id)
      .eq('child_id', session.childId);

    if (error) {
      throw error;
    }
  } catch {
    // offline
  }

  const events = await readCache<LogEvent[]>(EVENTS_KEY, []);
  await writeCache(
    EVENTS_KEY,
    events.map((item) => (item.id === event.id ? event : item))
  );
  notifyDataChanged();
}

export async function loadActivities(): Promise<Activity[]> {
  if (!isSupabaseConfigured()) {
    return readCache<Activity[]>(ACTIVITIES_KEY, DEFAULT_ACTIVITIES);
  }

  try {
    const session = await requireSession();
    const { data, error } = await clientFor(session)
      .from('activities')
      .select('*')
      .eq('child_id', session.childId);

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as unknown as ActivityRow[];

    if (rows.length === 0) {
      const cached = await readCache<Activity[]>(ACTIVITIES_KEY, []);
      return cached.length > 0 ? cached : DEFAULT_ACTIVITIES;
    }

    const activities = rows.map(rowToActivity);
    await writeCache(ACTIVITIES_KEY, activities);
    return activities;
  } catch {
    const cached = await readCache<Activity[]>(ACTIVITIES_KEY, []);
    return cached.length > 0 ? cached : DEFAULT_ACTIVITIES;
  }
}

export async function addActivity(activity: Activity): Promise<void> {
  try {
    const session = await requireSession();
    const { error } = await clientFor(session)
      .from('activities')
      .insert(activityToRow(activity, session.childId));

    if (error) {
      throw error;
    }
  } catch {
    // offline
  }

  const activities = await readCache<Activity[]>(ACTIVITIES_KEY, []);
  await writeCache(ACTIVITIES_KEY, [...activities, activity]);
  notifyDataChanged();
}

export async function removeActivity(activityId: string): Promise<void> {
  try {
    const session = await requireSession();
    const { error } = await clientFor(session)
      .from('activities')
      .delete()
      .eq('id', activityId)
      .eq('child_id', session.childId);

    if (error) {
      throw error;
    }
  } catch {
    // offline
  }

  const activities = await readCache<Activity[]>(ACTIVITIES_KEY, []);
  await writeCache(
    ACTIVITIES_KEY,
    activities.filter((activity) => activity.id !== activityId)
  );
  notifyDataChanged();
}

// ---------- Dziecko i członkowie ----------

export async function loadChild(): Promise<ChildProfile | null> {
  if (!isSupabaseConfigured()) {
    return readCachedChild();
  }

  try {
    const session = await requireSession();
    const db = clientFor(session);
    const [childResult, membersResult] = await Promise.all([
      db.from('children').select('*').eq('id', session.childId).maybeSingle(),
      db
        .from('members')
        .select('id, name, role')
        .eq('child_id', session.childId),
    ]);

    if (childResult.error) {
      throw childResult.error;
    }

    if (membersResult.error) {
      throw membersResult.error;
    }

    const row = childResult.data as unknown as ChildRow | null;

    if (!row) {
      // Sesja istnieje, ale urządzenie nie widzi żadnego dziecka —
      // dostęp wygasł lub sesja jest uszkodzona. Usuwamy tylko tę sesję.
      await removeSession(session.childId);
      return readCachedChild();
    }

    const members: Member[] = (
      (membersResult.data ?? []) as unknown as MemberRow[]
    ).map((m) => ({ id: m.id, name: m.name, role: m.role as Member['role'] }));

    let photoUri: string | undefined = undefined;
    let photoPath: string | undefined = undefined;
    if (row.photo_uri && !row.photo_uri.startsWith('file://')) {
      photoUri = (await resolveSignedPhotoUrl(row.photo_uri)) ?? undefined;
      // Zapisujemy ścieżkę w buckecie tylko dla nowego formatu (nie pełny http URL).
      if (!row.photo_uri.startsWith('http')) {
        photoPath = row.photo_uri;
      } else {
        photoPath = photoUri;
      }
    }

    const profile: ChildProfile = {
      name: row.name,
      shareCode: row.share_code,
      members,
      photoUri,
      photoPath,
      birthDate: row.birth_date ?? undefined,
      weightKg: row.weight_kg != null ? String(row.weight_kg) : undefined,
      heightCm: row.height_cm != null ? String(row.height_cm) : undefined,
    };

    await writeCache(CHILD_KEY, profile);
    return profile;
  } catch {
    return readCachedChild();
  }
}

export async function hasSavedChild(): Promise<boolean> {
  const session = await loadSession();

  if (session) {
    return true;
  }

  const raw = await AsyncStorage.getItem(CHILD_KEY);
  return Boolean(raw);
}

export async function saveChild(child: ChildProfile): Promise<void> {
  await writeCache(CHILD_KEY, child);
  notifyDataChanged();

  try {
    const session = await requireSession();
    const storedPath = child.photoPath && !child.photoPath.startsWith('file://')
      ? child.photoPath
      : null;
    const legacyUri =
      child.photoUri && !child.photoUri.startsWith('file://')
        ? stripSignedPhotoUrl(child.photoUri)
        : null;

    const { error } = await clientFor(session)
      .from('children')
      .update({
        name: child.name,
        photo_uri: storedPath ?? legacyUri,
        birth_date: child.birthDate ?? null,
        weight_kg: child.weightKg != null ? Number(child.weightKg) : null,
        height_cm: child.heightCm != null ? Number(child.heightCm) : null,
      })
      .eq('id', session.childId);

    if (error) {
      throw error;
    }
  } catch {
    // offline
  }
}

function stripSignedPhotoUrl(photoUri: string | undefined): string | null {
  if (!photoUri) return null;
  const marker = '/storage/v1/object/sign/photos/';
  const idx = photoUri.indexOf(marker);
  if (idx === -1) return photoUri;
  const after = photoUri.slice(idx + marker.length);
  const path = after.split('?')[0];
  return path || photoUri;
}

export async function addChildMember(member: Member): Promise<void> {
  try {
    const session = await requireSession();
    const { data, error } = await clientFor(session)
      .from('members')
      .insert({ child_id: session.childId, name: member.name, role: 'member' })
      .select('id, name, role')
      .single();

    if (error) {
      throw error;
    }

    const row = data as unknown as MemberRow;

    const child = await readCachedChild();

    if (child) {
      await writeCache(CHILD_KEY, {
        ...child,
        members: [
          ...child.members.filter((m) => m.id !== member.id),
          { id: row.id, name: row.name, role: row.role as Member['role'] },
        ],
      });
    }
  } catch {
    // offline — zmiana tylko w cache
    const child = await readCachedChild();

    if (child) {
      await writeCache(CHILD_KEY, {
        ...child,
        members: [...child.members, member],
      });
    }
  }
  notifyDataChanged();
}

export async function removeChildMember(memberId: string): Promise<void> {
  try {
    const session = await requireSession();
    const { error } = await clientFor(session)
      .from('members')
      .delete()
      .eq('id', memberId)
      .eq('child_id', session.childId);

    if (error) {
      throw error;
    }
  } catch {
    // offline
  }

  const child = await readCachedChild();

  if (child) {
    await writeCache(CHILD_KEY, {
      ...child,
      members: child.members.filter((m) => m.id !== memberId),
    });
  }
  notifyDataChanged();
}

// ---------- Wiele dzieci ----------

export type ChildSummary = {
  childId: string;
  name: string;
  photoUri?: string;
  isActive: boolean;
  isOwner: boolean;
};

export async function listChildren(): Promise<ChildSummary[]> {
  const sessions = await loadSessions();
  const active = await loadSession();

  const summaries = await Promise.all(
    sessions.map(async (session) => {
      let name = 'Dziecko';
      let photoPath: string | undefined;
      let photoUri: string | undefined;
      let isOwner = false;

      try {
        const db = getSupabase(session);
        const { data, error } = await db
          .from('children')
          .select('name, photo_uri, id')
          .eq('id', session.childId)
          .maybeSingle();

        if (!error && data) {
          const row = data as unknown as ChildRow;
          name = row.name;
          photoPath = row.photo_uri ?? undefined;
        }

        const { data: members, error: membersError } = await db
          .from('members')
          .select('id, role')
          .eq('child_id', session.childId);

        if (!membersError && members) {
          const me = (members as unknown as { id: string; role: string }[]).find(
            (m) => m.id === session.deviceId
          );
          isOwner = me?.role === 'owner';
        }
      } catch {
        // offline — używamy nazwy zastępczej
      }

      if (photoPath && !photoPath.startsWith('file://')) {
        photoUri =
          (await resolveSignedPhotoUrl(photoPath)) ?? undefined;
      }

      return {
        childId: session.childId,
        name,
        photoUri,
        isActive: session.childId === active?.childId,
        isOwner,
      };
    })
  );

  const sorted = [...summaries].sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return sorted;
}

export async function switchChild(childId: string): Promise<void> {
  await setActiveChild(childId);
  await AsyncStorage.multiRemove([
    CHILD_KEY,
    EVENTS_KEY,
    ACTIVITIES_KEY,
    PLANS_KEY,
    MEASUREMENTS_KEY,
  ]);
  notifyDataChanged();
  await Promise.all([loadChild(), loadActivities(), loadEvents(), loadPlans()]);
}

export async function removeLocalChild(childId: string): Promise<void> {
  const sessions = await loadSessions();

  if (sessions.length <= 1) {
    return;
  }

  const active = await loadSession();
  await removeSession(childId);

  if (active?.childId === childId) {
    const remaining = sessions.filter((session) => session.childId !== childId);
    const next = remaining[0];

    if (next) {
      await setActiveChild(next.childId);
    }
  }

  await AsyncStorage.multiRemove([
    CHILD_KEY,
    EVENTS_KEY,
    ACTIVITIES_KEY,
    PLANS_KEY,
    MEASUREMENTS_KEY,
  ]);
  notifyDataChanged();
}

// ---------- Plany ----------

export async function loadPlans(): Promise<Plan[]> {
  if (!isSupabaseConfigured()) {
    return readCache<Plan[]>(PLANS_KEY, []);
  }

  try {
    const session = await requireSession();
    const { data, error } = await clientFor(session)
      .from('plans')
      .select('*')
      .eq('child_id', session.childId)
      .order('created_at');

    if (error) {
      throw error;
    }

    const plans = ((data ?? []) as unknown as PlanRow[]).map(rowToPlan);
    await writeCache(PLANS_KEY, plans);
    return plans;
  } catch {
    return readCache<Plan[]>(PLANS_KEY, []);
  }
}

export async function addPlan(plan: Plan): Promise<void> {
  try {
    const session = await requireSession();
    const { error } = await clientFor(session)
      .from('plans')
      .insert(planToRow(plan, session.childId));

    if (error) {
      throw error;
    }
  } catch {
    // offline
  }

  const plans = await readCache<Plan[]>(PLANS_KEY, []);
  await writeCache(PLANS_KEY, [...plans, plan]);
  notifyDataChanged();
}

export async function removePlan(planId: string): Promise<void> {
  try {
    const session = await requireSession();
    const { error } = await clientFor(session)
      .from('plans')
      .delete()
      .eq('id', planId)
      .eq('child_id', session.childId);

    if (error) {
      throw error;
    }
  } catch {
    // offline
  }

  const plans = await readCache<Plan[]>(PLANS_KEY, []);
  await writeCache(
    PLANS_KEY,
    plans.filter((plan) => plan.id !== planId)
  );
  notifyDataChanged();
}

// ---------- Pomiary wagi i wzrostu ----------

export async function loadMeasurements(): Promise<Measurement[]> {
  if (!isSupabaseConfigured()) {
    return readCache<Measurement[]>(MEASUREMENTS_KEY, []);
  }

  try {
    const session = await requireSession();
    const { data, error } = await clientFor(session)
      .from('measurements')
      .select('*')
      .eq('child_id', session.childId)
      .order('date', { ascending: true });

    if (error) {
      throw error;
    }

    const measurements = ((data ?? []) as unknown as MeasurementRow[])
      .map(rowToMeasurement)
      .sort((a, b) => a.date.localeCompare(b.date));
    await writeCache(MEASUREMENTS_KEY, measurements);
    return measurements;
  } catch {
    return readCache<Measurement[]>(MEASUREMENTS_KEY, []);
  }
}

export async function addMeasurement(measurement: Measurement): Promise<void> {
  try {
    const session = await requireSession();
    const { error } = await clientFor(session)
      .from('measurements')
      .insert(measurementToRow(measurement, session));

    if (error) {
      throw error;
    }
  } catch {
    // offline
  }

  const measurements = await readCache<Measurement[]>(MEASUREMENTS_KEY, []);
  await writeCache(MEASUREMENTS_KEY, [
    ...measurements.filter((item) => item.id !== measurement.id),
    measurement,
  ].sort((a, b) => a.date.localeCompare(b.date)));
  await syncProfileFromMeasurements(measurements.concat(measurement));
  notifyDataChanged();
}

export async function removeMeasurement(measurementId: string): Promise<void> {
  try {
    const session = await requireSession();
    const { error } = await clientFor(session)
      .from('measurements')
      .delete()
      .eq('id', measurementId)
      .eq('child_id', session.childId);

    if (error) {
      throw error;
    }
  } catch {
    // offline
  }

  const measurements = await readCache<Measurement[]>(MEASUREMENTS_KEY, []);
  const remaining = measurements.filter((item) => item.id !== measurementId);
  await writeCache(MEASUREMENTS_KEY, remaining);
  await syncProfileFromMeasurements(remaining);
  notifyDataChanged();
}

/** Ostatni pomiar wagi/wzrostu trafia też do profilu dziecka. */
async function syncProfileFromMeasurements(measurements: Measurement[]): Promise<void> {
  const last = measurements[measurements.length - 1];
  if (!last) return;

  const child = await readCache<ChildProfile | null>(CHILD_KEY, null);
  if (!child) return;

  const weight = last.weightKg ?? child.weightKg;
  const height = last.heightCm ?? child.heightCm;
  if (weight === child.weightKg && height === child.heightCm) return;

  await writeCache(CHILD_KEY, {
    ...child,
    weightKg: weight != null ? String(weight) : undefined,
    heightCm: height != null ? String(height) : undefined,
  });

  try {
    const session = await requireSession();
    await clientFor(session)
      .from('children')
      .update({
        weight_kg: weight != null ? Number(weight) : null,
        height_cm: height != null ? Number(height) : null,
      })
      .eq('id', session.childId);
  } catch {
    // offline
  }
}

// ---------- Konto (lokalne, mock Google) ----------

export async function loadUser(): Promise<UserAccount | null> {
  return readCache<UserAccount | null>(USER_KEY, null);
}

export async function saveUser(user: UserAccount): Promise<void> {
  await writeCache(USER_KEY, user);
  notifyDataChanged();
}

export async function syncAccountEmail(email: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    return;
  }

  const session = await loadSession();
  if (!session) {
    return;
  }

  const { error } = await clientFor(session).rpc('update_member_email', {
    p_email: email.trim(),
  });

  if (error) {
    throw new Error('Nie udało się zaktualizować e-maila w chmurze.');
  }
}

export async function syncAccountEmailToAll(email: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    return;
  }

  const sessions = await loadSessions();
  for (const session of sessions) {
    const { error } = await clientFor(session).rpc('update_member_email', {
      p_email: email.trim(),
    });
    if (error) {
      throw new Error('Nie udało się zaktualizować e-maila w chmurze.');
    }
  }
}

export async function hasAcceptedPrivacy(): Promise<boolean> {
  const user = await loadUser();
  return Boolean(user?.privacyAccepted);
}

export async function acceptPrivacy(): Promise<void> {
  const user = (await loadUser()) ?? {
    id: `google-${Date.now()}`,
    provider: 'local',
    signedInAt: new Date().toISOString(),
  };
  await saveUser({ ...user, privacyAccepted: true });
}

export async function signOut(): Promise<void> {
  // Wylogowanie oznacza only rozłączenie konta Google — sesja urządzeniowa
  // (dane dziecka, wydarzenia, plany) zostaje zachowana.
  await AsyncStorage.removeItem(USER_KEY);
  notifyDataChanged();
}

export async function findChildByEmail(
  email: string
): Promise<{ childId: string; childName: string; shareCode: string; deviceId: string; secret: string } | null> {
  if (!isSupabaseConfigured() || !email.trim()) {
    return null;
  }

  const { data, error } = await getSupabase(null).rpc('find_child_by_owner_email', {
    p_email: email.trim(),
  });

  if (error || !data) {
    return null;
  }

  const result = Array.isArray(data) ? data[0] : data;
  if (!result?.out_child_id) {
    return null;
  }

  return {
    childId: result.out_child_id,
    childName: result.out_child_name,
    shareCode: result.out_share_code,
    deviceId: result.out_member_id,
    secret: result.out_secret,
  };
}

export type AccountChild = {
  childId: string;
  childName: string;
  shareCode: string;
  deviceId: string;
  secret: string;
  role: 'owner' | 'member' | 'observer';
  memberName: string;
};

/**
 * Wszystkie dziecka powiązane z e-mailem (jako właściciel, opiekun lub
 * obserwator). Służy do: blokowania zakładania duplikatu konta, wyboru
 * dziecka przy logowaniu oraz listy „Moje dzieci”.
 */
export async function accountsByEmail(email: string): Promise<AccountChild[]> {
  if (!isSupabaseConfigured() || !email.trim()) {
    return [];
  }

  const { data, error } = await getSupabase(null).rpc('accounts_by_email', {
    p_email: email.trim(),
  });

  if (error) {
    // starsza wersja bazy — próbujemy pojedynczego logowania
    const single = await loginByEmail(email);
    return single
      ? [
          {
            childId: single.childId,
            childName: single.childName,
            shareCode: single.shareCode,
            deviceId: single.deviceId,
            secret: single.secret,
            role: single.role as AccountChild['role'],
            memberName: single.memberName,
          },
        ]
      : [];
  }

  const rows = ((data ?? []) as unknown as {
    out_child_id: string;
    out_child_name: string;
    out_share_code: string;
    out_member_id: string;
    out_secret: string;
    out_role: string;
    out_member_name: string;
  }[]).filter((row) => row?.out_child_id);

  return rows.map((row) => ({
    childId: row.out_child_id,
    childName: row.out_child_name,
    shareCode: row.out_share_code,
    deviceId: row.out_member_id,
    secret: row.out_secret,
    role: row.out_role as AccountChild['role'],
    memberName: row.out_member_name,
  }));
}

export async function loginByEmail(
  email: string
): Promise<{
  childId: string;
  childName: string;
  shareCode: string;
  deviceId: string;
  secret: string;
  role: string;
  memberName: string;
} | null> {
  if (!isSupabaseConfigured() || !email.trim()) {
    return null;
  }

  const { data, error } = await getSupabase(null).rpc('login_by_email', {
    p_email: email.trim(),
  });

  if (error || !data) {
    return null;
  }

  const result = Array.isArray(data) ? data[0] : data;
  if (!result?.out_child_id) {
    return null;
  }

  return {
    childId: result.out_child_id,
    childName: result.out_child_name,
    shareCode: result.out_share_code,
    deviceId: result.out_member_id,
    secret: result.out_secret,
    role: result.out_role,
    memberName: result.out_member_name,
  };
}

export async function updateMemberRole(
  memberId: string,
  newRole: 'member' | 'observer'
): Promise<void> {
  const session = await requireSession();
  const { error } = await clientFor(session).rpc('update_member_role', {
    p_member_id: memberId,
    p_new_role: newRole,
  });

  if (error) {
    throw new Error(mapRoleError(error.message));
  }

  notifyDataChanged();
}

function mapRoleError(message: string): string {
  if (message === 'BRAK_UPRAWNIEN') {
    return 'Tylko rodzic (właściciel) może zmieniać role.';
  }
  if (message === 'NIE_MOZNA_ZMIENIC_OWNERA') {
    return 'Nie można zmienić roli rodzica.';
  }
  if (message === 'NIE_ZNANY_CZLONEK') {
    return 'Nie znaleziono tego członka.';
  }
  return 'Nie udało się zmienić roli.';
}

/**
 * Naprawia sytuację, w której profil nie ma właściciela (np. po ponownym
 * dołączeniu kodem). Przywraca rolę 'owner' najstarszemu członkowi dziecka —
 * wyłącznie wtedy, gdy żaden członek nie jest właścicielem.
 */
export async function repairMemberRole(): Promise<'NAPRAWIONO' | 'JUZ_ISTNIE_WLASCICIEL' | 'NIE_MOZNA_NAPRAWIC'> {
  const session = await requireSession();
  const { data, error } = await clientFor(session).rpc('repair_member_role');

  if (error) {
    throw new Error(mapRoleError(error.message));
  }

  const value = (Array.isArray(data) ? data[0] : data) as string | null;
  if (value === 'NAPRAWIONO') {
    notifyDataChanged();
    return 'NAPRAWIONO';
  }
  if (value === 'JUZ_ISTNIE_WLASCICIEL') return 'JUZ_ISTNIE_WLASCICIEL';
  return 'NIE_MOZNA_NAPRAWIC';
}

// ---------- Tworzenie dziecka / dołączanie / migracja ----------

async function seedActivities(childId: string, activities: Activity[]) {
  const session = await requireSession();
  const rows = activities.map((a) => activityToRow(a, childId));
  const { error } = await clientFor(session)
    .from('activities')
    .insert(rows);

  if (error) {
    throw error;
  }
}

async function uploadPhotoToStorage(
  session: DeviceSession | null,
  childId: string,
  localUri: string
): Promise<string | null> {
  try {
    if (!isSupabaseConfigured()) {
      return null;
    }

    const file = new File(localUri);
    if (!file.exists) {
      console.warn('[photo] file does not exist:', localUri);
      return null;
    }

    const path = `${childId}/${Date.now()}.jpg`;
    const db = getSupabase(session ?? (await loadSession()));

    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const binaryStr = atob(base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const { error } = await db.storage
      .from('photos')
      .upload(path, bytes, { contentType: 'image/jpeg', upsert: true });

    if (error) {
      console.warn('[photo] upload error:', error.message);
      return null;
    }

    // Zwracamy ścieżkę w buckecie (bucket jest prywatny).
    return path;
  } catch (e) {
    console.warn('[photo] upload exception:', e);
    return null;
  }
}

export async function resolveSignedPhotoUrl(
  path: string | undefined
): Promise<string | null> {
  if (!path) return null;
  // Lokalne pliki (jeszcze nieprzesłane) wyświetlamy bezpośrednio.
  if (path.startsWith('file://')) return path;
  // Pełny adres URL (np. obsługiwany wcześniej publiczny) zwracamy bez zmian.
  if (path.startsWith('http')) return path;

  try {
    const session = await loadSession();
    if (!session) return null;
    const db = getSupabase(session);
    const { data, error } = await db.storage
      .from('photos')
      .createSignedUrl(path, 3600);
    if (error) {
      console.warn('[photo] signed url error:', error.message);
      return null;
    }
    return data?.signedUrl ?? null;
  } catch (e) {
    console.warn('[photo] signed url exception:', e);
    return null;
  }
}

export async function uploadChildPhoto(localUri: string): Promise<string | null> {
  const session = await loadSession();
  if (!session) {
    return null;
  }
  return uploadPhotoToStorage(session, session.childId, localUri);
}

export async function createChildWithOwner(
  childName: string,
  photoUri: string | undefined,
  ownerName: string,
  ownerEmail?: string,
): Promise<ChildProfile> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase nie jest skonfigurowany.');
  }

  const db = getSupabase(null);

  type CreateResult = {
    out_child_id: string;
    out_child_name: string;
    out_share_code: string;
    out_member_id: string;
    out_secret: string;
  };

  let result: CreateResult | null = null;

  for (let attempt = 0; attempt < 5 && !result; attempt++) {
    const { data, error } = await db.rpc('create_child_with_owner', {
      p_child_name: childName.trim(),
      p_share_code: generateShareCode(childName),
      p_owner_name: ownerName.trim() || 'Rodzic',
      p_owner_email: ownerEmail ?? null,
      p_photo_uri: photoUri?.startsWith('file://') ? null : photoUri ?? null,
    });

    if (error) {
      if ((error as { code?: string }).code === '23505') {
        continue; // kolizja kodu — losujemy następny
      }
      throw error;
    }

    result = (Array.isArray(data) ? data[0] : data) as CreateResult | null;
  }

  if (!result) {
    throw new Error('Nie udało się utworzyć profilu dziecka.');
  }

  const ownerDisplayName = ownerName.trim() || 'Rodzic';

  const deviceSession: DeviceSession = {
    childId: result.out_child_id,
    deviceId: result.out_member_id,
    secret: result.out_secret,
  };
  await saveSession(deviceSession);

  await seedActivities(result.out_child_id, DEFAULT_ACTIVITIES);

  let finalPhotoUri = photoUri;

  if (photoUri) {
    const publicUrl = await uploadPhotoToStorage(
      deviceSession,
      result.out_child_id,
      photoUri
    );
    if (publicUrl) {
      finalPhotoUri = publicUrl;
      await getSupabase(deviceSession)
        .from('children')
        .update({ photo_uri: publicUrl })
        .eq('id', result.out_child_id);
    }
  }

  const profile: ChildProfile = {
    name: result.out_child_name,
    shareCode: result.out_share_code,
    members: [{ id: result.out_member_id, name: ownerDisplayName, role: 'owner' }],
    photoUri: finalPhotoUri,
  };

  await writeCache(CHILD_KEY, profile);
  await writeCache(ACTIVITIES_KEY, DEFAULT_ACTIVITIES);
  await writeCache(EVENTS_KEY, []);
  await writeCache(PLANS_KEY, []);
  notifyDataChanged();

  return profile;
}

export async function findChildByCode(
  code: string
): Promise<{ childId: string; childName: string } | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const { data, error } = await getSupabase(null).rpc('find_child_by_code', {
    p_code: code.trim(),
  });

  if (error) {
    return null;
  }

  const result = Array.isArray(data) ? data[0] : data;

  if (!result) {
    return null;
  }

  return { childId: result.out_child_id, childName: result.out_child_name };
}

export async function joinByCode(
  code: string,
  memberName: string,
  email?: string
): Promise<string> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase nie jest skonfigurowany.');
  }

  const { data, error } = await getSupabase(null).rpc('join_by_code', {
    p_code: code.trim(),
    p_name: memberName.trim(),
    p_email: email?.trim() || null,
  });

  if (error) {
    throw new Error(error.message === 'NIEZNANY_KOD' ? 'NIEZNANY_KOD' : error.message);
  }

  const result = Array.isArray(data) ? data[0] : data;

  if (!result) {
    throw new Error('NIEZNANY_KOD');
  }

  await saveSession({
    childId: result.out_child_id,
    deviceId: result.out_member_id,
    secret: result.out_secret,
  });

  notifyDataChanged();

  const { registerPushToken } = await import('@/lib/notifications');
  void registerPushToken();

  await Promise.all([loadChild(), loadActivities(), loadEvents(), loadPlans()]);

  return result.out_child_name as string;
}

export async function migrateLocalToCloud(ownerFallback: string, ownerEmail?: string): Promise<boolean> {
  const migrated = await AsyncStorage.getItem(MIGRATED_KEY);

  if (migrated || !isSupabaseConfigured()) {
    return false;
  }

  const existingSession = await loadSession();

  if (existingSession) {
    await AsyncStorage.setItem(MIGRATED_KEY, 'true');
    return false;
  }

  const localChild = await readCachedChild();
  const localEvents = await readCache<LogEvent[]>(EVENTS_KEY, []);
  const legacyRaw = await AsyncStorage.getItem(LEGACY_FEEDINGS_KEY);

  if (!localChild && localEvents.length === 0 && !legacyRaw) {
    await AsyncStorage.setItem(MIGRATED_KEY, 'true');
    return false;
  }

  let events = localEvents;

  if (events.length === 0 && legacyRaw) {
    const legacy = JSON.parse(legacyRaw) as LegacyFeeding[];
    events = legacy.map((item) => {
      const isBreast = item.type === 'Pierś';

      return {
        id: item.id,
        kind: 'milk' as const,
        activityId: 'milk',
        title: isBreast ? 'Pierś' : 'Mleko',
        icon: isBreast ? '🤱' : '🍼',
        color: '#34C759',
        time: item.time,
        date: eventDate(item),
        amount: item.amount,
        unit: 'ml',
      };
    });
  }

  const ownerName =
    localChild?.members.find((m) => m.role === 'owner')?.name ||
    ownerFallback ||
'Rodzic';

  try {
    const db = getSupabase(null);

    type CreateResult = {
      out_child_id: string;
      out_child_name: string;
      out_share_code: string;
      out_member_id: string;
      out_secret: string;
    };

    let created: CreateResult | null = null;

    for (let attempt = 0; attempt < 5 && !created; attempt++) {
      const { data, error } = await db.rpc('create_child_with_owner', {
        p_child_name: localChild?.name?.trim() || 'Dziecko',
        p_share_code: generateShareCode(localChild?.name || 'Baby'),
        p_owner_name: ownerName,
        p_owner_email: ownerEmail ?? null,
        p_photo_uri: localChild?.photoUri ?? null,
        p_birth_date: localChild?.birthDate ?? null,
        p_weight_kg:
          localChild?.weightKg != null ? Number(localChild.weightKg) : null,
        p_height_cm:
          localChild?.heightCm != null ? Number(localChild.heightCm) : null,
      });

      if (error) {
        if ((error as { code?: string }).code === '23505') {
          continue; // kolizja kodu — losujemy następny
        }
        throw error;
      }

      created = (Array.isArray(data) ? data[0] : data) as CreateResult | null;
    }

    if (!created) {
      throw new Error('Migracja: dziecko');
    }

    const childId = created.out_child_id;
    const ownerId = created.out_member_id;
    const ownerSecret = created.out_secret;

    await saveSession({
      childId,
      deviceId: ownerId,
      secret: ownerSecret,
    });

    const session = await loadSession();
    if (!session) {
      throw new Error('Migracja: sesja');
    }

    const localActivities = await readCache<Activity[]>(ACTIVITIES_KEY, []);
    await seedActivities(childId, localActivities.length > 0 ? localActivities : DEFAULT_ACTIVITIES);

    if (events.length > 0) {
      const { error: eventsError } = await clientFor(session)
        .from('events')
        .insert(events.map((e) => eventToRow(e, childId)));

      if (eventsError) {
        throw eventsError;
      }
    }

    const localPlans = await readCache<Plan[]>(PLANS_KEY, []);

    if (localPlans.length > 0) {
      const { error: plansError } = await clientFor(session)
        .from('plans')
        .insert(localPlans.map((p) => planToRow(p, childId)));

      if (plansError) {
        throw plansError;
      }
    }

    const profile: ChildProfile = {
      name: created.out_child_name,
      shareCode: created.out_share_code,
      members: [{ id: ownerId, name: ownerName, role: 'owner' }],
      photoUri: localChild?.photoUri,
      birthDate: localChild?.birthDate,
      weightKg: localChild?.weightKg,
      heightCm: localChild?.heightCm,
    };

    await writeCache(CHILD_KEY, profile);
    await AsyncStorage.setItem(MIGRATED_KEY, 'true');
    notifyDataChanged();
    return true;
  } catch {
    await clearSessionKeysOnFailure();
    return false;
  }
}

async function clearSessionKeysOnFailure(): Promise<void> {
  await AsyncStorage.removeItem(MIGRATED_KEY);
  await clearSession();
}

// ---------- Eksport / usuwanie danych (RODO / Google Play) ----------

export async function exportAllData(): Promise<string> {
  const [child, events, activities, plans, user] = await Promise.all([
    loadChild(),
    loadEvents(),
    loadActivities(),
    loadPlans(),
    loadUser(),
  ]);

  const data = {
    exportedAt: new Date().toISOString(),
    app: 'BabyLog',
    user: {
      name: user?.name ?? null,
      email: user?.email ?? null,
      signedInAt: user?.signedInAt ?? null,
    },
    child,
    events,
    activities,
    plans,
  };

  return JSON.stringify(data, null, 2);
}

export async function isCurrentUserOwner(): Promise<boolean> {
  try {
    const session = await loadSession();
    if (!session) return false;
    const child = await loadChild();
    const me = (child?.members ?? []).find(
      (member) => member.id === session.deviceId
    );
    return me?.role === 'owner';
  } catch {
    return false;
  }
}

export async function deleteAccountData(): Promise<void> {
  const session = await requireSession();

  // Usuwa profil dziecka — wszelkie powiązane rekordy (członkowie, zdarzenia,
  // plany, aktywności, tokeny push) są kasowane kaskadowo w bazie.
  const { error } = await clientFor(session)
    .from('children')
    .delete()
    .eq('id', session.childId);

  if (error) {
    throw error;
  }

  // Wyczyść lokalną pamięć podręczną zachowując sesje pozostałych dzieci.
  await AsyncStorage.multiRemove([
    CHILD_KEY,
    EVENTS_KEY,
    ACTIVITIES_KEY,
    PLANS_KEY,
    USER_KEY,
    MIGRATED_KEY,
    PLAN_NOTIFS_KEY,
  ]);
  await removeSession(session.childId);
  notifyDataChanged();
}
