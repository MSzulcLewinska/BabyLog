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

export async function loadSession(): Promise<DeviceSession | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);

    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as DeviceSession;
  } catch {
    return null;
  }
}

export async function saveSession(session: DeviceSession): Promise<void> {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
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
