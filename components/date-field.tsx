import { Palette } from '@/constants/theme';
import { formatLongDate } from '@/lib/dates';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

type DateFieldProps = {
  value: Date | null;
  onChange: (date: Date) => void;
  label?: string;
};

export function DateField({ value, onChange, label = 'Data urodzenia' }: DateFieldProps) {
  const [open, setOpen] = useState(false);

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.field} onPress={() => setOpen(true)}>
        <Text style={styles.icon}>📅</Text>
        <Text style={[styles.value, !value && styles.placeholder]}>
          {value ? formatLongDate(value) : 'Wybierz datę'}
        </Text>
        <Text style={styles.change}>Zmień</Text>
      </Pressable>
      {open && (
        <View style={styles.picker}>
          <DateTimePicker
            value={value ?? new Date()}
            mode="date"
            display="spinner"
            maximumDate={new Date()}
            onChange={(_, selected) => {
              if (Platform.OS === 'android') {
                setOpen(false);
              }
              if (selected) {
                onChange(selected);
              }
            }}
          />
        </View>
      )}
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
  field: {
    minHeight: 54,
    backgroundColor: Palette.greenSoft,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Palette.greenMuted,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  icon: {
    fontSize: 20,
    marginRight: 10,
  },
  value: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: Palette.text,
  },
  placeholder: {
    color: Palette.textMuted,
    fontWeight: '400',
  },
  change: {
    fontSize: 14,
    color: Palette.greenDark,
    fontWeight: '600',
  },
  picker: {
    alignItems: 'center',
    backgroundColor: Palette.greenSoft,
    borderRadius: 16,
    marginTop: 10,
  },
});
