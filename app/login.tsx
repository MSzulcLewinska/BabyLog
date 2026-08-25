import { Palette } from '@/constants/theme';
import { useAppState } from '@/hooks/use-app-state';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signIn } = useAppState();
  const [busy, setBusy] = useState(false);

  const handleGoogleLogin = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 700));
      await signIn();
      router.replace('/setup-child' as Href);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoEmoji}>🍼</Text>
        </View>
        <Text style={styles.title}>BabyLog</Text>
        <Text style={styles.subtitle}>
          Dziennik karmień, pieluch i ważnych chwil Twojego malucha
        </Text>

        <Pressable
          style={({ pressed }) => [
            styles.googleButton,
            busy && styles.googleButtonDisabled,
            pressed && styles.googleButtonPressed,
          ]}
          onPress={handleGoogleLogin}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator size="small" color={Palette.textSecondary} />
          ) : (
            <>
              <Text style={styles.googleIcon}>G</Text>
              <Text style={styles.googleLabel}>Kontynuuj z Google</Text>
            </>
          )}
        </Pressable>

        <Text style={styles.joinHint}>Druga osoba z rodziny?</Text>
        <Pressable
          style={({ pressed }) => [styles.joinButton, pressed && { opacity: 0.7 }]}
          onPress={() => router.push('/join' as Href)}
        >
          <Text style={styles.joinLabel}>Dołącz kodem dziecka →</Text>
        </Pressable>

        <Text style={styles.note}>
          Twoje dane pozostają zapisane na tym urządzeniu
        </Text>
      </View>
    </View>
  );
}

const GOOGLE_BLUE = '#4285F4';

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Palette.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  logoEmoji: {
    fontSize: 44,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: Palette.text,
  },
  subtitle: {
    fontSize: 15,
    color: Palette.textSecondary,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 40,
    lineHeight: 22,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.border,
    minHeight: 54,
    alignSelf: 'stretch',
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  googleButtonPressed: {
    opacity: 0.85,
  },
  googleButtonDisabled: {
    opacity: 0.6,
  },
  googleIcon: {
    fontSize: 20,
    fontWeight: '800',
    color: GOOGLE_BLUE,
    marginRight: 12,
  },
  googleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Palette.text,
  },
  joinHint: {
    fontSize: 13,
    color: Palette.textMuted,
    marginTop: 28,
  },
  joinButton: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  joinLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Palette.greenDark,
  },
  note: {
    fontSize: 12,
    color: Palette.textMuted,
    marginTop: 24,
    textAlign: 'center',
  },
});
