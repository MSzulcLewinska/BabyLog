import { PrimaryButton } from '@/components/primary-button';
import { Palette } from '@/constants/theme';
import { useAppState } from '@/hooks/use-app-state';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PRIVACY_URL = 'https://mszulclewinska.github.io/BabyLog/privacy.html';

export default function ConsentScreen() {
  const insets = useSafeAreaInsets();
  const { acceptPrivacyPolicy } = useAppState();

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 24 }]}
      >
        <Text style={styles.title}>Zanim zaczniemy 🍼</Text>

        <Text style={styles.body}>
          Aby korzystać z BabyLog, musisz zaakceptować nasze zasady prywatności.
          BabyLog przechowuje dane Twojego dziecka (imię, zdjęcie, datę urodzenia,
          wagę, wzrost) oraz wpisy dziennika (karmienia, pieluszki, temperaturę,
          leki, sen) bezpiecznie w chmurze na serwerach Supabase.
        </Text>

        <Text style={styles.body}>
          Twoje dane nie są sprzedawane ani udostępniane reklamodawcom. Nie
          używamy żadnych systemów analitycznych ani reklamowych. Masz prawo
          poprosić o usunięcie wszystkich danych w dowolnym momencie.
        </Text>

        <Text
          style={styles.link}
          onPress={() => void Linking.openURL(PRIVACY_URL)}
        >
          Przeczytaj pełną politykę prywatności →
        </Text>

        <View style={styles.buttonWrap}>
          <PrimaryButton
            label="Akceptuję zasady"
            onPress={() => void acceptPrivacyPolicy()}
          />
        </View>
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
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Palette.text,
    marginBottom: 16,
    marginTop: 8,
  },
  body: {
    fontSize: 15,
    lineHeight: 23,
    color: Palette.textSecondary,
    marginBottom: 14,
  },
  link: {
    fontSize: 15,
    fontWeight: '600',
    color: Palette.greenDark,
    marginTop: 6,
    marginBottom: 24,
  },
  buttonWrap: {
    marginTop: 8,
  },
});
