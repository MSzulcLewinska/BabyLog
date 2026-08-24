import { Palette } from '@/constants/theme';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

type FormFieldProps = TextInputProps & {
  label: string;
};

export function FormField({ label, style, multiline, ...props }: FormFieldProps) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={Palette.textMuted}
        multiline={multiline}
        style={[styles.input, multiline && styles.multiline, style]}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.text,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    minHeight: 54,
    backgroundColor: Palette.greenSoft,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Palette.greenMuted,
    paddingHorizontal: 14,
    fontSize: 16,
    color: Palette.text,
  },
  multiline: {
    minHeight: 92,
    paddingTop: 14,
    textAlignVertical: 'top',
  },
});
