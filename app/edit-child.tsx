import { BackHeader } from '@/components/back-header';
import { DateField } from '@/components/date-field';
import { FormField } from '@/components/form-field';
import { PrimaryButton } from '@/components/primary-button';
import { Palette } from '@/constants/theme';
import { formatChildAge, parseDateKey, toDateKey } from '@/lib/dates';
import { chooseProfileImage } from '@/lib/images';
import KeyboardAwareForm from '@/components/KeyboardAwareForm';
import { loadChild, saveChild } from '@/lib/storage';
import type { ChildProfile } from '@/lib/types';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

export default function EditChildScreen() {
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [weightKg, setWeightKg] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      loadChild().then((loaded) => {
        if (!active || !loaded) return;
        setName(loaded.name);
        setBirthDate(loaded.birthDate ? parseDateKey(loaded.birthDate) : null);
        setWeightKg(loaded.weightKg ?? '');
        setHeightCm(loaded.heightCm ?? '');
        setPhotoUri(loaded.photoUri ?? null);
      });

      return () => {
        active = false;
      };
    }, [])
  );

  const handlePhotoPress = async () => {
    const uri = await chooseProfileImage();
    if (uri) {
      setPhotoUri(uri);
    }
  };

  const handleSave = async () => {
    if (saving) return;

    if (!name.trim()) {
      Alert.alert('Podaj imię', 'Imię dziecka jest wymagane.');
      return;
    }

    setSaving(true);
    try {
      const base: ChildProfile = (await loadChild()) ?? {
        name: name.trim(),
        shareCode: '',
        members: [],
      };
      await saveChild({
        ...base,
        name: name.trim(),
        photoUri: photoUri ?? base.photoUri,
        birthDate: birthDate ? toDateKey(birthDate) : undefined,
        weightKg: weightKg.trim() || undefined,
        heightCm: heightCm.trim() || undefined,
      });
      Alert.alert('Zapisano', 'Profil dziecka został zaktualizowany.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <BackHeader title="Edytuj dziecko" />
      <KeyboardAwareForm contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.content}>
          <View style={styles.avatarSection}>
            <Pressable onPress={() => void handlePhotoPress()}>
              {photoUri ? (
                <Image
                  source={{ uri: photoUri }}
                  style={styles.avatar}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarInitial}>
                    {name.trim().charAt(0).toUpperCase() || '👶'}
                  </Text>
                </View>
              )}
              <Text style={styles.photoHint}>Zmień zdjęcie</Text>
            </Pressable>
          </View>

          <FormField
            label="Imię"
            value={name}
            onChangeText={setName}
            placeholder="np. Róża"
          />

          <DateField value={birthDate} onChange={setBirthDate} />

          {birthDate && (
            <Text style={styles.ageLine}>
              Wiek: {formatChildAge(toDateKey(birthDate))}
            </Text>
          )}

          <FormField
            label="Waga (kg)"
            value={weightKg}
            onChangeText={setWeightKg}
            placeholder="np. 5,6"
            keyboardType="decimal-pad"
          />

          <FormField
            label="Wzrost (cm)"
            value={heightCm}
            onChangeText={setHeightCm}
            placeholder="np. 58"
            keyboardType="decimal-pad"
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
  avatarSection: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  avatar: {
    width: 104,
    height: 104,
    borderRadius: 52,
  },
  avatarFallback: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: Palette.greenSoft,
    borderWidth: 2,
    borderColor: Palette.greenMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 40,
  },
  photoHint: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: Palette.greenDark,
    textAlign: 'center',
  },
  ageLine: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '600',
    color: Palette.greenDark,
  },
});
