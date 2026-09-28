import { BackHeader } from '@/components/back-header';
import { DateField } from '@/components/date-field';
import { FormField } from '@/components/form-field';
import { GrowthChart } from '@/components/growth-chart';
import KeyboardAwareForm from '@/components/KeyboardAwareForm';
import { PrimaryButton } from '@/components/primary-button';
import { Palette } from '@/constants/theme';
import { toDateKey } from '@/lib/dates';
import {
  addMeasurement,
  loadChild,
  loadMeasurements,
  newId,
  removeMeasurement,
} from '@/lib/storage';
import type { Measurement } from '@/lib/types';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function GrowthScreen() {
  const insets = useSafeAreaInsets();
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [date, setDate] = useState(new Date());
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setMeasurements(await loadMeasurements());
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const handleAdd = async () => {
    if (saving) return;

    const weightValue = weight.trim().replace(',', '.');
    const heightValue = height.trim().replace(',', '.');
    const weightKg = weightValue ? Number(weightValue) : undefined;
    const heightCm = heightValue ? Number(heightValue) : undefined;

    if (weightKg == null && heightCm == null) {
      Alert.alert('Brak danych', 'Podaj wagę albo wzrost dziecka.');
      return;
    }
    if (weightKg != null && (!Number.isFinite(weightKg) || weightKg <= 0 || weightKg >= 60)) {
      Alert.alert('Błędna waga', 'Wpisz wagę w kg, np. 5,6.');
      return;
    }
    if (heightCm != null && (!Number.isFinite(heightCm) || heightCm <= 0 || heightCm >= 200)) {
      Alert.alert('Błędny wzrost', 'Wpisz wzrost w cm, np. 58.');
      return;
    }

    const child = await loadChild();
    const dateKey = toDateKey(date);

    // nie dubluj pomiaru z tej samej daty — nadpisujemy istniejący wpis
    const existing = measurements.find((item) => item.date === dateKey);
    if (existing) {
      const confirmed = await new Promise<boolean>((resolve) => {
        Alert.alert(
          'Pomiar z tej daty istnieje',
          'Zastąpić poprzedni wpis z tej daty nowymi danymi?',
          [
            { text: 'Anuluj', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Zastąp', onPress: () => resolve(true) },
          ]
        );
      });
      if (!confirmed) return;
      await removeMeasurement(existing.id);
    }

    setSaving(true);
    try {
      await addMeasurement({
        id: newId(),
        date: dateKey,
        weightKg,
        heightCm,
        note: note.trim() || undefined,
        author: child?.members.find((member) => member.role === 'owner')?.name,
        createdAt: new Date().toISOString(),
      });
      setWeight('');
      setHeight('');
      setNote('');
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = (measurement: Measurement) => {
    void (async () => {
      await removeMeasurement(measurement.id);
      await load();
    })();
  };

  const latest = measurements[measurements.length - 1];

  return (
    <View style={styles.screen}>
      <BackHeader title="Waga i wzrost" />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        {measurements.length > 0 ? (
          <>
            <View style={styles.summary}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Aktualna waga</Text>
                <Text style={styles.summaryValue}>
                  {latest?.weightKg != null ? `${latest.weightKg.toFixed(1).replace('.', ',')} kg` : '—'}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Aktualny wzrost</Text>
                <Text style={styles.summaryValue}>
                  {latest?.heightCm != null ? `${Math.round(latest.heightCm)} cm` : '—'}
                </Text>
              </View>
            </View>

            <GrowthChart measurements={measurements} />
          </>
        ) : null}

        <KeyboardAwareForm>
          <View style={styles.form}>
            <Text style={styles.formTitle}>Nowy pomiar</Text>

            <DateField
              label="Data pomiaru"
              value={date}
              onChange={setDate}
              maximumDate={new Date()}
            />

            <FormField
              label="Waga (kg)"
              value={weight}
              onChangeText={setWeight}
              placeholder="np. 5,6"
              keyboardType="decimal-pad"
            />

            <FormField
              label="Wzrost (cm)"
              value={height}
              onChangeText={setHeight}
              placeholder="np. 58"
              keyboardType="decimal-pad"
            />

            <FormField
              label="Notatka"
              value={note}
              onChangeText={setNote}
              placeholder="np. pomiar u pediatry"
            />

            <PrimaryButton
              label={saving ? 'Zapisywanie...' : 'Zapisz pomiar'}
              onPress={() => void handleAdd()}
            />
          </View>
        </KeyboardAwareForm>

        {measurements.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.formTitle}>Historia pomiarów</Text>
            {[...measurements].reverse().map((item) => (
              <Pressable
                key={item.id}
                style={styles.row}
                onLongPress={() => handleRemove(item)}
              >
                <View style={styles.rowInfo}>
                  <Text style={styles.rowDate}>{item.date}</Text>
                  <Text style={styles.rowValues}>
                    {[
                      item.weightKg != null
                        ? `${item.weightKg.toFixed(1).replace('.', ',')} kg`
                        : null,
                      item.heightCm != null ? `${Math.round(item.heightCm)} cm` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                  {item.note ? <Text style={styles.rowNote}>{item.note}</Text> : null}
                </View>
                <Text style={styles.deleteHint}>Przytrzymaj, aby usunąć</Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
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
  summary: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  summaryItem: {
    flex: 1,
    backgroundColor: Palette.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 16,
  },
  summaryLabel: {
    fontSize: 12,
    color: Palette.textMuted,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Palette.text,
  },
  form: {
    marginTop: 4,
  },
  formTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.text,
    marginTop: 18,
    marginBottom: 4,
  },
  card: {
    backgroundColor: Palette.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 16,
    marginTop: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  rowInfo: {
    flex: 1,
  },
  rowDate: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.text,
  },
  rowValues: {
    fontSize: 14,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  rowNote: {
    fontSize: 12,
    color: Palette.textMuted,
    marginTop: 2,
  },
  deleteHint: {
    fontSize: 11,
    color: Palette.textMuted,
  },
});
