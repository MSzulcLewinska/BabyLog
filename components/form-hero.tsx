import { Palette } from '@/constants/theme';
import { StyleSheet, Text, View } from 'react-native';

type FormHeroProps = {
  icon: string;
  backgroundColor?: string;
};

export function FormHero({ icon, backgroundColor = Palette.greenSoft }: FormHeroProps) {
  return (
    <View style={styles.wrap}>
      <View style={[styles.circle, { backgroundColor }]}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    marginBottom: 8,
  },
  circle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 42,
  },
});
