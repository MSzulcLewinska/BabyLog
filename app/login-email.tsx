import KeyboardAwareForm from '@/components/KeyboardAwareForm';
import { BackHeader } from '@/components/back-header';
import { FormField } from '@/components/form-field';
import { FormHero } from '@/components/form-hero';
import { PrimaryButton } from '@/components/primary-button';
import { Palette } from '@/constants/theme';
import { useAppState } from '@/hooks/use-app-state';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

export default function LoginEmailScreen() {
  const { loginWithEmail } = useAppState();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const handleLogin = async () => {
    if (busy) return;
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      Alert.alert('Błędny e-mail', 'Wpisz poprawny adres e-mail.');
      return;
    }
    setBusy(true);
    try {
      await loginWithEmail(trimmed);
      Alert.alert('Zalogowano!', 'Witaj z powrotem!', [{ text: 'OK' }]);
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
});
