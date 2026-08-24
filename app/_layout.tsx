import { Palette } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  AppStateProvider,
  useAppState,
} from '@/hooks/use-app-state';
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';
import { useRouter, useSegments, type Href } from 'expo-router';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import 'react-native-reanimated';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  return (
    <AppStateProvider>
      <RootNavigator />
    </AppStateProvider>
  );
}

function RootNavigator() {
  const colorScheme = useColorScheme();
  const { ready, signedIn, onboarded } = useAppState();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;

    const current = segments[0];
    const onAuthScreen = current === 'login' || current === 'setup-child';

    if (!signedIn) {
      if (current !== 'login') router.replace('/login' as Href);
      return;
    }

    if (!onboarded) {
      if (current !== 'setup-child') router.replace('/setup-child' as Href);
      return;
    }

    if (onAuthScreen) router.replace('/(tabs)' as Href);
  }, [ready, signedIn, onboarded, segments, router]);

  if (!ready) {
    return <View style={styles.bootScreen} />;
  }

  return (
    <ThemeProvider
      value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}
    >
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Palette.background },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" />
        <Stack.Screen name="setup-child" />
        <Stack.Screen name="activities" />
        <Stack.Screen name="day" />
        <Stack.Screen name="log" />
        <Stack.Screen name="add-activity" />
        <Stack.Screen name="share" />
        <Stack.Screen name="join" />
        <Stack.Screen name="edit-child" />
        <Stack.Screen name="edit-account" />
        <Stack.Screen name="add-plan" />
        <Stack.Screen name="plans" />
      </Stack>
      <StatusBar style="dark" />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  bootScreen: {
    flex: 1,
    backgroundColor: Palette.background,
  },
});
