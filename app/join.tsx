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
      const childName = await joinByCode(typedCode, memberName);
      markJoined();

      Alert.alert(
        'Dołączono!',
        `${memberName} ma teraz dostęp do profilu ${childName}.`,
        [{ text: 'OK', onPress: () => router.replace('/(tabs)' as Href) }]
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

          <Text style={styles.hint}>
            Kod znajdziesz w aplikacji właściciela: Ustawienia → Udostępnij
            dziecko
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
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  hint: {
    fontSize: 13,
    color: Palette.textMuted,
    textAlign: 'center',
    marginTop: 16,
  },
});
