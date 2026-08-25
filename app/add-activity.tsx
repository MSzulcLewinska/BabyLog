import KeyboardAwareForm from '@/components/KeyboardAwareForm';
import { BackHeader } from '@/components/back-header';
import { FormField } from '@/components/form-field';
import { PrimaryButton } from '@/components/primary-button';
import { Palette } from '@/constants/theme';
import { addActivity, newId } from '@/lib/storage';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

const ICONS = ['🍼', '💩', '💧', '🌡️', '😴', '💊', '🐤', '✨', '❤️', '🌙'];
const COLORS = ['#3B82F6', '#34C759', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

export default function AddActivityScreen() {
  const [icon, setIcon] = useState('🌡️');
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [color, setColor] = useState(COLORS[0]);

  const save = async () => {
    if (!name.trim()) {
      Alert.alert('Podaj nazwę', 'Nazwa czynności jest wymagana.');
      return;
    }

    await addActivity({
      id: newId(),
      name: name.trim(),
      icon,
      unit: unit.trim() || undefined,
      color,
      builtin: false,
      kind: 'custom',
    });

    Alert.alert('Dodano', 'Nowa czynność jest gotowa.', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  return (
    <View style={styles.screen}>
      <BackHeader title="Dodaj czynność" />
      <KeyboardAwareForm>
        <View style={styles.content}>
          <Text style={styles.label}>Ikona</Text>
          <Pressable style={styles.iconPicker}>
            <Text style={styles.heroIcon}>{icon}</Text>
            <Text style={styles.iconHint}>Wybierz ikonę</Text>
          </Pressable>
          <View style={styles.iconRow}>
            {ICONS.map((item) => (
              <Pressable
                key={item}
                style={[styles.iconChoice, icon === item && styles.iconChoiceSelected]}
                onPress={() => setIcon(item)}
              >
                <Text style={styles.iconChoiceText}>{item}</Text>
              </Pressable>
            ))}
          </View>

          <FormField
            label="Nazwa"
            placeholder="np. Temperatura"
            value={name}
            onChangeText={setName}
          />
          <FormField
            label="Jednostka"
            placeholder="np. °C"
            value={unit}
            onChangeText={setUnit}
          />

          <Text style={styles.label}>Kolor</Text>
          <View style={styles.colors}>
            {COLORS.map((item) => (
              <Pressable
                key={item}
                style={[
                  styles.colorDot,
                  { backgroundColor: item },
                  color === item && styles.colorSelected,
                ]}
                onPress={() => setColor(item)}
              />
            ))}
          </View>

          <PrimaryButton label="ZAPISZ" onPress={save} />
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
    paddingBottom: 40,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.text,
    marginBottom: 8,
    marginTop: 16,
  },
  iconPicker: {
    alignItems: 'center',
    marginBottom: 12,
  },
  heroIcon: {
    fontSize: 48,
    marginBottom: 6,
  },
  iconHint: {
    color: Palette.textSecondary,
    fontSize: 13,
  },
  iconRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconChoice: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Palette.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Palette.border,
  },
  iconChoiceSelected: {
    borderColor: Palette.green,
    backgroundColor: Palette.greenSoft,
  },
  iconChoiceText: {
    fontSize: 22,
  },
  colors: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  colorDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  colorSelected: {
    borderWidth: 3,
    borderColor: Palette.text,
  },
});
