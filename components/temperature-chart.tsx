import { Palette } from '@/constants/theme';
import type { LogEvent } from '@/lib/types';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

type TempPoint = {
  hour: number;
  minute: number;
  value: number;
  medication?: 'ibuprofen' | 'paracetamol';
};

const TEMP_MIN = 36;
const TEMP_MAX = 40;
const CHART_HEIGHT = 160;
const PADDING_TOP = 20;
const PADDING_BOTTOM = 30;
const PLOT_HEIGHT = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
const HOURS = [0, 6, 12, 18, 23];

function tempToY(value: number): number {
  const clamped = Math.max(TEMP_MIN, Math.min(TEMP_MAX, value));
  const ratio = (clamped - TEMP_MIN) / (TEMP_MAX - TEMP_MIN);
  return PADDING_TOP + PLOT_HEIGHT * (1 - ratio);
}

export function TemperatureChart({ events }: { events: LogEvent[] }) {
  const points = useMemo(() => {
    const result: TempPoint[] = [];
    for (const event of events) {
      if (event.activityId !== 'temperature' || !event.amount) continue;
      const value = parseFloat(event.amount);
      if (!Number.isFinite(value)) continue;
      const [h, m] = event.time.split(':').map(Number);
      result.push({
        hour: h ?? 0,
        minute: m ?? 0,
        value,
        medication: event.feverMedication,
      });
    }
    result.sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute));
    return result;
  }, [events]);

  if (points.length === 0) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Wykres temperatury</Text>

      <View style={styles.row}>
        <View style={styles.yAxis}>
          {[40, 39, 38, 37, 36].map((t) => (
            <Text key={t} style={styles.yLabel}>
              {t}°
            </Text>
          ))}
        </View>

        <View style={styles.plotArea}>
          {[40, 39, 38, 37, 36].map((t) => (
            <View key={t} style={[styles.gridLine, { top: tempToY(t) - 0.5 }]} />
          ))}

          {points.map((p, i) => {
            const y = tempToY(p.value);
            const leftPct = ((p.hour * 60 + p.minute) / (24 * 60)) * 100;
            return (
              <View key={i}>
                <View
                  style={[
                    styles.dot,
                    {
                      left: `${leftPct}%`,
                      top: y - 5,
                      backgroundColor: p.medication
                        ? p.medication === 'ibuprofen'
                          ? '#3B82F6'
                          : '#F59E0B'
                        : Palette.danger,
                    },
                  ]}
                />
                <Text
                  style={[styles.valLabel, { left: `${leftPct}%`, top: y - 22 }]}
                >
                  {p.value.toFixed(1)}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.xAxis}>
        {HOURS.map((h) => (
          <Text key={h} style={styles.xLabel}>
            {String(h).padStart(2, '0')}:00
          </Text>
        ))}
      </View>

      {points.some((p) => p.medication) && (
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Palette.danger }]} />
            <Text style={styles.legendText}>Temperatura</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
            <Text style={styles.legendText}>Ibuprofen</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
            <Text style={styles.legendText}>Paracetamol</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Palette.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 16,
    marginBottom: 18,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.text,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    height: CHART_HEIGHT,
  },
  yAxis: {
    width: 30,
    justifyContent: 'space-between',
    paddingTop: PADDING_TOP,
    paddingBottom: PADDING_BOTTOM,
  },
  yLabel: {
    fontSize: 10,
    color: Palette.textMuted,
    textAlign: 'right',
    paddingRight: 4,
  },
  plotArea: {
    flex: 1,
    height: CHART_HEIGHT,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: Palette.border,
  },
  dot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    marginLeft: -5,
  },
  valLabel: {
    position: 'absolute',
    fontSize: 9,
    fontWeight: '600',
    color: Palette.text,
    width: 28,
    marginLeft: -14,
    textAlign: 'center',
  },
  xAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingLeft: 30,
  },
  xLabel: {
    fontSize: 10,
    color: Palette.textMuted,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F2F0',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: Palette.textSecondary,
  },
});
