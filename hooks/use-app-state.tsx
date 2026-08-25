import {
  createChildWithOwner,
  hasSavedChild,
  loadUser,
  migrateLocalToCloud,
  saveUser,
} from '@/lib/storage';
import { loadSession } from '@/lib/supabase';
import type { UserAccount } from '@/lib/types';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type AppStateValue = {
  ready: boolean;
  signedIn: boolean;
  onboarded: boolean;
  signIn: (user?: Partial<UserAccount>) => Promise<void>;
  completeSetup: (name: string, photoUri?: string) => Promise<void>;
  markJoined: () => void;
};

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [onboarded, setOnboarded] = useState(false);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    let active = true;

    const boot = async () => {
      const [user, session] = await Promise.all([loadUser(), loadSession()]);

      if (!session && user) {
        // Stare dane lokalne (przed Supabase) — jednorazowa migracja do chmury
        await migrateLocalToCloud(user.name || 'Właściciel');
      }

      const finalSession = session ?? (await loadSession());
      const childSaved = await hasSavedChild();

      if (!active) return;

      setUserName(user?.name ?? '');
      setSignedIn(Boolean(user) || Boolean(finalSession));
      setOnboarded(Boolean(finalSession) || childSaved);
      setReady(true);
    };

    void boot();

    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async (user?: Partial<UserAccount>) => {
    const account: UserAccount = {
      id: user?.id ?? `google-${Date.now()}`,
      provider: user?.provider ?? 'google',
      email: user?.email,
      name: user?.name,
      signedInAt: new Date().toISOString(),
    };
    await saveUser(account);    setUserName(account.name ?? '');
    setSignedIn(true);
  }, []);

  const completeSetup = useCallback(
    async (name: string, photoUri?: string) => {
      await createChildWithOwner(
        name.trim(),
        photoUri,
        userName.trim() || 'Właściciel'
      );
      setOnboarded(true);
    },
    [userName]
  );

  const markJoined = useCallback(() => {
    setSignedIn(true);
    setOnboarded(true);
  }, []);

  const value = useMemo(
    () => ({ ready, signedIn, onboarded, signIn, completeSetup, markJoined }),
    [ready, signedIn, onboarded, signIn, completeSetup, markJoined]
  );

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState(): AppStateValue {
  const context = useContext(AppStateContext);

  if (!context) {
    throw new Error('useAppState must be used within AppStateProvider');
  }

  return context;
}
