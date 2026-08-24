import { BackHeader } from '@/components/back-header';
import { EventTimeline } from '@/components/event-timeline';
import { Palette } from '@/constants/theme';
import { useLiveData } from '@/hooks/use-live-data';
import { formatLongDate, parseDateKey, toDateKey } from '@/lib/dates';
import { loadEvents } from '@/lib/storage';
import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export default function DayScreen() {
  const params = useLocalSearchParams<{ date?: string }>();
  const rawDate = typeof params.date === 'string' ? params.date : '';
  const dateKey = DATE_KEY_PATTERN.test(rawDate)
    ? rawDate
    : toDateKey(new Date());
  const date = parseDateKey(dateKey);

  const events = useLiveData(loadEvents);

  const dayEvents = useMemo(
    () =>
      (events ?? [])
        .filter((event) => event.date === dateKey)
        .sort((a, b) => b.time.localeCompare(a.time)),
    [events, dateKey]
  );

  const milkAmount = dayEvents.reduce((sum, event) => {
    if (event.kind !== 'milk') return sum;
    const amount = Number(event.amount);
    return Number.isFinite(amount) ? sum + amount : sum;
  }, 0);

  const poopCount = dayEvents.filter((event) => event.kind === 'poop').length;
  const vitaminGiven = dayEvents.some(
    (event) => event.kind === 'drops' && event.dropKind === 'vitamin-d'
  );

  return (
    <View style={styles.screen}>
      <BackHeader title={formatLongDate(date)} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <View style={styles.container}>
          <View style={styles.summaryCard}>
            <SummaryCell label="Mleko" value={`${milkAmount} ml`} />
            <View style={styles.divider} />
            <SummaryCell label="Kupa" value={`${poopCount} razy`} />
            <View style={styles.divider} />
            <SummaryCell
              label="Witaminy"
              value={vitaminGiven ? '1/1' : '0/1'}
            />
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Zdarzenia</Text>
            <Text style={styles.sectionCount}>
              {dayEvents.length} zdarzeń
            </Text>
          </View>

          <EventTimeline
            events={dayEvents}
            emptyTitle="Brak zdarzeń"
            emptyText="Ten dzień jest jeszcze pusty"
          />
        </View>
      </ScrollView>
    </View>
  );
}

function SummaryCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryItem}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  container: {
    paddingHorizontal: 18,
  },
  summaryCard: {
    backgroundColor: Palette.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingVertical: 14,
    paddingHorizontal: 8,
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginBottom: 5,
  },
  summaryValue: {
    fontSize: 17,
    fontWeight: '700',
    color: Palette.greenDark,
  },
  divider: {
    width: 1,
    height: 36,
    backgroundColor: Palette.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 3,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Palette.text,
  },
  sectionCount: {
    fontSize: 12,
    color: Palette.textMuted,
  },
});
