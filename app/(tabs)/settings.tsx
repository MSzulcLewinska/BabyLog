import { Palette } from '@/constants/theme';
import { useAppState } from '@/hooks/use-app-state';
import { useLiveData } from '@/hooks/use-live-data';
import { formatChildAge, formatChildAgeWeeks } from '@/lib/dates';
import {
  deleteAccountData,
  exportAllData,
  loadChild,
  loadUser,
  removeChildMember,
  updateMemberRole,
} from '@/lib/storage';
import type { Member } from '@/lib/types';
import { router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PRIVACY_URL = 'https://mszulclewinska.github.io/BabyLog/privacy.html';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const child = useLiveData(loadChild);
  const user = useLiveData(loadUser);
  const { signOut } = useAppState();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    let active = true;
    void import('@/lib/storage').then(({ isCurrentUserOwner }) =>
      isCurrentUserOwner().then((v) => {
        if (active) setIsOwner(v);
      })
    );
    return () => {
      active = false;
    };
  }, [child]);

  const accountLabel =
    user?.name || user?.email || 'Uzupełnij dane konta';

  const handleExportData = () => {
    void (async () => {
      try {
        const json = await exportAllData();
        await Share.share({ message: json });
      } catch {
        Alert.alert('Błąd', 'Nie udało się przygotować danych.');
      }
    })();
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Usunąć wszystkie dane?',
      'To trwale usunie profil dziecka oraz wszystkie wpisy, zdjęcia i dane członków z chmury. Tej operacji nie można cofnąć.',
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Usuń wszystko',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await deleteAccountData();
                await signOut();
                router.replace('/login' as Href);
              } catch {
                Alert.alert('Błąd', 'Nie udało się usunąć danych.');
              }
            })();
          },
        },
      ]
    );
  };

  const handleOpenPrivacy = () => {
    void Linking.openURL(PRIVACY_URL);
  };

  const handleSignOut = () => {
    Alert.alert(
      'Wylogowanie',
      'Wylogować to urządzenie? Dane dziecka pozostaną bezpieczne w chmurze.',
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Wyloguj',
          style: 'destructive',
          onPress: () => void signOut(),
        },
      ]
    );
  };

  const handleRemoveMember = (member: Member) => {
    Alert.alert(
      'Usuń członka',
      `Cofnąć dostęp dla „${member.name}"?`,
      [
        {
          text: 'Usuń',
          style: 'destructive',
          onPress: () => {
            setRemovingId(member.id);
            removeChildMember(member.id).finally(() => setRemovingId(null));
          },
        },
        { text: 'Anuluj', style: 'cancel' },
      ]
    );
  };

  const handleToggleRole = (member: Member) => {
    const isObserver = member.role === 'observer';
    const newRole = isObserver ? 'member' : 'observer';
    const label = isObserver ? 'Opiekun' : 'Obserwator';
    Alert.alert(
      'Zmień rolę',
      `Zmienić rolę „${member.name}" na ${label}?`,
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: label,
          onPress: () => {
            void updateMemberRole(member.id, newRole).catch(() => {
              Alert.alert('Błąd', 'Nie udało się zmienić roli.');
            });
          },
        },
      ]
    );
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: 24,
          paddingHorizontal: 18,
        }}
      >
        <Text style={styles.title}>Ustawienia</Text>

        <Pressable
          style={styles.profile}
          onPress={() => router.push('/edit-child' as Href)}
        >
          {child?.photoUri ? (
            <Image
              source={{ uri: child.photoUri }}
              style={styles.avatar}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(child?.name ?? 'R').charAt(0)}
              </Text>
            </View>
          )}
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{child?.name ?? 'Dodaj dziecko'}</Text>
            <Text style={styles.meta}>
              {child?.birthDate
                ? `${formatChildAge(child.birthDate)} · ${formatChildAgeWeeks(child.birthDate)}`
                : 'Dotknij, aby edytować profil'}
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>

        <Text style={styles.sectionLabel}>Konto</Text>
        <View style={styles.card}>
          <SettingsRow
            icon="👤"
            label={accountLabel}
            sub="Konto lokalne"
            onPress={() => router.push('/edit-account' as Href)}
          />
          <SettingsRow
            icon="🚪"
            label="Wyloguj się"
            onPress={handleSignOut}
            last
          />
        </View>

        <Text style={styles.sectionLabel}>Członkowie</Text>
        <View style={styles.card}>
          {(child?.members ?? []).map((member, index) => {
            const isOwner = member.role === 'owner';
            return isOwner ? (
              <MemberRowOwner
                key={member.id}
                member={member}
                last={index === (child?.members.length ?? 0) - 1}
              />
            ) : (
              <MemberRow
                key={member.id}
                member={member}
                last={index === (child?.members.length ?? 0) - 1}
                busy={removingId === member.id}
                onRemove={() => handleRemoveMember(member)}
                onToggleRole={() => handleToggleRole(member)}
              />
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>Udostępnianie</Text>
        <View style={styles.card}>
          <SettingsRow
            icon="🔗"
            label="Udostępnij dziecko"
            onPress={() => router.push('/share' as Href)}
          />
          <SettingsRow
            icon="🤝"
            label="Dołącz do dziecka"
            onPress={() => router.push('/join' as Href)}
            last
          />
        </View>

        <Text style={styles.sectionLabel}>Prywatność i dane</Text>
        <View style={styles.card}>
          <SettingsRow
            icon="📄"
            label="Polityka prywatności"
            onPress={handleOpenPrivacy}
          />
          <SettingsRow
            icon="⬇️"
            label="Pobierz moje dane"
            onPress={handleExportData}
          />
          {isOwner && (
            <SettingsRow
              icon="🗑️"
              label="Usuń konto i wszystkie dane"
              sub="Nieodwracalne"
              onPress={handleDeleteAccount}
              last
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function SettingsRow({
  icon,
  label,
  sub,
  onPress,
  last,
}: {
  icon: string;
  label: string;
  sub?: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      style={[styles.row, last && styles.lastRow]}
      onPress={onPress}
    >
      <Text style={styles.rowIcon}>{icon}</Text>
      <View style={styles.rowTexts}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sub && <Text style={styles.rowSub}>{sub}</Text>}
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

function MemberRowOwner({
  member,
  last,
}: {
  member: Member;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, last && styles.lastRow]}>
      <View style={styles.memberAvatar}>
        <Text style={styles.memberInitial}>
          {member.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.rowTexts}>
        <Text style={styles.rowLabel}>{member.name}</Text>
        <Text style={styles.rowSub}>Właściciel</Text>
      </View>
    </View>
  );
}

function MemberRow({
  member,
  last,
  busy,
  onRemove,
  onToggleRole,
}: {
  member: Member;
  last?: boolean;
  busy?: boolean;
  onRemove: () => void;
  onToggleRole: () => void;
}) {
  const isObserver = member.role === 'observer';

  return (
    <View style={[styles.row, last && styles.lastRow]}>
      <View style={styles.memberAvatar}>
        <Text style={styles.memberInitial}>
          {member.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.rowTexts}>
        <Text style={styles.rowLabel}>{member.name}</Text>
        <Text style={styles.rowSub}>
          {isObserver ? 'Obserwator (podgląd)' : 'Opiekun'}
        </Text>
      </View>
      <Pressable
        hitSlop={10}
        onPress={onToggleRole}
        style={styles.roleButton}
      >
        <Text style={styles.roleButtonText}>
          {isObserver ? '👤' : '👁️'}
        </Text>
      </Pressable>
      <Pressable hitSlop={10} onPress={onRemove} disabled={busy}>
        <Text style={[styles.removeIcon, busy && styles.removeIconBusy]}>
          🗑️
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Palette.text,
    marginBottom: 18,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
    marginTop: 18,
    paddingHorizontal: 4,
  },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 16,
    marginBottom: 4,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Palette.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: Palette.greenDark,
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: Palette.text,
  },
  meta: {
    fontSize: 13,
    color: Palette.textSecondary,
    marginTop: 3,
  },
  card: {
    backgroundColor: Palette.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Palette.border,
    overflow: 'hidden',
  },
  row: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F0',
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  rowIcon: {
    fontSize: 20,
    width: 32,
  },
  rowTexts: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 16,
    color: Palette.text,
    fontWeight: '500',
  },
  rowSub: {
    fontSize: 12,
    color: Palette.textMuted,
    marginTop: 2,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Palette.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  memberInitial: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.greenDark,
  },
  removeIcon: {
    fontSize: 16,
    opacity: 0.75,
  },
  removeIconBusy: {
    opacity: 0.3,
  },
  roleButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
  },
  roleButtonText: {
    fontSize: 16,
  },
  chevron: {
    fontSize: 22,
    color: Palette.textMuted,
    marginLeft: 8,
  },
});
