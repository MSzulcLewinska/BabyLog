import {
  hasSavedChild,
  loadChild,
  loadUser,
  saveChild,
  saveUser,
} from '@/lib/storage';
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
};

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [onboarded, setOnboarded] = useState(false);

  useEffect(() => {
    let active = true;

    Promise.all([loadUser(), hasSavedChild()]).then(
      ([user, childSaved]) => {
        if (!active) return;
        setSignedIn(Boolean(user));
        setOnboarded(childSaved);
        setReady(true);
      }
    );

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
    await saveUser(account);
    setSignedIn(true);
  }, []);

  const completeSetup = useCallback(
    async (name: string, photoUri?: string) => {
      const base = await loadChild();
      await saveChild({
        ...base,
        name: name.trim(),
        photoUri: photoUri ?? base.photoUri,
      });
      setOnboarded(true);
    },
    []
  );

  const value = useMemo(
    () => ({ ready, signedIn, onboarded, signIn, completeSetup }),
    [ready, signedIn, onboarded, signIn, completeSetup]
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
