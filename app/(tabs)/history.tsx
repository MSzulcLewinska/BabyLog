import { Palette } from '@/constants/theme';
import { useLiveData } from '@/hooks/use-live-data';
import { buildMonthGrid, formatMonthYear, toDateKey } from '@/lib/dates';
import { loadEvents, loadPlans } from '@/lib/storage';
import type { LogEvent } from '@/lib/types';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const WEEKDAY_LABELS = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];
const PLAN_COLOR = '#F59E0B';

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const todayKey = toDateKey(new Date());

  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const events = useLiveData(loadEvents);
  const plans = useLiveData(loadPlans);

  const goPrevMonth = () => {
    setCursor(({ year, month }) =>
      month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 }
    );
  };

  const goNextMonth = () => {
    setCursor(({ year, month }) =>
      month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 }
    );
  };

  const openDay = (dateKey: string) => {
    router.push(`/day?date=${dateKey}`);
  };

  const eventsByDate = useMemo(() => {
    const map = new Map<string, LogEvent[]>();
    for (const event of events ?? []) {
      const list = map.get(event.date);
      if (list) {
        list.push(event);
      } else {
        map.set(event.date, [event]);
      }
    }
    return map;
  }, [events]);

  const planDates = useMemo(() => {
    const set = new Set<string>();
    for (const plan of plans ?? []) {
      set.add(plan.date);
    }
    return set;
  }, [plans]);

  const cells = useMemo(
    () => buildMonthGrid(cursor.year, cursor.month),
    [cursor]
  );

  return (
    <View style={styles.screen}>
      <View style={[styles.top, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>Historia</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.monthHeader}>
          <Pressable style={styles.arrowButton} hitSlop={8} onPress={goPrevMonth}>
            <Text style={styles.arrow}>‹</Text>
          </Pressable>
          <Text style={styles.monthLabel}>
            {formatMonthYear(new Date(cursor.year, cursor.month, 1))}
          </Text>
          <Pressable style={styles.arrowButton} hitSlop={8} onPress={goNextMonth}>
            <Text style={styles.arrow}>›</Text>
          </Pressable>
        </View>

        <View style={styles.weekHeader}>
          {WEEKDAY_LABELS.map((label) => (
            <Text key={label} style={styles.weekday}>
              {label}
            </Text>
          ))}
        </View>

        <View style={styles.grid}>
          {cells.map((day, index) => {
            if (day === null) {
              return <View key={`empty-${index}`} style={styles.dayCell} />;
            }

            const dateKey = toDateKey(new Date(cursor.year, cursor.month, day));
            const dayEvents = eventsByDate.get(dateKey) ?? [];
            const eventColors = Array.from(
              new Set(dayEvents.map((event) => event.color))
            );
            const dotColors = [
              ...(planDates.has(dateKey) ? [PLAN_COLOR] : []),
              ...eventColors,
            ].slice(0, 3);

            return (
              <DayCell
                key={dateKey}
                dateKey={dateKey}
                dayNumber={day}
                dotColors={dotColors}
                isToday={dateKey === todayKey}
                hasEvents={dayEvents.length > 0 || planDates.has(dateKey)}
                onPress={openDay}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

type DayCellProps = {
  dateKey: string;
  dayNumber: number;
  dotColors: string[];
  isToday: boolean;
  hasEvents: boolean;
  onPress: (dateKey: string) => void;
};

function DayCell({
  dateKey,
  dayNumber,
  dotColors,
  isToday,
  hasEvents,
  onPress,
}: DayCellProps) {
  return (
    <Pressable
      style={styles.dayCell}
      onPress={() => onPress(dateKey)}
      android_ripple={{ color: Palette.greenMuted, borderless: false }}
    >
      <View
        style={[
          styles.dayCircle,
          isToday && styles.dayCircleToday,
          !isToday && hasEvents && styles.dayCircleHasEvents,
        ]}
      >
        <Text
          style={[
            styles.dayNumber,
            isToday && styles.dayNumberToday,
            !isToday && hasEvents && styles.dayNumberHasEvents,
          ]}
        >
          {dayNumber}
        </Text>
      </View>
      <View style={styles.dots}>
        {dotColors.map((color, index) => (
          <View key={index} style={[styles.dot, { backgroundColor: color }]} />
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  top: {
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Palette.text,
  },
  card: {
    backgroundColor: Palette.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 14,
    marginHorizontal: 18,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  arrowButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Palette.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrow: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '600',
    color: Palette.greenDark,
  },
  monthLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: Palette.text,
    textTransform: 'capitalize',
  },
  weekHeader: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: Palette.textMuted,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  dayCircleHasEvents: {
    backgroundColor: Palette.greenSoft,
  },
  dayCircleToday: {
    backgroundColor: Palette.green,
    borderColor: Palette.greenMuted,
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '500',
    color: Palette.text,
  },
  dayNumberHasEvents: {
    fontWeight: '700',
    color: Palette.greenDark,
  },
  dayNumberToday: {
    fontWeight: '800',
    color: '#FFFFFF',
  },
  dots: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 3,
    height: 4,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
