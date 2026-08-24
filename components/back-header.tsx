import { Palette } from '@/constants/theme';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type BackHeaderProps = {
  title: string;
};

export function BackHeader({ title }: BackHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <Pressable onPress={() => router.back()} hitSlop={12}>
        <Text style={styles.back}>‹</Text>
      </Pressable>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.side} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  back: {
    fontSize: 32,
    color: Palette.text,
    width: 32,
    lineHeight: 34,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: Palette.text,
  },
  side: {
    width: 32,
  },
});
