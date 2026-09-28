import KeyboardAwareForm from '@/components/KeyboardAwareForm';
import { FormField } from '@/components/form-field';
import { PrimaryButton } from '@/components/primary-button';
import { Palette } from '@/constants/theme';
import { useAppState } from '@/hooks/use-app-state';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signIn } = useAppState();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const handleRegister = async () => {
    if (busy) return;
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedName) {
      Alert.alert('Podaj imię', 'Wpisz swoje imię, żeby utworzyć konto.');
      return;
    }
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      Alert.alert(
        'Podaj e-mail',
        'E-mail jest wymagany, aby konto można było połączyć z dzieckiem i zalogować się na innym telefonie.'
      );
      return;
    }
    setBusy(true);
    try {
      await signIn({ name: trimmedName, email: trimmedEmail });
      // Nawigacją zajmuje się _layout.tsx na podstawie stanu signedIn/onboarded
    } catch (error) {
      if (error instanceof Error && error.message === 'EMAIL_ZAJETY') {
        setBusy(false);
        Alert.alert(
          'Ten e-mail jest już w bazie',
          'Konto z tym adresem e-mail już istnieje. Zaloguj się albo dołącz do dziecka kodem.',
          [
            { text: 'Anuluj', style: 'cancel' },
            {
              text: 'Zaloguj się',
              onPress: () => router.replace('/login-email' as Href),
            },
          ]
        );
        return;
      }
      setBusy(false);
      Alert.alert(
        'Nie udało się założyć konta',
        'Sprawdź internet i spróbuj ponownie.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <KeyboardAwareForm>
        <View style={styles.content}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>🍼</Text>
          </View>
          <Text style={styles.title}>BabyLog</Text>
          <Text style={styles.subtitle}>
            Dziennik karmień, pieluch i ważnych chwil Twojego malucha
          </Text>

          <FormField
            label="Twoje imię"
            value={name}
            onChangeText={setName}
            placeholder="np. Magda"
            autoCapitalize="words"
          />
          <FormField
            label="Adres e-mail"
            value={email}
            onChangeText={setEmail}
            placeholder="np. magda@gmail.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <PrimaryButton
            label={busy ? 'Rejestrowanie...' : 'UTWÓRZ KONTO'}
            onPress={() => void handleRegister()}
          />

          <Text style={styles.joinHint}>Masz już konto?</Text>
          <Pressable
            style={({ pressed }) => [styles.joinButton, pressed && { opacity: 0.7 }]}
            onPress={() => router.push('/login-email' as Href)}
          >
            <Text style={styles.joinLabel}>Zaloguj się mailem →</Text>
          </Pressable>

          <Text style={styles.joinHint}>Druga osoba z rodziny?</Text>
          <Pressable
            style={({ pressed }) => [styles.joinButton, pressed && { opacity: 0.7 }]}
            onPress={() => router.push('/join' as Href)}
          >
            <Text style={styles.joinLabel}>Dołącz kodem dziecka →</Text>
          </Pressable>

          <Text style={styles.note}>
            E-mail jest niezbędny do połączenia dziecka z rodzicami i logowania na
            innym telefonie
          </Text>
        </View>
      </KeyboardAwareForm>
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
    paddingBottom: 24,
  },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Palette.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  logoEmoji: {
    fontSize: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: Palette.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: Palette.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 18,
    lineHeight: 22,
  },
  joinHint: {
    fontSize: 13,
    color: Palette.textMuted,
    marginTop: 24,
    textAlign: 'center',
  },
  joinButton: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  joinLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Palette.greenDark,
  },
  note: {
    fontSize: 12,
    color: Palette.textMuted,
    marginTop: 20,
    textAlign: 'center',
  },
});