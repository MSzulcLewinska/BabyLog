import { BackHeader } from '@/components/back-header';
import { PrimaryButton } from '@/components/primary-button';
import { TemperatureChart } from '@/components/temperature-chart';
import { Palette } from '@/constants/theme';
import { useLiveData } from '@/hooks/use-live-data';
import { formatDurationMinutes, formatLongDate, minutesBetweenTimes, parseDateKey } from '@/lib/dates';
import { loadEvents, removeEvent } from '@/lib/storage';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

const FEVER_LABELS: Record<string, string> = {
  ibuprofen: '💊 Ibuprofen został podany',
  paracetamol: '💊 Paracetamol został podany',
};

export default function EventDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const eventId = typeof params.id === 'string' ? params.id : '';
  const events = useLiveData(loadEvents);

  const event = (events ?? []).find((item) => item.id === eventId) ?? null;

  const dayTemps = (events ?? []).filter(
    (item) =>
      item.date === event?.date && item.activityId === 'temperature'
  );

  const handleDelete = () => {
    if (!event) return;
    Alert.alert(
      'Usunąć wpis?',
      `Usunąć „${event.title}" (${event.time})?`,
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Usuń',
          style: 'destructive',
          onPress: () => {
            void removeEvent(event.id).then(() => router.back());
          },
        },
      ]
    );
  };

  const handleEdit = () => {
    if (!event) return;
    router.push({
      pathname: '/log',
      params: {
        eventId: event.id,
        kind: event.kind,
        activityId: event.activityId,
        ...(event.dropKind ? { dropKind: event.dropKind } : {}),
      },
    } as Href);
  };

  if (!event) {
    return (
      <View style={styles.screen}>
        <BackHeader title="Szczegóły" />
        <View style={styles.missing}>
          <Text style={styles.missingText}>Nie znaleziono wpisu.</Text>
        </View>
      </View>
    );
  }

  const detailRows: { label: string; value: string }[] = [];
  if (event.date) {
    detailRows.push({
      label: 'Data',
      value: formatLongDate(parseDateKey(event.date)),
    });
  }
  if (event.activityId === 'sleep' && event.endTime) {
    detailRows.push({
      label: 'Czas snu',
      value: formatDurationMinutes(
        minutesBetweenTimes(event.time, event.endTime)
      ),
    });
  } else if (event.amount && event.unit) {
    detailRows.push({ label: 'Wartość', value: `${event.amount} ${event.unit}` });
  } else if (event.amount) {
    detailRows.push({ label: 'Wartość', value: event.amount });
  }
  if (event.author) {
    detailRows.push({ label: 'Autor', value: event.author });
  }

  const isTemperature = event.activityId === 'temperature';

  return (
    <View style={styles.screen}>
      <BackHeader title="Szczegóły wpisu" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <View style={styles.container}>
          <View style={styles.heroCard}>
            <View style={[styles.iconWrap, { backgroundColor: `${event.color}22` }]}>
              <Text style={styles.icon}>{event.icon}</Text>
            </View>
            <Text style={styles.title}>{event.title}</Text>
            <Text style={styles.time}>{event.time}</Text>
          </View>

          {isTemperature && event.amount && (
            <View style={styles.chartCard}>
              <TemperatureChart events={dayTemps} />
              <Text style={styles.medication}>
                {event.feverMedication
                  ? FEVER_LABELS[event.feverMedication]
                  : 'Lek nie został podany'}
              </Text>
            </View>
          )}

          {detailRows.length > 0 && (
            <View style={styles.card}>
              {detailRows.map((row, index) => (
                <View
                  key={row.label}
                  style={[
                    styles.detailRow,
                    index === detailRows.length - 1 && styles.lastRow,
                  ]}
                >
                  <Text style={styles.detailLabel}>{row.label}</Text>
                  <Text style={styles.detailValue}>{row.value}</Text>
                </View>
              ))}
            </View>
          )}

          {event.notes ? (
            <View style={styles.card}>
              <Text style={styles.notesLabel}>Notatka</Text>
              <Text style={styles.notes}>{event.notes}</Text>
            </View>
          ) : (
            <View style={[styles.card, styles.noNotesCard]}>
              <Text style={styles.noNotes}>Brak notatki</Text>
            </View>
          )}

          <View style={styles.actions}>
            <PrimaryButton label="Edytuj" onPress={handleEdit} />
          </View>
          <View style={styles.actions}>
            <PrimaryButton label="Usuń wpis" onPress={handleDelete} danger />
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
  container: {
    paddingHorizontal: 18,
  },
  heroCard: {
    backgroundColor: Palette.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: 'center',
    paddingVertical: 22,
    marginBottom: 14,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  icon: {
    fontSize: 32,
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    color: Palette.text,
  },
  time: {
    fontSize: 15,
    fontWeight: '600',
    color: Palette.textSecondary,
    marginTop: 4,
  },
  chartCard: {
    marginBottom: 14,
  },
  medication: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.greenDark,
    textAlign: 'center',
    marginTop: -6,
    marginBottom: 10,
  },
  card: {
    backgroundColor: Palette.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.border,
    overflow: 'hidden',
    marginBottom: 14,
  },
  detailRow: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F0',
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  detailLabel: {
    flex: 1,
    fontSize: 14,
    color: Palette.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.text,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  notes: {
    fontSize: 15,
    color: Palette.text,
    lineHeight: 22,
    padding: 14,
  },
  noNotesCard: {
    alignItems: 'center',
    paddingVertical: 18,
  },
  noNotes: {
    fontSize: 13,
    color: Palette.textMuted,
  },
  actions: {
    marginBottom: 4,
  },
  missing: {
    alignItems: 'center',
    paddingTop: 80,
  },
  missingText: {
    fontSize: 15,
    color: Palette.textMuted,
  },
});