import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.8,
};

// Picker zwraca plik w folderze cache, który system może w każdej chwili
// wyczyścić — kopiujemy do trwałego folderu dokumentów aplikacji.
async function persistImage(sourceUri: string): Promise<string> {
  try {
    const source = new File(sourceUri);
    if (!source.exists) {
      return sourceUri;
    }

    const dir = new Directory(Paths.document, 'photos');
    dir.create({ idempotent: true, intermediates: true });

    const dest = new File(dir, `child-${Date.now()}.jpg`);
    await source.copy(dest);
    return dest.uri;
  } catch {
    return sourceUri;
  }
}

async function takePhoto(): Promise<string | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();

  if (!permission.granted) {
    Alert.alert(
      'Brak dostępu',
      'Zezwól aplikacji na dostęp do aparatu w ustawieniach telefonu.'
    );
    return null;
  }

  const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS);

  if (result.canceled) {
    return null;
  }

  const uri = result.assets[0]?.uri ?? null;
  return uri ? persistImage(uri) : null;
}

async function pickPhoto(): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    Alert.alert(
      'Brak dostępu',
      'Zezwól aplikacji na dostęp do zdjęć w ustawieniach telefonu.'
    );
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);

  if (result.canceled) {
    return null;
  }

  const uri = result.assets[0]?.uri ?? null;
  return uri ? persistImage(uri) : null;
}

export async function chooseProfileImage(): Promise<string | null> {
  return new Promise((resolve) => {
    Alert.alert(
      'Zdjęcie dziecka',
      'Skąd chcesz pobrać zdjęcie?',
      [
        {
          text: 'Zrób zdjęcie',
          onPress: () => {
            void takePhoto().then(resolve);
          },
        },
        {
          text: 'Z galerii',
          onPress: () => {
            void pickPhoto().then(resolve);
          },
        },
        { text: 'Anuluj', style: 'cancel', onPress: () => resolve(null) },
      ]
    );
  });
}
