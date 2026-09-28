import { Palette } from '@/constants/theme';
import { notifyFieldFocused } from '@/lib/keyboard-focus';
import { useRef } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  type LayoutChangeEvent,
} from 'react-native';

type FormFieldProps = TextInputProps & {
  label: string;
};

export function FormField({ label, style, multiline, onFocus, ...props }: FormFieldProps) {
  const offsetRef = useRef(0);

  const handleLayout = (event: LayoutChangeEvent) => {
    offsetRef.current = event.nativeEvent.layout.y;
  };

  return (
    <View onLayout={handleLayout}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={Palette.textMuted}
        multiline={multiline}
        onFocus={(event) => {
          notifyFieldFocused(offsetRef.current);
          onFocus?.(event);
        }}
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
