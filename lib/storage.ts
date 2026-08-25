import AsyncStorage from '@react-native-async-storage/async-storage';
import { File } from 'expo-file-system';

import { notifyDataChanged } from '@/lib/bus';
import { toDateKey } from '@/lib/dates';
import {
  clearSession,
  getSupabase,
  isSupabaseConfigured,
  loadSession,
  saveSession,
  type DeviceSession,
} from '@/lib/supabase';
import type {
  Activity,
  ChildProfile,
  LogEvent,
  Member,
  Plan,
  UserAccount,
} from '@/lib/types';

const EVENTS_KEY = 'babylog_events';
const ACTIVITIES_KEY = 'babylog_activities';
const CHILD_KEY = 'babylog_child';
const USER_KEY = 'babylog_user';
const PLANS_KEY = 'babylog_plans';
const LEGACY_FEEDINGS_KEY = 'feedings';
const MIGRATED_KEY = 'babylog_cloud_migrated';

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
    notificationId: row.notification_id ?? undefined,
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
    notification_id: plan.notificationId ?? null,
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
  const events = await readCache<LogEvent[]>(EVENTS_KEY, []);
  await writeCache(EVENTS_KEY, [...events, event]);
  notifyDataChanged();

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
  const activities = await readCache<Activity[]>(ACTIVITIES_KEY, []);
  await writeCache(ACTIVITIES_KEY, [...activities, activity]);
  notifyDataChanged();

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
      // dostęp wygasł lub sesja jest uszkodzona. Wylogowujemy.
      await clearSession();
      return readCachedChild();
    }

    const members: Member[] = (
      (membersResult.data ?? []) as unknown as MemberRow[]
    ).map((m) => ({ id: m.id, name: m.name, role: m.role as Member['role'] }));

    const profile: ChildProfile = {
      name: row.name,
      shareCode: row.share_code,
      members,
      photoUri: row.photo_uri ?? undefined,
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
    const { error } = await clientFor(session)
      .from('children')
      .update({
        name: child.name,
        photo_uri: child.photoUri ?? null,
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

export async function addChildMember(member: Member): Promise<void> {
  const child = await readCachedChild();

  if (child) {
    await writeCache(CHILD_KEY, {
      ...child,
      members: [...child.members, member],
    });
  }
  notifyDataChanged();

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
    // offline
  }
}

export async function removeChildMember(memberId: string): Promise<void> {
  const child = await readCachedChild();

  if (child) {
    await writeCache(CHILD_KEY, {
      ...child,
      members: child.members.filter((m) => m.id !== memberId),
    });
    notifyDataChanged();
  }

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
  const plans = await readCache<Plan[]>(PLANS_KEY, []);
  await writeCache(PLANS_KEY, [...plans, plan]);
  notifyDataChanged();

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
}

export async function removePlan(planId: string): Promise<void> {
  const plans = await readCache<Plan[]>(PLANS_KEY, []);
  await writeCache(
    PLANS_KEY,
    plans.filter((plan) => plan.id !== planId)
  );
  notifyDataChanged();

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
}

// ---------- Konto (lokalne, mock Google) ----------

export async function loadUser(): Promise<UserAccount | null> {
  return readCache<UserAccount | null>(USER_KEY, null);
}

export async function saveUser(user: UserAccount): Promise<void> {
  await writeCache(USER_KEY, user);
  notifyDataChanged();
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
    throw new Error(error.message === 'BRAK_UPRAWNIEN' ? 'Brak uprawnień właściciela.' : error.message);
  }

  notifyDataChanged();
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
      return null;
    }

    const bytes = await file.bytes();
    const path = `${childId}/${Date.now()}.jpg`;

    const db = getSupabase(session ?? (await loadSession()));
    const { error } = await db.storage
      .from('photos')
      .upload(path, bytes, { contentType: 'image/jpeg', upsert: true });

    if (error) {
      return null;
    }

    return db.storage.from('photos').getPublicUrl(path).data.publicUrl;
  } catch {
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
      p_owner_name: ownerName.trim() || 'Właściciel',
      p_owner_email: ownerEmail ?? null,
      p_photo_uri: photoUri ?? null,
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

  const ownerDisplayName = ownerName.trim() || 'Właściciel';

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
    'Właściciel';

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
