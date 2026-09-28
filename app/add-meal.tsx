import KeyboardAwareForm from '@/components/KeyboardAwareForm';
import { BackHeader } from '@/components/back-header';
import { FormField } from '@/components/form-field';
import { PrimaryButton } from '@/components/primary-button';
import { Palette } from '@/constants/theme';
import { useLiveData } from '@/hooks/use-live-data';
import {
  DIET_CATEGORIES,
  loadDiet,
  setDietStatus,
  type DietItem,
} from '@/lib/diet';
import { toDateKey } from '@/lib/dates';
import { addEvent, newId } from '@/lib/storage';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const MEAL_COLOR = '#F59E0B';

const MEAL_ICONS = ['🍽️', '🥣', '🥕', '🍌', '🍞', '🥚', '🥦', '🍎', '⭐'];

const AMOUNT_PRESETS = ['kilka łyżek', 'pół porcji', 'cała porcja', 'mała porcja'];

function nowTime(): string {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, '0')}:${now
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;
}

function isValidTime(value: string): boolean {
  if (!/^\d{1,2}:\d{2}$/.test(value)) return false;
  const [hours, minutes] = value.split(':').map(Number);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

export default function AddMealScreen() {
  const items = useLiveData(loadDiet) ?? [];

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [customMode, setCustomMode] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customIcon, setCustomIcon] = useState(MEAL_ICONS[0]);
  const [amount, setAmount] = useState('');
  const [time, setTime] = useState(nowTime());
  const [saving, setSaving] = useState(false);

  const selectedItems = items.filter((item) => selected[item.id]);
  const customNameTrimmed = customName.trim();

  const toggleItem = (item: DietItem) => {
    setSelected((prev) => ({ ...prev, [item.id]: !prev[item.id] }));
  };

  const save = async () => {
    if (saving) return;

    if (selectedItems.length === 0 && !customNameTrimmed) {
      Alert.alert(
        'Wybierz coś',
        'Zaznacz przynajmniej jeden produkt albo wpisz nazwę własnego posiłku.'
      );
      return;
    }

    if (!isValidTime(time.trim())) {
      Alert.alert('Zła godzina', 'Wpisz godzinę w formacie 12:30.');
      return;
    }

    const parts: { title: string; icon: string }[] = selectedItems.map(
      (item) => ({ title: item.name, icon: item.icon })
    );

    if (customNameTrimmed) {
      parts.push({ title: customNameTrimmed, icon: customIcon });
    }

    const amountTrimmed = amount.trim();
    const title = parts.map((part) => part.title).join(', ');

    setSaving(true);
    try {
      await addEvent({
        id: newId(),
        kind: 'meal',
        activityId: 'meal',
        title: parts.map((part) => part.title).join(', '),
        icon: parts.length === 1 ? parts[0].icon : '🍽️',
        color: MEAL_COLOR,
        time: time.trim(),
        date: toDateKey(new Date()),
        amount: amountTrimmed || undefined,
      });

      // zaznaczone produkty dostają status „dane”, żeby lista BLW się zgadzała
      await Promise.all(
        selectedItems.map((item) => setDietStatus(item.id, 'given'))
      );

      Alert.alert('Zapisano posiłek', `Dodano: ${title}.`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <BackHeader title="Dodaj posiłek" />
      <KeyboardAwareForm contentContainerStyle={styles.content}>
        <View style={styles.introCard}>
          <Text style={styles.introText}>
            Zaznacz, co dziecko zjadło. Posiłek pojawi się w dzienniku tego
            dnia, a produkty dostaną status „Dane”.
          </Text>
        </View>

        {DIET_CATEGORIES.map((category) => {
          const inCategory = items.filter(
            (item) => item.categoryId === category.id
          );
          if (inCategory.length === 0) return null;

          return (
            <View key={category.id} style={styles.section}>
              <Text style={styles.sectionTitle}>
                {category.icon} {category.name}
              </Text>
              <View style={styles.grid}>
                {inCategory.map((item) => {
                  const isOn = Boolean(selected[item.id]);
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => toggleItem(item)}
                      style={[styles.chip, isOn && styles.chipOn]}
                    >
                      <Text style={styles.chipText}>
                        {item.icon} {item.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>➕ Własny posiłek</Text>
          {!customMode ? (
            <Pressable
              style={styles.chip}
              onPress={() => setCustomMode(true)}
            >
              <Text style={styles.chipText}>✏️ Dodaj inny posiłek</Text>
            </Pressable>
          ) : (
            <View style={styles.customBox}>
              <FormField
                label="Nazwa posiłku"
                value={customName}
                onChangeText={setCustomName}
                placeholder="np. Kasza z masłem"
              />
              <View style={styles.iconRow}>
                {MEAL_ICONS.map((icon) => (
                  <Pressable
                    key={icon}
                    style={[
                      styles.iconChoice,
                      customIcon === icon && styles.iconChoiceSelected,
                    ]}
                    onPress={() => setCustomIcon(icon)}
                  >
                    <Text style={styles.iconChoiceText}>{icon}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </View>

        <Text style={styles.sectionTitle}>🍚 Ilość</Text>
        <View style={styles.grid}>
          {AMOUNT_PRESETS.map((preset) => (
            <Pressable
              key={preset}
              style={[styles.chip, amount === preset && styles.chipOn]}
              onPress={() => setAmount(preset)}
            >
              <Text style={styles.chipText}>{preset}</Text>
            </Pressable>
          ))}
        </View>
        <FormField
          label="Ilość (opcjonalnie)"
          value={amount}
          onChangeText={setAmount}
          placeholder="np. 3 łyżki"
        />

        <FormField
          label="Godzina"
          value={time}
          onChangeText={setTime}
          placeholder="12:30"
          keyboardType="numbers-and-punctuation"
        />

        <View style={styles.actions}>
          <PrimaryButton
            label={saving ? 'Zapisywanie...' : 'ZAPISZ POSIŁEK'}
            onPress={() => void save()}
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
    paddingBottom: 32,
  },
  introCard: {
    backgroundColor: Palette.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 14,
    marginTop: 12,
    marginBottom: 18,
  },
  introText: {
    fontSize: 14,
    lineHeight: 20,
    color: Palette.textSecondary,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.text,
    marginBottom: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: Palette.card,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  chipOn: {
    backgroundColor: Palette.greenSoft,
    borderColor: Palette.green,
  },
  chipText: {
    fontSize: 14,
    color: Palette.text,
  },
  customBox: {
    gap: 4,
  },
  iconRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
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
  actions: {
    marginTop: 24,
  },
});
