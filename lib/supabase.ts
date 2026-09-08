import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createClient,
  type SupabaseClient,
} from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ewbvhtbqjkgmpskqvkne.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3YnZodGJxamtnbXBza3F2a25lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1OTcxMjYsImV4cCI6MjEwMzE3MzEyNn0.im8wN6Rejwws-z-ycGlsZ2C2GKiZ8pAeD14ZpYTqEKM';

export type DeviceSession = {
  childId: string;
  deviceId: string;
  secret: string;
};

const SESSION_KEY = 'babylog_session';
const SESSIONS_KEY = 'babylog_sessions';
const ACTIVE_CHILD_KEY = 'babylog_active_child';

async function readRawSessions(): Promise<DeviceSession[]> {
  try {
    const raw = await AsyncStorage.getItem(SESSIONS_KEY);

    if (raw) {
      const parsed = JSON.parse(raw) as DeviceSession[];
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }

  // Starsze instalacje — pojedyncza sesja.
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (raw) {
      return [JSON.parse(raw) as DeviceSession];
    }
  } catch {
    // ignore
  }

  return [];
}

async function persistSessions(list: DeviceSession[]): Promise<void> {
  await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(list));

  if (list.length > 0) {
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(list[0]));
  } else {
    await AsyncStorage.removeItem(SESSION_KEY);
  }
  if (list.length === 0) {
    await AsyncStorage.removeItem(ACTIVE_CHILD_KEY);
  }
}

export async function loadSessions(): Promise<DeviceSession[]> {
  return readRawSessions();
}

export async function loadSession(): Promise<DeviceSession | null> {
  const list = await readRawSessions();

  if (list.length === 0) {
    return null;
  }

  const activeId = await AsyncStorage.getItem(ACTIVE_CHILD_KEY);
  const active = list.find((session) => session.childId === activeId);

  return active ?? list[0];
}

export async function saveSession(session: DeviceSession): Promise<void> {
  const list = await readRawSessions();
  const idx = list.findIndex((item) => item.childId === session.childId);

  if (idx >= 0) {
    list[idx] = session;
  } else {
    list.push(session);
  }

  await persistSessions(list);
  await AsyncStorage.setItem(ACTIVE_CHILD_KEY, session.childId);
}

export async function setActiveChild(childId: string): Promise<void> {
  const list = await readRawSessions();

  if (!list.some((session) => session.childId === childId)) {
    return;
  }

  await AsyncStorage.setItem(ACTIVE_CHILD_KEY, childId);
}

export async function removeSession(childId: string): Promise<void> {
  const list = (await readRawSessions()).filter(
    (session) => session.childId !== childId
  );
  await persistSessions(list);
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.multiRemove([SESSION_KEY, ACTIVE_CHILD_KEY]);
  await AsyncStorage.removeItem(SESSIONS_KEY);
}

let cachedClient: SupabaseClient | null = null;
let cachedIdentity = '';

export function getSupabase(session: DeviceSession | null): SupabaseClient {
  const identity = session ? `${session.deviceId}:${session.secret}` : 'anon';

  if (!cachedClient || cachedIdentity !== identity) {
    cachedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
      global: {
        headers: session
          ? {
              'x-member-id': session.deviceId,
              'x-member-secret': session.secret,
            }
          : {},
      },
    });
    cachedIdentity = identity;
  }

  return cachedClient;
}

export function isSupabaseConfigured(): boolean {
  return (
    SUPABASE_URL.startsWith('https://') &&
    SUPABASE_ANON_KEY.length > 20
  );
}
