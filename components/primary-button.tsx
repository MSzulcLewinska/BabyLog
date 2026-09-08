import { Palette } from '@/constants/theme';
import { Pressable, StyleSheet, Text } from 'react-native';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  danger?: boolean;
};

export function PrimaryButton({ label, onPress, danger }: PrimaryButtonProps) {
  return (
    <Pressable
      style={[styles.button, danger && styles.buttonDanger]}
      onPress={onPress}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: Palette.green,
    borderRadius: 16,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  buttonDanger: {
    backgroundColor: Palette.danger,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});
