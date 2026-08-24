import { Palette } from '@/constants/theme';
import { useLiveData } from '@/hooks/use-live-data';
import { lastNDates } from '@/lib/dates';
import { loadEvents } from '@/lib/storage';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const events = useLiveData(loadEvents) ?? [];

  const days = lastNDates(7);
  const milkByDay = days.map((date) =>
    events
      .filter((event) => event.date === date && event.kind === 'milk')
      .reduce((sum, event) => sum + (Number(event.amount) || 0), 0)
  );

  const maxMilk = Math.max(...milkByDay, 1);
  const milkTotal = milkByDay.reduce((sum, value) => sum + value, 0);
  const milkAverage = Math.round(milkTotal / days.length);

  const poopCount = events.filter(
    (event) => days.includes(event.date) && event.kind === 'poop'
  ).length;

  const vitaminDays = days.filter((date) =>
    events.some(
      (event) =>
        event.date === date &&
        event.kind === 'drops' &&
        event.dropKind === 'vitamin-d'
    )
  ).length;

  const labels = useMemo(
    () =>
      days.map((date) => {
        const [, , day] = date.split('-');
        return day;
      }),
    [days]
  );

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: 24,
          paddingHorizontal: 18,
        }}
      >
        <Text style={styles.title}>Statystyki</Text>
        <View style={styles.filter}>
          <Text style={styles.filterText}>Ostatnie 7 dni</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Mleko</Text>
          <Text style={styles.cardValue}>{milkTotal} ml</Text>
          <Text style={styles.cardHint}>średnio {milkAverage} ml / dzień</Text>

          <View style={styles.chart}>
            {milkByDay.map((value, index) => (
              <View key={days[index]} style={styles.barWrap}>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.bar,
                      { height: `${Math.max((value / maxMilk) * 100, 4)}%` },
                    ]}
                  />
                </View>
                <Text style={styles.barLabel}>{labels[index]}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.card, styles.halfCard]}>
            <Text style={styles.smallLabel}>Kupa</Text>
            <Text style={styles.smallValue}>{poopCount} razy</Text>
            <Text style={styles.cardHint}>
              {(poopCount / 7).toFixed(1)} / dzień
            </Text>
          </View>
          <View style={[styles.card, styles.halfCard]}>
            <Text style={styles.smallLabel}>Witaminy</Text>
            <Text style={styles.smallValue}>{vitaminDays}/7</Text>
            <Text style={styles.cardHint}>dni z witaminą D</Text>
          </View>
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
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Palette.text,
    marginBottom: 12,
  },
  filter: {
    alignSelf: 'flex-start',
    backgroundColor: Palette.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.text,
  },
  card: {
    backgroundColor: Palette.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    color: Palette.textSecondary,
  },
  cardValue: {
    fontSize: 28,
    fontWeight: '700',
    color: Palette.text,
    marginTop: 4,
  },
  cardHint: {
    fontSize: 12,
    color: Palette.textMuted,
    marginTop: 2,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 140,
    marginTop: 18,
    gap: 8,
  },
  barWrap: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
  },
  barTrack: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
    backgroundColor: Palette.greenSoft,
    borderRadius: 8,
  },
  bar: {
    width: '100%',
    backgroundColor: Palette.green,
    borderRadius: 8,
    minHeight: 6,
  },
  barLabel: {
    fontSize: 11,
    color: Palette.textMuted,
    marginTop: 6,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfCard: {
    flex: 1,
  },
  smallLabel: {
    fontSize: 13,
    color: Palette.textSecondary,
  },
  smallValue: {
    fontSize: 22,
    fontWeight: '700',
    color: Palette.text,
    marginTop: 6,
  },
});
