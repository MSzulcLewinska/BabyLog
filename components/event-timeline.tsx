import { Palette } from '@/constants/theme';
import type { LogEvent } from '@/lib/types';
import { StyleSheet, Text, View } from 'react-native';

type EventTimelineProps = {
  events: LogEvent[];
  emptyTitle?: string;
  emptyText?: string;
};

export function EventTimeline({
  events,
  emptyTitle = 'Brak zapisanych zdarzeń',
  emptyText = 'Dodaj pierwsze karmienie',
}: EventTimelineProps) {
  if (events.length === 0) {
    return (
      <View style={styles.card}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🌿</Text>
          <Text style={styles.emptyTitle}>{emptyTitle}</Text>
          <Text style={styles.emptyText}>{emptyText}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      {events.map((event, index) => (
        <View
          key={event.id}
          style={[
            styles.row,
            index === events.length - 1 && styles.lastRow,
          ]}
        >
          <Text style={styles.time}>{event.time}</Text>
          <Text style={styles.icon}>{event.icon}</Text>
          <View style={styles.nameWrap}>
            <Text style={styles.name}>{event.title}</Text>
            {event.author && (
              <Text style={styles.author}>dodał(a): {event.author}</Text>
            )}
          </View>
          <Text style={styles.value}>
            {event.amount && event.unit
              ? `${event.amount} ${event.unit}`
              : event.amount || ''}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Palette.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Palette.border,
    overflow: 'hidden',
  },
  row: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F0',
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  time: {
    width: 52,
    fontSize: 13,
    fontWeight: '600',
    color: Palette.text,
  },
  icon: {
    width: 28,
    textAlign: 'center',
    fontSize: 18,
    marginRight: 8,
  },
  nameWrap: {
    flex: 1,
    marginRight: 8,
  },
  name: {
    fontSize: 15,
    fontWeight: '500',
    color: Palette.text,
  },
  author: {
    fontSize: 11,
    color: Palette.textMuted,
    marginTop: 1,
  },
  value: {
    fontSize: 13,
    color: Palette.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 30,
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
});
