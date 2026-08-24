import { Palette } from '@/constants/theme';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TABS = [
  { key: 'index', label: 'Dzisiaj', icon: '⌂' },
  { key: 'history', label: 'Historia', icon: '◷' },
  { key: 'add', label: '', icon: '+' },
  { key: 'stats', label: 'Statystyki', icon: '▦' },
  { key: 'settings', label: 'Ustawienia', icon: '⚙' },
] as const;

export function AppTabBar({ state }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const current = state.routes[state.index]?.name;

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {TABS.map((tab) => {
        const focused = current === tab.key;

        if (tab.key === 'add') {
          return (
            <Pressable
              key={tab.key}
              style={styles.centerSlot}
              onPress={() => {
                if (process.env.EXPO_OS === 'ios') {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                router.push('/activities' as Href);
              }}
            >
              <View style={styles.fab}>
                <Text style={styles.fabText}>+</Text>
              </View>
            </Pressable>
          );
        }

        return (
          <Pressable
            key={tab.key}
            style={styles.item}
            onPress={() => {
              if (process.env.EXPO_OS === 'ios') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }

              const href =
                tab.key === 'index'
                  ? '/(tabs)'
                  : tab.key === 'history'
                    ? '/(tabs)/history'
                    : tab.key === 'stats'
                      ? '/(tabs)/stats'
                      : '/(tabs)/settings';
              router.navigate(href as Href);
            }}
          >
            <Text style={[styles.icon, focused && styles.iconActive]}>
              {tab.icon}
            </Text>
            <Text style={[styles.label, focused && styles.labelActive]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    backgroundColor: Palette.card,
    borderTopWidth: 1,
    borderTopColor: Palette.border,
    paddingTop: 8,
    paddingHorizontal: 6,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  icon: {
    fontSize: 20,
    color: Palette.textMuted,
    marginBottom: 2,
  },
  iconActive: {
    color: Palette.green,
  },
  label: {
    fontSize: 10,
    color: Palette.textMuted,
    fontWeight: '500',
  },
  labelActive: {
    color: Palette.green,
  },
  centerSlot: {
    width: 72,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Palette.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -22,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '300',
    lineHeight: 34,
    marginTop: -2,
  },
});
