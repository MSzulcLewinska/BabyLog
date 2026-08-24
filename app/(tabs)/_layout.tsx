import { AppTabBar } from '@/components/app-tab-bar';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <AppTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Dzisiaj' }} />
      <Tabs.Screen name="history" options={{ title: 'Historia' }} />
      <Tabs.Screen name="stats" options={{ title: 'Statystyki' }} />
      <Tabs.Screen name="settings" options={{ title: 'Ustawienia' }} />
    </Tabs>
  );
}
