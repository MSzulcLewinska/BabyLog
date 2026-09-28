import KeyboardAwareForm from '@/components/KeyboardAwareForm';
import { BackHeader } from '@/components/back-header';
import { FormField } from '@/components/form-field';
import { FormHero } from '@/components/form-hero';
import { PrimaryButton } from '@/components/primary-button';
import { Palette } from '@/constants/theme';
import { useAppState } from '@/hooks/use-app-state';
import type { AccountChild } from '@/lib/storage';
import { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const ROLE_LABEL: Record<AccountChild['role'], string> = {
  owner: 'Rodzic',
  member: 'Opiekun',
  observer: 'Obserwator',
};

export default function LoginEmailScreen() {
  const { loginWithEmail, findAccounts } = useAppState();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [accounts, setAccounts] = useState<AccountChild[] | null>(null);

  const runLogin = async (emailValue: string, childId?: string) => {
    await loginWithEmail(emailValue, childId);
    setAccounts(null);
    Alert.alert('Zalogowano!', 'Witaj z powrotem!', [{ text: 'OK' }]);
  };

  const handleLogin = async () => {
    if (busy) return;
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      Alert.alert('Błędny e-mail', 'Wpisz poprawny adres e-mail.');
      return;
    }
    setBusy(true);
    try {
      const found = await findAccounts(trimmed);

      if (found.length === 0) {
        Alert.alert(
          'Nie znaleziono konta',
          'Nie znaleziono konta z tym adresem e-mail. Sprawdź adres lub dołącz kodem.'
        );
        return;
      }

      if (found.length === 1) {
        await runLogin(trimmed, found[0].childId);
        return;
      }

      // kilka dzieci powiązanych z tym e-mailem — pozwalamy wybrać
      setAccounts(found);
    } catch (error) {
      Alert.alert(
        'Błąd',
        error instanceof Error
          ? error.message
          : 'Nie udało się zalogować. Sprawdź internet i spróbuj ponownie.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.screen}>
      <BackHeader title="Logowanie mailem" />
      <KeyboardAwareForm>
        <View style={styles.content}>
          <FormHero icon="📧" />
          <FormField
            label="Adres e-mail"
            value={email}
            onChangeText={setEmail}
            placeholder="np. jan@wp.pl"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <Text style={styles.hint}>
            E-mail musi być taki sam, jaki podałeś przy dołączaniu do dziecka.
          </Text>
          <PrimaryButton
            label={busy ? 'Logowanie...' : 'ZALOGUJ SIĘ'}
            onPress={() => void handleLogin()}
          />
        </View>
      </KeyboardAwareForm>

      <Modal
        visible={accounts !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setAccounts(null)}
      >
        <Pressable style={styles.backdrop} onPress={() => setAccounts(null)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.sheetTitle}>Wybierz dziecko</Text>
            <Text style={styles.sheetSub}>
              Ten e-mail ma dostęp do kilku profili:
            </Text>
            <ScrollView style={styles.sheetList}>
              {(accounts ?? []).map((account) => (
                <Pressable
                  key={account.childId}
                  style={styles.accountRow}
                  onPress={() => {
                    const target = account.childId;
                    setBusy(true);
                    void runLogin(email.trim().toLowerCase(), target)
                      .catch((error: unknown) => {
                        Alert.alert(
                          'Błąd',
                          error instanceof Error
                            ? error.message
                            : 'Nie udało się zalogować.'
                        );
                      })
                      .finally(() => setBusy(false));
                  }}
                >
                  <View style={styles.accountAvatar}>
                    <Text style={styles.accountInitial}>
                      {account.childName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.accountTexts}>
                    <Text style={styles.accountName}>{account.childName}</Text>
                    <Text style={styles.accountRole}>
                      {ROLE_LABEL[account.role] ?? 'Członek'}
                    </Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              style={styles.sheetCancel}
              onPress={() => setAccounts(null)}
            >
              <Text style={styles.sheetCancelText}>Anuluj</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
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
  },
  hint: {
    fontSize: 13,
    color: Palette.textMuted,
    marginTop: 10,
    textAlign: 'center',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Palette.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
  },
  sheetTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: Palette.text,
  },
  sheetSub: {
    fontSize: 14,
    color: Palette.textSecondary,
    marginTop: 4,
    marginBottom: 12,
  },
  sheetList: {
    maxHeight: 320,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  accountAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Palette.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  accountInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: Palette.greenDark,
  },
  accountTexts: {
    flex: 1,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '600',
    color: Palette.text,
  },
  accountRole: {
    fontSize: 12,
    color: Palette.textMuted,
    marginTop: 2,
  },
  chevron: {
    fontSize: 22,
    color: Palette.textMuted,
  },
  sheetCancel: {
    marginTop: 16,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: Palette.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
});
