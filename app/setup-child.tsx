import { FormField } from '@/components/form-field';
import { PrimaryButton } from '@/components/primary-button';
import { Palette } from '@/constants/theme';
import { useAppState } from '@/hooks/use-app-state';
import { chooseProfileImage } from '@/lib/images';
import KeyboardAwareForm from '@/components/KeyboardAwareForm';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SetupChildScreen() {
  const insets = useSafeAreaInsets();
  const { completeSetup } = useAppState();
  const [name, setName] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handlePhotoPress = async () => {
    const uri = await chooseProfileImage();

    if (!uri) return;

    setPhotoUri(uri);
  };

  const handleSave = async () => {
    if (saving) return;

    if (!name.trim()) {
      Alert.alert('Podaj imię', 'Imię dziecka jest wymagane.');
      return;
    }

    setSaving(true);
    try {
      await completeSetup(name.trim(), photoUri ?? undefined);
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
      <KeyboardAwareForm
        contentContainerStyle={{
          paddingTop: insets.top + 40,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 24,
        }}
      >
        <Text style={styles.title}>Poznajmy się!</Text>
        <Text style={styles.subtitle}>
          Wpisz imię dziecka i dodaj zdjęcie, jeśli chcesz
        </Text>

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
          placeholder="np. Róża"
          autoFocus
        />

        <PrimaryButton
          label={saving ? 'Zapisywanie...' : 'Zaczynamy'}
          onPress={() => {
            void handleSave();
          }}
        />
      </KeyboardAwareForm>
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
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: Palette.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  avatarSection: {
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 8,
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
