import { BackHeader } from '@/components/back-header';
import { DateField } from '@/components/date-field';
import { FormField } from '@/components/form-field';
import { PrimaryButton } from '@/components/primary-button';
import { TimeField } from '@/components/time-field';
import KeyboardAwareForm from '@/components/KeyboardAwareForm';
import { Palette } from '@/constants/theme';
import { useLiveData } from '@/hooks/use-live-data';
import { formatTime, toDateKey } from '@/lib/dates';
import {
  ensureNotificationSetup,
  reminderDate,
  schedulePlanReminder,
} from '@/lib/reminders';
import { addPlan, loadActivities, newId } from '@/lib/storage';
import type { Activity, Plan, ReminderKind } from '@/lib/types';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const MINUTE_OPTIONS = [15, 30, 45, 60];

function nextFullHour(): Date {
  const now = new Date();
  now.setHours(now.getHours() + 1, 0, 0, 0);
  return now;
}

export default function AddPlanScreen() {
  const activities = useLiveData(loadActivities);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(
    null
  );
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(nextFullHour());
  const [note, setNote] = useState('');

  const [reminderKind, setReminderKind] = useState<ReminderKind>('auto');
  const [minutesBefore, setMinutesBefore] = useState(30);
  const [reminderTime, setReminderTime] = useState(() => {
    const when = new Date();
    when.setMinutes(when.getMinutes() + 45);
    return when;
  });
  const [reminderNote, setReminderNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSelectedActivity((current) => current ?? (activities ?? [])[0] ?? null);
  }, [activities]);

  const handleSave = async () => {
    if (saving) return;
    if (!selectedActivity) return;

    const plan: Plan = {
      id: newId(),
      activityId: selectedActivity.id,
      title: selectedActivity.name,
      icon: selectedActivity.icon,
      color: selectedActivity.color,
      date: toDateKey(date),
      time: formatTime(time),
      note: note.trim() || undefined,
      reminderKind,
      minutesBefore: reminderKind === 'auto' ? minutesBefore : undefined,
      reminderTime:
        reminderKind === 'auto'
          ? formatTime(autoReminderTime())
          : formatTime(reminderTime),
      reminderNote:
        reminderKind === 'custom' ? reminderNote.trim() || undefined : undefined,
    };

    const triggerAt = reminderDate(plan);

    if (!triggerAt || triggerAt.getTime() <= Date.now()) {
      Alert.alert(
        'Godzina z przeszłości',
        'Wybrana godzina przypomnienia już minęła. Wybierz późniejszą.'
      );
      return;
    }

    setSaving(true);
    try {
      const granted = await ensureNotificationSetup();

      if (!granted) return;

      const notificationId = await schedulePlanReminder(plan);
      await addPlan({ ...plan, notificationId: notificationId ?? undefined });

      Alert.alert(
        'Zaplanowano',
        `${plan.icon} ${plan.title} — ${plan.date}, godz. ${plan.time}. Przypomnienie: ${describeReminderText(plan)}`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } finally {
      setSaving(false);
    }
  };

  const autoReminderTime = () => {
    const base = new Date(date);
    const [hours, minutes] = formatTime(time).split(':').map(Number);
    base.setHours(hours, minutes, 0, 0);
    return new Date(base.getTime() - minutesBefore * 60000);
  };

  return (
    <View style={styles.screen}>
      <BackHeader title="Zaplanuj i przypomnij" />
      <KeyboardAwareForm contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.content}>
          <Text style={styles.sectionLabel}>Czynność</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.chips}
          >
            {(activities ?? []).map((activity) => {
              const selected = selectedActivity?.id === activity.id;
              return (
                <Pressable
                  key={activity.id}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => setSelectedActivity(activity)}
                >
                  <Text style={styles.chipIcon}>{activity.icon}</Text>
                  <Text
                    style={[
                      styles.chipLabel,
                      selected && styles.chipLabelSelected,
                    ]}
                  >
                    {activity.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <DateField label="Data" value={date} onChange={setDate} />

          <TimeField value={time} onChange={setTime} />

          <FormField
            label="Notatka do planu (opcjonalnie)"
            value={note}
            onChangeText={setNote}
            placeholder="np. butelka 150 ml"
            multiline
          />

          <Text style={styles.sectionLabel}>Przypomnienie</Text>

          <View style={styles.options}>
            <ReminderOption
              label="Automatyczne"
              hint={`${minutesBefore} minut przed zdarzeniem`}
              selected={reminderKind === 'auto'}
              onSelect={() => setReminderKind('auto')}
            >
              {reminderKind === 'auto' && (
                <View style={styles.minuteRow}>
                  {MINUTE_OPTIONS.map((minutes) => {
                    const active = minutes === minutesBefore;
                    return (
                      <Pressable
                        key={minutes}
                        style={[
                          styles.minuteChip,
                          active && styles.minuteChipActive,
                        ]}
                        onPress={() => setMinutesBefore(minutes)}
                      >
                        <Text
                          style={[
                            styles.minuteText,
                            active && styles.minuteTextActive,
                          ]}
                        >
                          {minutes} min
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </ReminderOption>

            <ReminderOption
              label="Jednorazowe o godzinie"
              hint="Własna godzina i treść przypomnienia"
              selected={reminderKind === 'custom'}
              onSelect={() => setReminderKind('custom')}
            />
          </View>

          {reminderKind === 'custom' && (
            <>
              <TimeField value={reminderTime} onChange={setReminderTime} />
              <FormField
                label="Treść przypomnienia (opcjonalnie)"
                value={reminderNote}
                onChangeText={setReminderNote}
                placeholder="np. Zagotuj wodę"
              />
            </>
          )}

          <PrimaryButton
            label={saving ? 'Planowanie...' : 'Zaplanuj'}
            onPress={() => void handleSave()}
          />
        </View>
      </KeyboardAwareForm>
    </View>
  );
}

function ReminderOption({
  label,
  hint,
  selected,
  onSelect,
  children,
}: {
  label: string;
  hint: string;
  selected: boolean;
  onSelect: () => void;
  children?: React.ReactNode;
}) {
  return (
    <View style={[styles.option, selected && styles.optionSelected]}>
      <Pressable style={styles.optionHeader} onPress={onSelect}>
        <View style={[styles.radio, selected && styles.radioSelected]}>
          {selected && <Text style={styles.check}>✓</Text>}
        </View>
        <View style={styles.optionTexts}>
          <Text style={styles.optionLabel}>{label}</Text>
          <Text style={styles.optionHint}>{hint}</Text>
        </View>
      </Pressable>
      {children}
    </View>
  );
}

function describeReminderText(plan: Plan): string {
  if (plan.reminderKind === 'custom') {
    return plan.reminderNote ? `„${plan.reminderNote}"` : `o ${plan.reminderTime}`;
  }
  return `${plan.minutesBefore} min przed`;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  content: {
    paddingHorizontal: 20,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 20,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  chips: {
    gap: 8,
    paddingRight: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 6,
  },
  chipSelected: {
    backgroundColor: Palette.greenSoft,
    borderColor: Palette.green,
  },
  chipIcon: {
    fontSize: 16,
  },
  chipLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Palette.textSecondary,
  },
  chipLabelSelected: {
    color: Palette.greenDark,
    fontWeight: '700',
  },
  options: {
    backgroundColor: Palette.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.border,
    overflow: 'hidden',
  },
  option: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F0',
  },
  optionSelected: {
    backgroundColor: Palette.greenSoft,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
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
  optionTexts: {
    flex: 1,
    marginLeft: 12,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: Palette.text,
  },
  optionHint: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  minuteRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    marginLeft: 36,
  },
  minuteChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Palette.background,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  minuteChipActive: {
    backgroundColor: Palette.green,
    borderColor: Palette.green,
  },
  minuteText: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  minuteTextActive: {
    color: '#FFFFFF',
  },
});
