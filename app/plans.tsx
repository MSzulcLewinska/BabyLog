import { BackHeader } from '@/components/back-header';
import { PrimaryButton } from '@/components/primary-button';
import { Palette } from '@/constants/theme';
import { useLiveData } from '@/hooks/use-live-data';
import { toDateKey } from '@/lib/dates';
import {
  cancelPlanReminder,
  describeReminder,
} from '@/lib/reminders';
import { loadPlans, removePlan } from '@/lib/storage';
import type { Plan } from '@/lib/types';
import { router, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function PlansScreen() {
  const livePlans = useLiveData(loadPlans);
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);

  const todayKey = toDateKey(new Date());
  const nowTime = new Date().toTimeString().slice(0, 5);

  const plans = useMemo(
    () => (livePlans ?? []).filter((plan) => !hiddenIds.includes(plan.id)),
    [livePlans, hiddenIds]
  );

  const sorted = useMemo(
    () =>
      [...plans].sort((a, b) =>
        `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)
      ),
    [plans]
  );

  const handleDelete = (plan: Plan) => {
    Alert.alert('Usuń plan', `Usunąć „${plan.title}" (${plan.date} ${plan.time})?`, [
      {
        text: 'Usuń',
        style: 'destructive',
        onPress: () => {
          void cancelPlanReminder(plan).then(() => removePlan(plan.id));
          setHiddenIds((current) => [...current, plan.id]);
        },
      },
      { text: 'Anuluj', style: 'cancel' },
    ]);
  };

  return (
    <View style={styles.screen}>
      <BackHeader title="Zaplanowane" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View style={styles.content}>
          {sorted.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🗓️</Text>
              <Text style={styles.emptyTitle}>Brak zaplanowanych</Text>
              <Text style={styles.emptyText}>
                Zaplanuj pierwsze zdarzenie z przypomnieniem
              </Text>
            </View>
          )}

          {sorted.map((plan) => {
            const isPast =
              plan.date < todayKey ||
              (plan.date === todayKey && plan.time <= nowTime);

            return (
              <View key={plan.id} style={styles.card}>
                <View style={[styles.stripe, { backgroundColor: plan.color }]} />
                <View style={styles.cardBody}>
                  <View style={styles.cardTop}>
                    <Text style={styles.icon}>{plan.icon}</Text>
                    <Text
                      style={[styles.title, isPast && styles.titlePast]}
                    >
                      {plan.title}
                    </Text>
                    <Text style={styles.when}>
                      {plan.date === todayKey ? 'Dziś' : plan.date} · {plan.time}
                    </Text>
                  </View>
                  <Text style={styles.reminder}>
                    🔔 {describeReminder(plan)}
                    {isPast ? ' — minione' : ''}
                  </Text>
                  {(plan.note || plan.reminderNote) && (
                    <Text style={styles.note} numberOfLines={2}>
                      {plan.reminderNote ?? plan.note}
                    </Text>
                  )}
                </View>
                <Pressable
                  hitSlop={10}
                  onPress={() => handleDelete(plan)}
                  style={styles.delete}
                >
                  <Text style={styles.deleteIcon}>🗑️</Text>
                </Pressable>
              </View>
            );
          })}

          <PrimaryButton
            label="Nowy plan"
            onPress={() => router.push('/add-plan' as Href)}
          />
        </View>
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
    paddingHorizontal: 18,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyIcon: {
    fontSize: 34,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Palette.text,
  },
  emptyText: {
    fontSize: 13,
    color: Palette.textMuted,
    marginTop: 4,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: Palette.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.border,
    overflow: 'hidden',
    marginBottom: 10,
  },
  stripe: {
    width: 4,
  },
  cardBody: {
    flex: 1,
    paddingVertical: 12,
    paddingLeft: 12,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 18,
    marginRight: 8,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: Palette.text,
  },
  titlePast: {
    color: Palette.textMuted,
  },
  when: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  reminder: {
    fontSize: 12,
    color: Palette.greenDark,
    fontWeight: '600',
    marginTop: 6,
    paddingLeft: 26,
  },
  note: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginTop: 3,
    paddingLeft: 26,
  },
  delete: {
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  deleteIcon: {
    fontSize: 16,
    opacity: 0.7,
  },
});
