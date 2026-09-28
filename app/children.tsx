import { BackHeader } from '@/components/back-header';
import { PrimaryButton } from '@/components/primary-button';
import { Palette } from '@/constants/theme';
import { useLiveData } from '@/hooks/use-live-data';
import {
  accountsByEmail,
  listChildren,
  loadUser,
  removeLocalChild,
  switchChild,
  type AccountChild,
} from '@/lib/storage';
import { saveSession } from '@/lib/supabase';
import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const ROLE_LABEL: Record<string, string> = {
  owner: 'Rodzic',
  member: 'Opiekun',
  observer: 'Obserwator',
};

type Entry = {
  childId: string;
  name: string;
  role: string;
  isActive: boolean;
  onDevice: boolean;
  photoUri?: string;
  account?: AccountChild;
};

export default function ChildrenScreen() {
  const localChildren = useLiveData(listChildren) ?? [];
  const [emailChildren, setEmailChildren] = useState<AccountChild[] | null>(null);
  const [loading, setLoading] = useState(true);

  const loadEmailChildren = useCallback(async () => {
    try {
      const user = await loadUser();
      if (!user?.email) {
        setEmailChildren([]);
        return;
      }
      setEmailChildren(await accountsByEmail(user.email));
    } catch {
      setEmailChildren([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadEmailChildren();
    }, [loadEmailChildren])
  );

  const entries: Entry[] = localChildren.map((child) => {
    const account = (emailChildren ?? []).find(
      (item) => item.childId === child.childId
    );
    return {
      childId: child.childId,
      name: child.name,
      role: child.isOwner ? 'owner' : (account?.role ?? 'member'),
      isActive: child.isActive,
      onDevice: true,
      photoUri: child.photoUri,
      account,
    };
  });

  for (const account of emailChildren ?? []) {
    if (entries.some((entry) => entry.childId === account.childId)) {
      continue;
    }
    entries.push({
      childId: account.childId,
      name: account.childName,
      role: account.role,
      isActive: false,
      onDevice: false,
      account,
    });
  }

  const active = entries.find((entry) => entry.isActive);
  const others = entries.filter((entry) => !entry.isActive);

  const select = async (entry: Entry) => {
    try {
      if (!entry.onDevice && entry.account) {
        // dziecko powiązane z e-mailem, ale nie dodane na ten telefon
        await saveSession({
          childId: entry.account.childId,
          deviceId: entry.account.deviceId,
          secret: entry.account.secret,
        });
        await switchChild(entry.account.childId);
      } else {
        await switchChild(entry.childId);
      }
      router.back();
    } catch {
      Alert.alert(
        'Nie udało się przełączyć',
        'Sprawdź internet i spróbuj ponownie.'
      );
    }
  };

  const removeFromDevice = (entry: Entry) => {
    Alert.alert(
      'Usunąć z tego urządzenia?',
      `Dane dziecka „${entry.name}" zostaną w chmurze. Usuniemy tylko dostęp z tego telefonu.`,
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Usuń',
          style: 'destructive',
          onPress: () => void removeLocalChild(entry.childId),
        },
      ]
    );
  };

  const renderRow = (entry: Entry) => (
    <Pressable
      key={entry.childId}
      style={styles.row}
      onPress={() => void select(entry)}
    >
      {entry.photoUri ? (
        <Image
          source={{ uri: entry.photoUri }}
          style={styles.avatar}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {entry.name.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={styles.rowTexts}>
        <Text style={styles.name}>{entry.name}</Text>
        <Text style={styles.role}>
          {ROLE_LABEL[entry.role] ?? 'Członek'}
          {entry.onDevice ? '' : ' · dodaj na to urządzenie'}
        </Text>
      </View>
      {entry.isActive ? (
        <Text style={styles.activeBadge}>Aktywne ✓</Text>
      ) : (
        <Text style={styles.switchHint}>Przełącz</Text>
      )}
      {entry.onDevice && !entry.isActive && entries.length > 1 && (
        <Pressable
          hitSlop={10}
          onPress={() => removeFromDevice(entry)}
          style={styles.removeWrap}
        >
          <Text style={styles.removeIcon}>🗑️</Text>
        </Pressable>
      )}
    </Pressable>
  );

  return (
    <View style={styles.screen}>
      <BackHeader title="Moje dzieci" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {active && (
          <>
            <Text style={styles.sectionLabel}>Dziecko, na którym jesteś zalogowana</Text>
            <View style={styles.card}>{renderRow(active)}</View>
          </>
        )}

        <Text style={styles.sectionLabel}>Moje dzieci</Text>
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={Palette.green} />
          </View>
        ) : others.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.emptyText}>
              Do tego adresu e-mail nie są przypisane inne dziecka. Możesz dodać
              kolejne.
            </Text>
          </View>
        ) : (
          <View style={styles.card}>{others.map(renderRow)}</View>
        )}

        <PrimaryButton
          label="＋  Dodaj kolejne dziecko"
          onPress={() => router.push('/add-child' as Href)}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 32,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.textSecondary,
    marginTop: 18,
    marginBottom: 8,
  },
  card: {
    backgroundColor: Palette.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Palette.border,
    overflow: 'hidden',
    marginBottom: 16,
  },
  loadingBox: {
    paddingVertical: 28,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: Palette.textSecondary,
    lineHeight: 20,
    padding: 16,
  },
  row: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Palette.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: Palette.greenDark,
  },
  rowTexts: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: Palette.text,
  },
  role: {
    fontSize: 12,
    color: Palette.textMuted,
    marginTop: 2,
  },
  activeBadge: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.greenDark,
  },
  switchHint: {
    fontSize: 13,
    color: Palette.textSecondary,
  },
  removeWrap: {
    marginLeft: 12,
    padding: 4,
  },
  removeIcon: {
    fontSize: 15,
    opacity: 0.7,
  },
});
