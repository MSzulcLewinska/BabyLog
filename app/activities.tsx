import { BackHeader } from '@/components/back-header';
import { Palette } from '@/constants/theme';
import { useLiveData } from '@/hooks/use-live-data';
import { loadActivities, removeActivity } from '@/lib/storage';
import { router, type Href } from 'expo-router';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function ActivitiesScreen() {
  const activities = useLiveData(loadActivities) ?? [];

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      'Usunąć czynność?',
      `Usunąć „${name}" z listy czynności?`,
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Usuń',
          style: 'destructive',
          onPress: () => void removeActivity(id),
        },
      ]
    );
  };

  return (
    <View style={styles.screen}>
      <BackHeader title="Moje czynności" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.card}>
          {activities.map((activity, index) => (
            <Pressable
              key={activity.id}
              style={[
                styles.row,
                index === activities.length - 1 && styles.lastRow,
              ]}
              onPress={() =>
                router.push({
                  pathname: '/log',
                  params: {
                    kind: activity.kind,
                    activityId: activity.id,
                    ...(activity.kind === 'drops'
                      ? { dropKind: activity.id }
                      : {}),
                  },
                } as Href)
              }
            >
              <View style={[styles.iconWrap, { backgroundColor: `${activity.color}22` }]}>
                <Text style={styles.icon}>{activity.icon}</Text>
              </View>
              <Text style={styles.name}>{activity.name}</Text>
              <Pressable
                hitSlop={10}
                style={styles.deleteWrap}
                onPress={() => handleDelete(activity.id, activity.name)}
              >
                <Text style={styles.deleteIcon}>🗑️</Text>
              </Pressable>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          style={styles.addButton}
          onPress={() => router.push('/add-activity' as Href)}
        >
          <Text style={styles.addText}>＋  Dodaj czynność</Text>
        </Pressable>

        <Pressable
          style={[styles.addButton, styles.dietButton]}
          onPress={() => router.push('/diet' as Href)}
        >
          <Text style={styles.addText}>🍎  Dieta (BLW)</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: Palette.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Palette.border,
    overflow: 'hidden',
  },
  row: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F0',
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 20,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: Palette.text,
  },
  deleteWrap: {
    marginRight: 12,
    padding: 2,
  },
  deleteIcon: {
    fontSize: 16,
    opacity: 0.7,
  },
  chevron: {
    fontSize: 22,
    color: Palette.textMuted,
  },
  addButton: {
    marginTop: 16,
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.green,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.card,
  },
  dietButton: {
    marginTop: 10,
    borderColor: '#F59E0B',
  },
  addText: {
    color: Palette.greenDark,
    fontSize: 16,
    fontWeight: '600',
  },
});
