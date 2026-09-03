import KeyboardAwareForm from '@/components/KeyboardAwareForm';
import { BackHeader } from '@/components/back-header';
import { FormField } from '@/components/form-field';
import { FormHero } from '@/components/form-hero';
import { PrimaryButton } from '@/components/primary-button';
import { TimeField } from '@/components/time-field';
import { Palette } from '@/constants/theme';
import { useLiveData } from '@/hooks/use-live-data';
import { formatTime, toDateKey } from '@/lib/dates';
import {
  addEvent,
  loadActivities,
  loadChild,
  loadUser,
  newId,
} from '@/lib/storage';
import type { Activity, EventKind } from '@/lib/types';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

type FeverMed = 'ibuprofen' | 'paracetamol';

const FEVER_MEDICATIONS: { id: FeverMed; label: string; icon: string }[] = [
  { id: 'ibuprofen', label: 'Ibuprofen', icon: '💊' },
  { id: 'paracetamol', label: 'Paracetamol', icon: '💊' },
];

const DROP_OPTIONS = [
  { id: 'vitamin-d', label: 'Witamina D' },
  { id: 'probiotic', label: 'Probiotyk' },
  { id: 'colic', label: 'Krople na kolkę' },
  { id: 'other', label: 'Inne' },
];

const FALLBACK: Record<EventKind, Pick<Activity, 'name' | 'icon' | 'unit' | 'color'>> = {
  milk: { name: 'Mleko', icon: '🍼', unit: 'ml', color: Palette.green },
  poop: { name: 'Kupa', icon: '💩', color: '#C4A35A' },
  drops: { name: 'Krople / witaminy', icon: '💧', color: '#3B82F6' },
  custom: { name: 'Czynność', icon: '✨', color: Palette.green },
};

export default function LogScreen() {
  const params = useLocalSearchParams<{
    kind?: string;
    activityId?: string;
    dropKind?: string;
  }>();

  const kind = (params.kind as EventKind) || 'milk';
  const liveActivities = useLiveData(loadActivities);
  const [time, setTime] = useState(new Date());
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [dropKind, setDropKind] = useState(params.dropKind || 'vitamin-d');
  const [feverMed, setFeverMed] = useState<FeverMed | null>(null);

  const isTemperature = params.activityId === 'temperature';

  const activity = useMemo(
    () =>
      (liveActivities ?? []).find((item) => item.id === params.activityId) ??
      null,
    [liveActivities, params.activityId]
  );

  const meta = activity ?? { ...FALLBACK[kind], id: kind, builtin: true, kind };

  const title = useMemo(() => {
    if (kind === 'milk') return 'Dodaj mleko';
    if (kind === 'poop') return 'Dodaj kupę';
    if (kind === 'drops') return 'Dodaj krople / witaminy';
    return `Dodaj: ${meta.name}`;
  }, [kind, meta.name]);

  const save = async () => {
    if (kind === 'milk' && !amount.trim()) {
      Alert.alert('Podaj ilość', 'Wpisz ilość mleka w ml.');
      return;
    }

    const selectedDrop = DROP_OPTIONS.find((item) => item.id === dropKind);
    const titleForEvent =
      kind === 'drops' ? selectedDrop?.label ?? 'Krople' : meta.name;

    try {
      const [user, childProfile] = await Promise.all([
        loadUser(),
        loadChild(),
      ]);
      const author =
        user?.name?.trim() ||
        childProfile?.members.find((member) => member.role === 'owner')
          ?.name ||
        undefined;

      await addEvent({
        id: newId(),
        kind,
        activityId: meta.id,
        title: titleForEvent,
        icon: meta.icon,
        color: meta.color,
        time: formatTime(time),
        date: toDateKey(new Date()),
        amount: amount.trim() || undefined,
        unit: kind === 'drops' || kind === 'poop' ? undefined : meta.unit,
        notes: notes.trim() || undefined,
        dropKind: kind === 'drops' ? dropKind : undefined,
        feverMedication: isTemperature && feverMed ? feverMed : undefined,
        author,
      });

      Alert.alert('Zapisano', titleForEvent, [
        { text: 'OK', onPress: () => router.navigate('/(tabs)' as Href) },
      ]);
    } catch {
      Alert.alert('Błąd zapisu', 'Nie udało się zapisać zdarzenia.');
    }
  };

  return (
    <View style={styles.screen}>
      <BackHeader title={title} />
      <KeyboardAwareForm>
        <View style={styles.content}>
          <FormHero icon={meta.icon} />

          {kind === 'drops' && (
            <View style={styles.options}>
              {DROP_OPTIONS.map((option) => {
                const selected = dropKind === option.id;
                return (
                  <Pressable
                    key={option.id}
                    style={[styles.option, selected && styles.optionSelected]}
                    onPress={() => setDropKind(option.id)}
                  >
                    <Text style={styles.optionLabel}>{option.label}</Text>
                    <View style={[styles.radio, selected && styles.radioSelected]}>
                      {selected ? <Text style={styles.check}>✓</Text> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          <TimeField value={time} onChange={setTime} />

          {isTemperature && (
            <View style={styles.feverSection}>
              <Text style={styles.feverLabel}>Podany lek</Text>
              <View style={styles.feverOptions}>
                {FEVER_MEDICATIONS.map((med) => {
                  const selected = feverMed === med.id;
                  return (
                    <Pressable
                      key={med.id}
                      style={[styles.feverOption, selected && styles.feverOptionSelected]}
                      onPress={() => setFeverMed(selected ? null : med.id)}
                    >
                      <Text style={styles.feverOptionIcon}>{med.icon}</Text>
                      <Text style={[styles.feverOptionLabel, selected && styles.feverOptionLabelSelected]}>
                        {med.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {(kind === 'milk' || (kind === 'custom' && meta.unit)) && (
            <FormField
              label={meta.unit ? `Ilość (${meta.unit})` : 'Wartość'}
              placeholder={meta.unit === 'ml' ? 'np. 120' : 'np. 36.6'}
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />
          )}

          <FormField
            label="Notatka (opcjonalnie)"
            placeholder="Dodaj notatkę"
            multiline
            value={notes}
            onChangeText={setNotes}
          />

          <PrimaryButton label="ZAPISZ" onPress={save} />

          <Pressable
            style={styles.manageLink}
            onPress={() => router.push('/activities' as Href)}
          >
            <Text style={styles.manageLinkText}>Zarządzaj czynnościami</Text>
          </Pressable>
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
  options: {
    backgroundColor: Palette.card,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Palette.border,
    marginTop: 8,
  },
  option: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F0',
  },
  optionSelected: {
    backgroundColor: Palette.greenSoft,
  },
  optionLabel: {
    flex: 1,
    fontSize: 16,
    color: Palette.text,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    backgroundColor: Palette.green,
    borderColor: Palette.green,
  },
  check: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  manageLink: {
    alignItems: 'center',
    marginTop: 18,
  },
  manageLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.greenDark,
  },
  feverSection: {
    marginTop: 12,
  },
  feverLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.text,
    marginBottom: 8,
  },
  feverOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  feverOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.card,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Palette.border,
    paddingVertical: 14,
    paddingHorizontal: 10,
    gap: 8,
  },
  feverOptionSelected: {
    borderColor: Palette.green,
    backgroundColor: Palette.greenSoft,
  },
  feverOptionIcon: {
    fontSize: 18,
  },
  feverOptionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Palette.text,
  },
  feverOptionLabelSelected: {
    color: Palette.greenDark,
  },
});
