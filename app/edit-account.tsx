import { BackHeader } from '@/components/back-header';
import { FormField } from '@/components/form-field';
import KeyboardAwareForm from '@/components/KeyboardAwareForm';
import { PrimaryButton } from '@/components/primary-button';
import { Palette } from '@/constants/theme';
import { loadUser, saveUser } from '@/lib/storage';
import type { UserAccount } from '@/lib/types';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

export default function EditAccountScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [provider, setProvider] = useState('');
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      loadUser().then((loaded) => {
        if (!active) return;
        setName(loaded?.name ?? '');
        setEmail(loaded?.email ?? '');
        setProvider(loaded?.provider ?? 'google');
      });

      return () => {
        active = false;
      };
    }, [])
  );

  const handleSave = async () => {
    if (saving) return;

    setSaving(true);
    try {
      const base: UserAccount | null = await loadUser();
      await saveUser({
        id: base?.id ?? `google-${Date.now()}`,
        provider: base?.provider ?? provider,
        signedInAt: base?.signedInAt,
        name: name.trim() || undefined,
        email: email.trim() || undefined,
      });
      Alert.alert('Zapisano', 'Dane konta zostały zaktualizowane.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <BackHeader title="Moje konto" />
      <KeyboardAwareForm contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.content}>
          <View style={styles.providerCard}>
            <Text style={styles.providerIcon}>🔐</Text>
            <View>
              <Text style={styles.providerLabel}>Logowanie przez Google</Text>
              <Text style={styles.providerValue}>
                {email.trim() || 'Konto lokalne'}
              </Text>
            </View>
          </View>

          <FormField
            label="Twoje imię"
            value={name}
            onChangeText={setName}
            placeholder="np. Magda"
            autoCapitalize="words"
          />

          <FormField
            label="E-mail (opcjonalnie)"
            value={email}
            onChangeText={setEmail}
            placeholder="np. magda@gmail.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <PrimaryButton
            label={saving ? 'Zapisywanie...' : 'Zapisz'}
            onPress={() => void handleSave()}
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
    paddingHorizontal: 20,
  },
  providerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 14,
    marginTop: 8,
  },
  providerIcon: {
    fontSize: 22,
    marginRight: 12,
  },
  providerLabel: {
    fontSize: 13,
    color: Palette.textSecondary,
  },
  providerValue: {
    fontSize: 15,
    fontWeight: '600',
    color: Palette.text,
    marginTop: 2,
  },
});
