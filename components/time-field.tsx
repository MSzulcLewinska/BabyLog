import { Palette } from '@/constants/theme';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { formatTime } from '@/lib/dates';

type TimeFieldProps = {
  value: Date;
  onChange: (date: Date) => void;
};

export function TimeField({ value, onChange }: TimeFieldProps) {
  const [open, setOpen] = useState(false);

  return (
    <View>
      <Text style={styles.label}>Godzina</Text>
      <Pressable style={styles.field} onPress={() => setOpen(true)}>
        <Text style={styles.icon}>🕐</Text>
        <Text style={styles.value}>{formatTime(value)}</Text>
        <Text style={styles.change}>Zmień</Text>
      </Pressable>
      {open && (
        <View style={styles.picker}>
          <DateTimePicker
            value={value}
            mode="time"
            is24Hour
            display="spinner"
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
    fontSize: 18,
    fontWeight: '600',
    color: Palette.text,
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
