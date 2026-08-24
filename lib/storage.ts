import AsyncStorage from '@react-native-async-storage/async-storage';

import { notifyDataChanged } from '@/lib/bus';
import { toDateKey } from '@/lib/dates';
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

export const DEFAULT_CHILD: ChildProfile = {
  name: 'Róża',
  shareCode: 'RÓŻA-4821',
  members: [
    { id: 'owner', name: 'Magda', role: 'owner' },
  ],
};

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

export async function loadEvents(): Promise<LogEvent[]> {
  const raw = await AsyncStorage.getItem(EVENTS_KEY);

  if (raw) {
    return JSON.parse(raw) as LogEvent[];
  }

  const legacyRaw = await AsyncStorage.getItem(LEGACY_FEEDINGS_KEY);

  if (!legacyRaw) {
    return [];
  }

  const legacy = JSON.parse(legacyRaw) as LegacyFeeding[];
  const migrated: LogEvent[] = legacy.map((item) => {
    const isBreast = item.type === 'Pierś';

    return {
      id: item.id,
      kind: 'milk',
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

  await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(migrated));
  return migrated;
}

export async function saveEvents(events: LogEvent[]): Promise<void> {
  await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(events));
  notifyDataChanged();
}

export async function addEvent(event: LogEvent): Promise<void> {
  const events = await loadEvents();
  events.push(event);
  await saveEvents(events);
}

export async function loadActivities(): Promise<Activity[]> {
  const raw = await AsyncStorage.getItem(ACTIVITIES_KEY);

  if (!raw) {
    await AsyncStorage.setItem(ACTIVITIES_KEY, JSON.stringify(DEFAULT_ACTIVITIES));
    return DEFAULT_ACTIVITIES;
  }

  return JSON.parse(raw) as Activity[];
}

export async function saveActivities(activities: Activity[]): Promise<void> {
  await AsyncStorage.setItem(ACTIVITIES_KEY, JSON.stringify(activities));
  notifyDataChanged();
}

export async function addActivity(activity: Activity): Promise<void> {
  const activities = await loadActivities();
  activities.push(activity);
  await saveActivities(activities);
}

export async function loadChild(): Promise<ChildProfile> {
  const raw = await AsyncStorage.getItem(CHILD_KEY);

  if (!raw) {
    return DEFAULT_CHILD;
  }

  const parsed = JSON.parse(raw) as ChildProfile;

  if (parsed.members.some((member) => member.id === 'member-tomek')) {
    const cleaned: ChildProfile = {
      ...parsed,
      members: parsed.members.filter(
        (member) => member.id !== 'member-tomek'
      ),
    };
    await AsyncStorage.setItem(CHILD_KEY, JSON.stringify(cleaned));
    return cleaned;
  }

  return parsed;
}

export async function hasSavedChild(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(CHILD_KEY);
  return Boolean(raw);
}

export async function saveChild(child: ChildProfile): Promise<void> {
  await AsyncStorage.setItem(CHILD_KEY, JSON.stringify(child));
  notifyDataChanged();
}

export async function addChildMember(member: Member): Promise<void> {
  const child = await loadChild();
  await saveChild({ ...child, members: [...child.members, member] });
}

export async function removeChildMember(memberId: string): Promise<void> {
  const child = await loadChild();
  await saveChild({
    ...child,
    members: child.members.filter((member) => member.id !== memberId),
  });
}

export async function loadUser(): Promise<UserAccount | null> {
  const raw = await AsyncStorage.getItem(USER_KEY);

  if (!raw) {
    return null;
  }

  return JSON.parse(raw) as UserAccount;
}

export async function saveUser(user: UserAccount): Promise<void> {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  notifyDataChanged();
}

export async function loadPlans(): Promise<Plan[]> {
  const raw = await AsyncStorage.getItem(PLANS_KEY);

  if (!raw) {
    return [];
  }

  return JSON.parse(raw) as Plan[];
}

export async function savePlans(plans: Plan[]): Promise<void> {
  await AsyncStorage.setItem(PLANS_KEY, JSON.stringify(plans));
  notifyDataChanged();
}

export async function addPlan(plan: Plan): Promise<void> {
  const plans = await loadPlans();
  plans.push(plan);
  await savePlans(plans);
}

export async function removePlan(planId: string): Promise<void> {
  const plans = await loadPlans();
  await savePlans(plans.filter((plan) => plan.id !== planId));
}
