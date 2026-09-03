import {
  registerPushToken,
  syncPlanNotifications,
} from '@/lib/notifications';
import {
  acceptPrivacy,
  createChildWithOwner,
  findChildByEmail,
  hasAcceptedPrivacy,
  hasSavedChild,
  loadPlans,
  loadUser,
  loginByEmail,
  migrateLocalToCloud,
  saveUser,
  signOut as storageSignOut,
} from '@/lib/storage';
import { loadSession, saveSession } from '@/lib/supabase';
import type { UserAccount } from '@/lib/types';
import * as Notifications from 'expo-notifications';
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
  privacyAccepted: boolean;
  acceptPrivacyPolicy: () => Promise<void>;
  signIn: (user?: Partial<UserAccount>) => Promise<void>;
  loginWithEmail: (email: string) => Promise<void>;
  completeSetup: (name: string, photoUri?: string) => Promise<void>;
  markJoined: () => void;
  signOut: () => Promise<void>;
};

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [onboarded, setOnboarded] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    let active = true;
    let sub: Notifications.Subscription | null = null;

    const boot = async () => {
      const [user, session, accepted] = await Promise.all([
        loadUser(),
        loadSession(),
        hasAcceptedPrivacy(),
      ]);

      if (!session && user) {
        // Stare dane lokalne (przed Supabase) — jednorazowa migracja do chmury
        await migrateLocalToCloud(user.name || 'Właściciel', user.email);
      }

      const finalSession = session ?? (await loadSession());
      const childSaved = await hasSavedChild();

      if (finalSession) {
        void registerPushToken();

        // Nasłuchuj push — po odebraniu synchronizuj plany
        sub = Notifications.addNotificationReceivedListener(
          (notification) => {
            const data = notification.request.content.data as Record<string, unknown>;
            if (data?.type === 'plan_changed') {
              void (async () => {
                try {
                  const plans = await loadPlans();
                  await syncPlanNotifications(plans);
                } catch {
                  // cicho
                }
              })();
            }
          }
        );
      }

      if (!active) return;

      setUserName(user?.name ?? '');
      setSignedIn(Boolean(user) || Boolean(finalSession));
      setPrivacyAccepted(accepted);
      setOnboarded(Boolean(finalSession) || childSaved);
      setReady(true);
    };

    void boot();

    return () => {
      active = false;
      sub?.remove();
    };
  }, []);

  const signIn = useCallback(async (user?: Partial<UserAccount>) => {
    const account: UserAccount = {
      id: user?.id ?? `local-${Date.now()}`,
      provider: user?.provider ?? 'local',
      email: user?.email,
      name: user?.name,
      signedInAt: new Date().toISOString(),
    };
    await saveUser(account);
    setUserName(account.name ?? '');
    setSignedIn(true);
    setPrivacyAccepted(Boolean(user?.privacyAccepted));
    const [session, child] = await Promise.all([
      loadSession(),
      hasSavedChild(),
    ]);

    if (session || child) {
      setOnboarded(true);
      return;
    }

    // 2. Brak sesji lokalnej — spróbuj przywrócić z chmury po emailu
    if (account.email) {
      try {
        const restored = await findChildByEmail(account.email);
        if (restored) {
          await saveSession({
            childId: restored.childId,
            deviceId: restored.deviceId,
            secret: restored.secret,
          });
          void registerPushToken();
          setOnboarded(true);
          return;
        }
      } catch {
        // offline lub brak wyniku — idziemy do onboardingu
      }
    }

    // 3. Nowe konto — użytkownik przejdzie do setup-child
    setOnboarded(false);
  }, []);

  const completeSetup = useCallback(
    async (name: string, photoUri?: string) => {
      const user = await loadUser();
      await createChildWithOwner(
        name.trim(),
        photoUri,
        userName.trim() || 'Właściciel',
        user?.email,
      );
      void registerPushToken();
      setOnboarded(true);
    },
    [userName]
  );

  const loginWithEmail = useCallback(async (email: string) => {
    const result = await loginByEmail(email.trim());
    if (!result) {
      throw new Error('Nie znaleziono konta z tym adresem e-mail. Sprawdź adres lub dołącz kodem.');
    }

    await saveSession({
      childId: result.childId,
      deviceId: result.deviceId,
      secret: result.secret,
    });

    const account: UserAccount = {
      id: `email-${Date.now()}`,
      provider: 'email',
      email: email.trim(),
      name: result.memberName,
      signedInAt: new Date().toISOString(),
    };
    const existingUser = await loadUser();
    if (existingUser?.privacyAccepted) {
      account.privacyAccepted = true;
    }
    await saveUser(account);
    setUserName(result.memberName);
    setSignedIn(true);
    setPrivacyAccepted(Boolean(account.privacyAccepted));
    setOnboarded(true);
    void registerPushToken();
  }, []);

  const markJoined = useCallback(() => {
    setSignedIn(true);
    setOnboarded(true);
  }, []);

  const acceptPrivacyPolicy = useCallback(async () => {
    await acceptPrivacy();
    setPrivacyAccepted(true);
  }, []);

  const signOut = useCallback(async () => {
    await storageSignOut();
    setUserName('');
    setSignedIn(false);
    setOnboarded(false);
    setPrivacyAccepted(false);
  }, []);

  const value = useMemo(
    () => ({
      ready,
      signedIn,
      onboarded,
      privacyAccepted,
      acceptPrivacyPolicy,
      signIn,
      loginWithEmail,
      completeSetup,
      markJoined,
      signOut,
    }),
    [
      ready,
      signedIn,
      onboarded,
      privacyAccepted,
      acceptPrivacyPolicy,
      signIn,
      loginWithEmail,
      completeSetup,
      markJoined,
      signOut,
    ]
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
