import AsyncStorage from '@react-native-async-storage/async-storage';
import { notifyDataChanged } from '@/lib/bus';
import { loadSession } from '@/lib/supabase';
import { newId } from '@/lib/storage';

export type DietStatus = 'given' | 'wait' | null;

export type DietItem = {
  id: string;
  categoryId: string;
  name: string;
  icon: string;
  custom?: boolean;
  status: DietStatus;
};

export type DietCategory = {
  id: string;
  name: string;
  icon: string;
};

export const DIET_CATEGORIES: DietCategory[] = [
  { id: 'vegetables', name: 'Warzywa', icon: '🥕' },
  { id: 'fruits', name: 'Owoce', icon: '🍎' },
  { id: 'grains', name: 'Zboża i kasze', icon: '🍚' },
  { id: 'protein', name: 'Białko', icon: '🥚' },
  { id: 'bread', name: 'Pieczywo i kanapki', icon: '🍞' },
  { id: 'other', name: 'Inne', icon: '🌟' },
];

const PRESET_PRODUCTS: Omit<DietItem, 'status'>[] = [
  // warzywa
  { id: 'diet-marchew', categoryId: 'vegetables', name: 'Marchew', icon: '🥕' },
  { id: 'diet-brokol', categoryId: 'vegetables', name: 'Brokuł', icon: '🥦' },
  { id: 'diet-ziemniak', categoryId: 'vegetables', name: 'Ziemniak', icon: '🥔' },
  { id: 'diet-batat', categoryId: 'vegetables', name: 'Batat', icon: '🍠' },
  { id: 'diet-dynia', categoryId: 'vegetables', name: 'Dynia', icon: '🎃' },
  { id: 'diet-ogorek', categoryId: 'vegetables', name: 'Ogórek', icon: '🥒' },
  { id: 'diet-cukinia', categoryId: 'vegetables', name: 'Cukinia', icon: '🥒' },
  { id: 'diet-pomidor', categoryId: 'vegetables', name: 'Pomidor', icon: '🍅' },
  { id: 'diet-papryka', categoryId: 'vegetables', name: 'Papryka', icon: '🫑' },
  { id: 'diet-kalafior', categoryId: 'vegetables', name: 'Kalafior', icon: '🥦' },
  { id: 'diet-awokado', categoryId: 'vegetables', name: 'Awokado', icon: '🥑' },
  { id: 'diet-groszek', categoryId: 'vegetables', name: 'Groszek', icon: '🫛' },
  { id: 'diet-kukurydza', categoryId: 'vegetables', name: 'Kukurydza', icon: '🌽' },
  // owoce
  { id: 'diet-banana', categoryId: 'fruits', name: 'Banan', icon: '🍌' },
  { id: 'diet-jablko', categoryId: 'fruits', name: 'Jabłko', icon: '🍎' },
  { id: 'diet-gruszka', categoryId: 'fruits', name: 'Gruszka', icon: '🍐' },
  { id: 'diet-brzoskwinia', categoryId: 'fruits', name: 'Brzoskwinia', icon: '🍑' },
  { id: 'diet-sliwka', categoryId: 'fruits', name: 'Śliwka', icon: '🍑' },
  { id: 'diet-morela', categoryId: 'fruits', name: 'Morela', icon: '🍑' },
  { id: 'diet-truskawka', categoryId: 'fruits', name: 'Truskawka', icon: '🍓' },
  { id: 'diet-malina', categoryId: 'fruits', name: 'Malina', icon: '🍓' },
  { id: 'diet-borowka', categoryId: 'fruits', name: 'Borówka', icon: '🫐' },
  { id: 'diet-mango', categoryId: 'fruits', name: 'Mango', icon: '🥭' },
  // zboża i kasze
  { id: 'diet-ryz', categoryId: 'grains', name: 'Ryż', icon: '🍚' },
  { id: 'diet-kasza-jaglana', categoryId: 'grains', name: 'Kasza jaglana', icon: '🥣' },
  { id: 'diet-kasza-gryczana', categoryId: 'grains', name: 'Kasza gryczana', icon: '🥣' },
  { id: 'diet-owsianka', categoryId: 'grains', name: 'Owsianka', icon: '🥣' },
  { id: 'diet-platki', categoryId: 'grains', name: 'Płatki owsiane', icon: '🌾' },
  { id: 'diet-makaron', categoryId: 'grains', name: 'Makaron', icon: '🍝' },
  // białko
  { id: 'diet-jajko', categoryId: 'protein', name: 'Jajko', icon: '🥚' },
  { id: 'diet-losos', categoryId: 'protein', name: 'Łosoś', icon: '🐟' },
  { id: 'diet-dorsz', categoryId: 'protein', name: 'Dorsz', icon: '🐟' },
  { id: 'diet-kurczak', categoryId: 'protein', name: 'Kurczak', icon: '🍗' },
  { id: 'diet-wolowina', categoryId: 'protein', name: 'Wołowina', icon: '🥩' },
  { id: 'diet-indyk', categoryId: 'protein', name: 'Indyk', icon: '🍗' },
  { id: 'diet-ciecierzyca', categoryId: 'protein', name: 'Ciecierzyca', icon: '🫘' },
  { id: 'diet-soczewica', categoryId: 'protein', name: 'Soczewica', icon: '🫘' },
  { id: 'diet-tofu', categoryId: 'protein', name: 'Tofu', icon: '🥢' },
  // pieczywo
  { id: 'diet-chleb', categoryId: 'bread', name: 'Chleb', icon: '🍞' },
  { id: 'diet-bulka', categoryId: 'bread', name: 'Bułka', icon: '🥖' },
  { id: 'diet-bagietka', categoryId: 'bread', name: 'Bagietka', icon: '🥖' },
  { id: 'diet-chlebek-chrupki', categoryId: 'bread', name: 'Chlebek chrupki', icon: '🍞' },
  { id: 'diet-serek', categoryId: 'bread', name: 'Serek / twaróg', icon: '🧀' },
  // inne
  { id: 'diet-maslo', categoryId: 'other', name: 'Masło', icon: '🧈' },
  { id: 'diet-oliwa', categoryId: 'other', name: 'Oliwa', icon: '🫒' },
  { id: 'diet-woda', categoryId: 'other', name: 'Woda', icon: '💧' },
  { id: 'diet-herbatka', categoryId: 'other', name: 'Herbatka', icon: '🍵' },
  { id: 'diet-cynamon', categoryId: 'other', name: 'Cynamon', icon: '🟤' },
];

function dietKey(childId: string): string {
  return `babylog_diet_${childId}`;
}

export async function loadDiet(): Promise<DietItem[]> {
  const session = await loadSession();
  if (!session) {
    return PRESET_PRODUCTS.map((item) => ({ ...item, status: null }));
  }

  try {
    const raw = await AsyncStorage.getItem(dietKey(session.childId));
    const saved = raw ? (JSON.parse(raw) as DietItem[]) : [];

    const merged: DietItem[] = PRESET_PRODUCTS.map((preset) => {
      const match = saved.find((item) => item.id === preset.id);
      return {
        ...preset,
        status: match ? match.status : null,
      };
    });

    return merged.concat(saved.filter((item) => item.custom));
  } catch {
    return PRESET_PRODUCTS.map((item) => ({ ...item, status: null }));
  }
}

async function persist(items: DietItem[]): Promise<void> {
  const session = await loadSession();
  if (!session) return;

  const itemsToSave = items
    .filter((item) => item.status !== null || item.custom)
    .map((item) => ({
      id: item.id,
      categoryId: item.categoryId,
      name: item.name,
      icon: item.icon,
      custom: item.custom ?? false,
      status: item.status,
    }));

  await AsyncStorage.setItem(dietKey(session.childId), JSON.stringify(itemsToSave));
}

export async function setDietStatus(id: string, status: DietStatus): Promise<void> {
  const items = await loadDiet();
  const next = items.map((item) =>
    item.id === id ? { ...item, status: item.status === status ? null : status } : item
  );
  await persist(next);
  notifyDataChanged();
}

export async function addDietProduct(
  categoryId: string,
  name: string,
  icon: string
): Promise<void> {
  const items = await loadDiet();
  await persist([
    ...items,
    {
      id: newId(),
      categoryId,
      name: name.trim(),
      icon,
      custom: true,
      status: null,
    },
  ]);
  notifyDataChanged();
}

export async function removeDietProduct(id: string): Promise<void> {
  const items = await loadDiet();
  await persist(items.filter((item) => item.id !== id));
  notifyDataChanged();
}

export async function resetDietStatuses(): Promise<void> {
  await persist([]);
  notifyDataChanged();
}