import { BackHeader } from '@/components/back-header';
import { PrimaryButton } from '@/components/primary-button';
import { Palette } from '@/constants/theme';
import { useLiveData } from '@/hooks/use-live-data';
import { listChildren, removeLocalChild, switchChild } from '@/lib/storage';
import { router, type Href } from 'expo-router';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function ChildrenScreen() {
  const children = useLiveData(listChildren) ?? [];

  const activate = async (childId: string) => {
    await switchChild(childId);
    router.back();
  };

  const removeFromDevice = (childId: string, name: string) => {
    Alert.alert(
      'Usunąć z tego urządzenia?',
      `Dane dziecka „${name}" zostaną w chmurze. Usuniemy tylko dostęp z tego telefonu.`,
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Usuń',
          style: 'destructive',
          onPress: () => void removeLocalChild(childId),
        },
      ]
    );
  };

  return (
    <View style={styles.screen}>
      <BackHeader title="Moje dzieci" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.card}>
          {children.map((child, index) => (
            <Pressable
              key={child.childId}
              style={[
                styles.row,
                index === children.length - 1 && styles.lastRow,
              ]}
              onPress={() => void activate(child.childId)}
            >
              {child.photoUri ? (
                <Image
                  source={{ uri: child.photoUri }}
                  style={styles.avatar}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {child.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.rowTexts}>
                <Text style={styles.name}>{child.name}</Text>
                <Text style={styles.role}>
                  {child.isOwner ? 'Właściciel' : 'Opiekun'}
                </Text>
              </View>
              {child.isActive ? (
                <Text style={styles.activeBadge}>Aktywne ✓</Text>
              ) : (
                <Text style={styles.switchHint}>Przełącz</Text>
              )}
              {!child.isActive && children.length > 1 && (
                <Pressable
                  hitSlop={10}
                  onPress={() => removeFromDevice(child.childId, child.name)}
                  style={styles.removeWrap}
                >
                  <Text style={styles.removeIcon}>🗑️</Text>
                </Pressable>
              )}
            </Pressable>
          ))}
        </View>

        <PrimaryButton
          label="＋  Dodaj dziecko"
          onPress={() => router.push('/add-child' as Href)}
        />
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
    marginBottom: 16,
  },
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F0',
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Palette.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: Palette.greenDark,
  },
  rowTexts: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: Palette.text,
  },
  role: {
    fontSize: 12,
    color: Palette.textMuted,
    marginTop: 2,
  },
  activeBadge: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.greenDark,
  },
  switchHint: {
    fontSize: 13,
    color: Palette.textSecondary,
  },
  removeWrap: {
    marginLeft: 12,
    padding: 4,
  },
  removeIcon: {
    fontSize: 15,
    opacity: 0.7,
  },
});