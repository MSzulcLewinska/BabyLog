import { BackHeader } from '@/components/back-header';
import { Palette } from '@/constants/theme';
import {
  addDietProduct,
  DIET_CATEGORIES,
  loadDiet,
  removeDietProduct,
  setDietStatus,
  type DietItem,
} from '@/lib/diet';
import { useLiveData } from '@/hooks/use-live-data';
import { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const CUSTOM_ICONS = ['🌟', '🍽️', '🍴', '🥜', '🧈', '🍯', '🫐'];

export default function DietScreen() {
  const items = useLiveData(loadDiet) ?? [];

  const [modalOpen, setModalOpen] = useState(false);
  const [modalCategory, setModalCategory] = useState(DIET_CATEGORIES[0].id);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState(CUSTOM_ICONS[0]);

  const byCategory = (categoryId: string) =>
    items.filter((item) => item.categoryId === categoryId);

  const toggle = (item: DietItem, status: 'given' | 'wait') => {
    void setDietStatus(item.id, status);
  };

  const removeCustom = (item: DietItem) => {
    if (!item.custom) return;
    Alert.alert(
      'Usunąć produkt?',
      `Usunąć „${item.name}" z listy?`,
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Usuń',
          style: 'destructive',
          onPress: () => void removeDietProduct(item.id),
        },
      ]
    );
  };

  const openAddModal = (categoryId: string) => {
    setModalCategory(categoryId);
    setNewName('');
    setNewIcon(CUSTOM_ICONS[0]);
    setModalOpen(true);
  };

  const confirmAdd = () => {
    if (!newName.trim()) {
      Alert.alert('Podaj nazwę', 'Nazwa produktu jest wymagana.');
      return;
    }
    void addDietProduct(modalCategory, newName, newIcon).then(() =>
      setModalOpen(false)
    );
  };

  const renderProduct = (item: DietItem) => (
    <View style={styles.productRow} key={item.id}>
      <Text style={styles.productIcon}>{item.icon}</Text>
      <Text style={styles.productName}>{item.name}</Text>

      <Pressable
        onPress={() => toggle(item, 'given')}
        style={[
          styles.badge,
          item.status === 'given' && styles.badgeGiven,
        ]}
      >
        <Text
          style={[
            styles.badgeText,
            item.status === 'given' && styles.badgeTextGiven,
          ]}
        >
          ✓ Dane
        </Text>
      </Pressable>

      <Pressable
        onPress={() => toggle(item, 'wait')}
        style={[
          styles.badge,
          item.status === 'wait' && styles.badgeWait,
        ]}
      >
        <Text
          style={[
            styles.badgeText,
            item.status === 'wait' && styles.badgeTextWait,
          ]}
        >
          ⏳ Czeka
        </Text>
      </Pressable>

      {item.custom && (
        <Pressable
          hitSlop={8}
          style={styles.removeWrap}
          onPress={() => removeCustom(item)}
        >
          <Text style={styles.removeIcon}>✕</Text>
        </Pressable>
      )}
    </View>
  );

  return (
    <View style={styles.screen}>
      <BackHeader title="Dieta (BLW)" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.introCard}>
          <Text style={styles.introText}>
            Oznacz, które produkty dziecko już dostało (✓ Dane) i które na razie
            czekają (⏳ Czeka). Możesz też dodać własne produkty.
          </Text>
        </View>

        {DIET_CATEGORIES.map((category) => (
          <View key={category.id} style={styles.section}>
            <Text style={styles.sectionTitle}>
              {category.icon} {category.name}
            </Text>
            <View style={styles.card}>
              {byCategory(category.id).map(renderProduct)}
              <Pressable
                style={styles.addRow}
                onPress={() => openAddModal(category.id)}
              >
                <Text style={styles.addRowText}>＋ Dodaj własny produkt</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal
        visible={modalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setModalOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setModalOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Dodaj własny produkt</Text>

            <TextInput
              style={styles.input}
              value={newName}
              onChangeText={setNewName}
              placeholder="np. Orzechy laskowe"
              placeholderTextColor={Palette.textMuted}
              autoFocus
            />

            <View style={styles.iconRow}>
              {CUSTOM_ICONS.map((icon) => (
                <Pressable
                  key={icon}
                  style={[
                    styles.iconChoice,
                    newIcon === icon && styles.iconChoiceSelected,
                  ]}
                  onPress={() => setNewIcon(icon)}
                >
                  <Text style={styles.iconChoiceText}>{icon}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <Pressable style={styles.modalCancel} onPress={() => setModalOpen(false)}>
                <Text style={styles.modalCancelText}>Anuluj</Text>
              </Pressable>
              <Pressable style={styles.modalConfirm} onPress={confirmAdd}>
                <Text style={styles.modalConfirmText}>Dodaj</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  introCard: {
    backgroundColor: Palette.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 14,
    marginBottom: 18,
  },
  introText: {
    fontSize: 14,
    lineHeight: 20,
    color: Palette.textSecondary,
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.text,
    marginBottom: 8,
  },
  card: {
    backgroundColor: Palette.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.border,
    overflow: 'hidden',
  },
  productRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F0',
  },
  productIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  productName: {
    flex: 1,
    fontSize: 15,
    color: Palette.text,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    marginLeft: 6,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  badgeGiven: {
    backgroundColor: Palette.greenSoft,
    borderColor: Palette.green,
  },
  badgeWait: {
    backgroundColor: '#FFF4E5',
    borderColor: '#F59E0B',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  badgeTextGiven: {
    color: Palette.greenDark,
  },
  badgeTextWait: {
    color: '#B45309',
  },
  removeWrap: {
    marginLeft: 6,
    padding: 4,
  },
  removeIcon: {
    fontSize: 14,
    color: Palette.textMuted,
  },
  addRow: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addRowText: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.greenDark,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: Palette.card,
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Palette.text,
    marginBottom: 14,
  },
  input: {
    backgroundColor: Palette.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: Palette.text,
    marginBottom: 14,
  },
  iconRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
  },
  iconChoice: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Palette.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Palette.border,
  },
  iconChoiceSelected: {
    borderColor: Palette.green,
    backgroundColor: Palette.greenSoft,
  },
  iconChoiceText: {
    fontSize: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancel: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: Palette.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  modalConfirm: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: Palette.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});