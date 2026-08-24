import KeyboardAwareForm from '@/components/KeyboardAwareForm';
import { BackHeader } from '@/components/back-header';
import { FormField } from '@/components/form-field';
import { FormHero } from '@/components/form-hero';
import { PrimaryButton } from '@/components/primary-button';
import { Palette } from '@/constants/theme';
import { addChildMember, loadChild } from '@/lib/storage';
import type { Member } from '@/lib/types';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

export default function JoinScreen() {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');

  const join = async () => {
    const child = await loadChild();
    const typed = code.trim().toUpperCase();
    const memberName = name.trim();

    if (!typed) {
      Alert.alert('Wpisz kod', 'Kod dziecka jest wymagany.');
      return;
    }

    if (!memberName) {
      Alert.alert('Podaj imię', 'Wpisz swoje imię, żeby dodać Cię do dziecka.');
      return;
    }

    if (typed !== child.shareCode.toUpperCase()) {
      Alert.alert(
        'Nieznany kod',
        'Sprawdź kod na ekranie Udostępnij u właściciela dziennika.'
      );
      return;
    }

    const member: Member = {
      id: `member-${Date.now()}`,
      name: memberName,
      role: 'member',
    };

    await addChildMember(member);

    Alert.alert(
      'Dołączono!',
      `${member.name} ma teraz dostęp do profilu ${child.name}.`,
      [{ text: 'OK', onPress: () => router.back() }]
    );
  };

  return (
    <View style={styles.screen}>
      <BackHeader title="Dołącz do dziecka" />
      <KeyboardAwareForm>
        <View style={styles.content}>
          <FormHero icon="🤝" />

          <FormField
            label="Twój kod"
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

          <PrimaryButton label="DOŁĄCZ" onPress={() => void join()} />
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
