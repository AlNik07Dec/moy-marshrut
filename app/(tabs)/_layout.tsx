import { Tabs } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { GlassTabBar } from '../../src/components/GlassTabBar';
import { theme } from '../../src/theme';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props: BottomTabBarProps) => <GlassTabBar {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.bg },
        headerTitleStyle: { color: theme.colors.textPrimary, fontWeight: '600' },
        headerTintColor: theme.colors.textPrimary,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Walk&Paw',
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{ title: 'История' }}
      />
      <Tabs.Screen
        name="stats"
        options={{ title: 'Статистика' }}
      />
    </Tabs>
  );
}
