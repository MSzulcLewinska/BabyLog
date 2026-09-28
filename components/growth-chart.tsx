import { Palette } from '@/constants/theme';
import type { Measurement } from '@/lib/types';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

const CHART_HEIGHT = 190;
const PADDING_LEFT = 40;
const PADDING_RIGHT = 14;
const PADDING_TOP = 18;
const PADDING_BOTTOM = 26;
const PLOT_HEIGHT = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
const CHART_WIDTH = 300;

type Metric = 'weightKg' | 'heightCm';

type Series = {
  key: Metric;
  label: string;
  unit: string;
  color: string;
  values: { date: string; value: number }[];
};

const METRICS: { key: Metric; label: string; unit: string; color: string }[] = [
  { key: 'weightKg', label: 'Waga', unit: 'kg', color: '#F59E0B' },
  { key: 'heightCm', label: 'Wzrost', unit: 'cm', color: '#3B82F6' },
];

function dayNumber(date: string): number {
  const [year, month, day] = date.split('-').map(Number);
  return Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1) / 86400000;
}

function formatDate(date: string): string {
  const [year, month, day] = date.split('-');
  return `${day}.${month}.${String(year).slice(2)}`;
}

export function GrowthChart({ measurements }: { measurements: Measurement[] }) {
  const series = useMemo<Series[]>(
    () =>
      METRICS.map((metric) => {
        const values = measurements
          .filter((item) => item[metric.key] != null)
          .map((item) => ({
            date: item.date,
            value: item[metric.key] as number,
          }));
        return { ...metric, values };
      }).filter((item) => item.values.length > 0),
    [measurements]
  );

  if (series.length === 0) return null;

  const minDay = Math.min(
    ...series.flatMap((item) => item.values.map((value) => dayNumber(value.date)))
  );
  const maxDay = Math.max(
    ...series.flatMap((item) => item.values.map((value) => dayNumber(value.date)))
  );
  const span = Math.max(maxDay - minDay, 1);

  const plotWidth = CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT;

  const xFor = (date: string) =>
    PADDING_LEFT + ((dayNumber(date) - minDay) / span) * plotWidth;

  const yFor = (value: number, min: number, max: number) => {
    const range = Math.max(max - min, 0.1);
    const ratio = (value - min) / range;
    return PADDING_TOP + PLOT_HEIGHT * (1 - ratio);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Wykres rozwoju</Text>

      {series.map((item) => {
        const values = item.values.map((entry) => entry.value);
        const rawMin = Math.min(...values);
        const rawMax = Math.max(...values);
        const min = Math.max(0, rawMin - Math.max((rawMax - rawMin) * 0.25, 0.5));
        const max = rawMax + Math.max((rawMax - rawMin) * 0.25, 0.5);

        const ticks = [max, (max + min) / 2, min].map((value) =>
          item.key === 'weightKg' ? value.toFixed(1) : value.toFixed(0)
        );

        return (
          <View key={item.key} style={styles.block}>
            <View style={styles.blockHeader}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <Text style={styles.blockTitle}>
                {item.label} ({item.unit})
              </Text>
            </View>

            <View style={styles.plotRow}>
              <View style={styles.yAxis}>
                {ticks.map((tick) => (
                  <Text key={tick} style={styles.yLabel}>
                    {tick}
                  </Text>
                ))}
              </View>

              <View style={styles.plotArea}>
                {ticks.map((tick, index) => (
                  <View
                    key={`${tick}-${index}`}
                    style={[
                      styles.gridLine,
                      {
                        top:
                          PADDING_TOP +
                          (PLOT_HEIGHT * index) / (ticks.length - 1) -
                          0.5,
                      },
                    ]}
                  />
                ))}

                {item.values.map((entry, index) => {
                  const x = xFor(entry.date);
                  const y = yFor(entry.value, min, max);
                  const previous = item.values[index - 1];
                  return (
                    <View key={`${item.key}-${entry.date}-${index}`}>
                      {previous && (
                        <View
                          style={[
                            styles.segment,
                            {
                              width: Math.max(
                                Math.hypot(x - xFor(previous.date), y - yFor(previous.value, min, max)),
                                2
                              ),
                              left: Math.min(x, xFor(previous.date)) - 1,
                              top:
                                Math.min(y, yFor(previous.value, min, max)) - 1,
                              backgroundColor: item.color,
                              transform: [
                                {
                                  rotate: `${Math.atan2(
                                    y - yFor(previous.value, min, max),
                                    x - xFor(previous.date)
                                  )}rad`,
                                },
                              ],
                            },
                          ]}
                        />
                      )}
                      <View
                        style={[
                          styles.dot,
                          { left: x - 5, top: y - 5, backgroundColor: item.color },
                        ]}
                      />
                    </View>
                  );
                })}
              </View>
            </View>

            <View style={styles.xAxis}>
              {item.values.length <= 4 ? (
                item.values.map((entry) => (
                  <Text key={entry.date} style={styles.xLabel}>
                    {formatDate(entry.date)}
                  </Text>
                ))
              ) : (
                <>
                  <Text style={styles.xLabel}>
                    {formatDate(item.values[0].date)}
                  </Text>
                  <Text style={styles.xLabel}>
                    {formatDate(item.values[item.values.length - 1].date)}
                  </Text>
                </>
              )}
            </View>
          </View>
        );
      })}
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
    marginBottom: 8,
  },
  block: {
    marginTop: 8,
  },
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  blockTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  plotRow: {
    flexDirection: 'row',
    height: CHART_HEIGHT,
  },
  yAxis: {
    width: PADDING_LEFT - 6,
    justifyContent: 'space-between',
    paddingTop: PADDING_TOP - 6,
    paddingBottom: PADDING_BOTTOM,
  },
  yLabel: {
    fontSize: 10,
    color: Palette.textMuted,
    textAlign: 'right',
    paddingRight: 6,
  },
  plotArea: {
    width: CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT,
    height: CHART_HEIGHT,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: Palette.border,
  },
  segment: {
    position: 'absolute',
    height: 2,
    borderRadius: 1,
    opacity: 0.55,
    transformOrigin: 'left center',
  },
  dot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  xAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    marginLeft: PADDING_LEFT,
    width: CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT,
  },
  xLabel: {
    fontSize: 10,
    color: Palette.textMuted,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
