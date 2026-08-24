import { EventTimeline } from '@/components/event-timeline';
import { Palette } from '@/constants/theme';
import { useLiveData } from '@/hooks/use-live-data';
import { formatLongDate, toDateKey } from '@/lib/dates';
import { describeReminder } from '@/lib/reminders';
import { loadChild, loadEvents, loadPlans } from '@/lib/storage';
import { router, type Href } from 'expo-router';
import { useMemo } from 'react';
import { Image } from 'expo-image';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const events = useLiveData(loadEvents);
  const child = useLiveData(loadChild);
  const livePlans = useLiveData(loadPlans);

  const now = useMemo(() => new Date(), []);
  const todayKey = toDateKey(now);
  const nowTime = now.toTimeString().slice(0, 5);

  const upcomingPlans = useMemo(() => {
    return (livePlans ?? [])
      .filter(
        (plan) =>
          plan.date > todayKey ||
          (plan.date === todayKey && plan.time > nowTime)
      )
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
      .slice(0, 3);
  }, [livePlans, todayKey, nowTime]);

  const todayEvents = (events ?? [])
    .filter((event) => event.date === todayKey)
    .sort((a, b) => b.time.localeCompare(a.time));

  const milkAmount = todayEvents.reduce((sum, event) => {
    if (event.kind !== 'milk') return sum;
    const amount = Number(event.amount);
    return Number.isFinite(amount) ? sum + amount : sum;
  }, 0);

  const poopCount = todayEvents.filter((event) => event.kind === 'poop').length;
  const vitaminGiven = todayEvents.some(
    (event) => event.kind === 'drops' && event.dropKind === 'vitamin-d'
  );

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 10,
          paddingBottom: 24,
        }}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Pressable
              style={styles.babyInfo}
              onPress={() => router.push('/(tabs)/settings' as Href)}
            >
              {child?.photoUri ? (
                <Image
                  source={{ uri: child.photoUri }}
                  style={styles.avatar}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {(child?.name ?? 'R').charAt(0)}
                  </Text>
                </View>
              )}
              <View>
                <Text style={styles.babyName}>{child?.name ?? 'Róża'}</Text>
                <Text style={styles.date}>{formatLongDate(new Date())}</Text>
              </View>
            </Pressable>
            <View style={styles.headerButtons}>
              <Pressable
                style={styles.roundButton}
                onPress={() => router.push('/add-plan' as Href)}
              >
                <Text style={styles.roundButtonIcon}>＋</Text>
              </Pressable>
              <Pressable
                style={styles.roundButton}
                onPress={() => router.push('/(tabs)/history' as Href)}
              >
                <Text style={styles.calendarIcon}>▣</Text>
              </Pressable>
            </View>
          </View>

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
            <Text style={styles.sectionTitle}>Dzisiaj</Text>
            <Text style={styles.sectionCount}>
              {todayEvents.length} zdarzeń
            </Text>
          </View>

          <EventTimeline events={todayEvents} />

          {upcomingPlans.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Zaplanowane</Text>
                <Pressable
                  hitSlop={6}
                  onPress={() => router.push('/plans' as Href)}
                >
                  <Text style={styles.sectionLink}>Wszystkie ›</Text>
                </Pressable>
              </View>
              <View style={styles.plansCard}>
                {upcomingPlans.map((plan, index) => (
                  <Pressable
                    key={plan.id}
                    style={[
                      styles.planRow,
                      index === upcomingPlans.length - 1 && styles.lastRow,
                    ]}
                    onPress={() => router.push('/plans' as Href)}
                  >
                    <View
                      style={[
                        styles.planIconWrap,
                        { backgroundColor: `${plan.color}22` },
                      ]}
                    >
                      <Text style={styles.planIcon}>{plan.icon}</Text>
                    </View>
                    <View style={styles.planTexts}>
                      <Text style={styles.planTitle}>{plan.title}</Text>
                      <Text style={styles.planReminder} numberOfLines={1}>
                        🔔 {describeReminder(plan)}
                        {plan.reminderNote ? ` · ${plan.reminderNote}` : ''}
                      </Text>
                    </View>
                    <Text style={styles.planTime}>
                      {plan.date === todayKey ? 'Dziś' : plan.date}
                      {'\n'}
                      {plan.time}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  babyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Palette.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 21,
    fontWeight: '700',
    color: Palette.greenDark,
  },
  babyName: {
    fontSize: 18,
    fontWeight: '700',
    color: Palette.text,
  },
  date: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginTop: 3,
  },
  calendarButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  roundButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundButtonIcon: {
    fontSize: 24,
    lineHeight: 28,
    color: Palette.green,
    fontWeight: '600',
  },
  calendarIcon: {
    fontSize: 22,
    color: Palette.green,
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
  sectionLink: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.greenDark,
  },
  plansCard: {
    backgroundColor: Palette.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Palette.border,
    overflow: 'hidden',
    marginBottom: 18,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F0',
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  planIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  planIcon: {
    fontSize: 17,
  },
  planTexts: {
    flex: 1,
    marginRight: 8,
  },
  planTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.text,
  },
  planReminder: {
    fontSize: 11,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  planTime: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.textSecondary,
    textAlign: 'right',
  },
});
