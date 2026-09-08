import KeyboardAwareForm from '@/components/KeyboardAwareForm';
import { BackHeader } from '@/components/back-header';
import { FormField } from '@/components/form-field';
import { PrimaryButton } from '@/components/primary-button';
import { Palette } from '@/constants/theme';
import { chooseProfileImage } from '@/lib/images';
import { createChildWithOwner, loadUser } from '@/lib/storage';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';

export default function AddChildScreen() {
  const [name, setName] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handlePhotoPress = async () => {
    const uri = await chooseProfileImage();
    if (uri) setPhotoUri(uri);
  };

  const handleSave = async () => {
    if (saving) return;

    if (!name.trim()) {
      Alert.alert('Podaj imię', 'Imię dziecka jest wymagane.');
      return;
    }

    setSaving(true);
    try {
      const user = await loadUser();
      await createChildWithOwner(
        name.trim(),
        photoUri ?? undefined,
        user?.name?.trim() || 'Właściciel',
        user?.email,
      );
      router.replace('/(tabs)' as Href);
    } catch {
      Alert.alert(
        'Coś poszło nie tak',
        'Nie udało się utworzyć profilu. Sprawdź internet i spróbuj ponownie.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <BackHeader title="Dodaj dziecko" />
      <KeyboardAwareForm contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.content}>
          <View style={styles.avatarSection}>
            <View style={styles.avatarWrapper}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitial}>
                    {name.trim().charAt(0).toUpperCase() || '👶'}
                  </Text>
                </View>
              )}
            </View>
            <Text
              style={styles.photoButton}
              onPress={() => {
                void handlePhotoPress();
              }}
            >
              {photoUri ? 'Zmień zdjęcie' : 'Dodaj zdjęcie'}
            </Text>
          </View>

          <FormField
            label="Imię dziecka"
            value={name}
            onChangeText={setName}
            placeholder="np. Jaś"
            autoFocus
          />

          <PrimaryButton
            label={saving ? 'Zapisywanie...' : 'Dodaj dziecko'}
            onPress={() => {
              void handleSave();
            }}
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
    marginTop: 16,
    marginBottom: 12,
  },
  avatarWrapper: {
    width: 128,
    height: 128,
  },
  avatarPlaceholder: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: Palette.greenSoft,
    borderWidth: 2,
    borderColor: Palette.greenMuted,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarInitial: {
    fontSize: 48,
  },
  avatarImage: {
    width: 128,
    height: 128,
    borderRadius: 64,
  },
  photoButton: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: '600',
    color: Palette.greenDark,
  },
});