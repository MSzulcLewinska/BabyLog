import KeyboardAwareForm from '@/components/KeyboardAwareForm';
import { BackHeader } from '@/components/back-header';
import { FormField } from '@/components/form-field';
import { FormHero } from '@/components/form-hero';
import { PrimaryButton } from '@/components/primary-button';
import { Palette } from '@/constants/theme';
import { useAppState } from '@/hooks/use-app-state';
import { joinByCode } from '@/lib/storage';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

export default function JoinScreen() {
  const { markJoined } = useAppState();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [joining, setJoining] = useState(false);

  const join = async () => {
    if (joining) return;
    const typedCode = code.trim();
    const memberName = name.trim();
    if (!typedCode) {
      Alert.alert('Wpisz kod', 'Kod dziecka jest wymagany.');
      return;
    }
    if (!memberName) {
      Alert.alert('Podaj imię', 'Wpisz swoje imię, żeby dodać Cię do dziecka.');
      return;
    }
    setJoining(true);
    try {
      const childName = await joinByCode(
        typedCode,
        memberName,
        email.trim() || undefined,
      );
      markJoined();
      Alert.alert(
        'Dołączono!',
        `${memberName} ma teraz dostęp do profilu ${childName}.${email.trim() ? '\nZapisz swój e-mail — przydasz się do logowania na innym telefonie.' : ''}`,
        [{ text: 'OK', onPress: () => router.replace('/(tabs)' as Href) }],
      );
    } catch (error) {
      const message =
        error instanceof Error && error.message === 'NIEZNANY_KOD'
          ? 'Sprawdź kod na ekranie Udostępnij u właściciela dziennika.'
          : 'Nie udało się połączyć. Sprawdź internet i spróbuj ponownie.';
      Alert.alert('Błąd', message);
    } finally {
      setJoining(false);
    }
  };

  return (
    <View style={styles.screen}>
      <BackHeader title="Dołącz do dziecka" />
      <KeyboardAwareForm>
        <View style={styles.content}>
          <FormHero icon="🤝" />
          <FormField
            label="Twoje imię"
            value={name}
            onChangeText={setName}
            placeholder="np. Tomek"
            autoCapitalize="words"
          />
          <FormField
            label="Kod dziecka"
            value={code}
            onChangeText={setCode}
            placeholder="np. RÓŻA-4821"
            autoCapitalize="characters"
          />
          <FormField
            label="Twój e-mail (opcjonalnie)"
            value={email}
            onChangeText={setEmail}
            placeholder="np. jan@wp.pl"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <Text style={styles.hint}>
            Podaj e-mail, żeby móc zalogować się na innym telefonie bez kodu.
          </Text>
          <Text style={styles.hint}>
            Kod znajdziesz w aplikacji właściciela: Ustawienia → Udostępnij
          </Text>
          <PrimaryButton
            label={joining ? 'Dołączanie...' : 'DOŁĄCZ'}
            onPress={() => void join()}
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
